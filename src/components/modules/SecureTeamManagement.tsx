'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useToast } from '../../components/ui/Toast'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

// Secure role definitions
type StaffRole = 'owner' | 'manager' | 'staff'

interface TeamMember {
  id: string
  name: string
  email: string
  role: StaffRole
  status: 'active' | 'inactive' | 'pending'
  joinDate: string
  phone?: string
  lastActive?: string
}

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    description: 'Full system access',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '👑',
    permissions: ['All Features']
  },
  manager: {
    label: 'Manager',
    description: 'Operations & team management',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👨‍💼',
    permissions: ['Staff Management', 'Reports', 'Operations']
  },
  staff: {
    label: 'Staff',
    description: 'Basic operational access',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '👤',
    permissions: ['POS', 'Inventory', 'Purchase Orders']
  }
}

export default function SecureTeamManagement() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { addToast } = useToast()
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<TeamMember | null>(null)

  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as StaffRole,
    phone: ''
  })

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as StaffRole,
    phone: ''
  })

  // Check permissions - only owners and managers can access
  const hasTeamManagementAccess = () => {
    return profile?.role === 'owner' || profile?.role === 'manager'
  }

  // Load team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!profile?.tenantId || !hasTeamManagementAccess()) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const membersRef = collection(db, `tenants/${profile.tenantId}/teamMembers`)
        const snapshot = await getDocs(membersRef)
        
        const members = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamMember[]
        
        setTeamMembers(members)
      } catch (error) {
        console.error('Error loading team members:', error)
        addToast('Failed to load team members', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadTeamMembers()
  }, [profile?.tenantId])

  // Validation helpers
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isDuplicateEmail = (email: string, excludeId?: string) => {
    return teamMembers.some(member => 
      member.email.toLowerCase() === email.toLowerCase() && member.id !== excludeId
    )
  }

  // Add member
  const handleAddMember = async () => {
    const trimmedName = addFormData.name.trim()
    const trimmedEmail = addFormData.email.trim()

    // Validation
    if (!trimmedName || trimmedName.length < 2) {
      addToast('Please enter a valid name (at least 2 characters)', 'error')
      return
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      addToast('Please enter a valid email address', 'error')
      return
    }

    if (isDuplicateEmail(trimmedEmail)) {
      addToast('A team member with this email already exists', 'error')
      return
    }

    if (!profile?.tenantId) {
      addToast('Authentication error. Please try logging in again.', 'error')
      return
    }

    try {
      const newMember: Omit<TeamMember, 'id'> = {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: addFormData.role,
        status: 'pending',
        joinDate: new Date().toISOString().split('T')[0],
        phone: addFormData.phone.trim(),
        lastActive: 'Just added'
      }

      const membersRef = collection(db, `tenants/${profile.tenantId}/teamMembers`)
      const docRef = await addDoc(membersRef, newMember)
      
      setTeamMembers(prev => [...prev, { id: docRef.id, ...newMember }])
      setShowAddModal(false)
      setAddFormData({ name: '', email: '', role: 'staff', phone: '' })
      
      addToast(`Team member ${trimmedName} has been added successfully!`, 'success')
      
    } catch (error) {
      console.error('Error adding team member:', error)
      addToast('Failed to add team member. Please try again.', 'error')
    }
  }

  // Update member
  const handleUpdateMember = async () => {
    if (!editingMember || !profile?.tenantId) return

    const trimmedName = editFormData.name.trim()
    const trimmedEmail = editFormData.email.trim()

    // Validation
    if (!trimmedName || trimmedName.length < 2) {
      addToast('Please enter a valid name (at least 2 characters)', 'error')
      return
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      addToast('Please enter a valid email address', 'error')
      return
    }

    if (isDuplicateEmail(trimmedEmail, editingMember.id)) {
      addToast('A team member with this email already exists', 'error')
      return
    }

    try {
      const memberRef = doc(db, `tenants/${profile.tenantId}/teamMembers`, editingMember.id)
      await updateDoc(memberRef, {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: editFormData.role,
        phone: editFormData.phone.trim()
      })

      const updatedMember = {
        ...editingMember,
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        role: editFormData.role,
        phone: editFormData.phone.trim()
      }
      
      setTeamMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))
      setEditingMember(null)
      setEditFormData({ name: '', email: '', role: 'staff', phone: '' })
      
      addToast(`Team member ${trimmedName} has been updated successfully!`, 'success')
      
    } catch (error) {
      console.error('Error updating team member:', error)
      addToast('Failed to update team member. Please try again.', 'error')
    }
  }

  // Delete member
  const confirmDeleteMember = async () => {
    if (!showDeleteConfirm || !profile?.tenantId) return

    try {
      const memberRef = doc(db, `tenants/${profile.tenantId}/teamMembers`, showDeleteConfirm.id)
      await deleteDoc(memberRef)
      
      setTeamMembers(prev => prev.filter(m => m.id !== showDeleteConfirm.id))
      addToast(`Team member ${showDeleteConfirm.name} has been removed successfully`, 'success')
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting team member:', error)
      addToast('Failed to remove team member. Please try again.', 'error')
    }
  }

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setEditFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || ''
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
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
          Pending
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

  // Access denied screen
  if (!hasTeamManagementAccess()) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
            <p className="text-slate-600 mt-2">Manage your team members and permissions</p>
          </div>
        </div>
        
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-700 mb-4">
              You don't have permission to access team management. This feature is only available to owners and managers.
            </p>
            <p className="text-sm text-red-600 mb-4">
              Your current role: <span className="font-medium">{profile?.role || 'Unknown'}</span>
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
            <p className="text-slate-600 mt-2">Manage your team members and permissions</p>
          </div>
        </div>
        
        <div className="p-8">
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
              <p className="text-slate-600 mt-2">Manage your team members and permissions</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Team Member
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
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

        {/* Team Members Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          </div>
          
          {teamMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No team members yet</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first team member.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Team Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                          {member.phone && (
                            <div className="text-sm text-gray-500">{member.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_CONFIG[member.role].color}`}>
                          <span className="mr-1">{ROLE_CONFIG[member.role].icon}</span>
                          {ROLE_CONFIG[member.role].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(member.joinDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditMember(member)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(member)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(ROLE_CONFIG).map(([roleId, config]) => (
              <div key={roleId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{config.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{config.label}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Permissions</h4>
                  <div className="space-y-1">
                    {config.permissions.map((permission, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {permission}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={addFormData.role}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, role: e.target.value as StaffRole }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ROLE_CONFIG).map(([roleId, config]) => (
                    <option key={roleId} value={roleId}>
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
                  onChange={(e) => setAddFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddFormData({ name: '', email: '', role: 'staff', phone: '' })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Team Member</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as StaffRole }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ROLE_CONFIG).map(([roleId, config]) => (
                    <option key={roleId} value={roleId}>
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
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingMember(null)
                  setEditFormData({ name: '', email: '', role: 'staff', phone: '' })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">
                Are you sure you want to remove <strong>{showDeleteConfirm.name}</strong> from your team? 
                This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
