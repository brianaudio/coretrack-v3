'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { getRealTimeMenuCostSync } from '../../lib/firebase/realTimeMenuCostSync'

interface RealTimeSyncStatusProps {
  className?: string
}

export default function RealTimeSyncStatus({ className = '' }: RealTimeSyncStatusProps) {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [syncStatus, setSyncStatus] = useState<{
    active: boolean
    menuItemsCount: number
    inventoryItemsCount: number
  }>({
    active: false,
    menuItemsCount: 0,
    inventoryItemsCount: 0
  })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) return

    const locationId = getBranchLocationId(selectedBranch.id)
    const syncInstance = getRealTimeMenuCostSync(profile.tenantId, locationId)
    
    // Update sync status
    const updateStatus = () => {
      const status = syncInstance.getSyncStatus()
      setSyncStatus(status)
    }

    // Initial status check
    updateStatus()

    // Listen for menu cost updates
    const handleMenuCostUpdate = (event: CustomEvent) => {
      setLastUpdate(new Date())
      updateStatus()
    }

    window.addEventListener('menuCostsUpdated', handleMenuCostUpdate as EventListener)

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000)

    return () => {
      window.removeEventListener('menuCostsUpdated', handleMenuCostUpdate as EventListener)
      clearInterval(interval)
    }
  }, [profile?.tenantId, selectedBranch?.id])

  if (!syncStatus.active) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-600 dark:text-green-400 font-medium">
          Real-time Sync Active
        </span>
      </div>

      {/* Sync Details */}
      <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400 text-xs">
        <span>📋 {syncStatus.menuItemsCount} menu items</span>
        <span>📦 {syncStatus.inventoryItemsCount} inventory items</span>
        {lastUpdate && (
          <span title={`Last update: ${lastUpdate.toLocaleTimeString()}`}>
            💰 Updated {Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago
          </span>
        )}
      </div>

      {/* Info Tooltip */}
      <div 
        className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs cursor-help"
        title="Menu costs automatically update when inventory prices change"
      >
        ℹ️
      </div>
    </div>
  )
}
