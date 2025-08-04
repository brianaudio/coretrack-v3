'use client'

import { useState } from 'react'
import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { useShift } from '../lib/context/ShiftContext'
import { useShiftReset } from '../lib/hooks/useShiftReset'
import BranchSelector from './BranchSelector'
import NotificationCenter from './NotificationCenter'

interface HeaderProps {
  activeModule: ModuleType
  onSidebarToggle: () => void
  onLogout?: () => void
}

const moduleNames: Record<ModuleType, string> = {
  'dashboard': 'Dashboard',
  'inventory': 'Inventory Center',
  'pos': 'Point of Sale',
  'purchase-orders': 'Purchase Orders',
  'expenses': 'Expenses',
  'menu-builder': 'Menu Builder',
  'team-management': 'Team Management',
  'location-management': 'Location Management',
  'business-reports': 'Business Reports',
  'settings': 'Settings',
  'discrepancy-monitoring': 'Discrepancy Monitoring'
}

export default function Header({ activeModule, onSidebarToggle, onLogout }: HeaderProps) {
  const { profile, tenant, signOut, user } = useAuth()
  const { isShiftActive, currentShift, loading } = useShift()
  const { performReset, isResetting } = useShiftReset()

  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Get user info from AuthContext instead of UserContext
  const currentRole = profile?.role || null
  const currentUser = user && profile ? {
    uid: user.uid,
    email: user.email || profile.email || '',
    role: profile.role
  } : null

  const handleEndShift = async () => {
    try {
      // Perform enterprise-grade shift end with automatic data reset
      await performReset({
        resetReason: 'shift_end',
        shiftId: currentShift?.id,
        shiftName: currentShift?.name
      })
      setShowEndConfirm(false)
    } catch (error) {
      console.error('Failed to end shift with reset:', error)
    }
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        // In dev mode, just call the logout callback
        if (onLogout) {
          onLogout()
        } else {
          // In production, use Firebase signOut
          await signOut()
        }
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
  }

  return (
    <header className="bg-white border-b border-surface-200 shadow-sm">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Mobile Menu + Module Title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onSidebarToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-100 transition-colors"
            >
              <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-surface-900">
                {moduleNames[activeModule]}
              </h1>
            </div>
          </div>

          {/* Right Section - Enterprise Controls */}
          <div className="flex items-center space-x-4">
            {/* Branch Selector */}
            <BranchSelector />

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Profile Section */}
            <div className="flex items-center space-x-3 pl-4 border-l border-surface-200">
              {/* User Info */}
              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-sm font-medium text-surface-900">
                    {profile?.displayName || currentUser?.email?.split('@')[0] || profile?.email?.split('@')[0] || 'User'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      currentRole === 'owner' ? 'bg-purple-500' :
                      currentRole === 'manager' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></span>
                    <span className="text-xs text-surface-500 capitalize font-medium">
                      {currentRole || 'staff'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* End Shift Button (when shift is active) */}
                {isShiftActive && (
                  <button
                    onClick={() => setShowEndConfirm(true)}
                    disabled={loading || isResetting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l6 6m0-6l-6 6" />
                    </svg>
                    <span className="hidden md:inline">
                      {loading || isResetting ? 'Ending...' : 'End Shift'}
                    </span>
                  </button>
                )}

                {/* Sign Out Button */}
                <button 
                  onClick={handleLogout}
                  className="text-surface-500 hover:text-red-600 hover:bg-red-50 p-3 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End Shift Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">End Shift & Reset Data?</h3>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will end the current shift and automatically:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Archive all shift data (orders, expenses, transactions)
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Reset operational data for the next shift
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update inventory levels based on sales
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Generate complete audit trail
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEndShift}
                disabled={loading || isResetting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {loading || isResetting ? 'Ending & Resetting...' : 'End Shift & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
