'use client'

import React from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { Branch } from '../../lib/context/BranchContext'

interface VisionHeaderProps {
  selectedBranch: Branch
  branches: Branch[]
  lastRefresh: Date
  onRefresh: () => void
  loading: boolean
}

export default function VisionHeader({ 
  selectedBranch, 
  branches, 
  lastRefresh, 
  onRefresh, 
  loading 
}: VisionHeaderProps) {
  const { switchBranch } = useBranch()
  const { user, profile, signOut } = useAuth()
  const [showBranchSelector, setShowBranchSelector] = React.useState(false)
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [switchingBranch, setSwitchingBranch] = React.useState(false)

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.branch-selector') && !target.closest('.user-menu')) {
        setShowBranchSelector(false)
        setShowUserMenu(false)
      }
    }

    if (showBranchSelector || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showBranchSelector, showUserMenu])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleBranchSwitch = async (branchId: string) => {
    // Don't switch if it's the same branch
    if (branchId === selectedBranch.id) {
      setShowBranchSelector(false)
      return
    }

    // Prevent multiple concurrent switches
    if (switchingBranch) {
      return
    }

    try {
      setSwitchingBranch(true)
      // Close the dropdown first
      setShowBranchSelector(false)
      
      console.log('Switching from branch:', selectedBranch.id, 'to:', branchId)
      
      // Perform the branch switch
      await switchBranch(branchId)
      
      console.log('Branch switch completed, performing full refresh...')
      
      // Force a full page refresh to ensure all components and data are updated
      window.location.reload()
    } catch (error) {
      console.error('Error switching branch:', error)
      setSwitchingBranch(false)
      // Show error to user
      alert('Failed to switch branch. Please try again.')
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out of CoreTrack Vision?')) {
      try {
        await signOut()
        // Redirect to main CoreTrack or login page
        window.location.href = '/'
      } catch (error) {
        console.error('Error signing out:', error)
        alert('Failed to sign out. Please try again.')
      }
    }
  }

  const handleBackToMain = () => {
    if (confirm('Return to main CoreTrack dashboard?')) {
      window.location.href = '/'
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-md mx-auto px-6 py-4">
        
        {/* Enterprise Header - Minimalist Design */}
        <div className="flex items-center justify-between mb-6">
          {/* Left: Navigation & Branding */}
          <div className="flex items-center">
            <div className="flex flex-col">
              {/* CoreTrack Vision Branding */}
              <div className="flex items-center space-x-3">
                {/* Minimalist Line Graph Logo */}
                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.94" />
                  </svg>
                </div>
                <div className="flex items-baseline">
                  <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                    CoreTrack
                  </h1>
                  <span className="text-xl font-semibold text-blue-600 tracking-tight ml-1">
                    Vision
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: User Profile */}
          <div className="relative user-menu">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </button>

            {/* Enterprise User Menu */}
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-semibold text-white">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{user?.email}</div>
                      <div className="text-xs text-gray-500 capitalize">{profile?.role}</div>
                    </div>
                  </div>
                  
                  {/* Menu Actions */}
                  <div className="pt-3 space-y-1">
                    <button
                      onClick={handleBackToMain}
                      className="w-full flex items-center space-x-3 p-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5V3a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Main Dashboard</div>
                        <div className="text-xs text-gray-500">Return to CoreTrack</div>
                      </div>
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 p-2.5 text-left hover:bg-red-50 rounded-lg transition-colors group"
                    >
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-900">Sign Out</div>
                        <div className="text-xs text-red-500">Exit Vision</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enterprise Branch Selector */}
        <div className="mb-6">
          <div className="relative branch-selector">
            <button
              onClick={() => !switchingBranch && setShowBranchSelector(!showBranchSelector)}
              disabled={switchingBranch}
              className={`w-full flex items-center justify-between p-4 bg-gray-50/80 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 ${
                switchingBranch ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  {switchingBranch ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <span className="text-lg">🏢</span>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900">
                    {switchingBranch ? 'Switching...' : selectedBranch.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {switchingBranch ? 'Please wait' : (selectedBranch.isMain ? 'Main Location' : 'Branch Location')}
                  </div>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Enterprise Branch Dropdown */}
            {showBranchSelector && !switchingBranch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2">SELECT LOCATION</div>
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchSwitch(branch.id)}
                      disabled={switchingBranch}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedBranch.id === branch.id ? 'bg-blue-50 border border-blue-100' : ''
                      }`}
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">🏢</span>
                      </div>
                      <div className="text-left flex-1">
                        <div className={`text-sm font-medium ${
                          selectedBranch.id === branch.id ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {branch.name}
                        </div>
                        <div className={`text-xs ${
                          selectedBranch.id === branch.id ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {branch.isMain ? 'Main Location' : 'Branch Location'}
                        </div>
                      </div>
                      {selectedBranch.id === branch.id && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar - Minimal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Updated {formatTime(lastRefresh)}</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  )
}
