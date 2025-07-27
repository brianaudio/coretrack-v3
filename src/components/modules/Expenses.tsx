'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { useFeatureAccess } from '../../lib/hooks/useFeatureAccess'
import { 
  getExpenses, 
  addExpense, 
  updateExpense, 
  deleteExpense,
  getExpenseCategories,
  addExpenseCategory,
  type Expense,
  type ExpenseCategory,
  type CreateExpense,
  type CreateExpenseCategory
} from '../../lib/firebase/expenses'
import { 
  getPOSOrders, 
  getPOSItems,
  type POSOrder,
  type POSItem 
} from '../../lib/firebase/pos'
import { Timestamp } from 'firebase/firestore'

export default function Expenses() {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { canAddProduct, blockActionWithLimit } = useFeatureAccess()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [dateFilter, setDateFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Profit tracking state
  const [profitData, setProfitData] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0
  })
  const [profitLoading, setProfitLoading] = useState(false)

  const [newExpense, setNewExpense] = useState({
    title: '',
    category: '',
    amount: 0,
    description: '',
    vendor: '',
    receiptNumber: '',
    paymentMethod: 'cash' as const,
    date: new Date().toISOString().split('T')[0]
  })

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    budget: 0
  })

  // Helper functions
  const getTotalExpenses = useCallback((filtered: Expense[]) => {
    return filtered.reduce((sum, expense) => sum + expense.amount, 0)
  }, [])

  // Filter expenses for profit calculation using the same date logic as orders
  const getFilteredExpensesForProfitCalculation = useCallback(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return expenses.filter(expense => {
      const expenseDate = expense.date.toDate()
      
      switch (dateFilter) {
        case 'today':
          return expenseDate >= startOfToday
        case 'week':
          return expenseDate >= startOfWeek
        case 'month':
          return expenseDate >= startOfMonth
        default:
          return true
      }
    })
  }, [expenses, dateFilter])

  // Filter orders based on date filter
  const getFilteredOrders = useCallback((orders: POSOrder[]) => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return orders.filter(order => {
      const orderDate = order.createdAt.toDate()
      
      switch (dateFilter) {
        case 'today':
          return orderDate >= startOfToday
        case 'week':
          return orderDate >= startOfWeek
        case 'month':
          return orderDate >= startOfMonth
        default:
          return true
      }
    })
  }, [dateFilter])

  // Calculate profit metrics
  const calculateProfitMetrics = useCallback(async () => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      setProfitLoading(true)
      
      const locationId = getBranchLocationId(selectedBranch.id)
      // Get orders and menu items for the selected date range
      const [orders, menuItems] = await Promise.all([
        getPOSOrders(profile.tenantId, locationId),
        getPOSItems(profile.tenantId, locationId)
      ])

      // Filter orders based on date filter - inline filtering to avoid dependency
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const filteredOrders = orders.filter(order => {
        const orderDate = order.createdAt.toDate()
        
        switch (dateFilter) {
          case 'today':
            return orderDate >= startOfToday
          case 'week':
            return orderDate >= startOfWeek
          case 'month':
            return orderDate >= startOfMonth
          default:
            return true
        }
      })
      
      // Calculate total revenue from completed orders
      const totalRevenue = filteredOrders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.total, 0)

      // Calculate COGS by matching order items with menu item costs
      let totalCOGS = 0
      filteredOrders
        .filter(order => order.status === 'completed')
        .forEach(order => {
          order.items.forEach(orderItem => {
            const menuItem = menuItems.find(item => item.id === orderItem.itemId)
            if (menuItem) {
              totalCOGS += menuItem.cost * orderItem.quantity
            }
          })
        })

      // Calculate gross profit
      const grossProfit = totalRevenue - totalCOGS

      // Get filtered expenses for the same date period - inline filtering to avoid dependency
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = expense.date.toDate()
        
        switch (dateFilter) {
          case 'today':
            return expenseDate >= startOfToday
          case 'week':
            return expenseDate >= startOfWeek
          case 'month':
            return expenseDate >= startOfMonth
          default:
            return true
        }
      })
      
      const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

      // Calculate net profit (gross profit minus expenses)
      const netProfit = grossProfit - totalExpenses

      console.log('Profit Calculation Debug:', {
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        filteredExpensesCount: filteredExpenses.length
      })

      setProfitData({
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit
      })
    } catch (error) {
      console.error('Error calculating profit metrics:', error)
    } finally {
      setProfitLoading(false)
    }
  }, [profile?.tenantId, selectedBranch?.id, dateFilter, expenses]) // Include selectedBranch in dependencies

  // Load expenses and categories
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) {
      // No tenant or branch: set empty state
      setLoading(false)
      setProfitLoading(false)
      setExpenses([])
      setCategories([])
      setProfitData({
        totalRevenue: 0,
        totalCOGS: 0,
        grossProfit: 0,
        totalExpenses: 0,
        netProfit: 0
      })
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        const [expensesData, categoriesData] = await Promise.all([
          getExpenses(profile.tenantId, locationId),
          getExpenseCategories(profile.tenantId)
        ])
        setExpenses(expensesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading expenses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.tenantId, selectedBranch?.id]) // Re-run when tenantId or branch changes

  // Separate effect to calculate profit metrics when expenses or date filter changes
  useEffect(() => {
    if (profile?.tenantId && expenses.length >= 0) { // Allow empty expenses array
      calculateProfitMetrics()
    }
  }, [profile?.tenantId, expenses, dateFilter]) // Remove calculateProfitMetrics from dependencies

  const handleCreateExpense = async () => {
    if (!profile?.tenantId || !selectedBranch || !newExpense.title || !newExpense.amount || !newExpense.category) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      const expenseData: CreateExpense = {
        title: newExpense.title,
        category: newExpense.category,
        amount: newExpense.amount,
        description: newExpense.description,
        vendor: newExpense.vendor,
        receiptNumber: newExpense.receiptNumber,
        paymentMethod: newExpense.paymentMethod,
        date: new Date(newExpense.date),
        createdBy: profile.uid,
        tenantId: profile.tenantId,
        locationId: locationId
      }

      await addExpense(expenseData)
      
      // Refresh expenses
      const updatedExpenses = await getExpenses(profile.tenantId, locationId)
      setExpenses(updatedExpenses)
      
      // Recalculate profit metrics
      await calculateProfitMetrics()
      
      // Reset form
      setNewExpense({
        title: '',
        category: '',
        amount: 0,
        description: '',
        vendor: '',
        receiptNumber: '',
        paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0]
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating expense:', error)
    }
  }

  const handleCreateCategory = async () => {
    if (!profile?.tenantId || !newCategory.name) return

    try {
      const categoryData: CreateExpenseCategory = {
        name: newCategory.name,
        description: newCategory.description,
        budget: newCategory.budget || undefined,
        tenantId: profile.tenantId
      }

      await addExpenseCategory(categoryData)
      
      // Refresh categories
      const updatedCategories = await getExpenseCategories(profile.tenantId)
      setCategories(updatedCategories)
      
      // Reset form
      setNewCategory({
        name: '',
        description: '',
        budget: 0
      })
      setShowCategoryModal(false)
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleUpdateExpense = async () => {
    if (!profile?.tenantId || !editingExpense) return

    try {
      await updateExpense(profile.tenantId, editingExpense.id!, {
        title: editingExpense.title,
        amount: editingExpense.amount,
        description: editingExpense.description,
        vendor: editingExpense.vendor
      })
      
      // Update local state
      setExpenses(prev => prev.map(expense => 
        expense.id === editingExpense.id ? editingExpense : expense
      ))
      
      // Recalculate profit metrics
      await calculateProfitMetrics()
      
      setEditingExpense(null)
    } catch (error) {
      console.error('Error updating expense:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!profile?.tenantId || !confirm('Are you sure you want to delete this expense?')) return

    try {
      await deleteExpense(profile.tenantId, expenseId)
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId))
      
      // Recalculate profit metrics
      await calculateProfitMetrics()
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const getFilteredExpenses = () => {
    let filtered = expenses

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter)
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      const startDate = new Date()

      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      if (dateFilter !== 'all') {
        filtered = filtered.filter(expense => 
          expense.date.toDate() >= startDate
        )
      }
    }

    return filtered.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredExpenses = getFilteredExpenses()
  const totalExpenses = getTotalExpenses(filteredExpenses)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Profit and Expenses</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add Category
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Expense
          </button>
        </div>
      </div>

      {/* Profit Analysis Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Profit Analysis</h3>
          <button
            onClick={calculateProfitMetrics}
            disabled={profitLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {profitLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Calculating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Total Revenue</span>
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              ₱{profitData.totalRevenue.toFixed(2)}
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-700">Cost of Goods Sold</span>
              <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
              </svg>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              ₱{profitData.totalCOGS.toFixed(2)}
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Gross Profit</span>
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"/>
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-900">
              ₱{profitData.grossProfit.toFixed(2)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {profitData.totalRevenue > 0 ? ((profitData.grossProfit / profitData.totalRevenue) * 100).toFixed(1) : 0}% margin
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700">Total Expenses</span>
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
              </svg>
            </div>
            <div className="text-2xl font-bold text-red-900">
              ₱{profitData.totalExpenses.toFixed(2)}
            </div>
          </div>

          {/* Net Profit */}
          <div className={`bg-gradient-to-br p-4 rounded-lg border ${
            profitData.netProfit >= 0 
              ? 'from-emerald-50 to-emerald-100 border-emerald-200' 
              : 'from-red-50 to-red-100 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                profitData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>Net Profit</span>
              <svg className={`w-5 h-5 ${
                profitData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`} fill="currentColor" viewBox="0 0 24 24">
                {profitData.netProfit >= 0 ? (
                  <path d="M7 14L12 9L17 14H7Z"/>
                ) : (
                  <path d="M7 10L12 15L17 10H7Z"/>
                )}
              </svg>
            </div>
            <div className={`text-2xl font-bold ${
              profitData.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'
            }`}>
              ₱{profitData.netProfit.toFixed(2)}
            </div>
            <div className={`text-xs mt-1 ${
              profitData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {profitData.totalRevenue > 0 ? ((profitData.netProfit / profitData.totalRevenue) * 100).toFixed(1) : 0}% net margin
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900">{expenses.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">This Month</div>
          <div className="text-2xl font-bold text-red-600">
            ₱{getTotalExpenses(expenses.filter(e => {
              const expenseDate = e.date.toDate()
              const now = new Date()
              return expenseDate.getMonth() === now.getMonth() && 
                     expenseDate.getFullYear() === now.getFullYear()
            })).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Categories</div>
          <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Filtered Total</div>
          <div className="text-2xl font-bold text-green-600">₱{totalExpenses.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">Last Year</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                    {expense.description && (
                      <div className="text-sm text-gray-500">{expense.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₱{expense.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setEditingExpense(expense)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Expense Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Expense title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor (Optional)
                </label>
                <input
                  type="text"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Vendor name"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={!newExpense.title || !newExpense.amount || !newExpense.category}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Category</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCategory.budget}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCategory.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Expense</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingExpense.description || ''}
                  onChange={(e) => setEditingExpense(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateExpense}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
