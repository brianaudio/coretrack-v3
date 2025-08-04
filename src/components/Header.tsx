'use client'

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
    } catch (error) {
      console.error('Failed to end shift with reset:', error)
    }
  }

  const handleEndShiftAndLogout = async () => {
    const action = isShiftActive ? 'end your shift and sign out' : 'sign out';
    if (confirm(`Are you sure you want to ${action}?`)) {
      try {
        // If shift is active, end it first
        if (isShiftActive) {
          await performReset({
            resetReason: 'shift_end',
            shiftId: currentShift?.id,
            shiftName: currentShift?.name
          });
        }
        
        // Then sign out
        if (onLogout) {
          onLogout()
        } else {
          // In production, use Firebase signOut
          await signOut()
        }
      } catch (error) {
        console.error('End shift and logout error:', error)
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
                {/* Combined End Shift & Sign Out Button */}
                <button 
                  onClick={handleEndShiftAndLogout}
                  disabled={loading || isResetting}
                  className={`${isShiftActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'text-surface-500 hover:text-red-600 hover:bg-red-50'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5`}
                  title={isShiftActive ? "End Shift & Sign Out" : "Sign Out"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isShiftActive ? (
                      // End shift icon
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l6 6m0-6l-6 6" />
                      </>
                    ) : (
                      // Sign out icon
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    )}
                  </svg>
                  <span className="hidden md:inline">
                    {loading || isResetting ? 'Ending...' : (isShiftActive ? 'End Shift' : 'Sign Out')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
