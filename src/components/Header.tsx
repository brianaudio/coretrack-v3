'use client'

import { useState, useEffect } from 'react'
import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { useUser } from '../lib/rbac/UserContext'
import { subscribeToNotifications } from '../lib/firebase/notifications'
import BranchSelector from './BranchSelector'

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
  'expenses': 'Profit and Expenses',
  'menu-builder': 'Product Builder',
  'team-management': 'Team Management',
  'location-management': 'Location Management',
  'settings': 'Settings',
  'discrepancy-monitoring': 'Inventory Discrepancy'
}

export default function Header({ activeModule, onSidebarToggle, onLogout }: HeaderProps) {
  const { profile, tenant, signOut } = useAuth()
  const { currentUser, currentRole } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)

  // Subscribe to real-time notification count
  useEffect(() => {
    if (!profile?.tenantId) return

    const unsubscribe = subscribeToNotifications(
      profile.tenantId,
      (notifications) => {
        setUnreadCount(notifications.filter(n => !n.isRead).length)
      },
      { unreadOnly: true, limit: 50 }
    )

    return unsubscribe
  }, [profile?.tenantId])

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
    <header className="bg-white border-b border-surface-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onSidebarToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-surface-900">
              {moduleNames[activeModule]}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Real-time status indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-surface-600 hidden sm:block">Live</span>
          </div>

          {/* Enterprise Branch Selector */}
          <BranchSelector />

          {/* Notifications */}
          <button 
            onClick={() => window.location.hash = '#notifications'}
            className="p-2 rounded-lg hover:bg-surface-100 transition-colors relative"
            title={`${unreadCount} unread notifications`}
          >
            <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v6.5" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-surface-200 hidden sm:block"></div>

          {/* Enterprise User Section */}
          <div className="flex items-center space-x-3">
            {/* User Info */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-surface-900">
                {currentUser?.email?.split('@')[0] || profile?.displayName || 'User'}
              </p>
              <p className="text-xs text-surface-600 capitalize flex items-center justify-end">
                <span className={`w-2 h-2 rounded-full mr-1 ${
                  currentRole === 'owner' ? 'bg-purple-500' :
                  currentRole === 'manager' ? 'bg-green-500' : 'bg-blue-500'
                }`}></span>
                {currentRole || profile?.role}
              </p>
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 bg-surface-100 rounded-full flex items-center justify-center border border-surface-200">
              <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            {/* Sign Out Button */}
            <button 
              onClick={handleLogout}
              className="hidden sm:flex items-center space-x-1 text-surface-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>

            {/* Mobile Sign Out */}
            <button 
              onClick={handleLogout}
              className="sm:hidden p-2 rounded-lg hover:bg-red-50 text-surface-600 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
