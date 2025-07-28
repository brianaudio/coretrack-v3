'use client'

import { useAuth } from '../lib/context/AuthContext'
import { useBranch } from '../lib/context/BranchContext'
import { useEffect, useState } from 'react'
import { debugTrace, debugStep, debugError, debugSuccess } from '../lib/utils/debugHelper'

export default function DiagnosticsPanel() {
  const { user, profile, loading: authLoading } = useAuth()
  const { selectedBranch, branches, loading: branchLoading } = useBranch()
  const [diagnostics, setDiagnostics] = useState<any>({})

  useEffect(() => {
    debugTrace('Diagnostics Panel', {
      authLoading,
      branchLoading,
      hasUser: !!user,
      hasProfile: !!profile,
      hasSelectedBranch: !!selectedBranch,
      branchCount: branches.length
    }, { component: 'Diagnostics' })

    const diag = {
      timestamp: new Date().toISOString(),
      authentication: {
        loading: authLoading,
        hasUser: !!user,
        userEmail: user?.email,
        hasProfile: !!profile,
        tenantId: profile?.tenantId,
        userRole: profile?.role
      },
      branches: {
        loading: branchLoading,
        count: branches.length,
        hasSelected: !!selectedBranch,
        selectedBranchName: selectedBranch?.name,
        selectedBranchId: selectedBranch?.id,
        allBranches: branches.map(b => ({ id: b.id, name: b.name }))
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isDevelopment: process.env.NODE_ENV === 'development'
      }
    }

    setDiagnostics(diag)

    // Log critical missing pieces
    if (!user && !authLoading) {
      debugError('No user found and auth not loading', diag.authentication, { component: 'Diagnostics' })
    }
    if (!profile && user && !authLoading) {
      debugError('User exists but no profile found', diag.authentication, { component: 'Diagnostics' })
    }
    if (!selectedBranch && branches.length > 0 && !branchLoading) {
      debugStep('Branches exist but none selected yet', { 
        branchCount: branches.length,
        branchNames: branches.map(b => b.name),
        hasSelectedBranch: !!selectedBranch 
      }, { component: 'Diagnostics', level: 'warn' })
    }
    if (branches.length === 0 && !branchLoading && profile) {
      debugError('No branches found for user', diag.branches, { component: 'Diagnostics' })
    }

  }, [user, profile, authLoading, selectedBranch, branches, branchLoading])

  if (authLoading || branchLoading) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-4 z-50 max-w-md">
        <h3 className="font-bold text-yellow-800 mb-2">🔄 Loading State</h3>
        <div className="text-sm text-yellow-700">
          <div>Auth Loading: {authLoading ? '⏳' : '✅'}</div>
          <div>Branch Loading: {branchLoading ? '⏳' : '✅'}</div>
        </div>
      </div>
    )
  }

  const hasIssues = !user || !profile || !selectedBranch || branches.length === 0

  return (
    <div className={`fixed top-4 right-4 rounded-lg p-4 z-50 max-w-md border ${
      hasIssues ? 'bg-red-100 border-red-400' : 'bg-green-100 border-green-400'
    }`}>
      <h3 className={`font-bold mb-2 ${hasIssues ? 'text-red-800' : 'text-green-800'}`}>
        {hasIssues ? '❌ Issues Found' : '✅ All Systems OK'}
      </h3>
      
      <div className="text-sm space-y-2">
        <div className="space-y-1">
          <div className={user ? 'text-green-700' : 'text-red-700'}>
            🔐 User: {user ? '✅ Logged in' : '❌ Not logged in'}
          </div>
          {user && (
            <div className="text-xs text-gray-600 ml-4">
              Email: {user.email}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className={profile ? 'text-green-700' : 'text-red-700'}>
            👤 Profile: {profile ? '✅ Loaded' : '❌ Missing'}
          </div>
          {profile && (
            <div className="text-xs text-gray-600 ml-4">
              Tenant: {profile.tenantId}<br/>
              Role: {profile.role}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className={branches.length > 0 ? 'text-green-700' : 'text-red-700'}>
            🏢 Branches: {branches.length > 0 ? `✅ ${branches.length} found` : '❌ None found'}
          </div>
          {branches.length > 0 && (
            <div className="text-xs text-gray-600 ml-4">
              {branches.map(b => b.name).join(', ')}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className={selectedBranch ? 'text-green-700' : 'text-red-700'}>
            🎯 Selected: {selectedBranch ? `✅ ${selectedBranch.name}` : '❌ None selected'}
          </div>
        </div>

        {hasIssues && (
          <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-800">
            <strong>🔧 Fix Steps:</strong><br/>
            {!user && '1. Sign in to your account<br/>'}
            {user && !profile && '2. Check user profile creation<br/>'}
            {profile && branches.length === 0 && '3. Create or assign branches<br/>'}
            {branches.length > 0 && !selectedBranch && '4. Select a branch<br/>'}
          </div>
        )}
      </div>
    </div>
  )
}
