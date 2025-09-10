'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'

export default function RealTimeSales() {
  const { user } = useAuth()
  const [salesData, setSalesData] = useState({
    todayTotal: 0,
    todayOrders: 0,
    avgOrderValue: 0,
    lastOrderTime: null as Date | null,
    hourlyTrend: [] as number[]
  })

  // Simulate real-time data (replace with Firebase listener)
  useEffect(() => {
    // Mock data for demo
    setSalesData({
      todayTotal: 15420,
      todayOrders: 47,
      avgOrderValue: 328,
      lastOrderTime: new Date(Date.now() - 300000), // 5 minutes ago
      hourlyTrend: [2, 5, 8, 12, 15, 18, 22, 19, 16, 14, 11, 8]
    })

    // Simulate live updates every 30 seconds
    const interval = setInterval(() => {
      setSalesData(prev => ({
        ...prev,
        todayTotal: prev.todayTotal + Math.floor(Math.random() * 500),
        todayOrders: prev.todayOrders + (Math.random() > 0.7 ? 1 : 0),
        lastOrderTime: Math.random() > 0.8 ? new Date() : prev.lastOrderTime
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`

  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'No recent orders'
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="space-y-4">
      {/* Today's Sales Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Today's Sales</h2>
        <div className="flex items-center space-x-1 text-xs text-green-600">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* Main Sales Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="text-green-600 text-sm font-medium mb-1">Total Sales</div>
          <div className="text-2xl font-bold text-green-800">{formatCurrency(salesData.todayTotal)}</div>
          <div className="text-xs text-green-600 mt-1">+12% vs yesterday</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="text-blue-600 text-sm font-medium mb-1">Orders</div>
          <div className="text-2xl font-bold text-blue-800">{salesData.todayOrders}</div>
          <div className="text-xs text-blue-600 mt-1">Avg: {formatCurrency(salesData.avgOrderValue)}</div>
        </div>
      </div>

      {/* Last Order */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Last Order</div>
              <div className="text-xs text-gray-600">{getTimeAgo(salesData.lastOrderTime)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">₱425</div>
            <div className="text-xs text-gray-600">2x Latte, 1x Pastry</div>
          </div>
        </div>
      </div>

      {/* Simple Hourly Trend */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-sm font-medium text-gray-900 mb-3">Today's Orders by Hour</div>
        <div className="flex items-end justify-between space-x-1 h-16">
          {salesData.hourlyTrend.map((value, index) => (
            <div key={index} className="flex flex-col items-center space-y-1">
              <div 
                className="bg-blue-500 rounded-t-sm w-3 transition-all duration-300"
                style={{ height: `${(value / Math.max(...salesData.hourlyTrend)) * 100}%` }}
              ></div>
              <div className="text-xs text-gray-500">{index + 8}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
