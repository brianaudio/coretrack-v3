'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useBranch } from './BranchContext'
import { getBranchLocationId } from '../utils/branchUtils'
import { Timestamp } from 'firebase/firestore'
import {
  createShift,
  updateShift,
  getActiveShift,
  getShiftHistory as getFirebaseShiftHistory,
  archiveShiftData,
  calculateShiftSummary
} from '../firebase/shifts'

// Types
export interface ShiftData {
  id: string
  name: string
  startTime: Timestamp
  endTime?: Timestamp
  status: 'active' | 'ended' | 'archived'
  totalSales: number
  totalExpenses: number
  totalOrders: number
  createdBy: string
  tenantId: string
  locationId: string
  metadata?: {
    cashFloat?: number
    notes?: string
    endedBy?: string
  }
}

export interface ShiftContextType {
  currentShift: ShiftData | null
  loading: boolean
  error: string | null
  
  // Shift Operations
  startNewShift: (shiftName?: string, cashFloat?: number) => Promise<void>
  endCurrentShift: (notes?: string) => Promise<void>
  archiveShift: (shiftId: string) => Promise<void>
  
  // Data Operations
  resetDailyData: () => Promise<any>
  getShiftSummary: () => Promise<any>
  
  // Shift History
  getShiftHistory: (days?: number) => Promise<ShiftData[]>
  
