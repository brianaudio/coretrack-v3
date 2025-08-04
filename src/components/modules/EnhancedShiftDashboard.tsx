'use client'

import { useState, useEffect } from 'react'
import { useShift } from '../../lib/context/ShiftContext'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import ShiftControlPanel from './ShiftControlPanel'

export default function EnhancedShiftDashboard() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift, getShiftSummary } = useShift()
  
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Auto-refresh summary every 30 seconds when shift is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (currentShift) {
      const refreshSummary = async () => {
        try {
          setLoading(true)
          const data = await getShiftSummary()
          setSummary(data)
          setLastUpdate(new Date())
        } catch (error) {
          console.error('Failed to refresh summary:', error)
        } finally {
          setLoading(false)
        }
      }

      // Initial load
      refreshSummary()
      
      // Set up interval
      interval = setInterval(refreshSummary, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentShift, getShiftSummary])

  const formatDuration = (startTime: any) => {
    if (!startTime) return 'Unknown'
    
    const start = startTime.toDate()
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  const getShiftStatus = () => {
    if (!currentShift) return { status: 'No Shift', color: 'text-gray-500', bg: 'bg-gray-100' }
    
    const duration = currentShift.startTime.toDate()
    const now = new Date()
    const hours = (now.getTime() - duration.getTime()) / (1000 * 60 * 60)
    
    if (hours < 4) return { status: 'Fresh', color: 'text-green-600', bg: 'bg-green-100' }
    if (hours < 8) return { status: 'Active', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (hours < 12) return { status: 'Extended', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { status: 'Long', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const shiftStatus = getShiftStatus()

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Shift Management Dashboard</h1>
            <p className="text-blue-100">
              Welcome back, {profile?.displayName} • {selectedBranch?.name}
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${shiftStatus.bg} ${shiftStatus.color} bg-opacity-20 text-white`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${shiftStatus.color.replace('text-', 'bg-').replace('-600', '-400')}`}></div>
              {shiftStatus.status}
            </div>
            <p className="text-xs text-blue-200 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      {currentShift && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Duration */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-600">Shift Duration</p>
                <p className="text-2xl font-bold text-surface-900">
                  {formatDuration(currentShift.startTime)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-surface-500">
                Started: {new Date(currentShift.startTime.toDate()).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Total Sales */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-600">Total Sales</p>
                <p className="text-2xl font-bold text-surface-900">
                  ₱{summary.totalSales?.toLocaleString() || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-green-600">
                {summary.totalOrders || 0} orders completed
              </span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-600">Total Expenses</p>
                <p className="text-2xl font-bold text-surface-900">
                  ₱{summary.totalExpenses?.toLocaleString() || '0.00'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4zm5-14H7" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-red-600">
                {summary.expenseCount || 0} expenses recorded
              </span>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-600">Net Profit</p>
                <p className="text-2xl font-bold text-surface-900">
                  ₱{((summary.totalSales || 0) - (summary.totalExpenses || 0)).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-xs ${((summary.totalSales || 0) - (summary.totalExpenses || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {((summary.totalSales || 0) - (summary.totalExpenses || 0)) >= 0 ? '↗ Profitable' : '↘ Loss'}
              </span>
            </div>
          </div>
        </div>
      )}



      {/* Main Shift Control Panel */}
      <ShiftControlPanel />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-surface-600">Refreshing data...</span>
          </div>
        </div>
      )}
    </div>
  )
}
