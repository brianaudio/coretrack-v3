'use client'

import React, { useState, useEffect } from 'react'
import AdvancedSearch from '@/components/AdvancedSearch'
import BulkOperations from '@/components/BulkOperations'
import SimpleChart from '@/components/SimpleChart'
import PaymentMethodsAnalytics from './PaymentMethodsAnalytics'
import { subscribeToInventoryItems, InventoryItem } from '../../lib/firebase/inventory'
import { subscribeToPOSOrders, POSOrder } from '../../lib/firebase/pos'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'

// Types for analytics data
interface SalesData {
  date: string
  revenue: number
  orders: number
  customers: number
  averageOrderValue: number
}

interface InventoryAnalytics {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  averageStockLevel: number
  topMovingItems: TopMovingItem[]
  categoryBreakdown: CategoryBreakdown[]
}

interface TopMovingItem {
  id: string
  name: string
  category: string
  quantityUsed: number
  usageRate: number
  lastMovement: Date
}

interface CategoryBreakdown {
  category: string
  value: number
  percentage: number
  items: number
}

interface CustomerAnalytics {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  averageOrdersPerCustomer: number
  customerSatisfaction: number
  topCustomers: TopCustomer[]
}

interface TopCustomer {
  id: string
  name: string
  totalOrders: number
  totalSpent: number
  lastVisit: Date
  loyaltyLevel: 'bronze' | 'silver' | 'gold' | 'platinum'
}

interface PerformanceMetrics {
  revenue: number
  revenueGrowth: number
  orders: number
  ordersGrowth: number
  averageOrderValue: number
  aovGrowth: number
  profitMargin: number
  marginGrowth: number
}

