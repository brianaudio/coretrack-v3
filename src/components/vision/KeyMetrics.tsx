'use client'

import React, { useState, useEffect } from 'react'

export default function KeyMetrics() {
  const [metrics, setMetrics] = useState({
    weeklyGrowth: 12.5,
    bestSeller: 'Iced Caramel Latte',
    lowStock: 3,
    customerSatisfaction: 4.8,
    peakHour: '2:00 PM',
    profitMargin: 68.2
  })

  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value}%`

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGrowthBg = (value: number) => {
    if (value > 0) return 'bg-green-50 border-green-200'
    if (value < 0) return 'bg-red-50 border-red-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
      
      {/* Growth Card */}
      <div className={`rounded-xl p-4 border ${getGrowthBg(metrics.weeklyGrowth)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">Weekly Growth</div>
            <div className={`text-2xl font-bold ${getGrowthColor(metrics.weeklyGrowth)}`}>
              {formatPercentage(metrics.weeklyGrowth)}
            </div>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">vs last week</div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="text-purple-600 text-sm font-medium mb-1">Best Seller</div>
          <div className="text-sm font-bold text-purple-800">{metrics.bestSeller}</div>
          <div className="text-xs text-purple-600 mt-1">23 sold today</div>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="text-orange-600 text-sm font-medium mb-1">Peak Hour</div>
          <div className="text-sm font-bold text-orange-800">{metrics.peakHour}</div>
          <div className="text-xs text-orange-600 mt-1">Busiest time</div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="text-red-600 text-sm font-medium mb-1">Low Stock</div>
          <div className="text-sm font-bold text-red-800">{metrics.lowStock} items</div>
          <div className="text-xs text-red-600 mt-1">Need reorder</div>
        </div>

        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <div className="text-yellow-600 text-sm font-medium mb-1">Profit Margin</div>
          <div className="text-sm font-bold text-yellow-800">{metrics.profitMargin}%</div>
          <div className="text-xs text-yellow-600 mt-1">This month</div>
        </div>
      </div>

      {/* Customer Satisfaction */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-blue-600 text-sm font-medium mb-1">Customer Rating</div>
            <div className="flex items-center space-x-2">
              <div className="text-xl font-bold text-blue-800">{metrics.customerSatisfaction}</div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg 
                    key={star}
                    className={`w-4 h-4 ${star <= metrics.customerSatisfaction ? 'text-yellow-400' : 'text-gray-300'}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
        <div className="text-xs text-blue-600 mt-1">Based on 127 reviews</div>
      </div>
    </div>
  )
}
