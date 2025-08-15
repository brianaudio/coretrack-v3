'use client'

import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

export default function POS_Enhanced() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">POS System Under Maintenance</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          The Point of Sale system is temporarily unavailable while we perform system maintenance. 
          Please check back shortly.
        </p>
        <div className="bg-blue-50 rounded-lg p-4 max-w-sm mx-auto">
          <p className="text-sm text-blue-800">
            <strong>Branch:</strong> {selectedBranch?.name || 'No branch selected'}
          </p>
          <p className="text-sm text-blue-800">
            <strong>User:</strong> {profile?.displayName || 'Not logged in'}
          </p>
        </div>
      </div>
    </div>
  )
}
