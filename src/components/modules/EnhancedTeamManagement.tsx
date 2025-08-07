'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { createStaffAccount } from '../../lib/auth/roleBasedAuth'
import { UserRole } from '../../lib/rbac/permissions'
import ShiftResetManager from './ShiftResetManager'
import HybridResetManager from './HybridResetManager'

// Platform administration - crucial for SaaS scalability
const PLATFORM_ADMINS = [
  'brian@coretrack.com',
  'support@coretrack.com',
  'admin@coretrack.com',
  'brianbasa@gmail.com'  // Add your actual email here
]

const isPlatformAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false
  return PLATFORM_ADMINS.includes(email.toLowerCase())
}

// Simple role definitions - enterprise ready but easy to understand  
type StaffRole = 'owner' | 'manager' | 'staff'

interface LocalTeamMember {
  id: string
  name: string
  email: string
  role: StaffRole
  status: 'active' | 'inactive' | 'pending'
  joinDate: string
  phone?: string
  avatar?: string
  lastActive?: string
  authUserId?: string // Link to Firebase Auth user ID
  hasAuthAccount?: boolean // Track if auth account exists
}

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    description: 'Full system access including admin features',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '👑',
    permissions: ['All Features', 'Admin Panel', 'Team Management', 'Settings']
  },
  manager: {
    label: 'Manager',
    description: 'Full operations access (no admin features)',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👨‍💼',
    permissions: ['POS', 'Inventory', 'Purchase Orders', 'Menu Builder', 'Reports', 'Team Management']
  },
  staff: {
    label: 'Staff',
    description: 'Basic operational access',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '👤',
    permissions: ['POS', 'Inventory', 'Purchase Orders']
  }
}

