'use client'

import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { useShift } from '../lib/context/ShiftContext'
import { useShiftReset } from '../lib/hooks/useShiftReset'
import { handleLogoutWithShiftEnd } from '../lib/utils/logoutUtils'
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
    // Safety check: Determine if current user can safely end the shift
    const isShiftOwner = currentShift?.createdBy === user?.uid
    const isManagerOrOwner = currentRole === 'manager' || currentRole === 'owner'
    const isCashier = currentRole === 'cashier'
    
    // Determine the appropriate action
    let action: string
    let canEndShift = false
    
    if (!isShiftActive) {
      action = 'sign out'
      canEndShift = false
    } else if (isShiftOwner || isCashier) {
      // User owns the shift or is a cashier (typically owns shifts)
      action = 'end your shift and sign out'
      canEndShift = true
    } else if (isManagerOrOwner) {
      // Manager/Owner but someone else's shift is active
      action = `sign out (${currentShift?.createdBy || 'Unknown'} shift will continue)`
      canEndShift = false
    } else {
      // Default case
      action = 'sign out'
      canEndShift = false
    }
    
    if (confirm(`Are you sure you want to ${action}?`)) {
      try {
        // If user can end shift, try to end it with the enterprise reset system first
        if (isShiftActive && canEndShift) {
          try {
            await performReset({
              resetReason: 'shift_end',
              shiftId: currentShift?.id,
              shiftName: currentShift?.name
            });
            console.log('✅ Enterprise shift reset completed')
          } catch (resetError) {
            console.warn('⚠️ Enterprise reset failed, using standard logout:', resetError)
          }
        }
        
        // Always use enhanced logout for consistent behavior
        if (onLogout) {
          onLogout()
        } else {
          await handleLogoutWithShiftEnd()
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
                {/* Smart End Shift & Sign Out Button */}
                <button 
                  onClick={handleEndShiftAndLogout}
                  disabled={loading || isResetting}
                  className={`${
                    isShiftActive 
                      ? (currentShift?.createdBy === user?.uid || currentRole === 'cashier')
                        ? 'bg-red-600 hover:bg-red-700 text-white' // Can end shift
                        : 'bg-orange-500 hover:bg-orange-600 text-white' // Sign out only
                      : 'text-surface-500 hover:text-red-600 hover:bg-red-50' // Normal sign out
                  } disabled:bg-gray-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5`}
                  title={
                    isShiftActive
                      ? (currentShift?.createdBy === user?.uid || currentRole === 'cashier')
                        ? "End Shift & Sign Out"
                        : `Sign Out Only (${currentShift?.createdBy || 'Active'} shift continues)`
                      : "Sign Out"
                  }
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isShiftActive ? (
                      (currentShift?.createdBy === user?.uid || currentRole === 'cashier') ? (
                        // End shift icon - user can end shift
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l6 6m0-6l-6 6" />
                        </>
                      ) : (
                        // Sign out only icon - someone else's shift
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      )
                    ) : (
                      // Normal sign out icon
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    )}
                  </svg>
                  <span className="hidden md:inline">
                    {loading || isResetting ? 'Ending...' : 
                      isShiftActive
                        ? (currentShift?.createdBy === user?.uid || currentRole === 'cashier')
                          ? 'End Shift'
                          : 'Sign Out'
                        : 'Sign Out'
                    }
                  </span>
                </button>
                
                {/* Active Shift Indicator for Non-Owners */}
                {isShiftActive && currentShift?.createdBy !== user?.uid && currentRole !== 'cashier' && (
                  <div className="hidden lg:flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Active Shift
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
