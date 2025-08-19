'use client'

import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { useShift } from '../lib/context/ShiftContext'
import { useShiftReset } from '../lib/hooks/useShiftReset'
import { useHelp } from '../lib/context/HelpContext'
import { handleLogoutWithShiftEnd } from '../lib/utils/logoutUtils'
import BranchSelector from './BranchSelector'
import NotificationCenter from './NotificationCenter'
import PWAInstallButton from './ui/PWAInstallButton'

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
  'capital-intelligence': 'Capital Intelligence',
  'team-management': 'Team Management',
  'location-management': 'Location Management',
  'business-reports': 'Business Reports',
  'settings': 'Settings',
  'discrepancy-monitoring': 'Discrepancy Monitoring'
}

export default function Header({ activeModule, onSidebarToggle, onLogout }: HeaderProps) {
  const { profile, tenant, signOut, user } = useAuth()
  const { isShiftActive, currentShift, loading, startNewShift, endCurrentShift } = useShift()
  const { showHelp } = useHelp()
  const { performReset, isResetting } = useShiftReset()

  // Get user info from AuthContext instead of UserContext
  const currentRole = profile?.role || null
  const currentUser = user && profile ? {
    uid: user.uid,
    email: user.email || profile.email || '',
    role: profile.role
  } : null

  const handleStartShift = async () => {
    try {
      // Modern shift start without prompt - just start with current date
      const today = new Date();
      const shiftName = `${today.toLocaleDateString()} Shift`;
      await startNewShift(shiftName)
    } catch (error) {
      console.error('Failed to start shift:', error)
      // More elegant error handling
      const errorMessage = error instanceof Error ? error.message : 'Failed to start shift. Please try again.';
      alert(errorMessage);
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        if (onLogout) {
          onLogout()
        } else {
          await signOut()
        }
      } catch (error) {
        console.error('Sign out error:', error)
      }
    }
  }

  const handleEndShift = async () => {
    if (!confirm('Are you sure you want to end the current shift? This will reset all data for the next shift.')) {
      return
    }

    try {
      // Just end the shift - the endCurrentShift function should handle the data reset
      await endCurrentShift('Shift ended from header')
      
      // Show success message
      alert('✅ Shift ended successfully! Data has been reset for the next shift.')
      
      // Refresh page to ensure clean state
      window.location.reload()
      
    } catch (error) {
      console.error('Failed to end shift:', error)
      alert('❌ Failed to end shift. Please try again.')
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
    <header className="relative bg-white/95 backdrop-blur-xl border-b border-gray-200/30 shadow-[0_1px_8px_-1px_rgba(0,0,0,0.08)]">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 via-white/50 to-purple-50/20 pointer-events-none"></div>
      
      <div className="relative px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left Section - Modern Module Title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onSidebarToggle}
              className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100/80 active:bg-gray-200/80 transition-all duration-200 group"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                <div className="flex flex-col">
                  <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                    {moduleNames[activeModule]}
                  </h1>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Minimalist Controls */}
          <div className="flex items-center space-x-4">
            {/* Branch Selector - Modern Styling */}
            <div className="flex items-center">
              <BranchSelector />
            </div>

            {/* Notification Center - Cleaner */}
            <div className="flex items-center">
              <NotificationCenter />
            </div>

            {/* PWA Install Button */}
            <div className="flex items-center">
              <PWAInstallButton />
            </div>

            {/* Modern User Profile Section */}
            <div className="flex items-center space-x-4 pl-4 ml-2 border-l border-gray-200/50">
              {/* Elegant User Info */}
              <div className="hidden sm:flex flex-col items-end text-right">
                <div className="flex items-center justify-end space-x-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    currentRole === 'owner' ? 'bg-purple-500' :
                    currentRole === 'manager' ? 'bg-emerald-500' : 'bg-blue-500'
                  } shadow-sm`}></div>
                  <span className="text-xs text-gray-500 capitalize font-medium">
                    {currentRole || 'staff'}
                  </span>
                </div>
              </div>

              {/* Modern Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* Help Button - Minimalist */}
                <button 
                  onClick={() => {
                    console.log('Help button clicked, activeModule:', activeModule)
                    showHelp(activeModule)
                  }}
                  className="group relative p-2 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-all duration-200"
                  title="Help & Tutorials"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Start Shift Button - Ultra Minimalist & Sleek */}
                {!isShiftActive && (
                  <button 
                    onClick={handleStartShift}
                    disabled={loading}
                    className="group bg-white/80 backdrop-blur-sm border border-emerald-200/50 hover:border-emerald-300 text-emerald-700 hover:text-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 hover:bg-white/90"
                    title="Start Work Session"
                  >
                    {loading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth={2} className="opacity-25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"/>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">
                      {loading ? 'Starting...' : 'Start'}
                    </span>
                  </button>
                )}

                {/* End Shift Button - Ultra Minimalist & Sleek */}
                {isShiftActive && (currentShift?.createdBy === user?.uid || currentRole === 'cashier') && (
                  <button 
                    onClick={handleEndShift}
                    disabled={loading || isResetting}
                    className="group bg-white/80 backdrop-blur-sm border border-rose-200/50 hover:border-rose-300 text-rose-700 hover:text-rose-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 hover:bg-white/90"
                    title="End Work Session"
                  >
                    {loading || isResetting ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth={2} className="opacity-25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"/>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">
                      {loading || isResetting ? 'Ending...' : 'End'}
                    </span>
                  </button>
                )}

                {/* Sign Out Button - Ultra Minimalist */}
                <button 
                  onClick={handleSignOut}
                  disabled={loading}
                  className="group relative p-2 rounded-xl hover:bg-red-50 active:bg-red-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-red-600 disabled:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
                
                {/* Active Shift Indicator - Elegant Badge */}
                {isShiftActive && currentShift?.createdBy !== user?.uid && currentRole !== 'cashier' && (
                  <div className="hidden lg:flex items-center text-xs text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 px-3 py-1.5 rounded-full shadow-sm">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 animate-pulse"></div>
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
