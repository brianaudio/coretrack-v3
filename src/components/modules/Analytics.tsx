'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { 
  getDashboardStats, 
  getSalesChartData,
  getTopSellingItems,
  getCategoryPerformance,
  type DashboardStats,
  type SalesData,
  type TopSellingItem
} from '../../lib/firebase/analytics'
import {
  getInventoryAnalytics,
  type InventoryAnalytics,
  type InventoryValueItem,
  type StockMovementData,
  type CategoryAnalytics,
  type StockPrediction,
  type UsageAnalytics
} from '../../lib/firebase/inventoryAnalytics'
import {
  getExpensesByDateRange,
  type Expense
} from '../../lib/firebase/expenses'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

export default function Analytics() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedMetric, setSelectedMetric] = useState('sales')
  const [selectedTab, setSelectedTab] = useState('overview') // overview, inventory, predictions, usage
  const [loading, setLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [topItems, setTopItems] = useState<TopSellingItem[]>([])
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Load analytics data
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) return

    const loadAnalyticsData = async () => {
      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        const days = selectedPeriod === 'day' ? 1 : selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365
        
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const endDate = new Date()
        
        const [stats, salesChart, topSellingItems, inventoryData, expensesData] = await Promise.all([
          getDashboardStats(profile.tenantId, locationId),
          getSalesChartData(profile.tenantId, days, locationId),
          getTopSellingItems(profile.tenantId, days, 10, locationId),
          getInventoryAnalytics(profile.tenantId, days, locationId),
          getExpensesByDateRange(profile.tenantId, startDate, endDate)
        ])
        
        setDashboardStats(stats)
        setSalesData(salesChart)
        setTopItems(topSellingItems)
        setInventoryAnalytics(inventoryData)
        setExpenses(expensesData)
      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [profile?.tenantId, selectedBranch?.id, selectedPeriod, selectedBranch])

  const totalSales = salesData.reduce((sum, day) => sum + day.revenue, 0)
  const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0)
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0
  
  // Calculate expenses and profit
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const grossProfit = totalSales - (inventoryAnalytics?.totalValue || 0)
  const netProfit = grossProfit - totalExpenses
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0

  // Chart colors
  const chartColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
  
  // Export functionality
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return
    
    const keys = Object.keys(data[0])
    const csvContent = [
      keys.join(','),
      ...data.map(row => keys.map(key => {
        const value = row[key]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value
      }).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const exportInventoryReport = () => {
    if (!inventoryAnalytics) return
    
    const reportData = [
      { metric: 'Total Items', value: inventoryAnalytics.totalItems },
      { metric: 'Total Value', value: `₱${inventoryAnalytics.totalValue.toFixed(2)}` },
      { metric: 'Low Stock Items', value: Array.isArray(inventoryAnalytics.lowStockItems) ? inventoryAnalytics.lowStockItems.length : inventoryAnalytics.lowStockItems },
      { metric: 'Out of Stock Items', value: Array.isArray(inventoryAnalytics.outOfStockItems) ? inventoryAnalytics.outOfStockItems.length : inventoryAnalytics.outOfStockItems },
      { metric: 'Average Stock Level', value: inventoryAnalytics.averageStockLevel.toFixed(2) },
    ]
    
    exportToCSV(reportData, 'inventory-summary')
  }

  const exportStockPredictions = () => {
    if (!inventoryAnalytics?.stockPredictions) return
    
    const predictionData = inventoryAnalytics.stockPredictions.map(pred => ({
      'Item Name': pred.itemName,
      'Current Stock': pred.currentStock,
      'Unit': pred.unit,
      'Daily Usage Rate': pred.dailyUsageRate.toFixed(2),
      'Days Until Empty': pred.daysUntilEmpty,
      'Status': pred.status,
      'Recommended Reorder Date': pred.recommendedReorderDate.toLocaleDateString()
    }))
    
    exportToCSV(predictionData, 'stock-predictions')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-surface-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs and Controls */}
      <div className="card p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-xl font-bold text-surface-900">Advanced Analytics Dashboard</h2>
              <p className="text-surface-600">Comprehensive insights for sales, inventory, and operations</p>
            </div>
            <div className="flex space-x-2">
              {['day', 'week', 'month', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
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
          <div className="flex space-x-1 bg-surface-100 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'inventory', label: 'Inventory', icon: '📦' },
              { id: 'predictions', label: 'Predictions', icon: '🔮' },
              { id: 'usage', label: 'Usage Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600">Total Sales</p>
                  <p className="text-3xl font-bold text-green-600">₱{totalSales.toLocaleString()}</p>
                  <p className="text-sm text-green-600">+12.5% from last week</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600">Total Orders</p>
                  <p className="text-3xl font-bold text-blue-600">{totalOrders}</p>
                  <p className="text-sm text-blue-600">+8.2% from last week</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600">Inventory Value</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ₱{inventoryAnalytics?.totalValue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-purple-600">
                    {inventoryAnalytics?.totalItems || 0} items
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-600">Net Profit</p>
                  <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₱{netProfit.toLocaleString()}
                  </p>
                  <p className={`text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}% margin
                  </p>
                </div>
                <div className={`w-12 h-12 ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-xl flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d={netProfit >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Sales Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-900">Sales Trends</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedMetric('sales')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedMetric === 'sales'
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 text-surface-700'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setSelectedMetric('orders')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      selectedMetric === 'orders'
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 text-surface-700'
                    }`}
                  >
                    Orders
                  </button>
                </div>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [
                        selectedMetric === 'sales' ? `₱${value.toLocaleString()}` : value,
                        selectedMetric === 'sales' ? 'Revenue' : 'Orders'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric === 'sales' ? 'revenue' : 'orders'}
                      stroke={chartColors[0]}
                      fill={chartColors[0]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-6">Top Selling Items</h3>
              <div className="space-y-4">
                {topItems.slice(0, 6).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-surface-900">{item.name}</p>
                        <p className="text-sm text-surface-600">{item.quantity} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-surface-900">₱{item.revenue.toFixed(2)}</p>
                      <p className="text-sm text-surface-600">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Inventory Tab */}
      {selectedTab === 'inventory' && inventoryAnalytics && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Value Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-900">Top Value Items</h3>
                <button
                  onClick={() => {
                    const data = inventoryAnalytics.topValueItems.map(item => ({
                      'Item Name': item.name,
                      'Category': item.category,
                      'Current Stock': item.currentStock,
                      'Unit': item.unit,
                      'Cost Per Unit': item.costPerUnit,
                      'Total Value': item.totalValue
                    }))
                    exportToCSV(data, 'top-value-items')
                  }}
                  className="text-sm px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Export
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryAnalytics.topValueItems.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px' 
                      }}
                      formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Total Value']}
                    />
                    <Bar dataKey="totalValue" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-6">Category Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryAnalytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="totalValue"
                      label={({category, totalValue}) => `${category}: ₱${totalValue.toLocaleString()}`}
                      labelLine={false}
                    >
                      {inventoryAnalytics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Value']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stock Movement Trends */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-6">Stock Movement Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={inventoryAnalytics.stockMovements}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px' 
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="movements" 
                      stroke={chartColors[1]} 
                      strokeWidth={2} 
                      name="Total Movements"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="itemsAffected" 
                      stroke={chartColors[3]} 
                      strokeWidth={2} 
                      name="Items Affected"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Summary Stats */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-900">Inventory Summary</h3>
                <button
                  onClick={exportInventoryReport}
                  className="text-sm px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Export Report
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{inventoryAnalytics.totalItems}</p>
                  <p className="text-sm text-surface-600">Total Items</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">₱{inventoryAnalytics.totalValue.toLocaleString()}</p>
                  <p className="text-sm text-surface-600">Total Value</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{Array.isArray(inventoryAnalytics.lowStockItems) ? inventoryAnalytics.lowStockItems.length : inventoryAnalytics.lowStockItems}</p>
                  <p className="text-sm text-surface-600">Low Stock</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{Array.isArray(inventoryAnalytics.outOfStockItems) ? inventoryAnalytics.outOfStockItems.length : inventoryAnalytics.outOfStockItems}</p>
                  <p className="text-sm text-surface-600">Out of Stock</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Predictions Tab */}
      {selectedTab === 'predictions' && inventoryAnalytics && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Stock Predictions</h3>
                <p className="text-sm text-surface-600">AI-powered insights for inventory planning</p>
              </div>
              <button
                onClick={exportStockPredictions}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Export Predictions
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-red-800">Urgent</span>
                </div>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {inventoryAnalytics.stockPredictions.filter(p => p.status === 'urgent').length}
                </p>
                <p className="text-sm text-red-600">items need immediate attention</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium text-yellow-800">Warning</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  {inventoryAnalytics.stockPredictions.filter(p => p.status === 'warning').length}
                </p>
                <p className="text-sm text-yellow-600">items to monitor</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-800">Good</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {inventoryAnalytics.stockPredictions.filter(p => p.status === 'good').length}
                </p>
                <p className="text-sm text-green-600">items in good shape</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Current Stock</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Daily Usage</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Days Left</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Reorder Date</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryAnalytics.stockPredictions
                    .sort((a, b) => {
                      const statusOrder = { urgent: 0, warning: 1, good: 2 }
                      return statusOrder[a.status] - statusOrder[b.status]
                    })
                    .slice(0, 15)
                    .map((prediction) => (
                    <tr key={prediction.itemId} className="border-b border-surface-100">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-surface-900">{prediction.itemName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-surface-700">
                        {prediction.currentStock} {prediction.unit}
                      </td>
                      <td className="py-3 px-4 text-surface-700">
                        {prediction.dailyUsageRate.toFixed(1)} {prediction.unit}/day
                      </td>
                      <td className="py-3 px-4 text-surface-700">
                        {prediction.daysUntilEmpty === Infinity ? '∞' : Math.round(prediction.daysUntilEmpty)} days
                      </td>
                      <td className="py-3 px-4 text-surface-700">
                        {prediction.recommendedReorderDate.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prediction.status === 'urgent' 
                            ? 'bg-red-100 text-red-800' 
                            : prediction.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {prediction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Usage Analytics Tab */}
      {selectedTab === 'usage' && inventoryAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Frequency Chart */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-6">Usage Frequency Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { 
                          name: 'High Usage', 
                          value: inventoryAnalytics.usageAnalytics.filter(u => u.usageFrequency === 'high').length 
                        },
                        { 
                          name: 'Medium Usage', 
                          value: inventoryAnalytics.usageAnalytics.filter(u => u.usageFrequency === 'medium').length 
                        },
                        { 
                          name: 'Low Usage', 
                          value: inventoryAnalytics.usageAnalytics.filter(u => u.usageFrequency === 'low').length 
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}`}
                    >
                      <Cell fill={chartColors[1]} />
                      <Cell fill={chartColors[3]} />
                      <Cell fill={chartColors[5]} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Most Used Items */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-6">Most Used Items</h3>
              <div className="space-y-3">
                {inventoryAnalytics.usageAnalytics
                  .sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed)
                  .slice(0, 8)
                  .map((item, index) => (
                  <div key={item.itemId} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-surface-900">{item.itemName}</p>
                        <p className="text-xs text-surface-600">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-surface-900">{item.totalQuantityUsed.toFixed(1)}</p>
                      <p className="text-xs text-surface-600">{item.averageDailyUsage.toFixed(1)}/day</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Usage Analytics Table */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Detailed Usage Analytics</h3>
              <button
                onClick={() => {
                  const data = inventoryAnalytics.usageAnalytics.map(item => ({
                    'Item Name': item.itemName,
                    'Category': item.category,
                    'Total Movements': item.totalMovements,
                    'Total Quantity Used': item.totalQuantityUsed,
                    'Average Daily Usage': item.averageDailyUsage.toFixed(2),
                    'Last Movement': item.lastMovement.toLocaleDateString(),
                    'Usage Frequency': item.usageFrequency
                  }))
                  exportToCSV(data, 'usage-analytics')
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Export Usage Data
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Movements</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Total Used</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Daily Avg</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Last Movement</th>
                    <th className="text-left py-3 px-4 font-medium text-surface-900">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryAnalytics.usageAnalytics
                    .sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed)
                    .slice(0, 20)
                    .map((item) => (
                    <tr key={item.itemId} className="border-b border-surface-100">
                      <td className="py-3 px-4 font-medium text-surface-900">{item.itemName}</td>
                      <td className="py-3 px-4 text-surface-700">{item.category}</td>
                      <td className="py-3 px-4 text-surface-700">{item.totalMovements}</td>
                      <td className="py-3 px-4 text-surface-700">{item.totalQuantityUsed.toFixed(1)}</td>
                      <td className="py-3 px-4 text-surface-700">{item.averageDailyUsage.toFixed(2)}</td>
                      <td className="py-3 px-4 text-surface-700">{item.lastMovement.toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.usageFrequency === 'high' 
                            ? 'bg-green-100 text-green-800' 
                            : item.usageFrequency === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.usageFrequency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
