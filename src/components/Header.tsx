'use client'

import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { useShift } from '../lib/context/ShiftContext'
import { useShiftReset } from '../lib/hooks/useShiftReset'
import { useHelp } from '../lib/context/HelpContext'
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
  const { performReset, isResetting } = useShiftReset()
  const { showHelp } = useHelp()

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
    if (!confirm('Are you sure you want to end the current shift?')) {
      return
    }

    try {
      // End the shift first through ShiftContext
      await endCurrentShift('Ended from header')
      
      // Then perform enterprise-grade data reset
      await performReset({
        resetReason: 'shift_end',
        shiftId: currentShift?.id,
        shiftName: currentShift?.name
      })
      
      // FIREBASE NUCLEAR SOLUTION: Clear Firebase listeners and force re-sync
      console.log('🚀 FIREBASE NUCLEAR SOLUTION: Clearing Firebase data and forcing complete re-sync...');
      alert('✅ Shift ended successfully! Clearing all Firebase data and refreshing...');
      
      // Force immediate Firebase data clear and re-sync
      setTimeout(() => {
        console.log('💥 FIREBASE NUCLEAR: Forcing complete Firebase re-sync!');
        
        // Broadcast a custom event to force all components to reset their Firebase listeners
        window.dispatchEvent(new CustomEvent('forceFirebaseReset', { 
          detail: { 
            timestamp: Date.now(),
            reason: 'shift_end_nuclear_reset' 
          } 
        }));
        
        // Force complete page reload to ensure clean Firebase state
        window.location.reload();
      }, 1000);
      
      console.log('✅ Shift ended successfully')
    } catch (error) {
      console.error('Failed to end shift:', error)
      alert('Failed to end shift. Please try again.')
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

                {/* Start Shift Button - Ultra Modern Design */}
                {!isShiftActive && (
                  <button 
                    onClick={handleStartShift}
                    disabled={loading}
                    className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-lg hover:shadow-xl active:scale-[0.97] hover:-translate-y-0.5"
                    title="Start Your Work Session"
                  >
                    {/* Beautiful gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Animated icon */}
                    <div className="relative">
                      {loading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Text with subtle animation */}
                    <span className="relative hidden md:inline-block">
                      <span className={`transition-all duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                        {loading ? 'Starting Session...' : 'Start Shift'}
                      </span>
                    </span>
                    
                    {/* Subtle shine effect */}
                    <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                  </button>
                )}

                {/* End Shift Button - Ultra Modern Design (matching Start Shift) */}
                {isShiftActive && (currentShift?.createdBy === user?.uid || currentRole === 'cashier') && (
                  <button 
                    onClick={handleEndShift}
                    disabled={loading || isResetting}
                    className="group relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-700 hover:via-red-800 hover:to-rose-800 text-white disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-lg hover:shadow-xl active:scale-[0.97] hover:-translate-y-0.5"
                    title="End Your Work Session"
                  >
                    {/* Beautiful gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Animated icon */}
                    <div className="relative">
                      {loading || isResetting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 12l12.728 6.364" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Text with subtle animation */}
                    <span className="relative hidden md:inline-block">
                      <span className={`transition-all duration-300 ${loading || isResetting ? 'opacity-60' : 'opacity-100'}`}>
                        {loading || isResetting ? 'Ending Session...' : 'End Shift'}
                      </span>
                    </span>
                    
                    {/* Subtle shine effect */}
                    <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
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
