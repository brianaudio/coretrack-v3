'use client'

import { useState, useEffect } from 'react'
import ShiftControlPanel from '../../components/modules/ShiftControlPanel'
import { useShift } from '../../lib/context/ShiftContext'

export default function ShiftManagementPage() {
  const { currentShift, getShiftHistory } = useShift()
  const [shiftHistory, setShiftHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const history = await getShiftHistory(7) // Last 7 days
      setShiftHistory(history)
    } catch (error) {
      console.error('Failed to load shift history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [currentShift])

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900">Shift Management</h1>
          <p className="mt-2 text-surface-600">
            Manage your daily shifts, track performance, and archive data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Control Panel */}
          <div className="lg:col-span-2">
            <ShiftControlPanel />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Quick Stats</h3>
              
              {currentShift ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-surface-500">Current Sales</span>
                    <span className="font-semibold">₱{currentShift.totalSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Current Expenses</span>
                    <span className="font-semibold">₱{currentShift.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Orders</span>
                    <span className="font-semibold">{currentShift.totalOrders}</span>
                  </div>
                  <hr className="border-surface-200" />
                  <div className="flex justify-between">
                    <span className="text-surface-500">Net Profit</span>
                    <span className={`font-semibold ${
                      (currentShift.totalSales - currentShift.totalExpenses) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      ₱{(currentShift.totalSales - currentShift.totalExpenses).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-surface-500 text-sm">No active shift</p>
                  <p className="text-surface-400 text-xs">Start a shift to see stats</p>
                </div>
              )}
            </div>

            {/* Recent Shifts */}
            <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900">Recent Shifts</h3>
                <button
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {loadingHistory ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {shiftHistory.length > 0 ? (
                <div className="space-y-3">
                  {shiftHistory.slice(0, 5).map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-surface-900">{shift.name}</p>
                        <p className="text-xs text-surface-500">
                          {shift.startTime.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-surface-900">
                          ₱{shift.totalSales.toLocaleString()}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          shift.status === 'active' 
                            ? 'bg-green-100 text-green-700'
                            : shift.status === 'ended'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {shift.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-surface-500 text-sm">No recent shifts</p>
                  <p className="text-surface-400 text-xs">Your shift history will appear here</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900">Generate Report</p>
                      <p className="text-xs text-surface-500">Export shift data</p>
                    </div>
                  </div>
                </button>

                <button className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900">Archive Data</p>
                      <p className="text-xs text-surface-500">Move to archives</p>
                    </div>
                  </div>
                </button>

                <button className="w-full text-left p-3 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900">Settings</p>
                      <p className="text-xs text-surface-500">Configure shifts</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
