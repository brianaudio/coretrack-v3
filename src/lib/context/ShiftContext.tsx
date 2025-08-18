'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useBranch } from './BranchContext'
import { getBranchLocationId } from '../utils/branchUtils'
import { generateUniqueReactKey } from '../utils/reactKeyUtils'
import { generateDailyResetKey } from '../utils/shiftKeyDebugger'
import { Timestamp } from 'firebase/firestore'
import {
  createShift,
  updateShift,
  getActiveShift,
  getShiftHistory as getFirebaseShiftHistory,
  archiveShiftData,
  calculateShiftSummary
} from '../firebase/shifts'
import { generateShiftReportData } from '../utils/shiftReportGenerator'
import { generateShiftReportPDF } from '../utils/pdfGenerator'

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
  const [isResetting, setIsResetting] = useState(false) // Add reset protection

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
      
      if (!profile?.tenantId || !selectedBranch) {
        return
      }
      
      const locationId = getBranchLocationId(selectedBranch.id)
      const activeShift = await getActiveShift(profile.tenantId, locationId)
      
      setCurrentShift(activeShift)
      setError(null)
    } catch (err) {
      console.error('❌ [SHIFT-CONTEXT] Error loading current shift:', err)
      setError('Failed to load current shift')
      setCurrentShift(null)
    } finally {
      setLoading(false)
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
      
      // Generate and download shift report PDF
      try {
        console.log('📊 Generating shift report PDF...')
        const reportData = await generateShiftReportData(
          endedShift,
          profile.tenantId,
          selectedBranch.name,
          profile.displayName || profile.email || 'Staff Member',
          locationId
        )
        
        generateShiftReportPDF(reportData)
        console.log('✅ Shift report PDF generated successfully')
      } catch (pdfError) {
        console.error('❌ Failed to generate PDF report:', pdfError)
        // Don't throw error - shift ending should not fail if PDF generation fails
        alert('Shift ended successfully, but PDF report generation failed. You can try generating the report manually later.')
      }
      
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
    // Prevent concurrent reset operations
    if (isResetting) {
      console.warn('Reset operation already in progress, skipping...')
      return null
    }

    try {
      setIsResetting(true) // Set reset flag
      
      // Small delay to prevent rapid successive calls in Strict Mode
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!profile?.tenantId || !selectedBranch) {
        throw new Error('Missing tenant or branch information for daily reset')
      }

      const locationId = getBranchLocationId(selectedBranch.id)
      
      // Import and use the ShiftResetService for proper reset
      const { ShiftResetService } = await import('../services/ShiftResetService')
      const resetService = new ShiftResetService(profile.tenantId, selectedBranch.id)
      
      // Create a daily reset with unique timestamp and random component
      // Use high-resolution timer and multiple random sources for maximum uniqueness
      // Add React Strict Mode protection with crypto random
      const timestamp = Date.now()
      const highResTime = Math.floor(performance.now() * 1000).toString() // Convert to integer to avoid decimals
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const cryptoRandom = typeof crypto !== 'undefined' && crypto.getRandomValues 
        ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
        : Math.floor(Math.random() * 999999).toString(36)
      const strictModeCounter = Math.floor(Math.random() * 10000).toString(36)
      const uniqueId = `${timestamp}-${highResTime}-${randomSuffix}-${cryptoRandom}-${strictModeCounter}`
      const dailyResetData = {
        tenantId: profile.tenantId,
        branchId: selectedBranch.id,
        shiftId: generateDailyResetKey(),
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
      
      return summary
    } catch (err) {
      console.error('Error resetting daily data:', err)
      throw err
    } finally {
      setIsResetting(false) // Clear reset flag
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

  // Load current shift when auth or branch changes
  useEffect(() => {
    loadCurrentShift()
  }, [profile?.tenantId, selectedBranch?.id])

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