export default function EnhancedTeamManagement() {
  const { profile, loading: authLoading } = useAuth()
  const { selectedBranch } = useBranch()
  
  // Platform administration detection
  const isCurrentUserPlatformAdmin = isPlatformAdmin(profile?.email)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [availableTenants, setAvailableTenants] = useState<Array<{id: string, name: string}>>([])
  
  const [teamMembers, setTeamMembers] = useState<LocalTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [operationLoading, setOperationLoading] = useState(false) // For add/edit/delete operations
  const [accessDenied, setAccessDenied] = useState(false) // For permission errors
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<LocalTeamMember | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<LocalTeamMember | null>(null)

  // Coordinated loading state - team loading OR auth still loading
  const isFullyLoading = loading || authLoading
  const [activeTab, setActiveTab] = useState<'team' | 'roles' | 'reset' | 'activity'>('team')
  
  // Data mode toggle
  const [useRealData, setUseRealData] = useState(false)
  
  const [editFormData, setEditFormData] = useState<{
    name: string
    email: string
    role: string
    phone: string
  }>({
    name: '',
    email: '',
    role: '',
    phone: ''
  })
  
  const [addFormData, setAddFormData] = useState<{
    name: string
    email: string
    role: string
    phone: string
  }>({
    name: '',
    email: '',
    role: 'staff',
    phone: ''
  })

  // Load team members from Firebase with enhanced security validation
  useEffect(() => {
    const loadTeamMembers = async () => {
      // Don't proceed if auth is still loading
      if (authLoading) {
        return
      }

      // Reset access denied state when re-evaluating permissions
      setAccessDenied(false)

      // Determine which tenant to load data for
      let targetTenantId: string

      if (isCurrentUserPlatformAdmin && selectedTenantId) {
        // Platform admin viewing specific tenant
        targetTenantId = selectedTenantId
        console.log('👑 Platform Admin: Loading tenant', targetTenantId)
      } else if (!isCurrentUserPlatformAdmin && profile?.tenantId && profile?.uid) {
        // Regular user accessing their own tenant
        targetTenantId = profile.tenantId
        
        // Security validation: Users can only access their own tenant's team management
        // Only owners and managers should be able to view team management
        console.log('🔍 Security Check:', {
          isCurrentUserPlatformAdmin,
          profileExists: !!profile,
          profileRole: profile?.role,
          profileEmail: profile?.email,
          profileTenantId: profile?.tenantId,
          profileUid: profile?.uid
        })
        
        if (profile.role !== 'owner' && profile.role !== 'manager') {
          console.error('🚨 Security: Insufficient permissions for team management', {
            userRole: profile.role,
            userEmail: profile.email,
            requiredRoles: ['owner', 'manager']
          })
          setAccessDenied(true)
          setLoading(false)
          return
        }
      } else {
        // Check if we're still waiting for auth to complete
        if (authLoading) {
          console.log('⏳ Waiting for authentication to complete...')
          return
        }
        
        // After auth is complete, handle platform admin tenant selection
        if (isCurrentUserPlatformAdmin && profile && !selectedTenantId) {
          console.log('👑 Platform Admin: Auto-selecting tenant from profile...')
          // For platform admins, if no tenant is selected but they have a tenantId in profile,
          // use their own tenant as default
          if (profile.tenantId) {
            setSelectedTenantId(profile.tenantId)
            console.log('✅ Platform Admin: Auto-selected tenant:', profile.tenantId)
            return // Let the useEffect re-run with the selected tenant
          } else {
            console.warn('🚨 Platform Admin: No tenantId available, awaiting manual selection')
            setLoading(false)
            return
          }
        }
        
        // For non-platform admins, they should use their own tenant
        if (!isCurrentUserPlatformAdmin && profile?.tenantId) {
          console.log('🔄 Regular user with tenant, but missing uid - using fallback')
          targetTenantId = profile.tenantId
        } else {
          console.warn('🚨 Security: Missing tenant context - Profile:', {
            exists: !!profile,
            tenantId: profile?.tenantId,
            uid: profile?.uid,
            isPlatformAdmin: isCurrentUserPlatformAdmin,
            selectedTenantId
          })
          setLoading(false)
          return
        }
      }

      try {
        setLoading(true)
        const membersRef = collection(db, `tenants/${targetTenantId}/teamMembers`)
        console.log('📥 LOADING TEAM MEMBERS FROM FIREBASE')
        console.log('📍 Collection path:', `tenants/${targetTenantId}/teamMembers`)
        
        const snapshot = await getDocs(membersRef)
        console.log('📊 Found', snapshot.size, 'documents in Firebase')
        
        const members = snapshot.docs.map(doc => {
          const data = doc.data()
          console.log('👤 Loading member:', {
            id: doc.id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            hasAuthAccount: data.hasAuthAccount
          })
          return {
            id: doc.id,
            ...data
          }
        }) as LocalTeamMember[]
        
        console.log('✅ Final members array:', members)
        console.log('📧 Emails in final array:', members.map(m => ({ name: m.name, email: m.email })))
        setTeamMembers(members)
      } catch (error) {
        console.error('Error loading team members:', error)
        // Load fallback data
        setTeamMembers([
          {
            id: '1',
            name: 'John Doe',
            email: 'john@restaurant.com',
            role: 'owner',
            status: 'active',
            joinDate: '2024-01-15',
            phone: '+1234567890',
            lastActive: '2 minutes ago'
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    loadTeamMembers()
  }, [profile?.tenantId || '', selectedTenantId || '', isCurrentUserPlatformAdmin, authLoading || false])

  // Load available tenants for platform admin
  useEffect(() => {
    const loadAvailableTenants = async () => {
      if (!isCurrentUserPlatformAdmin || authLoading) return

      try {
        const tenantsRef = collection(db, 'tenants')
        const snapshot = await getDocs(tenantsRef)
        const tenants = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().businessName || `Tenant ${doc.id.slice(-6)}`
        }))
        setAvailableTenants(tenants)
        
        // Auto-select tenant if none selected
        if (tenants.length > 0 && !selectedTenantId) {
          // Prioritize the platform admin's own tenant if it exists
          if (profile?.tenantId && tenants.some(t => t.id === profile.tenantId)) {
            console.log('👑 Platform Admin: Auto-selecting own tenant:', profile.tenantId)
            setSelectedTenantId(profile.tenantId)
          } else {
            // Otherwise, select the first available tenant
            console.log('👑 Platform Admin: Auto-selecting first available tenant:', tenants[0].id)
            setSelectedTenantId(tenants[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading tenants for platform admin:', error)
      }
    }

    loadAvailableTenants()
  }, [isCurrentUserPlatformAdmin, selectedTenantId || '', profile?.tenantId || '', authLoading || false])

  // Helper functions for audit log generation
  const getActionDescription = (action: string): string => {
    const descriptions: { [key: string]: string } = {
      'user.login': 'User successfully logged into the system',
      'user.logout': 'User logged out of the system',
      'user.created': 'New user account was created',
      'user.updated': 'User profile information was updated',
      'user.deleted': 'User account was permanently deleted',
      'team.member.added': 'New team member was added to the organization',
      'team.member.removed': 'Team member was removed from the organization',
      'team.role.changed': 'Team member role permissions were modified',
      'pos.transaction.created': 'New point of sale transaction was processed',
      'pos.transaction.voided': 'POS transaction was voided and refunded',
      'pos.payment.processed': 'Payment was successfully processed',
      'inventory.item.created': 'New inventory item was added to the catalog',
      'inventory.item.updated': 'Inventory item details were modified',
      'inventory.stock.adjusted': 'Stock levels were manually adjusted',
      'menu.item.created': 'New menu item was added',
      'menu.item.updated': 'Menu item details were updated',
      'menu.category.created': 'New menu category was created',
      'billing.subscription.created': 'New subscription plan was activated',
      'billing.payment.processed': 'Subscription payment was processed',
      'billing.invoice.generated': 'Invoice was automatically generated',
      'system.backup.completed': 'Automated system backup completed successfully',
      'system.maintenance.started': 'Scheduled maintenance window initiated',
      'system.alert.triggered': 'System monitoring alert was triggered',
      'security.login.failed': 'Failed login attempt detected',
      'security.password.reset': 'Password reset request was processed',
      'security.permission.denied': 'User attempted unauthorized action'
    }
    return descriptions[action] || 'System action performed'
  }

  const getActionMetadata = (action: string, tenantName: string): any => {
    const baseMetadata = { tenant: tenantName, platform: 'CoreTrack' }
    
    if (action.startsWith('pos.')) {
      return { ...baseMetadata, amount: (Math.random() * 100 + 10).toFixed(2), items: Math.floor(Math.random() * 5) + 1 }
    } else if (action.startsWith('inventory.')) {
      return { ...baseMetadata, itemId: `item_${Math.random().toString(36).substr(2, 9)}`, quantity: Math.floor(Math.random() * 100) + 1 }
    } else if (action.startsWith('billing.')) {
      return { ...baseMetadata, amount: (Math.random() * 200 + 29).toFixed(2), plan: ['starter', 'professional', 'enterprise'][Math.floor(Math.random() * 3)] }
    }
    
    return baseMetadata
  }

  // Helper function to map team roles to auth roles (now simplified)
  const mapTeamRoleToAuthRole = (teamRole: StaffRole): UserRole => {
    // Since both use the same role names now, direct mapping
    return teamRole
  }

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Check for duplicate email
  const isDuplicateEmail = (email: string, excludeId?: string) => {
    return teamMembers.some(member => 
      member.email.toLowerCase() === email.toLowerCase() && member.id !== excludeId
    )
  }

  // Add member to Firebase
  const handleAddMember = async () => {
    const trimmedName = addFormData.name.trim()
    const trimmedEmail = addFormData.email.trim()

    // Validation
    if (!trimmedName || trimmedName.length < 2) {
      alert('Please enter a valid name (at least 2 characters)')
      return
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      alert('Please enter a valid email address')
      return
    }

    if (isDuplicateEmail(trimmedEmail)) {
      alert('A team member with this email already exists')
      return
    }

    if (!profile?.tenantId && !selectedTenantId) {
      alert('Authentication error. Please try logging in again.')
      return
    }

    const targetTenantId = isCurrentUserPlatformAdmin ? selectedTenantId : profile?.tenantId
    if (!targetTenantId) {
      alert('No tenant selected for operation.')
      return
    }

    try {
      setOperationLoading(true) // Show loading state
      
      let authUserId = ''
      let hasAuthAccount = false
      let memberStatus: 'active' | 'pending' = 'pending'

      // Create Firebase Auth account for non-owner roles
      if (addFormData.role !== 'owner') {
        try {
          console.log('🚀 STARTING AUTH ACCOUNT CREATION')
          console.log('📧 Email:', trimmedEmail)
          console.log('👤 Name:', trimmedName)
          console.log('🏢 Tenant ID:', targetTenantId)
          console.log('👑 Created by UID:', profile?.uid || 'platform-admin')
          
          // Map team role to auth role
          const authRole = mapTeamRoleToAuthRole(addFormData.role as StaffRole)
          console.log(`🔄 Mapping team role "${addFormData.role}" to auth role "${authRole}"`)
          
          console.log('⏳ Calling createStaffAccount...')
          authUserId = await createStaffAccount(
            {
              email: trimmedEmail,
              displayName: trimmedName,
              role: authRole,
              locationIds: selectedBranch ? [selectedBranch.id] : []
            },
            targetTenantId,
            profile?.uid || 'platform-admin'
          )
          console.log('✅ createStaffAccount returned:', authUserId)
          
          // Handle the special case where user already exists
          if (authUserId === 'existing-user') {
            hasAuthAccount = true
            memberStatus = 'active' // They can log in with existing account
            authUserId = '' // We don't have the actual UID, but they can log in
            console.log('Using existing Firebase Auth account for:', trimmedEmail)
          } else {
            hasAuthAccount = true
            memberStatus = 'active' // Account was created successfully
            console.log('Firebase Auth account created successfully:', authUserId)
          }
          
        } catch (authError: any) {
          console.error('❌ FAILED TO CREATE AUTH ACCOUNT')
          console.error('🚨 Error details:', authError)
          console.error('🚨 Error code:', authError.code)
          console.error('🚨 Error message:', authError.message)
          console.error('🚨 Full error object:', JSON.stringify(authError, null, 2))
          
          // Handle specific error cases more gracefully
          if (authError.message?.includes('already registered')) {
            console.log('📝 Email already exists in system - treating as existing account')
            hasAuthAccount = true
            memberStatus = 'active'
            authUserId = '' // We don't have the actual UID, but account exists
          } else if (authError.message?.includes('email-already-in-use')) {
            console.log('📝 Email already exists in Firebase Auth, but continuing with team member creation')
            hasAuthAccount = false
            memberStatus = 'pending'
          } else {
            // For other errors, continue without auth account
            console.log('📝 Auth account creation failed with error:', authError.message)
            hasAuthAccount = false
            memberStatus = 'pending'
          }
        }
      } else {
        // Owners should already have auth accounts
        hasAuthAccount = true
        memberStatus = 'active'
      }
      
      console.log('📦 CREATING TEAM MEMBER OBJECT')
      console.log('🔍 Final values:')
      console.log('   hasAuthAccount:', hasAuthAccount)
      console.log('   memberStatus:', memberStatus)
      console.log('   authUserId:', authUserId)
      
      const newMember: Omit<LocalTeamMember, 'id'> = {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(), // Normalize email
        role: addFormData.role as StaffRole,
        status: memberStatus,
        joinDate: new Date().toISOString().split('T')[0],
        phone: addFormData.phone.trim(),
        lastActive: 'Just added',
        ...(authUserId && { authUserId }), // Only include authUserId if it exists
        hasAuthAccount
      }
      
      console.log('📝 New member object:', JSON.stringify(newMember, null, 2))

      // Add to Firebase team members collection
      console.log('💾 SAVING TO FIREBASE FIRESTORE')
      console.log('🎯 Target tenant ID:', targetTenantId)
      const membersRef = collection(db, `tenants/${targetTenantId}/teamMembers`)
      console.log('📍 Collection path: tenants/' + targetTenantId + '/teamMembers')
      console.log('⏳ Adding document to Firestore...')
      const docRef = await addDoc(membersRef, newMember)
      console.log('✅ Document added with ID:', docRef.id)
      
      // Add to local state
      console.log('🔄 Adding to local state...')
      setTeamMembers(prev => [...prev, { id: docRef.id, ...newMember }])
      console.log('✅ Added to local state')
      
      setShowAddModal(false)
      setAddFormData({ name: '', email: '', role: 'staff', phone: '' })
      console.log('✅ Modal closed and form reset')
      
      console.log('🎉 TEAM MEMBER CREATION COMPLETED SUCCESSFULLY!')
      
      // Enhanced success notification with appropriate messaging
      if (hasAuthAccount && authUserId && authUserId !== 'existing-user') {
        // Provide clear messaging about the session change and email troubleshooting
        setTimeout(() => {
          alert(`✅ Team member ${trimmedName} has been added successfully!\n\n📧 A password reset email has been sent to ${trimmedEmail}\n🔐 They can use this email to set up their login credentials.\n\n⚠️ IMPORTANT: Creating this account automatically logged them in. You may need to log back in with your owner/manager account to continue managing your team.\n\n📮 EMAIL TROUBLESHOOTING:\n• Check spam/junk folders\n• Look in Promotions tab (Gmail)\n• Add noreply@inventory-system-latest.firebaseapp.com to contacts\n• Email may take 5-15 minutes to arrive\n• If no email arrives, user can use "Forgot Password" from login page`)
        }, 100)
      } else if (hasAuthAccount && (!authUserId || authUserId === 'existing-user')) {
        alert(`✅ Team member ${trimmedName} has been added successfully!\n\n📧 They already have a login account and can access the system using their existing credentials.\n\n💡 If they need to reset their password, they can use the "Forgot Password" option from the login page.`)
      } else {
        alert(`✅ Team member ${trimmedName} has been added to your team!\n\n⚠️ Note: Login account setup is pending. They&apos;ve been added to your team management.\n\n🔐 To create their login credentials:\n1. You can try creating their account again later\n2. Or they can sign up themselves using the same email\n3. Or use "Forgot Password" if account exists`)
      }
      
    } catch (error) {
      console.error('💥 CRITICAL ERROR IN handleAddMember:', error)
      console.error('🚨 Error type:', typeof error)
      console.error('🚨 Error details:', JSON.stringify(error, null, 2))
      
      if (error instanceof Error) {
        console.error('🚨 Error name:', error.name)
        console.error('🚨 Error message:', error.message)
        console.error('🚨 Error stack:', error.stack)
      }
      
      alert('❌ Failed to add team member. Please check your connection and try again.\n\nCheck the browser console for detailed error information.')
    } finally {
      console.log('🔚 handleAddMember finally block executed')
      setOperationLoading(false)
    }
  }

  // Update member in Firebase
  const handleUpdateMember = async () => {
    if (!editingMember) return

    const targetTenantId = isCurrentUserPlatformAdmin ? selectedTenantId : profile?.tenantId
    if (!targetTenantId) {
      alert('No tenant selected for operation.')
      return
    }

    const trimmedName = editFormData.name.trim()
    const trimmedEmail = editFormData.email.trim()

    // Validation
    if (!trimmedName || trimmedName.length < 2) {
      alert('Please enter a valid name (at least 2 characters)')
      return
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      alert('Please enter a valid email address')
      return
    }

    if (isDuplicateEmail(trimmedEmail, editingMember.id)) {
      alert('A team member with this email already exists')
      return
    }

    try {
      setOperationLoading(true) // Show loading state
      
      const memberRef = doc(db, `tenants/${targetTenantId}/teamMembers`, editingMember.id)
      await updateDoc(memberRef, {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: editFormData.role,
        phone: editFormData.phone.trim()
      })

      // Update local state
      const updatedMember = {
        ...editingMember,
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: editFormData.role as StaffRole,
        phone: editFormData.phone.trim()
      }
      
      setTeamMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))
      setEditingMember(null)
      setEditFormData({ name: '', email: '', role: '', phone: '' })
      
      // Success notification
      alert(`✅ Team member ${trimmedName} has been updated successfully!`)
      
    } catch (error) {
      console.error('Error updating team member:', error)
      alert('❌ Failed to update team member. Please check your connection and try again.')
    } finally {
      setOperationLoading(false)
    }
  }

  // Delete member from Firebase
  const confirmDeleteMember = async () => {
    if (!showDeleteConfirm) return

    const targetTenantId = isCurrentUserPlatformAdmin ? selectedTenantId : profile?.tenantId
    if (!targetTenantId) {
      alert('No tenant selected for operation.')
      return
    }

    try {
      setOperationLoading(true) // Show loading state
      
      const memberRef = doc(db, `tenants/${targetTenantId}/teamMembers`, showDeleteConfirm.id)
      await deleteDoc(memberRef)
      
      // Remove from local state
      setTeamMembers(prev => prev.filter(m => m.id !== showDeleteConfirm.id))
      
      // Success notification
      alert(`✅ Team member ${showDeleteConfirm.name} has been removed successfully`)
      
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting team member:', error)
      alert('❌ Failed to remove team member. Please check your connection and try again.')
    } finally {
      setOperationLoading(false)
    }
  }

  const handleEditMember = (member: LocalTeamMember) => {
    setEditingMember(member)
    setEditFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || ''
    })
  }

  const handleDeleteMember = (member: LocalTeamMember) => {
    setShowDeleteConfirm(member)
  }

  const handleCancelEdit = () => {
    setEditingMember(null)
    setEditFormData({ name: '', email: '', role: '', phone: '' })
  }

  const handleCancelAdd = () => {
    setShowAddModal(false)
    setAddFormData({ name: '', email: '', role: 'staff', phone: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string, hasAuthAccount?: boolean) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
          Active
        </span>
      )
    }
    
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1"></div>
          Pending Setup
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></div>
        Inactive
      </span>
    )
  }

  // Show access denied message for insufficient permissions
  if (accessDenied) {
    const isLikelySessionSwitch = profile?.role === 'staff';
    
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h3>
          <p className="text-red-700 mb-4">
            You don&apos;t have permission to access team management. This feature is only available to owners and managers.
          </p>
          <p className="text-sm text-red-600 mb-2">
            Your current role: <span className="font-medium">{profile?.role || 'Unknown'}</span>
          </p>
          {isLikelySessionSwitch && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Session Switched:</strong> It looks like you were automatically logged in as a newly created team member. 
                To manage your team, please log back in with your owner/manager account.
              </p>
            </div>
          )}
          <div className="mt-6 space-x-3">
            <button
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            {isLikelySessionSwitch && (
              <button
                onClick={() => window.location.href = '/'}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Return to Login
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show unified loading state while authentication or team data initializes
  if (isFullyLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Platform Admin Selector */}
      {isCurrentUserPlatformAdmin && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.5.5a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-purple-900">Platform Administrator</h3>
                <p className="text-sm text-purple-600">You have access to all tenant data for support purposes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/admin"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Admin Dashboard
              </a>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="px-4 py-2 border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Tenant</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.id.slice(-6)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Team Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-gray-900">{teamMembers.length}</div>
          <div className="text-sm text-gray-600">Total Members</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-green-600">{teamMembers.filter(m => m.status === 'active').length}</div>
          <div className="text-sm text-gray-600">Active Members</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-blue-600">{Object.keys(ROLE_CONFIG).length}</div>
          <div className="text-sm text-gray-600">Roles Available</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-purple-600">{teamMembers.filter(m => m.role === 'owner').length}</div>
          <div className="text-sm text-gray-600">Owners</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'team', label: 'Team Members', icon: '👥' },
              { id: 'roles', label: 'Role Permissions', icon: '🔑' },
              { id: 'reset', label: 'Shift Management', icon: '🔄' },
              { id: 'activity', label: 'Recent Activity', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Team Members Tab */}
        {activeTab === 'team' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Access</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {member.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{ROLE_CONFIG[member.role]?.icon || '👤'}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ROLE_CONFIG[member.role]?.label || member.role}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ROLE_CONFIG[member.role]?.description || 'Unknown role'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.status, member.hasAuthAccount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {member.hasAuthAccount ? (
                            <div className="flex items-center text-green-600">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium">Can Login</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-500">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs">No Login</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditMember(member)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteMember(member)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Role Permissions Tab */}
        {activeTab === 'roles' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => (
                <div key={roleKey} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color.replace('text-', 'bg-').replace('border-', '')}`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{config.label}</h3>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Permissions:</h4>
                    {config.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">{permission}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {teamMembers.filter(m => m.role === roleKey).length} team member(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shift Management Tab */}
        {activeTab === 'reset' && (
          <div className="p-6 space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Shift & Data Management</h3>
              <p className="text-sm text-gray-600">
                Manage shift transitions and daily data resets. Data is automatically archived and reset at 3AM daily, 
                or you can manually trigger resets when ending shifts.
              </p>
            </div>

            {/* Manual Shift Reset */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Manual Shift Reset</h4>
                    <p className="text-sm text-gray-600">End current shift and reset daily operational data</p>
                  </div>
                  <div className="text-2xl">🔄</div>
                </div>
                <ShiftResetManager />
              </div>
            </div>

            {/* Automatic Reset Schedule */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Automatic Reset Schedule</h4>
                    <p className="text-sm text-gray-600">Configure automatic daily data resets</p>
                  </div>
                  <div className="text-2xl">⏰</div>
                </div>
                <HybridResetManager />
              </div>
            </div>

            {/* Information Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">How Shift Reset Works</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• <strong>Archives Data:</strong> All sales, expenses, and transactions are safely archived</p>
                    <p>• <strong>Resets Collections:</strong> Clears daily operational data for fresh start</p>
                    <p>• <strong>Updates Analytics:</strong> Refreshes all dashboard components automatically</p>
                    <p>• <strong>Preserves Inventory:</strong> Stock levels are maintained and updated</p>
                    <p>• <strong>Creates Reports:</strong> Generates comprehensive shift summaries</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Team Activity</h3>
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">No Team Activity Yet</h4>
                  <p className="text-gray-500">Team activity will appear here once members start using the system</p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Activity Tracking Coming Soon</h4>
                      <p className="text-xs text-blue-600 mt-1">Real-time activity tracking is currently in development</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show team member summary as placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Team Overview</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Members:</span>
                      <span className="font-medium">{teamMembers.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Members:</span>
                      <span className="font-medium text-green-600">{teamMembers.filter(m => m.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recently Added:</span>
                      <span className="font-medium">{teamMembers.filter(m => m.lastActive === 'Just added').length}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Role Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
                      const count = teamMembers.filter(m => m.role === roleKey).length
                      if (count === 0) return null
                      return (
                        <div key={roleKey} className="flex justify-between text-sm">
                          <span className="text-gray-600 flex items-center">
                            <span className="mr-2">{config.icon}</span>
                            {config.label}:
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}





      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({...addFormData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!addFormData.name.trim() || !addFormData.email.trim() || operationLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {operationLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {operationLoading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={operationLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {operationLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {operationLoading ? 'Updating...' : 'Update Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Remove Team Member</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to remove <strong>{showDeleteConfirm.name}</strong> from your team? 
                They will lose access to the system immediately.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                disabled={operationLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {operationLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {operationLoading ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
