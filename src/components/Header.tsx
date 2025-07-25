'use client'

import { useState, useEffect } from 'react'
import { ModuleType } from './Dashboard'
import { useAuth } from '../lib/context/AuthContext'
import { subscribeToNotifications } from '../lib/firebase/notifications'

interface HeaderProps {
  activeModule: ModuleType
  onSidebarToggle: () => void
}

const moduleNames = {
  'dashboard': 'Dashboard',
  'inventory': 'Inventory Center',
  'pos': 'Point of Sale',
  'purchase-orders': 'Purchase Orders',
  'analytics': 'Analytics',
  'expenses': 'Profit and Expenses',
  'menu-builder': 'Product Builder',
  'notifications': 'Notifications',
  'payment-monitoring': 'Payment Monitoring'
}

export default function Header({ activeModule, onSidebarToggle }: HeaderProps) {
  const { profile, tenant, signOut } = useAuth()
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
      await signOut()
    }
  }

  return (
    <header className="bg-white border-b border-surface-200 px-6 py-4">
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
            <h1 className="text-2xl font-bold text-surface-900">
              {moduleNames[activeModule]}
            </h1>
            <p className="text-sm text-surface-600">
              {tenant?.name || 'Your Business'} • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Real-time status indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-surface-600 hidden sm:block">Live</span>
          </div>

          {/* User profile and actions */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-surface-900">{profile?.displayName}</p>
              <p className="text-xs text-surface-600 capitalize">{profile?.role}</p>
            </div>

            <button 
              onClick={() => window.location.hash = '#notifications'}
              className="p-2 rounded-lg hover:bg-surface-100 transition-colors relative"
              title={`${unreadCount} unread notifications`}
            >
              <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v6.5" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
              title="Logout"
            >
              <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
