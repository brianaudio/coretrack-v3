'use client'

import React from 'react'

interface SalesData {
  todayRevenue: number
  todayOrders: number
  cashCollected: number
  yesterdayComparison: number
}

interface FinancialMetricsProps {
  salesData: SalesData
  loading: boolean
  error: string | null
}

export default function FinancialMetrics({ salesData, loading, error }: FinancialMetricsProps) {
  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`
  
  const formatGrowth = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : ''
    return `${sign}${percentage.toFixed(1)}%`
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-sm text-red-700">Failed to load financial data</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-4">
      
      {/* Hero Revenue Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-lg mb-6">
        <div className="text-center">
          <div className="text-sm font-medium text-blue-100 mb-2">Today's Revenue</div>
          <div className="text-3xl font-light mb-4">
            {loading ? (
              <div className="h-9 bg-blue-500/30 rounded-lg animate-pulse"></div>
            ) : (
              formatCurrency(salesData.todayRevenue)
            )}
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-blue-100">
              {loading ? '...' : formatGrowth(salesData.yesterdayComparison)} vs yesterday
            </span>
          </div>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        
        {/* Today's Orders */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-lg">🛒</span>
            </div>
            <div className="text-xl font-light text-gray-900 mb-1">
              {loading ? (
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                salesData.todayOrders
              )}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Orders Today
            </div>
            <div className="text-xs text-green-600 font-medium mt-1">
              {loading ? '...' : formatGrowth(salesData.yesterdayComparison)}
            </div>
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="text-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-lg">💰</span>
            </div>
            <div className="text-xl font-light text-gray-900 mb-1">
              {loading ? (
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                formatCurrency(salesData.cashCollected)
              )}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Cash Today
            </div>
            <div className="text-xs text-gray-600 font-medium mt-1">
              {loading ? '...' : `${((salesData.cashCollected / salesData.todayRevenue) * 100 || 0).toFixed(0)}% of sales`}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
        <div className="space-y-3">
          
          {/* Revenue Trend */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className={`text-sm ${salesData.yesterdayComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {salesData.yesterdayComparison >= 0 ? '📈' : '📉'}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Revenue Trend</div>
                <div className="text-xs text-gray-600">
                  {salesData.yesterdayComparison >= 0 ? 'Growing' : 'Declining'} compared to yesterday
                </div>
              </div>
            </div>
            <div className={`text-sm font-medium ${
              salesData.yesterdayComparison >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {loading ? '...' : formatGrowth(salesData.yesterdayComparison)}
            </div>
          </div>

          {/* Average Order */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-sm">💎</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Average Order</div>
                <div className="text-xs text-gray-600">Per transaction value</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {loading ? '...' : formatCurrency(salesData.todayOrders > 0 ? salesData.todayRevenue / salesData.todayOrders : 0)}
            </div>
          </div>

          {/* Payment Mix */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-sm">💳</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Payment Mix</div>
                <div className="text-xs text-gray-600">Cash vs Card ratio</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {loading ? '...' : `${((salesData.cashCollected / salesData.todayRevenue) * 100 || 0).toFixed(0)}% / ${(100 - (salesData.cashCollected / salesData.todayRevenue) * 100 || 0).toFixed(0)}%`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
