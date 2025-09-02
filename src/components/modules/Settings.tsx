'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { VERSION, VERSION_NAME, RELEASE_DATE, getFullVersionString } from '../../lib/version'

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
          <p className="text-sm text-surface-500 mb-8">
            Navigate to the Settings tab in the main navigation to access all configuration options.
          </p>
          
          {/* System Information Card */}
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg border border-surface-200">
            <div className="text-center">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-lg font-semibold text-surface-900 mb-4">System Information</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-surface-100">
                  <span className="text-surface-600">Version</span>
                  <span className="font-mono font-medium text-surface-900">{getFullVersionString()}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-surface-100">
                  <span className="text-surface-600">Release</span>
                  <span className="text-surface-900">{VERSION_NAME}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-surface-100">
                  <span className="text-surface-600">Release Date</span>
                  <span className="text-surface-900">{RELEASE_DATE}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-surface-600">Environment</span>
                  <span className="text-surface-900 capitalize">{process.env.NODE_ENV || 'development'}</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-surface-100">
                <div className="text-xs text-surface-500">
                  CoreTrack Business Management System
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}