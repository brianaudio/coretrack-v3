'use client'

import { useEffect, useState } from 'react'
import { isNetworkOnline, onNetworkStatusChange, onSyncStatusChange } from '@/lib/firebase'

interface OfflineStatusProps {
  className?: string
}

export default function OfflineStatusIndicator({ className = '' }: OfflineStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showOnlineConfirmation, setShowOnlineConfirmation] = useState(false)
  const [syncTimeout, setSyncTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize online status
    const initialOnlineStatus = isNetworkOnline()
    setIsOnline(initialOnlineStatus)
    
    // Reset dismissed state when going offline
    if (!initialOnlineStatus) {
      setIsDismissed(false)
    }

    // Set up network status listener
    const unsubscribeNetwork = onNetworkStatusChange((online: boolean) => {
      const wasOnline = isOnline
      setIsOnline(online)
      
      // Reset dismissed state when going offline
      if (!online) {
        setIsDismissed(false)
      }
      
      // Show brief online confirmation when coming back online
      if (!wasOnline && online) {
        setShowOnlineConfirmation(true)
        setTimeout(() => setShowOnlineConfirmation(false), 3000) // Show for 3 seconds
      }
    })

    // Set up sync status listener with debouncing to prevent constant blinking
    const unsubscribeSync = onSyncStatusChange((syncInfo: { timestamp: number; isOnline: boolean }) => {
      // Clear any existing timeout
      if (syncTimeout) {
        clearTimeout(syncTimeout)
      }
      
      // REMOVED SYNC INDICATOR: Just update timestamp without showing sync state
      setLastSyncTime(syncInfo.timestamp)
    })

    // Cleanup listeners and timeouts
    return () => {
      unsubscribeNetwork()
      unsubscribeSync()
      if (syncTimeout) {
        clearTimeout(syncTimeout)
      }
    }
  }, [])

  // Auto-hide online confirmation after showing briefly
  useEffect(() => {
    if (showOnlineConfirmation) {
      const timer = setTimeout(() => setShowOnlineConfirmation(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showOnlineConfirmation])

  // Don't show if dismissed and offline, or if online and not showing confirmation
  // REMOVED SYNC NOTIFICATION: Hide syncing state to prevent annoying notifications
  if ((isDismissed && !isOnline) || (isOnline && !showOnlineConfirmation)) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ${
        isOnline 
          ? showOnlineConfirmation
            ? 'bg-green-500 text-white'
            : 'bg-green-500 text-white'
          : 'bg-orange-500 text-white'
      }`}>
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {isOnline ? (
            showOnlineConfirmation ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-3 h-3 bg-white rounded-full" />
            )
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Status Text and Time */}
        <div className="flex-1 min-w-0">
          <div className="font-medium">
            {isOnline ? (
              showOnlineConfirmation ? (
                'Back Online'
              ) : (
                'Online'
              )
            ) : (
              'Offline Mode'
            )}
          </div>
          {!isOnline && lastSyncTime && (
            <div className="text-xs opacity-90 mt-1">
              Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Dismiss Button - only show when offline */}
        {!isOnline && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss offline notification"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
