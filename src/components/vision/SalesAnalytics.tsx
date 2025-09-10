'use client'

import React from 'react'

interface SalesData {
  todayRevenue: number
  todayOrders: number
  cashCollected: number
  yesterdayComparison: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
  category?: string
}

interface SalesAnalyticsProps {
  topProducts: TopProduct[]
  salesData: SalesData
  loading: boolean
  error: string | null
}

export default function SalesAnalytics({ 
  topProducts, 
  salesData, 
  loading, 
  error 
}: SalesAnalyticsProps) {
  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-sm text-red-700">Failed to load analytics data</span>
          </div>
        </div>
      </div>
    )
  }

  // Calculate peak hours (mock data for now)
  const peakHours = [
    { hour: '10-11 AM', orders: 12 },
    { hour: '1-2 PM', orders: 15 },
    { hour: '3-4 PM', orders: 8 }
  ]

  return (
    <div className="mx-auto max-w-md px-6 py-4 pb-8">
      
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sales Analytics</h2>
        <p className="text-sm text-gray-600">Quick insights for busy owners</p>
      </div>

      {/* Today's Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-light text-gray-900 mb-1">
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                salesData.todayOrders
              )}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Orders Today</div>
          </div>
          <div>
            <div className="text-2xl font-light text-gray-900 mb-1">
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                formatCurrency(salesData.todayRevenue)
              )}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Revenue</div>
          </div>
        </div>
        
        {/* Growth indicator */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className={`${
              salesData.yesterdayComparison >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {salesData.yesterdayComparison >= 0 ? '📈' : '📉'}
            </span>
            <span className="text-gray-600">
              {loading ? '...' : `${salesData.yesterdayComparison >= 0 ? '+' : ''}${salesData.yesterdayComparison.toFixed(1)}%`} vs yesterday
            </span>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          // Empty state
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📊</span>
            </div>
            <p className="text-sm text-gray-600">No sales data available yet</p>
          </div>
        ) : (
          // Top products list
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((product, index) => (
              <div key={`${product.name}-${index}`} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">
                    {product.quantity} sold · {formatCurrency(product.revenue)}
                  </div>
                </div>
                <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                  Popular
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h3>
        <div className="space-y-3">
          {peakHours.map((hour, index) => (
            <div key={hour.hour} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🕐</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{hour.hour}</div>
                  <div className="text-xs text-gray-500">Peak time</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {hour.orders} orders
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
        <div className="space-y-3">
          
          {/* Best selling insight */}
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-xl">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-sm">☕</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {topProducts.length > 0 ? `${topProducts[0]?.name} is trending` : 'Building insights...'}
              </div>
              <div className="text-xs text-gray-600">
                {topProducts.length > 0 ? `${topProducts[0]?.quantity} sold today` : 'More data needed'}
              </div>
            </div>
          </div>

          {/* Revenue insight */}
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-sm">💰</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {salesData.yesterdayComparison >= 0 ? 'Sales growing' : 'Sales declining'}
              </div>
              <div className="text-xs text-gray-600">
                {Math.abs(salesData.yesterdayComparison).toFixed(1)}% vs yesterday
              </div>
            </div>
          </div>

          {/* Average order insight */}
          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-xl">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Average order value</div>
              <div className="text-xs text-gray-600">
                {formatCurrency(salesData.todayOrders > 0 ? salesData.todayRevenue / salesData.todayOrders : 0)} per transaction
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
