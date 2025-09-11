'use client'

import React, { useState, useEffect } from 'react'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface ProfitData {
  grossProfit: number
  netProfit: number
  totalExpenses: number
  revenue: number
  profitMargin: number
  growthRate: number
}

interface ChartData {
  date: string
  grossProfit: number
  netProfit: number
  expenses: number
  revenue: number
}

export default function ProfitAnalytics() {
  const { selectedBranch } = useBranch()
  const { user } = useAuth()
  const [profitData, setProfitData] = useState<ProfitData>({
    grossProfit: 0,
    netProfit: 0,
    totalExpenses: 0,
    revenue: 0,
    profitMargin: 0,
    growthRate: 0
  })
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [showDetailedView, setShowDetailedView] = useState(false)

  useEffect(() => {
    if (!selectedBranch?.id || !user) return

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Listen to sales data
    const salesQuery = query(
      collection(db, 'sales'),
      where('locationId', '==', selectedBranch.id),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    )

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('locationId', '==', selectedBranch.id),
      where('date', '>=', Timestamp.fromDate(startDate)),
      orderBy('date', 'desc')
    )

    let salesData: any[] = []
    let expensesData: any[] = []

    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      calculateProfitData()
    })

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      calculateProfitData()
    })

    const calculateProfitData = () => {
      try {
        // Calculate totals
        const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)
        const totalCOGS = salesData.reduce((sum, sale) => sum + (sale.costOfGoods || sale.total * 0.3), 0) // Estimate if not available
        const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0)
        
        const grossProfit = totalRevenue - totalCOGS
        const netProfit = grossProfit - totalExpenses
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

        // Calculate growth rate (vs previous period)
        const previousPeriodStart = new Date(startDate)
        previousPeriodStart.setDate(previousPeriodStart.getDate() - days)
        
        const previousRevenue = salesData
          .filter(sale => {
            const saleDate = sale.timestamp?.toDate() || new Date(sale.timestamp)
            return saleDate >= previousPeriodStart && saleDate < startDate
          })
          .reduce((sum, sale) => sum + (sale.total || 0), 0)
        
        const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

        setProfitData({
          grossProfit,
          netProfit,
          totalExpenses,
          revenue: totalRevenue,
          profitMargin,
          growthRate
        })

        // Generate chart data
        generateChartData(salesData, expensesData, days)
        setLoading(false)
      } catch (error) {
        console.error('Error calculating profit data:', error)
        setLoading(false)
      }
    }

    return () => {
      unsubscribeSales()
      unsubscribeExpenses()
    }
  }, [selectedBranch?.id, user, timeRange])

  const generateChartData = (sales: any[], expenses: any[], days: number) => {
    const chartPoints: ChartData[] = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayRevenue = sales
        .filter(sale => {
          const saleDate = sale.timestamp?.toDate() || new Date(sale.timestamp)
          return saleDate.toDateString() === date.toDateString()
        })
        .reduce((sum, sale) => sum + (sale.total || 0), 0)

      const dayExpenses = expenses
        .filter(expense => {
          const expenseDate = expense.date?.toDate() || new Date(expense.date)
          return expenseDate.toDateString() === date.toDateString()
        })
        .reduce((sum, expense) => sum + (expense.amount || 0), 0)

      const dayCOGS = dayRevenue * 0.3 // Estimate
      const dayGrossProfit = dayRevenue - dayCOGS
      const dayNetProfit = dayGrossProfit - dayExpenses

      chartPoints.push({
        date: dateStr,
        revenue: dayRevenue,
        expenses: dayExpenses,
        grossProfit: dayGrossProfit,
        netProfit: dayNetProfit
      })
    }

    setChartData(chartPoints)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-40 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (showDetailedView) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDetailedView(false)}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Business Growth Analytics</h3>
              <p className="text-sm text-gray-500">Detailed profit analysis and trends</p>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Futuristic Chart */}
        <div className="relative h-80 mb-6 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-6 overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 grid-rows-8 h-full">
              {Array.from({ length: 96 }).map((_, i) => (
                <div key={i} className="border border-gray-300"></div>
              ))}
            </div>
          </div>

          {/* Chart SVG */}
          <svg className="w-full h-full relative z-10" viewBox="0 0 400 200">
            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="netProfitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1"/>
              </linearGradient>
              <linearGradient id="grossProfitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.1"/>
              </linearGradient>
            </defs>

            {/* Chart Lines */}
            {chartData.length > 1 && (
              <>
                {/* Gross Profit Area */}
                <path
                  d={`M ${chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 380 + 10
                    const maxValue = Math.max(...chartData.map(d => Math.max(d.grossProfit, d.netProfit)))
                    const y = 180 - (point.grossProfit / maxValue) * 160
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')} L ${(chartData.length - 1) / (chartData.length - 1) * 380 + 10} 180 L 10 180 Z`}
                  fill="url(#grossProfitGradient)"
                />

                {/* Net Profit Area */}
                <path
                  d={`M ${chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 380 + 10
                    const maxValue = Math.max(...chartData.map(d => Math.max(d.grossProfit, d.netProfit)))
                    const y = 180 - (point.netProfit / maxValue) * 160
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')} L ${(chartData.length - 1) / (chartData.length - 1) * 380 + 10} 180 L 10 180 Z`}
                  fill="url(#netProfitGradient)"
                />

                {/* Gross Profit Line */}
                <path
                  d={chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 380 + 10
                    const maxValue = Math.max(...chartData.map(d => Math.max(d.grossProfit, d.netProfit)))
                    const y = 180 - (point.grossProfit / maxValue) * 160
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke="#10B981"
                  strokeWidth="2"
                  fill="none"
                />

                {/* Net Profit Line */}
                <path
                  d={chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 380 + 10
                    const maxValue = Math.max(...chartData.map(d => Math.max(d.grossProfit, d.netProfit)))
                    const y = 180 - (point.netProfit / maxValue) * 160
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  fill="none"
                />

                {/* Data Points */}
                {chartData.map((point, index) => {
                  const x = (index / (chartData.length - 1)) * 380 + 10
                  const maxValue = Math.max(...chartData.map(d => Math.max(d.grossProfit, d.netProfit)))
                  const grossY = 180 - (point.grossProfit / maxValue) * 160
                  const netY = 180 - (point.netProfit / maxValue) * 160
                  
                  return (
                    <g key={index}>
                      <circle cx={x} cy={grossY} r="3" fill="#10B981" className="opacity-80" />
                      <circle cx={x} cy={netY} r="3" fill="#3B82F6" className="opacity-80" />
                    </g>
                  )
                })}
              </>
            )}
          </svg>

          {/* Chart Legend */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">Gross Profit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">Net Profit</span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl">
            <div className="text-sm font-medium text-emerald-700 mb-1">Average Daily Gross</div>
            <div className="text-xl font-bold text-emerald-900">
              {formatCurrency(profitData.grossProfit / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl">
            <div className="text-sm font-medium text-blue-700 mb-1">Average Daily Net</div>
            <div className="text-xl font-bold text-blue-900">
              {formatCurrency(profitData.netProfit / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl">
            <div className="text-sm font-medium text-purple-700 mb-1">Profit Margin</div>
            <div className="text-xl font-bold text-purple-900">{profitData.profitMargin.toFixed(1)}%</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-xl">
            <div className="text-sm font-medium text-amber-700 mb-1">Growth Rate</div>
            <div className={`text-xl font-bold ${profitData.growthRate >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              {formatPercentage(profitData.growthRate)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Profit Analytics</h3>
            <p className="text-sm text-gray-500">Last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDetailedView(true)}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
        >
          <span>View Details</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Profit Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Net Profit */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-700">Net Profit</div>
            <div className={`text-xs px-2 py-1 rounded-full ${profitData.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {profitData.netProfit >= 0 ? '↑' : '↓'} {formatPercentage(profitData.growthRate)}
            </div>
          </div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(profitData.netProfit)}</div>
        </div>

        {/* Gross Profit */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-emerald-700">Gross Profit</div>
            <div className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
              {((profitData.grossProfit / profitData.revenue) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-900">{formatCurrency(profitData.grossProfit)}</div>
        </div>

        {/* Total Expenses */}
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-xl border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-red-700">Expenses</div>
            <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
              {((profitData.totalExpenses / profitData.revenue) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-xl font-bold text-red-900">{formatCurrency(profitData.totalExpenses)}</div>
        </div>
      </div>

      {/* Mini Chart Preview */}
      <div className="h-24 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-4 relative overflow-hidden">
        <div className="text-xs font-medium text-gray-600 mb-2">Profit Trend</div>
        {chartData.length > 1 && (
          <svg className="w-full h-12" viewBox="0 0 200 40">
            <path
              d={chartData.map((point, index) => {
                const x = (index / (chartData.length - 1)) * 180 + 10
                const maxValue = Math.max(...chartData.map(d => d.netProfit))
                const y = 35 - (point.netProfit / maxValue) * 25
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              className="drop-shadow-sm"
            />
          </svg>
        )}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          Click "View Details" for full analysis
        </div>
      </div>
    </div>
  )
}
