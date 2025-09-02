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

  // Hide the sync status display
  return null
}
