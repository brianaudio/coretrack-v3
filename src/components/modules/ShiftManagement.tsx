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
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h3>
          <p className="text-red-700 mb-4">
            You don&apos;t have permission to access shift management. This feature is only available to owners and managers.
          </p>
          <div className="mt-6">
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

  if (loading || authLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
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
          <h2 className="text-3xl font-bold text-gray-900">Shift Management</h2>
          <p className="text-gray-600 text-lg">Professional shift operations and team accountability</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-primary-50 rounded-lg px-6 py-3 border border-primary-200">
            <div className="text-sm font-medium text-primary-700">Team Size</div>
            <div className="text-2xl font-bold text-primary-900">{teamMembers.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg px-6 py-3 border border-green-200">
            <div className="text-sm font-medium text-green-700">Active</div>
            <div className="text-2xl font-bold text-green-900">{teamMembers.filter(m => m.status === 'active').length}</div>
          </div>
        </div>
      </div>

      {/* Professional Shift Overview Cards - Enhanced Visibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Active Shifts Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-2xl p-12 text-white transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-lg font-bold uppercase tracking-wide">Active Shifts</p>
              <p className="text-5xl font-black mt-4">0</p>
              <p className="text-green-200 text-base mt-4 font-semibold">Currently running</p>
            </div>
            <div className="bg-white/25 rounded-full p-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-6 -right-6 opacity-15">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Team Members Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-2xl p-12 text-white transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-lg font-bold uppercase tracking-wide">Team Members</p>
              <p className="text-5xl font-black mt-4">{teamMembers.length}</p>
              <p className="text-primary-200 text-base mt-4 font-semibold">Available staff</p>
            </div>
            <div className="bg-white/25 rounded-full p-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-6 -right-6 opacity-15">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
        </div>

        {/* Productivity Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-2xl p-12 text-white transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-lg font-bold uppercase tracking-wide">Productivity</p>
              <p className="text-5xl font-black mt-4">98%</p>
              <p className="text-purple-200 text-base mt-4 font-semibold">Team efficiency</p>
            </div>
            <div className="bg-white/25 rounded-full p-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-6 -right-6 opacity-15">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Shift Operations - Full Width Hero Style */}
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Shift Close-Out - Prominent Design */}
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-8 py-6 border-b border-surface-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-2xl font-bold text-surface-900 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-4 animate-pulse"></span>
                  Shift Close-Out
                </h4>
                <p className="text-base text-surface-700 mt-2 font-semibold">End current shift and archive daily data safely</p>
              </div>
              <div className="text-6xl animate-bounce">🔄</div>
            </div>
          </div>
          <div className="p-8">
            <ShiftResetManager />
          </div>
        </div>

        {/* Daily Automation - Enhanced */}
        <div className="bg-white rounded-2xl border-2 border-green-300 shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
          <div className="bg-gradient-to-r from-green-50 to-green-100 px-8 py-6 border-b border-surface-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-2xl font-bold text-surface-900 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-4 animate-pulse"></span>
                  Daily Automation
                </h4>
                <p className="text-base text-surface-700 mt-2 font-semibold">Automatic daily close-out schedule management</p>
              </div>
              <div className="text-6xl animate-pulse">⏰</div>
            </div>
          </div>
          <div className="p-8">
            <HybridResetManager />
          </div>
        </div>
      </div>

      {/* Professional Information Panel */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-8">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <div className="bg-primary-500 rounded-full p-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-primary-900 mb-4">Enterprise Shift Management Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-primary-800">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span><strong>Data Archival:</strong> Safe backup of all shift data</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span><strong>Auto Reset:</strong> Scheduled daily operations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span><strong>Team Analytics:</strong> Performance tracking</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span><strong>Role Management:</strong> Access control</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span><strong>Real-time Updates:</strong> Live dashboard</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span><strong>Comprehensive Reports:</strong> Detailed insights</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-primary-300">
              <div className="text-center">
                <span className="text-sm font-medium text-primary-700">
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