const EnhancedAnalytics: React.FC = () => {
  const { selectedBranch } = useBranch()
  const { profile } = useAuth()
  
  // Real sales data from Firebase
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [realPOSOrders, setRealPOSOrders] = useState<POSOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  
  // Real inventory data from Firebase
  const [realInventoryItems, setRealInventoryItems] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(true)

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    branchId: '',
    profileUid: '',
    profileTenantId: '',
    locationId: '',
    ordersCount: 0,
    inventoryCount: 0,
    subscriptionErrors: [] as string[]
  })

  // Calculate real inventory analytics from actual data
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    averageStockLevel: 0,
    topMovingItems: [],
    categoryBreakdown: []
  })

  // Subscribe to real inventory data
  useEffect(() => {
    if (!selectedBranch?.id || !profile?.uid) {
      console.log('[Analytics] Missing requirements - Branch:', selectedBranch?.id, 'Profile:', profile?.uid)
      setDebugInfo(prev => ({
        ...prev,
        branchId: selectedBranch?.id || 'missing',
        profileUid: profile?.uid || 'missing',
        subscriptionErrors: [...prev.subscriptionErrors, 'Missing branch or profile']
      }))
      return
    }

    const locationId = getBranchLocationId(selectedBranch.id)
    console.log('[Analytics] Setting up inventory subscription for location:', locationId)
    
    setDebugInfo(prev => ({
      ...prev,
      branchId: selectedBranch.id,
      profileUid: profile.uid,
      locationId,
      profileTenantId: (profile as any).tenantId || 'not-set'
    }))
    
    setLoadingInventory(true)
    const unsubscribe = subscribeToInventoryItems(
      profile.tenantId || profile.uid, // Use tenantId if available, fallback to uid
      locationId,
      (items: InventoryItem[]) => {
        console.log('[Analytics] Received inventory items:', items.length, items)
        setRealInventoryItems(items)
        setLoadingInventory(false)
        setDebugInfo(prev => ({
          ...prev,
          inventoryCount: items.length
        }))
      }
    )

    return () => {
      console.log('[Analytics] Cleaning up inventory subscription')
      unsubscribe()
    }
  }, [selectedBranch?.id, profile?.uid])

  // Subscribe to real POS orders data
  useEffect(() => {
    if (!selectedBranch?.id || !profile?.uid) {
      console.log('[Analytics] Missing requirements for orders - Branch:', selectedBranch?.id, 'Profile:', profile?.uid)
      return
    }

    const locationId = getBranchLocationId(selectedBranch.id)
    console.log('[Analytics] Setting up POS orders subscription for location:', locationId)
    
    setLoadingOrders(true)
    const unsubscribe = subscribeToPOSOrders(
      profile.tenantId || profile.uid, // Use tenantId if available, fallback to uid
      (orders: POSOrder[]) => {
        console.log('[Analytics] Received POS orders:', orders.length, orders)
        console.log('[Analytics] Order details:', orders.map(o => ({
          id: o.id,
          status: o.status,
          total: o.total,
          locationId: o.locationId,
          createdAt: o.createdAt?.toDate()
        })))
        setRealPOSOrders(orders)
        
        // Transform orders into sales data for analytics
        const salesByDate = transformOrdersToSalesData(orders)
        console.log('[Analytics] Transformed sales data:', salesByDate)
        setSalesData(salesByDate)
        setLoadingOrders(false)
        setDebugInfo(prev => ({
          ...prev,
          ordersCount: orders.length
        }))
      },
      locationId
    )

    return () => {
      console.log('[Analytics] Cleaning up POS orders subscription')
      unsubscribe()
    }
  }, [selectedBranch?.id, profile?.uid])

  // Transform POS orders into sales analytics data
  const transformOrdersToSalesData = (orders: POSOrder[]): SalesData[] => {
    if (!orders.length) return []

    // Group completed orders by date
    const completedOrders = orders.filter(order => 
      order.status === 'completed' && order.createdAt
    )

    const salesByDate = new Map<string, {
      revenue: number
      orders: number
      customers: Set<string>
    }>()

    completedOrders.forEach(order => {
      const date = order.createdAt.toDate().toISOString().split('T')[0]
      
      if (!salesByDate.has(date)) {
        salesByDate.set(date, {
          revenue: 0,
          orders: 0,
          customers: new Set()
        })
      }

      const dayData = salesByDate.get(date)!
      dayData.revenue += order.total
      dayData.orders += 1
      if (order.customerName) {
        dayData.customers.add(order.customerName)
      }
    })

    // Convert to SalesData array and sort by date
    return Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
        customers: data.customers.size,
        averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Calculate inventory analytics from real data
  useEffect(() => {
    if (!realInventoryItems.length) {
      setInventoryAnalytics({
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        averageStockLevel: 0,
        topMovingItems: [],
        categoryBreakdown: []
      })
      return
    }

    const totalItems = realInventoryItems.length
    const totalValue = realInventoryItems.reduce((sum, item) => {
      const cost = item.costPerUnit || (item as any).cost || 0
      const stock = item.currentStock || (item as any).quantity || 0
      return sum + (cost * stock)
    }, 0)

    const lowStockItems = realInventoryItems.filter(item => {
      const stock = item.currentStock || (item as any).quantity || 0
      const minStock = item.minStock || (item as any).minStock || 0
      return stock <= minStock && stock > 0
    }).length

    const outOfStockItems = realInventoryItems.filter(item => {
      const stock = item.currentStock || (item as any).quantity || 0
      return stock === 0
    }).length

    const averageStockLevel = totalItems > 0 ? 
      realInventoryItems.reduce((sum, item) => {
        const stock = item.currentStock || (item as any).quantity || 0
        return sum + stock
      }, 0) / totalItems : 0

    // Category breakdown
    const categoryMap = new Map<string, { value: number, items: number }>()
    realInventoryItems.forEach(item => {
      const category = item.category || 'Uncategorized'
      const cost = item.costPerUnit || (item as any).cost || 0
      const stock = item.currentStock || (item as any).quantity || 0
      const value = cost * stock

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { value: 0, items: 0 })
      }
      
      const categoryData = categoryMap.get(category)!
      categoryData.value += value
      categoryData.items += 1
    })

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      items: data.items
    }))

    console.log('[Analytics Debug] Total items:', totalItems, 'Total value:', totalValue)
    console.log('[Analytics Debug] Sample item structure:', realInventoryItems[0])

    setInventoryAnalytics({
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      averageStockLevel,
      topMovingItems: [], // TODO: Implement based on sales data
      categoryBreakdown
    })
  }, [realInventoryItems])

  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics>({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    averageOrdersPerCustomer: 0,
    customerSatisfaction: 0,
    topCustomers: []
  })

  // Calculate customer analytics from real POS orders
  useEffect(() => {
    if (!realPOSOrders.length) {
      setCustomerAnalytics({
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        averageOrdersPerCustomer: 0,
        customerSatisfaction: 0,
        topCustomers: []
      })
      return
    }

    const completedOrders = realPOSOrders.filter(order => order.status === 'completed')
    const customersMap = new Map<string, {
      orders: number
      totalSpent: number
      firstVisit: Date
      lastVisit: Date
    }>()

    completedOrders.forEach(order => {
      const customerName = order.customerName || 'Walk-in Customer'
      const orderDate = order.createdAt.toDate()

      if (!customersMap.has(customerName)) {
        customersMap.set(customerName, {
          orders: 0,
          totalSpent: 0,
          firstVisit: orderDate,
          lastVisit: orderDate
        })
      }

      const customer = customersMap.get(customerName)!
      customer.orders += 1
      customer.totalSpent += order.total
      
      if (orderDate < customer.firstVisit) {
        customer.firstVisit = orderDate
      }
      if (orderDate > customer.lastVisit) {
        customer.lastVisit = orderDate
      }
    })

    const totalCustomers = customersMap.size
    const averageOrdersPerCustomer = totalCustomers > 0 ? 
      completedOrders.length / totalCustomers : 0

    // Determine new vs returning customers (new = first visit within last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    let newCustomers = 0
    let returningCustomers = 0

    customersMap.forEach((data) => {
      if (data.firstVisit >= thirtyDaysAgo) {
        newCustomers++
      } else {
        returningCustomers++
      }
    })

    console.log('[Analytics] Customer analytics updated:', {
      totalCustomers,
      newCustomers,
      returningCustomers,
      orders: completedOrders.length
    })

    setCustomerAnalytics({
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageOrdersPerCustomer,
      customerSatisfaction: 0, // TODO: Implement satisfaction tracking
      topCustomers: [] // TODO: Implement top customers
    })
  }, [realPOSOrders])

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('week')
  const [selectedTab, setSelectedTab] = useState<'sales' | 'inventory' | 'customers'>('sales')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})

  // Calculate performance metrics from actual data
  const currentMetrics: PerformanceMetrics = {
    revenue: salesData.reduce((sum, day) => sum + day.revenue, 0),
    revenueGrowth: 0,
    orders: salesData.reduce((sum, day) => sum + day.orders, 0),
    ordersGrowth: 0,
    averageOrderValue: salesData.length > 0 ? salesData.reduce((sum, day) => sum + day.averageOrderValue, 0) / salesData.length : 0,
    aovGrowth: 0,
    profitMargin: 0,
    marginGrowth: 0
  }

  // Export functionality
  const exportData = (data: any[], filename: string) => {
    if (!data.length) return
    
    const keys = Object.keys(data[0])
    const csvContent = [
      keys.join(','),
      ...data.map(row => 
        keys.map(key => {
          const value = row[key]
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Enhanced Revenue Chart with wave/line design
  const RevenueChart: React.FC = () => {
    if (salesData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center bg-surface-50 rounded-lg border-2 border-dashed border-surface-300">
          <div className="text-center">
            <svg className="w-12 h-12 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v15" />
            </svg>
            <p className="text-surface-500 font-medium">No revenue data available</p>
            <p className="text-surface-400 text-sm">Start making sales to see revenue trends</p>
          </div>
        </div>
      )
    }

    const chartData = salesData.map(day => ({
      label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: day.revenue || 0 // Ensure no NaN values
    }))

    // Calculate max value for better scaling with validation
    const validValues = chartData.map(d => d.value).filter(v => !isNaN(v) && isFinite(v))
    const maxValue = validValues.length > 0 ? Math.max(...validValues) : 1 // Fallback to 1 to avoid division by zero
    const chartHeight = 280
    const chartWidth = 400
    const padding = 40
    
    // Validate that we have enough data and valid dimensions
    if (chartData.length === 0 || maxValue <= 0) {
      return (
        <div className="h-64 flex items-center justify-center bg-surface-50 rounded-lg border-2 border-dashed border-surface-300">
          <div className="text-center">
            <p className="text-surface-500 font-medium">Invalid chart data</p>
            <p className="text-surface-400 text-sm">Chart data contains invalid values</p>
          </div>
        </div>
      )
    }
    
    // Create SVG path for smooth wave line with validation
    const createWavePath = (data: typeof chartData) => {
      if (data.length < 2) return ''
      
      const stepX = (chartWidth - padding * 2) / Math.max(data.length - 1, 1)
      let path = ''
      
      data.forEach((point, index) => {
        const x = padding + index * stepX
        const normalizedValue = Math.max(0, Math.min(1, point.value / maxValue)) // Normalize between 0-1
        const y = chartHeight - padding - (normalizedValue * (chartHeight - padding * 2))
        
        // Validate coordinates
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
          return // Skip invalid points
        }
        
        if (index === 0) {
          path += `M ${x} ${y}`
        } else {
          // Create smooth curve using quadratic bezier
          const prevIndex = Math.max(0, index - 1)
          const prevX = padding + prevIndex * stepX
          const prevNormalizedValue = Math.max(0, Math.min(1, data[prevIndex].value / maxValue))
          const prevY = chartHeight - padding - (prevNormalizedValue * (chartHeight - padding * 2))
          const controlX = (prevX + x) / 2
          
          // Validate previous coordinates
          if (!isNaN(prevX) && !isNaN(prevY) && !isNaN(controlX) && isFinite(prevX) && isFinite(prevY) && isFinite(controlX)) {
            path += ` Q ${controlX} ${prevY} ${x} ${y}`
          }
        }
      })
      
      return path
    }
    
    return (
      <div className="space-y-4">
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4" style={{ height: chartHeight }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Grid lines */}
            <defs>
              <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.2"/>
              </linearGradient>
            </defs>
            
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = chartHeight - padding - (ratio * (chartHeight - padding * 2))
              const gridValue = Math.round(maxValue * ratio)
              
              return (
                <g key={index}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    fontSize="10"
                    fill="#6B7280"
                    textAnchor="end"
                  >
                    ₱{gridValue.toLocaleString()}
                  </text>
                </g>
              )
            })}
            
            {/* Wave line */}
            <path
              d={createWavePath(chartData)}
              fill="none"
              stroke="url(#revenueGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Data points */}
            {chartData.map((point, index) => {
              const stepX = (chartWidth - padding * 2) / Math.max(chartData.length - 1, 1)
              const x = padding + index * stepX
              const normalizedValue = Math.max(0, Math.min(1, point.value / maxValue))
              const y = chartHeight - padding - (normalizedValue * (chartHeight - padding * 2))
              
              // Only render if coordinates are valid
              if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
                return null
              }
              
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                    className="hover:r-6 transition-all cursor-pointer"
                  />
                  {/* Data labels */}
                  <text
                    x={x}
                    y={chartHeight - 10}
                    fontSize="10"
                    fill="#6B7280"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                </g>
              )
            })}
            
            {/* Area fill under the wave */}
            {chartData.length > 1 && (
              <path
                d={`${createWavePath(chartData)} L ${padding + (chartData.length - 1) * ((chartWidth - padding * 2) / Math.max(chartData.length - 1, 1))} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`}
                fill="url(#revenueGradient)"
                fillOpacity="0.1"
              />
            )}
          </svg>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span className="text-surface-600">Revenue Trend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary-300 rounded-full"></div>
              <span className="text-surface-600">Peak: ₱{maxValue.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-surface-500">
            {salesData.length} days of data
          </div>
        </div>
      </div>
    )
  }

  const CategoryChart: React.FC = () => {
    if (inventoryAnalytics.categoryBreakdown.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-2">No Category Data</h4>
            <p className="text-slate-500 text-sm">Category breakdown will appear when sales data is available</p>
          </div>
        </div>
      )
    }

    const chartData = inventoryAnalytics.categoryBreakdown.map(category => ({
      label: category.category,
      value: category.value
    }))

    // Calculate total value for percentages
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0)
    
    // Enhanced color palette for professional look
    const colorPalette = [
      { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-700', light: 'bg-blue-50' },
      { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50' },
      { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-700', light: 'bg-purple-50' },
      { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-700', light: 'bg-orange-50' },
      { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-700', light: 'bg-pink-50' },
      { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-indigo-700', light: 'bg-indigo-50' },
      { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-teal-700', light: 'bg-teal-50' },
      { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-700', light: 'bg-red-50' }
    ]
    
    return (
      <div className="h-96 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-1">Category Distribution</h4>
              <p className="text-sm text-slate-500">Revenue breakdown across product categories</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Value</p>
              <p className="text-lg font-bold text-slate-800">₱{totalValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Scroll Indicator */}
          {chartData.length > 4 && (
            <div className="flex items-center justify-center mb-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Scroll to view all {chartData.length} categories</span>
              </div>
            </div>
          )}

          {/* Professional Category Breakdown - Scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {chartData.map((category, index) => {
              const color = colorPalette[index % colorPalette.length]
              const percentage = totalValue > 0 ? (category.value / totalValue) * 100 : 0
              const categoryInfo = inventoryAnalytics.categoryBreakdown[index]
              
              return (
                <div key={category.label} className="group flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-4 h-4 rounded-full ${color.bg} border-2 ${color.border} shadow-sm flex-shrink-0`}></div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-medium text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                          {category.label}
                        </h5>
                        <p className="text-xs text-slate-500">{categoryInfo.items} items</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-slate-800">₱{category.value.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full ${color.bg} rounded-full transition-all duration-500 ease-out shadow-sm`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Footer */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex-shrink-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Categories</p>
                <p className="text-lg font-bold text-slate-800">{chartData.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Top Category</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {chartData.length > 0 ? chartData.reduce((max, cat) => cat.value > max.value ? cat : max).label : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Avg Value</p>
                <p className="text-lg font-bold text-slate-800">
                  ₱{chartData.length > 0 ? Math.round(totalValue / chartData.length).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Advanced Analytics</h2>
          <p className="text-surface-600 text-sm">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {['today', 'week', 'month', 'quarter'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                selectedPeriod === period
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-surface-200 p-2">
        <div className="flex space-x-1">
          {[
            { id: 'sales', label: 'Sales Analytics', icon: '💰' },
            { id: 'inventory', label: 'Inventory', icon: '📦' },
            { id: 'customers', label: 'Customers', icon: '👥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sales Analytics Tab */}
      {selectedTab === 'sales' && (
        <div className="space-y-8">
          {/* Payment Methods Analytics - Top Priority */}
          <PaymentMethodsAnalytics />
          
          {/* Sales Performance Dashboard */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
            <div className="p-6 border-b border-surface-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-surface-900 mb-1">Sales Performance Dashboard</h3>
                  <p className="text-sm text-surface-500">Comprehensive sales analytics and key performance indicators</p>
                </div>
                {salesData.length > 0 && (
                  <button
                    onClick={() => exportData(salesData, 'sales-analytics-export')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Analytics
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Charts and Analytics Section */}
              {salesData.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v15" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-surface-900 mb-3">No Sales Data Available</h3>
                  <p className="text-surface-600 mb-6 max-w-md mx-auto">
                    Start making sales through the POS system to see detailed analytics and performance metrics.
                  </p>
                  <button 
                    onClick={() => window.location.href = '#pos'}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
                  >
                    Go to POS System
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Performance Insights Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">Growth</span>
                      </div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Revenue Growth</h4>
                      <p className="text-2xl font-bold text-green-900">
                        {salesData.length > 1 ? 
                          `${((salesData[salesData.length - 1].revenue / salesData[0].revenue - 1) * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </p>
                      <p className="text-xs text-green-600 mt-1">Since first sale</p>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full font-semibold">Peak</span>
                      </div>
                      <h4 className="text-sm font-semibold text-indigo-700 mb-2">Best Performance Day</h4>
                      <p className="text-lg font-bold text-indigo-900">
                        {salesData.length > 0 ? 
                          new Date(salesData.reduce((best, day) => day.revenue > best.revenue ? day : best).date)
                            .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'N/A'
                        }
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        ₱{salesData.length > 0 ? 
                          salesData.reduce((best, day) => day.revenue > best.revenue ? day : best).revenue.toLocaleString()
                          : '0'
                        } revenue
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v15" />
                          </svg>
                        </div>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-semibold">Trend</span>
                      </div>
                      <h4 className="text-sm font-semibold text-orange-700 mb-2">Daily Average</h4>
                      <p className="text-2xl font-bold text-orange-900">
                        ₱{salesData.length > 0 ? 
                          Math.round(salesData.reduce((sum, day) => sum + day.revenue, 0) / salesData.length).toLocaleString()
                          : '0'
                        }
                      </p>
                      <p className="text-xs text-orange-600 mt-1">Average daily revenue</p>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Revenue Trends Chart */}
                    <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h4 className="text-lg font-semibold text-surface-900 mb-1">Revenue Trends</h4>
                          <p className="text-sm text-surface-500">Daily revenue performance over time</p>
                        </div>
                        <button
                          onClick={() => exportData(salesData, 'revenue-trends')}
                          className="text-xs bg-surface-100 hover:bg-surface-200 text-surface-600 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Export
                        </button>
                      </div>
                      <RevenueChart />
                    </div>

                    {/* Sales Category Chart */}
                    <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h4 className="text-lg font-semibold text-surface-900 mb-1">Sales by Category</h4>
                          <p className="text-sm text-surface-500">Revenue breakdown by product categories</p>
                        </div>
                        <button
                          onClick={() => exportData(inventoryAnalytics.categoryBreakdown, 'sales-by-category')}
                          className="text-xs bg-surface-100 hover:bg-surface-200 text-surface-600 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Export
                        </button>
                      </div>
                      <CategoryChart />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Analytics Tab */}
      {selectedTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Total Items</p>
                  {loadingInventory ? (
                    <div className="h-8 w-16 bg-surface-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-surface-900">{inventoryAnalytics.totalItems}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Total Value</p>
                  {loadingInventory ? (
                    <div className="h-8 w-24 bg-surface-200 rounded animate-pulse"></div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-surface-900">₱{inventoryAnalytics.totalValue.toLocaleString()}</p>
                      {inventoryAnalytics.totalValue === 0 && realInventoryItems.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">Add cost data to items in Inventory Center</p>
                      )}
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Low Stock</p>
                  {loadingInventory ? (
                    <div className="h-8 w-12 bg-surface-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">{inventoryAnalytics.lowStockItems}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Out of Stock</p>
                  {loadingInventory ? (
                    <div className="h-8 w-12 bg-surface-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-red-600">{inventoryAnalytics.outOfStockItems}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-900">Inventory by Category</h3>
              <button
                onClick={() => exportData(inventoryAnalytics.categoryBreakdown, 'inventory-categories')}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Export
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {inventoryAnalytics.categoryBreakdown.map((category) => (
                <div key={category.category} className="p-4 bg-surface-50 rounded-lg">
                  <h4 className="font-semibold text-surface-900">{category.category}</h4>
                  <p className="text-2xl font-bold text-primary-600">₱{category.value.toLocaleString()}</p>
                  <p className="text-sm text-surface-500">{category.items} items ({category.percentage}%)</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Analytics Tab */}
      {selectedTab === 'customers' && (
        <div className="space-y-6">
          {/* Customer Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Customer Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-600">Total Customers</span>
                  <span className="font-semibold">{customerAnalytics.totalCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">New Customers</span>
                  <span className="font-semibold text-green-600">+{customerAnalytics.newCustomers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">Returning Customers</span>
                  <span className="font-semibold text-blue-600">{customerAnalytics.returningCustomers}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Customer Behavior</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-600">Avg Orders/Customer</span>
                  <span className="font-semibold">{customerAnalytics.averageOrdersPerCustomer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">Satisfaction Score</span>
                  <span className="font-semibold">{customerAnalytics.customerSatisfaction}/5</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Customers</h3>
              <div className="space-y-3">
                {customerAnalytics.topCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-surface-500 font-medium">No customer data</p>
                    <p className="text-surface-400 text-sm">Customer insights will appear here</p>
                  </div>
                ) : (
                  customerAnalytics.topCustomers.slice(0, 3).map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-surface-900">{customer.name}</p>
                        <p className="text-sm text-surface-500">{customer.totalOrders} orders</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.loyaltyLevel === 'platinum' ? 'bg-purple-100 text-purple-800' :
                        customer.loyaltyLevel === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                        customer.loyaltyLevel === 'silver' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {customer.loyaltyLevel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedAnalytics
