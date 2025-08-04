'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBranch } from '../context/BranchContext'
import { useShift } from '../context/ShiftContext'
import { ShiftResetService, type ShiftResetSummary } from '../services/ShiftResetService'
import { Timestamp } from 'firebase/firestore'

interface UseShiftResetOptions {
  onResetComplete?: (summary: ShiftResetSummary) => void
  onResetError?: (error: Error) => void
  autoGenerateReport?: boolean
  preserveInventoryLevels?: boolean
}

export function useShiftReset(options: UseShiftResetOptions = {}) {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  
  const [isResetting, setIsResetting] = useState(false)
  const [resetSummary, setResetSummary] = useState<ShiftResetSummary | null>(null)
  const [resetHistory, setResetHistory] = useState<ShiftResetSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  /**
   * Perform enterprise shift reset
   */
  const performReset = async (customOptions?: {
    shiftId?: string
    shiftName?: string
    startTime?: Timestamp
    resetReason?: 'shift_end' | 'manual' | 'system'
  }) => {
    if (!profile?.tenantId || !selectedBranch || !currentShift) {
      throw new Error('Missing required data for shift reset')
    }

    setIsResetting(true)
    setError(null)

    try {
      const resetService = new ShiftResetService(profile.tenantId, selectedBranch.id)
      
      const summary = await resetService.performShiftReset({
        tenantId: profile.tenantId,
        branchId: selectedBranch.id,
        shiftId: customOptions?.shiftId || currentShift.id,
        shiftName: customOptions?.shiftName || currentShift.name,
        startTime: customOptions?.startTime || currentShift.startTime,
        resetBy: profile.uid || profile.email || 'system',
        resetReason: customOptions?.resetReason || 'shift_end',
        generateReport: options.autoGenerateReport !== false,
        preserveInventoryLevels: options.preserveInventoryLevels !== false
      })

      setResetSummary(summary)
      options.onResetComplete?.(summary)
      
      return summary
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Shift reset failed')
      setError(error.message)
      options.onResetError?.(error)
      throw error
    } finally {
      setIsResetting(false)
    }
  }

  /**
   * Load shift reset history
   */
  const loadResetHistory = async (limitCount?: number) => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      const resetService = new ShiftResetService(profile.tenantId, selectedBranch.id)
      const history = await resetService.getShiftResetHistory(limitCount)
      setResetHistory(history)
      return history
    } catch (err) {
      console.error('Failed to load reset history:', err)
      setError('Failed to load reset history')
    }
  }

  /**
   * Validate integrity of a previous reset
   */
  const validateResetIntegrity = async (archiveId: string) => {
    if (!profile?.tenantId || !selectedBranch) return false

    try {
      const resetService = new ShiftResetService(profile.tenantId, selectedBranch.id)
      return await resetService.validateResetIntegrity(archiveId)
    } catch (err) {
      console.error('Integrity validation failed:', err)
      return false
    }
  }

  /**
   * Get reset statistics
   */
  const getResetStatistics = () => {
    if (!resetHistory.length) return null

    const totalResets = resetHistory.length
    const totalSales = resetHistory.reduce((sum, reset) => sum + reset.totalSales, 0)
    const totalExpenses = resetHistory.reduce((sum, reset) => sum + reset.totalExpenses, 0)
    const totalProfit = resetHistory.reduce((sum, reset) => sum + reset.netProfit, 0)
    const averageShiftDuration = resetHistory.reduce((sum, reset) => sum + reset.duration, 0) / totalResets

    return {
      totalResets,
      totalSales,
      totalExpenses,
      totalProfit,
      averageShiftDuration: Math.round(averageShiftDuration),
      averageSalesPerShift: totalSales / totalResets,
      averageOrdersPerShift: resetHistory.reduce((sum, reset) => sum + reset.totalOrders, 0) / totalResets
    }
  }

  /**
   * Check if reset is possible
   */
  const canPerformReset = () => {
    return !!(
      profile?.tenantId && 
      selectedBranch && 
      currentShift && 
      !isResetting &&
      (profile.role === 'manager' || profile.role === 'owner')
    )
  }

  return {
    // State
    isResetting,
    resetSummary,
    resetHistory,
    error,
    
    // Actions
    performReset,
    loadResetHistory,
    validateResetIntegrity,
    
    // Computed
    canPerformReset: canPerformReset(),
    resetStatistics: getResetStatistics(),
    
    // Utils
    clearError: () => setError(null),
    clearSummary: () => setResetSummary(null)
  }
}
