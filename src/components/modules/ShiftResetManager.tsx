'use client'

import { useState, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShiftReset } from '../../lib/hooks/useShiftReset'
import { useShift } from '../../lib/context/ShiftContext'
import type { ShiftResetSummary } from '../../lib/services/ShiftResetService'

interface ShiftResetManagerProps {
  onResetComplete?: (summary: ShiftResetSummary) => void
  className?: string
}

export default function ShiftResetManager({ onResetComplete, className = '' }: ShiftResetManagerProps) {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift, endCurrentShift } = useShift()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [resetReason, setResetReason] = useState<'shift_end' | 'manual' | 'system'>('shift_end')
  const [isManualResetting, setIsManualResetting] = useState(false)
  
  const {
    isResetting,
    resetSummary,
    resetHistory,
    error,
    performReset,
    loadResetHistory,
    canPerformReset,
    resetStatistics,
    clearError
  } = useShiftReset({
    onResetComplete: (summary) => {
      setShowSummaryModal(true)
      onResetComplete?.(summary)
    },
    onResetError: (error) => {
      console.error('Reset failed:', error)
    }
  })

  useEffect(() => {
    loadResetHistory(10) // Load last 10 resets
  }, [])

  const handleEndShiftWithReset = async () => {
    if (!currentShift || !canPerformReset) return
    
    try {
      // Perform the reset first
      const summary = await performReset({ resetReason })
      
      // Then end the shift
      await endCurrentShift(`Shift ended with data reset. Sales: ₱${summary.totalSales.toLocaleString()}`)
      
      setShowConfirmModal(false)
    } catch (error) {
      console.error('Failed to end shift with reset:', error)
    }
  }

  const handleManualReset = async () => {
    try {
      setIsManualResetting(true)
      console.log('🔄 Starting manual reset...')
      console.log('Profile:', profile?.tenantId)
      console.log('Branch:', selectedBranch?.id)
      
      if (!profile?.tenantId || !selectedBranch?.id) {
        throw new Error('Missing tenant or branch information')
      }
      
      // Import and use the actual ShiftResetService
      const { ShiftResetService } = await import('../../lib/services/ShiftResetService')
      const resetService = new ShiftResetService(profile.tenantId, selectedBranch.id)
      
      // Create a manual shift reset with default values
      const manualShiftData = {
        tenantId: profile.tenantId,
        branchId: selectedBranch.id,
        shiftId: `manual-reset-${Date.now()}`,
        shiftName: `Manual Reset ${new Date().toLocaleDateString()}`,
        startTime: Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
        resetBy: profile.uid || profile.email || 'manual-user',
        resetReason: 'manual' as const,
        generateReport: true,
        preserveInventoryLevels: false
      }
      
      console.log('🔧 Performing manual reset with data:', manualShiftData)
      const summary = await resetService.performShiftReset(manualShiftData)
      
      console.log('✅ Manual reset completed:', summary)
      alert(`✅ Manual reset completed successfully!\n\nSummary:\n• Total Sales: ₱${summary.totalSales.toLocaleString()}\n• Total Orders: ${summary.totalOrders}\n• Archive ID: ${summary.archiveId}\n\nCheck console for full details.`)
      
      // Update the state with the summary
      setShowConfirmModal(false)
      if (onResetComplete) {
        onResetComplete(summary)
      }
      
    } catch (error) {
      console.error('Failed to perform manual reset:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Reset failed: ${errorMessage}`)
    } finally {
      setIsManualResetting(false)
    }
  }

  const handleTestReset = () => {
    console.log('🧪 Test Reset Button Clicked!')
    console.log('Current state:', {
      profile: profile?.tenantId,
      branch: selectedBranch?.id,
      currentShift: currentShift?.id,
      canPerformReset,
      isResetting
    })
    alert('Test reset button works! Check console for details.')
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Reset Control */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-surface-900">Enterprise Shift Reset</h3>
            <p className="text-sm text-surface-600">
              {currentShift 
                ? `Current shift: ${currentShift.name}` 
                : 'No active shift'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              disabled={isResetting}
            >
              <option value="shift_end">Shift End</option>
              <option value="manual">Manual Reset</option>
              <option value="system">System Reset</option>
            </select>
            
            {currentShift ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!canPerformReset}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  canPerformReset
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isResetting ? 'Resetting...' : 'End Shift & Reset'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleTestReset}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Test Button
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isManualResetting}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {isManualResetting ? 'Resetting...' : 'Manual Data Reset'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Shift Info */}
        {currentShift && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Duration</div>
              <div className="text-xl font-bold text-blue-900">
                {formatDuration(Math.floor((Date.now() - currentShift.startTime.toDate().getTime()) / 60000))}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Sales</div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(currentShift.totalSales || 0)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Orders</div>
              <div className="text-xl font-bold text-purple-900">
                {currentShift.totalOrders || 0}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-600 font-medium">Profit</div>
              <div className="text-xl font-bold text-orange-900">
                {formatCurrency((currentShift.totalSales || 0) - (currentShift.totalExpenses || 0))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <span className="text-red-800 font-medium">Reset Failed</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* Reset Statistics */}
        {resetStatistics && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Reset Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Resets:</span>
                <span className="font-medium ml-2">{resetStatistics.totalResets}</span>
              </div>
              <div>
                <span className="text-gray-500">Avg Duration:</span>
                <span className="font-medium ml-2">{formatDuration(resetStatistics.averageShiftDuration)}</span>
              </div>
              <div>
                <span className="text-gray-500">Avg Sales:</span>
                <span className="font-medium ml-2">{formatCurrency(resetStatistics.averageSalesPerShift)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Profit:</span>
                <span className="font-medium ml-2">{formatCurrency(resetStatistics.totalProfit)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Reset History */}
      {resetHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Recent Resets</h3>
          <div className="space-y-3">
            {resetHistory.slice(0, 5).map((reset, index) => (
              <div key={reset.archiveId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{reset.shiftName}</div>
                  <div className="text-xs text-gray-500">
                    {reset.resetAt.toDate?.()?.toLocaleDateString()} • {formatDuration(reset.duration)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatCurrency(reset.totalSales)}</div>
                  <div className="text-xs text-gray-500">{reset.totalOrders} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentShift ? 'End Shift & Reset Data' : 'Manual Data Reset'}
                </h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-medium text-yellow-800 mb-2">What will happen:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• All sales data will be archived</li>
                  <li>• Expenses will be archived</li>
                  <li>• Inventory transactions will be archived</li>
                  {currentShift && <li>• Current shift will be ended</li>}
                  <li>• System will be ready for {currentShift ? 'next shift' : 'fresh start'}</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                disabled={isManualResetting}
              >
                Cancel
              </button>
              <button
                onClick={currentShift ? handleEndShiftWithReset : handleManualReset}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                disabled={isResetting || isManualResetting}
              >
                {(isResetting || isManualResetting) ? 'Processing...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && resetSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Shift Reset Complete</h3>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-900">{formatCurrency(resetSummary.totalSales)}</div>
                    <div className="text-sm text-green-600">Total Sales</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">{resetSummary.totalOrders}</div>
                    <div className="text-sm text-blue-600">Orders</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-900">{formatCurrency(resetSummary.totalExpenses)}</div>
                    <div className="text-sm text-purple-600">Expenses</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-900">{formatCurrency(resetSummary.netProfit)}</div>
                    <div className="text-sm text-orange-600">Net Profit</div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Payment Methods</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(resetSummary.paymentBreakdown).map(([method, data]) => (
                      <div key={method} className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-sm capitalize">{method}</div>
                        <div className="text-lg font-bold">{formatCurrency(data.amount)}</div>
                        <div className="text-xs text-gray-500">{data.count} transactions</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Archive Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Archive Information</h4>
                  <div className="text-sm text-blue-800">
                    <p>Archive ID: <code className="bg-blue-100 px-1 rounded">{resetSummary.archiveId}</code></p>
                    <p>Collections archived: {resetSummary.archivedCollections.join(', ')}</p>
                    <p>Reset at: {resetSummary.resetAt.toDate?.()?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