  // Status
  isShiftActive: boolean
  canEndShift: boolean
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined)

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  const [currentShift, setCurrentShift] = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper to generate shift names
  const generateShiftName = () => {
    const now = new Date()
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
    const dateString = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    return `${dateString} ${timeString} Shift`
  }

  // Load current active shift
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) {
      setLoading(false)
      setCurrentShift(null)
      return
    }

    loadCurrentShift()
  }, [profile?.tenantId, selectedBranch?.id])

  const loadCurrentShift = async () => {
    try {
      setLoading(true)
      console.log('🚀 [SHIFT-CONTEXT] Loading current shift...', {
        tenantId: profile?.tenantId,
        selectedBranch: selectedBranch?.id,
        locationId: selectedBranch ? getBranchLocationId(selectedBranch.id) : 'none'
      })
      
      if (!profile?.tenantId || !selectedBranch) {
        console.log('🚨 [SHIFT-CONTEXT] Missing required data for shift loading')
        return
      }
      
      const locationId = getBranchLocationId(selectedBranch.id)
      console.log('🔍 [SHIFT-CONTEXT] Getting active shift for location:', locationId)
      const activeShift = await getActiveShift(profile.tenantId, locationId)
      
      console.log('📋 [SHIFT-CONTEXT] Active shift result:', {
        found: !!activeShift,
        shiftId: activeShift?.id,
        shiftStatus: activeShift?.status,
        shiftName: activeShift?.name,
        createdBy: activeShift?.createdBy
      })
      
      setCurrentShift(activeShift)
      setError(null)
    } catch (err) {
      console.error('❌ [SHIFT-CONTEXT] Error loading current shift:', err)
      setError('Failed to load current shift')
      setCurrentShift(null)
    } finally {
      setLoading(false)
      console.log('✅ [SHIFT-CONTEXT] Shift loading completed')
    }
  }

  const startNewShift = async (shiftName?: string, cashFloat?: number) => {
    if (!profile?.tenantId || !selectedBranch) {
      throw new Error('No tenant or branch selected')
    }

    try {
      setLoading(true)
      
      // End any existing active shift first
      if (currentShift?.status === 'active') {
        await endCurrentShift('Auto-ended to start new shift')
      }

      const locationId = getBranchLocationId(selectedBranch.id)
      const now = Timestamp.now()
      const newShiftData: Omit<ShiftData, 'id'> = {
        name: shiftName || generateShiftName(),
        startTime: now,
        status: 'active',
        totalSales: 0,
        totalExpenses: 0,
        totalOrders: 0,
        createdBy: profile.uid,
        tenantId: profile.tenantId,
        locationId: locationId,
        metadata: {
          cashFloat: cashFloat || 0,
          notes: ''
        }
      }

      // Save to Firebase
      const shiftId = await createShift(newShiftData)
      const createdShift: ShiftData = {
        ...newShiftData,
        id: shiftId
      }

      setCurrentShift(createdShift)
      setError(null)
      
      console.log('New shift started:', createdShift)
    } catch (err) {
      console.error('Error starting shift:', err)
      setError('Failed to start new shift')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const endCurrentShift = async (notes?: string) => {
    if (!currentShift || currentShift.status !== 'active' || !profile?.tenantId || !selectedBranch) {
      throw new Error('No active shift to end')
    }

    try {
      setLoading(true)
      
      const locationId = getBranchLocationId(selectedBranch.id)
      
      // Get shift summary data
      const summary = await calculateShiftSummary(
        profile.tenantId,
        locationId,
        currentShift.startTime
      )
      
      const endedShift: ShiftData = {
        ...currentShift,
        endTime: Timestamp.now(),
        status: 'ended',
        totalSales: summary.totalSales || 0,
        totalExpenses: summary.totalExpenses || 0,
        totalOrders: summary.totalOrders || 0,
        metadata: {
          ...currentShift.metadata,
          notes: notes || '',
          endedBy: profile.uid
        }
      }

      // Update shift in Firebase
      await updateShift(profile.tenantId, currentShift.id, endedShift)
      setCurrentShift(endedShift)
      
      console.log('Shift ended:', endedShift)
      
      // Archive the shift data
      await archiveShift(endedShift.id)
      
    } catch (err) {
      console.error('Error ending shift:', err)
      setError('Failed to end shift')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const archiveShift = async (shiftId: string) => {
    if (!profile?.tenantId || !selectedBranch) return
    
    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      await archiveShiftData(profile.tenantId, locationId, shiftId)
      
      console.log('Shift archived:', shiftId)
      
      // Mark shift as archived in local state
      if (currentShift?.id === shiftId) {
        setCurrentShift({
          ...currentShift,
          status: 'archived'
        })
      }
    } catch (err) {
      console.error('Error archiving shift:', err)
      throw err
    }
  }

  const resetDailyData = async () => {
    try {
      if (!profile?.tenantId || !selectedBranch) {
        throw new Error('Missing tenant or branch information for daily reset')
      }

      console.log('🔄 Starting daily data reset...')
      const locationId = getBranchLocationId(selectedBranch.id)
      
      // Import and use the ShiftResetService for proper reset
      const { ShiftResetService } = await import('../services/ShiftResetService')
      const resetService = new ShiftResetService(profile.tenantId, selectedBranch.id)
      
      // Create a daily reset with current timestamp
      const dailyResetData = {
        tenantId: profile.tenantId,
        branchId: selectedBranch.id,
        shiftId: `daily-reset-${Date.now()}`,
        shiftName: `Daily Reset ${new Date().toLocaleDateString()}`,
        startTime: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24 hours ago
        resetBy: profile.uid || profile.email || 'system',
        resetReason: 'system' as const,
        generateReport: true,
        preserveInventoryLevels: true
      }
      
      // Perform the actual reset
      const summary = await resetService.performShiftReset(dailyResetData)
      
      // Update last reset timestamp
      localStorage.setItem('lastDailyReset', new Date().toISOString())
      
      console.log('✅ Daily reset completed:', summary)
      return summary
    } catch (err) {
      console.error('Error resetting daily data:', err)
      throw err
    }
  }

  const getShiftSummary = async () => {
    if (!profile?.tenantId || !selectedBranch || !currentShift) {
      return {
        totalSales: 0,
        totalExpenses: 0,
        totalOrders: 0,
        netProfit: 0
      }
    }

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      const summary = await calculateShiftSummary(
        profile.tenantId,
        locationId,
        currentShift.startTime
      )
      return summary
    } catch (err) {
      console.error('Error getting shift summary:', err)
      return {
        totalSales: 0,
        totalExpenses: 0,
        totalOrders: 0,
        netProfit: 0
      }
    }
  }

  const getShiftHistory = async (days: number = 7): Promise<ShiftData[]> => {
    if (!profile?.tenantId || !selectedBranch) return []
    
    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      return await getFirebaseShiftHistory(profile.tenantId, locationId, days)
    } catch (err) {
      console.error('Error getting shift history:', err)
      return []
    }
  }

  // Debug log the shift state whenever it changes
  useEffect(() => {
    console.log('🔄 [SHIFT-CONTEXT] Shift state updated:', {
      currentShift: currentShift ? {
        id: currentShift.id,
        status: currentShift.status,
        name: currentShift.name
      } : null,
      isShiftActive: currentShift?.status === 'active',
      loading
    })
  }, [currentShift, loading])

  const value: ShiftContextType = {
    currentShift,
    loading,
    error,
    
    // Operations
    startNewShift,
    endCurrentShift,
    archiveShift,
    resetDailyData,
    getShiftSummary,
    getShiftHistory,
    
    // Status
    isShiftActive: currentShift?.status === 'active',
    canEndShift: currentShift?.status === 'active' && !loading
  }

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  )
}

export function useShift() {
  const context = useContext(ShiftContext)
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider')
  }
  return context
}
