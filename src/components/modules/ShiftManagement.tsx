'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import ShiftResetManager from './ShiftResetManager'
import HybridResetManager from './HybridResetManager'

// Platform administration - crucial for SaaS scalability
const PLATFORM_ADMINS = [
  'brian@coretrack.com',
  'support@coretrack.com',
  'admin@coretrack.com',
  'brianbasa@gmail.com'
]

const isPlatformAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false
  return PLATFORM_ADMINS.includes(email.toLowerCase())
}

interface LocalTeamMember {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  joinDate: string
}

export default function ShiftManagement() {
  const { profile, loading: authLoading } = useAuth()
  const { selectedBranch } = useBranch()
  
  // Platform administration detection
  const isCurrentUserPlatformAdmin = isPlatformAdmin(profile?.email)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [availableTenants, setAvailableTenants] = useState<Array<{id: string, name: string}>>([])
  
  const [teamMembers, setTeamMembers] = useState<LocalTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  // Load basic team data for shift display purposes
  useEffect(() => {
    const loadTeamData = async () => {
      setAccessDenied(false)

      let targetTenantId: string
      if (isCurrentUserPlatformAdmin && selectedTenantId) {
        targetTenantId = selectedTenantId
      } else if (!isCurrentUserPlatformAdmin && profile?.tenantId) {
        targetTenantId = profile.tenantId
      } else {
        setLoading(false)
        return
      }

      try {
        const membersRef = collection(db, `tenants/${targetTenantId}/teamMembers`)
        const membersSnapshot = await getDocs(membersRef)
        const loadedMembers = membersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LocalTeamMember[]

        setTeamMembers(loadedMembers)
      } catch (error) {
        console.error('Error loading team data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTeamData()
  }, [profile?.tenantId, selectedTenantId, isCurrentUserPlatformAdmin, authLoading])

  // Load available tenants for platform admin
  useEffect(() => {
    const loadAvailableTenants = async () => {
      if (!isCurrentUserPlatformAdmin || authLoading) return

      try {
        const tenantsRef = collection(db, 'tenants')
        const tenantsSnapshot = await getDocs(tenantsRef)
        const tenants = tenantsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || `Tenant ${doc.id.slice(-6)}`
        }))
        setAvailableTenants(tenants)
      } catch (error) {
        console.error('Error loading tenants:', error)
      }
    }

    loadAvailableTenants()
  }, [isCurrentUserPlatformAdmin, selectedTenantId, profile?.tenantId, authLoading])

  // Show access denied message for insufficient permissions
  if (accessDenied) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-surface-900 mb-3">Access Denied</h3>
          <p className="text-surface-600 mb-6 max-w-md mx-auto">
            You don&apos;t have permission to access shift management. This feature is only available to owners and managers.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-surface-900 text-white px-6 py-3 rounded-xl hover:bg-surface-800 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-200 rounded-xl w-64 mb-3"></div>
            <div className="h-5 bg-surface-200 rounded-lg w-96 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface-100 rounded-2xl p-6">
                  <div className="h-4 bg-surface-200 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-surface-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-surface-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Platform Admin Selector */}
      {isCurrentUserPlatformAdmin && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.5.5a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-purple-900">Platform Administrator</h3>
                <p className="text-sm text-purple-600">Access to all tenant data for support purposes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/admin"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Admin Dashboard
              </a>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="px-4 py-2.5 border border-purple-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
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
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-surface-900">Shift Management</h2>
          <p className="text-surface-600 text-lg">Professional shift operations and team accountability</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white rounded-2xl px-6 py-4 border border-surface-200 shadow-sm">
            <div className="text-sm font-medium text-surface-600">Team Size</div>
            <div className="text-2xl font-bold text-surface-900">{teamMembers.length}</div>
          </div>
          <div className="bg-white rounded-2xl px-6 py-4 border border-surface-200 shadow-sm">
            <div className="text-sm font-medium text-surface-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{teamMembers.filter(m => m.status === 'active').length}</div>
          </div>
        </div>
      </div>

      
      {/* Minimalistic Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Shifts Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-surface-600 font-medium">Active Shifts</span>
              </div>
              <div className="text-3xl font-bold text-surface-900">0</div>
              <div className="text-sm text-surface-500 mt-1">Currently running</div>
            </div>
          </div>
        </div>

        {/* Team Members Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <span className="text-surface-600 font-medium">Team Members</span>
              </div>
              <div className="text-3xl font-bold text-surface-900">{teamMembers.length}</div>
              <div className="text-sm text-surface-500 mt-1">Available staff</div>
            </div>
          </div>
        </div>

        {/* Productivity Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-surface-600 font-medium">Productivity</span>
              </div>
              <div className="text-3xl font-bold text-surface-900">98%</div>
              <div className="text-sm text-surface-500 mt-1">Team efficiency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Operations - Clean & Minimalistic */}
      <div className="space-y-6">
        {/* Shift Close-Out */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="bg-surface-50 px-6 py-4 border-b border-surface-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-surface-900">Shift Close-Out</h4>
                  <p className="text-sm text-surface-600">End current shift and archive daily data safely</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-surface-500 font-medium">Active</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <ShiftResetManager />
          </div>
        </div>

        {/* Daily Automation */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="bg-surface-50 px-6 py-4 border-b border-surface-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-surface-900">Daily Automation</h4>
                  <p className="text-sm text-surface-600">Automatic daily close-out schedule management</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-surface-500 font-medium">Scheduled</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <HybridResetManager />
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-surface-900 mb-4">Enterprise Shift Management Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-surface-700">
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                <span><span className="font-medium">Data Archival:</span> Safe backup of all shift data</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                <span><span className="font-medium">Role Management:</span> Access control</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                <span><span className="font-medium">Auto Reset:</span> Scheduled daily operations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                <span><span className="font-medium">Real-time Updates:</span> Live dashboard</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                <span><span className="font-medium">Team Analytics:</span> Performance tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                <span><span className="font-medium">Comprehensive Reports:</span> Detailed insights</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-surface-300">
              <div className="text-center">
                <span className="text-sm text-surface-600">
                  Professional shift management designed for restaurant and retail operations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
