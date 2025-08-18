'use client'

import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { useShift } from '../lib/context/ShiftContext'
import { useShiftReset } from '../lib/hooks/useShiftReset'
import { handleLogoutWithShiftEnd } from '../lib/utils/logoutUtils'
import BranchSelector from './BranchSelector'
import NotificationCenter from './NotificationCenter'

interface MinimalistHeaderProps {
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
  'capital-intelligence': 'Capital Intelligence',
  'team-management': 'Team Management',
  'location-management': 'Location Management',
  'business-reports': 'Business Reports',
  'settings': 'Settings',
  'discrepancy-monitoring': 'Discrepancy Monitoring'
}

export default function MinimalistHeader({ activeModule, onSidebarToggle, onLogout }: MinimalistHeaderProps) {
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
        shiftId: currentShift?.id
      })
    } catch (error) {
      console.error('Error ending shift:', error)
    }
  }

  const handleEndShiftAndLogout = async () => {
    try {
      if (isShiftActive && (currentShift?.createdBy === user?.uid || currentRole === 'cashier')) {
        // End shift first
        await handleEndShift()
      }
      
      // Then sign out using utility function
      await handleLogoutWithShiftEnd()
      
      // Call parent callback if provided
      if (onLogout) {
        onLogout()
      }
    } catch (error) {
      console.error('Error during logout with shift end:', error)
      // Fallback to regular sign out
      try {
        await signOut()
        if (onLogout) onLogout()
      } catch (signOutError) {
        console.error('Error during fallback sign out:', signOutError)
      }
    }
  }

  return (
    <header className="bg-white border-b border-surface-100 shadow-sm">
      <div className="h-16 px-6 flex items-center justify-between">
        
        {/* Left Section - Clean & Minimal */}
        <div className="flex items-center space-x-4">
          {/* Module Title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-semibold text-surface-800 tracking-tight">
              {moduleNames[activeModule]}
            </h1>
            {/* Subtle Active Indicator */}
            <div className="w-2 h-2 bg-primary-400 rounded-full opacity-60"></div>
          </div>
        </div>

        {/* Right Section - Essential Actions Only */}
        <div className="flex items-center space-x-3">
          
          {/* Branch Selector - Minimal */}
          <div className="hidden lg:block">
            <BranchSelector />
          </div>

          {/* Notification Center - Clean Icon */}
          <div className="hidden lg:block">
            <NotificationCenter />
          </div>

          {/* Shift Status & User Info - Streamlined */}
          <div className="flex items-center space-x-3 pl-3 border-l border-surface-200">
            
            {/* Active Shift Indicator */}
            {isShiftActive && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">
                  Shift Active
                </span>
              </div>
            )}

            {/* User Avatar & Info */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-surface-800">
                  {currentUser?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-surface-500 capitalize">
                  {currentRole}
                </div>
              </div>
            </div>

            {/* Start/End Shift Button - Prominent */}
            <button 
              onClick={handleEndShiftAndLogout}
              disabled={loading || isResetting}
              className={`${
                isShiftActive 
                  ? (currentShift?.createdBy === user?.uid || currentRole === 'cashier')
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm' // Can end shift
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm' // Sign out only
                  : 'text-surface-600 hover:text-red-600 hover:bg-red-50 border border-surface-200' // Normal sign out
              } disabled:bg-gray-300 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2`}
              title={
                isShiftActive
                  ? (currentShift?.createdBy === user?.uid || currentRole === 'cashier')
                    ? "End Shift & Sign Out"
                    : `Sign Out Only (${currentShift?.createdBy || 'Active'} shift continues)`
                  : "Sign Out"
              }
            >
              {/* Smart Icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isShiftActive ? (
                  (currentShift?.createdBy === user?.uid || currentRole === 'cashier') ? (
                    // End shift icon
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  ) : (
                    // Sign out only icon
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  )
                ) : (
                  // Normal sign out icon
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                )}
              </svg>
              
              <span>
                {loading || isResetting ? 'Ending...' : 
                  isShiftActive
                    ? (currentShift?.createdBy === user?.uid || currentRole === 'cashier')
                      ? 'End Shift'
                      : 'Sign Out'
                    : 'Sign Out'
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
