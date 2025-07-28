'use client'

import React, { useState, useEffect } from 'react'
import AdvancedSearch from '@/components/AdvancedSearch'
import BulkOperations from '@/components/BulkOperations'
import SimpleChart from '@/components/SimpleChart'
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
  stockPredictions: StockPrediction[]
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

interface StockPrediction {
  id: string
  itemName: string
  currentStock: number
  dailyUsage: number
  daysUntilEmpty: number
  status: 'critical' | 'warning' | 'normal'
  recommendedAction: string
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

  // Calculate real inventory analytics from actual data
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    averageStockLevel: 0,
    topMovingItems: [],
    categoryBreakdown: [],
    stockPredictions: []
  })

  // Subscribe to real inventory data
  useEffect(() => {
    if (!selectedBranch?.id || !profile?.uid) {
      console.log('[Analytics] Missing requirements - Branch:', selectedBranch?.id, 'Profile:', profile?.uid)
      return
    }

    const locationId = getBranchLocationId(selectedBranch.id)
    console.log('[Analytics] Setting up inventory subscription for location:', locationId)
    
    setLoadingInventory(true)
    const unsubscribe = subscribeToInventoryItems(
      profile.uid,
      locationId,
      (items: InventoryItem[]) => {
        console.log('[Analytics] Received inventory items:', items.length, items)
        setRealInventoryItems(items)
        setLoadingInventory(false)
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
      profile.uid,
      (orders: POSOrder[]) => {
        console.log('[Analytics] Received POS orders:', orders.length, orders)
        setRealPOSOrders(orders)
        
        // Transform orders into sales data for analytics
        const salesByDate = transformOrdersToSalesData(orders)
        setSalesData(salesByDate)
        setLoadingOrders(false)
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
        categoryBreakdown: [],
        stockPredictions: []
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
      categoryBreakdown,
      stockPredictions: [] // TODO: Implement predictions
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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sales' | 'inventory' | 'customers' | 'predictions'>('overview')
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

  // Enhanced Revenue Chart with better design
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
      value: day.revenue
    }))
    
    return (
      <div className="space-y-4">
        <SimpleChart data={chartData} type="line" height={280} />
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span className="text-surface-600">Revenue Trend</span>
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
        <div className="h-48 flex items-center justify-center bg-surface-50 rounded-lg border-2 border-dashed border-surface-300">
          <div className="text-center">
            <svg className="w-12 h-12 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <p className="text-surface-500 font-medium">No category data</p>
            <p className="text-surface-400 text-sm">Sales data will appear here</p>
          </div>
        </div>
      )
    }

    const chartData = inventoryAnalytics.categoryBreakdown.map(category => ({
      label: category.category,
      value: category.value
    }))
    
    return <SimpleChart data={chartData} type="pie" height={200} />
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
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'sales', label: 'Sales Analytics', icon: '💰' },
            { id: 'inventory', label: 'Inventory', icon: '📦' },
            { id: 'customers', label: 'Customers', icon: '👥' },
            { id: 'predictions', label: 'Predictions', icon: '🔮' }
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

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Loading State */}
          {(loadingOrders || loadingInventory) && (
            <div className="bg-white p-6 rounded-xl border border-surface-200 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                <span className="text-surface-600">Loading analytics data...</span>
              </div>
            </div>
          )}

          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-surface-900">₱{currentMetrics.revenue.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-1">
                    {loadingOrders ? 'Loading...' : `${salesData.length} days of data`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Total Orders</p>
                  <p className="text-2xl font-bold text-surface-900">{currentMetrics.orders.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-1">
                    {loadingOrders ? 'Loading...' : `${realPOSOrders.length} total orders`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Average Order Value</p>
                  <p className="text-2xl font-bold text-surface-900">₱{currentMetrics.averageOrderValue.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-1">
                    {loadingOrders ? 'Loading...' : 'Per completed order'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Avg Order Value</p>
                  <p className="text-2xl font-bold text-surface-900">₱{currentMetrics.averageOrderValue.toFixed(0)}</p>
                  <p className={`text-sm ${currentMetrics.aovGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentMetrics.aovGrowth > 0 ? '+' : ''}{currentMetrics.aovGrowth}% vs last period
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Total Customers</p>
                  <p className="text-2xl font-bold text-surface-900">{customerAnalytics.totalCustomers.toLocaleString()}</p>
                  <p className="text-xs text-surface-400 mt-1">
                    {loadingOrders ? 'Loading...' : `${customerAnalytics.newCustomers} new this month`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900">Revenue Trends</h3>
                <button
                  onClick={() => exportData(salesData, 'sales-data')}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Export
                </button>
              </div>
              <div className="h-64 bg-surface-50 rounded-lg flex items-center justify-center">
                <p className="text-surface-500">Revenue chart will be implemented</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900">Sales by Category</h3>
                <button
                  onClick={() => exportData(inventoryAnalytics.categoryBreakdown, 'category-breakdown')}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Export
                </button>
              </div>
              <div className="h-64 bg-surface-50 rounded-lg flex items-center justify-center">
                <p className="text-surface-500">Category chart will be implemented</p>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Performing Items</h3>
              <div className="space-y-3">
                {inventoryAnalytics.topMovingItems.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <p className="text-surface-500 font-medium">No data available</p>
                    <p className="text-surface-400 text-sm">Sales data will appear here</p>
                  </div>
                ) : (
                  inventoryAnalytics.topMovingItems.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-semibold text-primary-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900">{item.name}</p>
                          <p className="text-sm text-surface-500">{item.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-surface-900">{item.quantityUsed}</p>
                        <p className="text-sm text-surface-500">units</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Analytics Tab */}
      {selectedTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-surface-200">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Detailed Sales Analytics</h3>
            
            {/* Sales Filters */}
            <div className="mb-6">
              <AdvancedSearch
                onSearch={(searchTerm: string, filters: any) => {
                  setSearchQuery(searchTerm)
                  setFilters(filters)
                }}
                filters={[
                  {
                    key: 'dateRange',
                    label: 'Date Range',
                    type: 'date',
                  },
                  {
                    key: 'paymentMethod',
                    label: 'Payment Method',
                    type: 'select',
                    options: [
                      { value: 'cash', label: 'Cash' },
                      { value: 'card', label: 'Card' },
                      { value: 'digital', label: 'Digital Wallet' }
                    ]
                  }
                ]}
                placeholder="Search sales data..."
              />
            </div>

            {/* Sales Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Date</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Revenue</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Orders</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Customers</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Avg Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {salesData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-surface-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v15" />
                          </svg>
                          <p className="text-surface-500 font-medium">No sales data available</p>
                          <p className="text-surface-400 text-sm">Sales records will appear here once you start making sales</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    salesData.map((day) => (
                      <tr key={day.date} className="hover:bg-surface-50">
                        <td className="px-6 py-4 text-surface-900">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-surface-900">
                          ₱{day.revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-surface-700">
                          {day.orders}
                        </td>
                        <td className="px-6 py-4 text-right text-surface-700">
                          {day.customers}
                        </td>
                        <td className="px-6 py-4 text-right text-surface-700">
                          ₱{day.averageOrderValue.toFixed(0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

      {/* Predictions Tab */}
      {selectedTab === 'predictions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-surface-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Stock Predictions & Alerts</h3>
              <button
                onClick={() => exportData(inventoryAnalytics.stockPredictions, 'stock-predictions')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Export Predictions
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Item</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Current Stock</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Daily Usage</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Days Until Empty</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-surface-700">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {inventoryAnalytics.stockPredictions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-surface-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v15" />
                          </svg>
                          <p className="text-surface-500 font-medium">No predictions available</p>
                          <p className="text-surface-400 text-sm">Stock predictions will appear when inventory data is available</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    inventoryAnalytics.stockPredictions.map((prediction) => (
                      <tr key={prediction.id} className="hover:bg-surface-50">
                        <td className="px-6 py-4 font-medium text-surface-900">{prediction.itemName}</td>
                        <td className="px-6 py-4 text-right text-surface-700">{prediction.currentStock}</td>
                        <td className="px-6 py-4 text-right text-surface-700">{prediction.dailyUsage.toFixed(1)}</td>
                        <td className="px-6 py-4 text-right text-surface-700">{prediction.daysUntilEmpty}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            prediction.status === 'critical' ? 'bg-red-100 text-red-800' :
                            prediction.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {prediction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-surface-700">{prediction.recommendedAction}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedAnalytics
