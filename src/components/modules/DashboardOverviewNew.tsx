'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import Notifications from './Notifications'
import { 
  getDashboardStats, 
  getSalesChartData,
  getTopSellingItems,
  type DashboardStats,
  type SalesData,
  type TopSellingItem
} from '../../lib/firebase/analytics'
import { getInventoryAnalytics, type InventoryAnalytics } from '../../lib/firebase/inventoryAnalytics'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function DashboardOverview() {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedView, setSelectedView] = useState('overview') // overview, analytics, detailed
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null)
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [topItems, setTopItems] = useState<TopSellingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, selectedPeriod])

  const fetchData = async () => {
    if (!user || !profile?.tenantId || !selectedBranch) return
    
    const locationId = getBranchLocationId(selectedBranch.id)
    
    try {
      setLoading(true)
      const [stats, salesChartData, topSellingItems, invAnalytics] = await Promise.all([
        getDashboardStats(profile.tenantId, locationId),
        getSalesChartData(profile.tenantId, 7), // Convert period to number
        getTopSellingItems(profile.tenantId, 10), // Convert to number
        getInventoryAnalytics(profile.tenantId)
      ])

      setDashboardStats(stats)
      setSalesData(salesChartData)
      setTopItems(topSellingItems)
      setInventoryAnalytics(invAnalytics)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const periods = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'detailed', label: 'Detailed', icon: '📋' }
  ]

  const chartColors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs and period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex space-x-1 bg-surface-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedView === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border-surface-300 text-sm"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={fetchData}
            className="btn-secondary text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-surface-900">
                    ₱{dashboardStats?.todaysSales?.revenue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">💰</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">
                +{dashboardStats?.thisWeekSales?.growth || 0}% from last period
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600">Total Orders</p>
                  <p className="text-2xl font-bold text-surface-900">
                    {dashboardStats?.todaysSales?.orders?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📦</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                +{dashboardStats?.thisWeekSales?.growth || 0}% from last period
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-surface-900">
                    ₱{dashboardStats?.todaysSales?.avgOrderValue?.toFixed(2) || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xl">💳</span>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                +{dashboardStats?.thisMonthSales?.growth || 0}% from last period
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-600">Active Items</p>
                  <p className="text-2xl font-bold text-surface-900">
                    {inventoryAnalytics?.totalItems || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📋</span>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2">
                {Array.isArray(inventoryAnalytics?.lowStockItems) ? inventoryAnalytics.lowStockItems.length : inventoryAnalytics?.lowStockItems || 0} low stock items
              </p>
            </div>
          </div>

          {/* Charts and Top Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">Sales Trend</h3>
              <div className="h-64">
                {mounted && salesData.length > 0 ? (
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
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-500">
                    No sales data available
                  </div>
                )}
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">Top Selling Items</h3>
              <div className="space-y-3">
                {topItems.slice(0, 8).map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 text-sm font-medium">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">{item.name}</p>
                        <p className="text-xs text-surface-500">{item.quantity} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-surface-900">₱{item.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications Widget */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Recent Notifications</h3>
            <Notifications showAsWidget={true} maxItems={5} />
          </div>
        </>
      )}

      {/* Analytics Tab */}
      {selectedView === 'analytics' && (
        <>
          {/* Inventory Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Value by Category */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">Inventory Value by Category</h3>
              <div className="h-64">
                {mounted && inventoryAnalytics?.categoryBreakdown && inventoryAnalytics.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryAnalytics.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={(entry) => entry.category}
                      >
                        {inventoryAnalytics.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-500">
                    No inventory data available
                  </div>
                )}
              </div>
            </div>

            {/* Stock Status */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">Stock Status Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-surface-600">Total Items</span>
                  <span className="font-medium">{inventoryAnalytics?.totalItems || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-600">Low Stock</span>
                  <span className="font-medium text-orange-600">{Array.isArray(inventoryAnalytics?.lowStockItems) ? inventoryAnalytics.lowStockItems.length : inventoryAnalytics?.lowStockItems || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-600">Out of Stock</span>
                  <span className="font-medium text-red-600">{Array.isArray(inventoryAnalytics?.outOfStockItems) ? inventoryAnalytics.outOfStockItems.length : inventoryAnalytics?.outOfStockItems || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-600">Total Value</span>
                  <span className="font-medium">₱{inventoryAnalytics?.totalValue?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">📈</span>
              </div>
              <h4 className="text-lg font-medium text-surface-900">Revenue Growth</h4>
              <p className="text-2xl font-bold text-green-600 mt-2">+{dashboardStats?.thisWeekSales?.growth || 0}%</p>
              <p className="text-sm text-surface-500 mt-1">vs. last period</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-2xl">📦</span>
              </div>
              <h4 className="text-lg font-medium text-surface-900">Order Growth</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">+{dashboardStats?.thisWeekSales?.growth || 0}%</p>
              <p className="text-sm text-surface-500 mt-1">vs. last period</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 text-2xl">💳</span>
              </div>
              <h4 className="text-lg font-medium text-surface-900">AOV Growth</h4>
              <p className="text-2xl font-bold text-purple-600 mt-2">+{dashboardStats?.thisMonthSales?.growth || 0}%</p>
              <p className="text-sm text-surface-500 mt-1">vs. last period</p>
            </div>
          </div>
        </>
      )}

      {/* Detailed Tab */}
      {selectedView === 'detailed' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-surface-900">Detailed Analytics</h2>
            <div className="flex space-x-2">
              <button className="btn-secondary text-sm">Export PDF</button>
              <button className="btn-secondary text-sm">Export CSV</button>
            </div>
          </div>

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 gap-6">
            {/* Top Items Detailed Table */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">Top Selling Items - Detailed</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-200">
                  <thead className="bg-surface-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Quantity Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Avg Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-surface-200">
                    {topItems.map((item, index) => (
                      <tr key={`${item.name}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-primary-600 text-sm font-medium">#{index + 1}</span>
                            </div>
                            <div className="text-sm font-medium text-surface-900">{item.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">
                          ₱{item.revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">
                          ₱{(item.revenue / item.quantity).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            index < 3 
                              ? 'bg-green-100 text-green-800' 
                              : index < 7 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                            }`}>
                            {index < 3 ? 'Excellent' : index < 7 ? 'Good' : 'Good'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
