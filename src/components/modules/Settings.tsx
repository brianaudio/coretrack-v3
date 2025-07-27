'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

export default function Settings() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  return (
    <div className="flex h-full bg-surface-50">
      <div className="w-full p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-surface-900 mb-2">Settings Module</h2>
          <p className="text-surface-600 mb-6">
            This module is now fully implemented in the Settings page.
          </p>
          <p className="text-sm text-surface-500">
            Navigate to the Settings tab in the main navigation to access all configuration options.
          </p>
        </div>
      </div>
    </div>
  )
}