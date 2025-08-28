'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { 
  getExpenses, 
  addExpense, 
  updateExpense, 
  deleteExpense,
  updateExpenseStatus,
  getExpenseCategories,
  addExpenseCategory,
  type Expense,
  type ExpenseCategory,
  type CreateExpense,
  type CreateExpenseCategory
} from '../../lib/firebase/expenses'
import EnhancedExpenseModal from './EnhancedExpenseModal'
import { 
  getPOSOrders, 
  getPOSItems,
  type POSOrder,
  type POSItem 
} from '../../lib/firebase/pos'
import { Timestamp } from 'firebase/firestore'
import { waitForOfflinePersistence, isOfflinePersistenceEnabled } from '../../lib/firebase'
export default function Expenses() {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

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
    // FIX TIMEZONE ISSUE: Use local date, not UTC
    date: (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()
  })

  // Helper functions
  const getTotalExpenses = useCallback((filtered: Expense[]) => {
    return filtered.reduce((sum, expense) => sum + expense.amount, 0)
  }, [])

  // Filter expenses for profit calculation using the same date logic as orders

  // Calculate profit metrics
  const calculateProfitMetrics = useCallback(async () => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      setProfitLoading(true)
      console.log('[FinancialPerformance] Starting calculation with:', {
        expensesCount: expenses.length,
        tenantId: profile.tenantId,
        branchId: selectedBranch.id
      })
      
      // Wait for Firebase offline persistence to be ready
      await waitForOfflinePersistence()
      
      const locationId = getBranchLocationId(selectedBranch.id)
      // Get orders and menu items
      const [orders, menuItems] = await Promise.all([
        getPOSOrders(profile.tenantId, locationId),
        getPOSItems(profile.tenantId, locationId)
      ])

      // Calculate total revenue from completed orders (no filtering)
      const totalRevenue = orders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.total, 0)

      // Calculate COGS by matching order items with menu item costs
      let totalCOGS = 0
      orders
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

      // Calculate total expenses (no filtering)
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
      
      // Debug logging
      console.log('[FinancialPerformance] Expense calculation:', {
        totalExpensesInState: expenses.length,
        totalExpenseAmount: totalExpenses,
        expenses: expenses.map(e => ({
          title: e.title,
          amount: e.amount,
          date: e.date.toDate().toLocaleDateString()
        }))
      })

      // Calculate net profit (gross profit minus expenses)
      const netProfit = grossProfit - totalExpenses

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
  }, [profile?.tenantId, selectedBranch?.id, expenses])

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
        
        // Wait for Firebase offline persistence to be ready
        await waitForOfflinePersistence()
        
        const locationId = getBranchLocationId(selectedBranch.id)
        const [expensesData, categoriesData] = await Promise.all([
          getExpenses(profile.tenantId, locationId),
          getExpenseCategories(profile.tenantId)
        ])
        setExpenses(expensesData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading expenses:', error)
        // Even if Firebase is offline, still set empty arrays to show UI
        if (!isOfflinePersistenceEnabled()) {
          console.warn('Firebase offline persistence not enabled - some data may not be available')
        }
        setExpenses([])
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.tenantId, selectedBranch?.id]) // Re-run when tenantId or branch changes

  // Separate effect to calculate profit metrics when expenses or date filter changes
  useEffect(() => {
    if (profile?.tenantId && selectedBranch && expenses.length >= 0) { // Allow empty expenses array
      calculateProfitMetrics()
    }
  }, [profile?.tenantId, selectedBranch?.id, expenses, calculateProfitMetrics])

  const handleCreateExpense = async (formData: any) => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      // Wait for Firebase offline persistence to be ready before operations
      await waitForOfflinePersistence()
      
      const locationId = getBranchLocationId(selectedBranch.id)
      const expenseData: CreateExpense = {
        title: formData.title,
        category: formData.category,
        amount: formData.amount,
        description: formData.description || '',
        vendor: formData.vendor || '',
        receiptNumber: formData.receiptUrl ? 'Receipt uploaded' : '',
        paymentMethod: formData.paymentMethod,
        // FIX TIMEZONE ISSUE: Ensure date is set for local timezone, not UTC
        date: (() => {
          const [year, month, day] = formData.date.split('-').map(Number)
          return new Date(year, month - 1, day, 12, 0, 0, 0) // Set to noon local time to avoid timezone issues
        })(),
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
      
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating expense:', error)
      if (!isOfflinePersistenceEnabled()) {
        console.warn('Firebase offline persistence not enabled - expense may not sync properly')
      }
      throw error // Re-throw to let modal handle the error
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

  const handleUpdateExpenseStatus = async (expenseId: string, newStatus: 'pending' | 'approved' | 'paid' | 'rejected') => {
    if (!profile?.tenantId) return

    try {
      await updateExpenseStatus(profile.tenantId, expenseId, newStatus, profile.uid)
      
      // Update local state
      setExpenses(prev => prev.map(expense => 
        expense.id === expenseId ? { ...expense, status: newStatus } : expense
      ))
      
      // Recalculate profit metrics if status changed to paid
      if (newStatus === 'paid') {
        await calculateProfitMetrics()
      }
    } catch (error) {
      console.error('Error updating expense status:', error)
    }
  }

  const toggleRowExpansion = (expenseId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId)
      } else {
        newSet.add(expenseId)
      }
      return newSet
    })
  }

  const getFilteredExpenses = () => {
    let filtered = expenses

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === selectedCategory)
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
          break
        case 'week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 6) // Last 7 days
          startDate.setHours(0, 0, 0, 0)
          break
        case 'month':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 29) // Last 30 days
          startDate.setHours(0, 0, 0, 0)
          break
        default:
          startDate = new Date(0) // All time
      }

      filtered = filtered.filter(expense => {
        const expenseDate = expense.date.toDate()
        return expenseDate >= startDate
      })
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(expense => 
        expense.title.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.vendor?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by date (newest first)
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
    <div className="space-y-8">
      {/* Modern Financial Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="px-8 py-6 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Financials</h1>
                <p className="text-sm text-gray-500 font-medium">Manage expenses, track budgets, and analyze your business financial health</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="group flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Expense</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Clean Financial Metrics */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Card */}
            <div className="group">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900 tracking-tight">₱{profitData.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            {/* Costs Card */}
            <div className="group">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Costs</p>
                  <p className="text-2xl font-semibold text-gray-900 tracking-tight">₱{profitData.totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            {/* Net Profit Card */}
            <div className="group">
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  profitData.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  <svg className={`w-4 h-4 ${
                    profitData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-semibold tracking-tight ${
                    profitData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    ₱{profitData.netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Profit Analysis Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-surface-900">Financial Performance</h3>
            <p className="text-sm text-surface-500 mt-1">Real-time profit analysis based on sales and expenses</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live Data</span>
            </div>
            <button
              onClick={calculateProfitMetrics}
              disabled={profitLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                </svg>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Revenue</span>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-900">₱{profitData.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-blue-600 mt-1">From completed sales</p>
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                </svg>
              </div>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">COGS</span>
            </div>
            <div>
              <p className="text-sm font-medium text-orange-700 mb-1">Cost of Goods Sold</p>
              <p className="text-3xl font-bold text-orange-900">₱{profitData.totalCOGS.toLocaleString()}</p>
              <p className="text-xs text-orange-600 mt-1">Product costs</p>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"/>
                </svg>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Gross</span>
            </div>
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Gross Profit</p>
              <p className="text-3xl font-bold text-green-900">₱{profitData.grossProfit.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">
                {profitData.totalRevenue > 0 ? ((profitData.grossProfit / profitData.totalRevenue) * 100).toFixed(1) : 0}% margin
              </p>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
                </svg>
              </div>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Expenses</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-700 mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-red-900">₱{profitData.totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-red-600 mt-1">Operating costs</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className={`bg-gradient-to-br p-6 rounded-xl border-2 hover:shadow-lg transition-shadow duration-200 ${
            profitData.netProfit >= 0 
              ? 'from-emerald-50 to-emerald-100 border-emerald-300' 
              : 'from-red-50 to-red-100 border-red-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                profitData.netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {profitData.netProfit >= 0 ? (
                    <path d="M7 14L12 9L17 14H7Z"/>
                  ) : (
                    <path d="M7 10L12 15L17 10H7Z"/>
                  )}
                </svg>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                profitData.netProfit >= 0 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                Net Profit
              </span>
            </div>
            <div>
              <p className={`text-sm font-medium mb-1 ${
                profitData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>Net Profit</p>
              <p className={`text-3xl font-bold ${
                profitData.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'
              }`}>
                ₱{profitData.netProfit.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${
                profitData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {profitData.totalRevenue > 0 ? ((profitData.netProfit / profitData.totalRevenue) * 100).toFixed(1) : 0}% net margin
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs bg-surface-100 text-surface-600 px-2 py-1 rounded-full font-medium">Count</span>
          </div>
          <div className="text-sm font-medium text-surface-500 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-surface-900">{expenses.length}</div>
          <div className="text-xs text-surface-400 mt-1">All time records</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">Monthly</span>
          </div>
          <div className="text-sm font-medium text-orange-700 mb-1">This Month</div>
          <div className="text-2xl font-bold text-orange-900">
            ₱{getTotalExpenses(expenses.filter(e => {
              const expenseDate = e.date.toDate()
              const now = new Date()
              return expenseDate.getMonth() === now.getMonth() && 
                     expenseDate.getFullYear() === now.getFullYear()
            })).toLocaleString()}
          </div>
          <div className="text-xs text-orange-600 mt-1">Current period</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">Categories</span>
          </div>
          <div className="text-sm font-medium text-blue-700 mb-1">Categories</div>
          <div className="text-2xl font-bold text-blue-900">{categories.length}</div>
          <div className="text-xs text-blue-600 mt-1">Active groups</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">Filtered</span>
          </div>
          <div className="text-sm font-medium text-green-700 mb-1">Filtered Total</div>
          <div className="text-2xl font-bold text-green-900">₱{totalExpenses.toLocaleString()}</div>
          <div className="text-xs text-green-600 mt-1">Current view</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 mb-6 p-6">
        <h3 className="text-lg font-semibold mb-4 text-surface-900">Filter Expenses</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month' | 'all')}
              className="w-full p-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title, description, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-9 border border-surface-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
              <svg 
                className="absolute left-3 top-2.5 h-4 w-4 text-surface-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-surface-600">
            Showing {filteredExpenses.length} of {expenses.length} expenses
            {selectedCategory !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {selectedCategory}
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                {dateRange === 'today' ? 'Today' : 
                 dateRange === 'week' ? 'This Week' : 
                 dateRange === 'month' ? 'This Month' : dateRange}
              </span>
            )}
            {searchTerm && (
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                "{searchTerm}"
              </span>
            )}
          </div>
          
          {(selectedCategory !== 'all' || dateRange !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setDateRange('all')
                setSearchTerm('')
              }}
              className="text-sm text-surface-500 hover:text-surface-700 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Expenses List */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Expense Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-100">
              {filteredExpenses.map((expense) => (
                <React.Fragment key={expense.id}>
                  {/* Main Row */}
                  <tr className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-surface-900">{expense.title}</div>
                      {expense.description && (
                        <div className="text-sm text-surface-500 mt-1">{expense.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800 border border-primary-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-surface-900">
                      ₱{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-600">
                      {expense.date.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleRowExpansion(expense.id!)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${expandedRows.has(expense.id!) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="ml-1">{expandedRows.has(expense.id!) ? 'Close' : 'Actions'}</span>
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expandable Actions Row */}
                  {expandedRows.has(expense.id!) && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3 justify-center">
                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Expense
                          </button>
                          
                          {/* Status Actions */}
                          {expense.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateExpenseStatus(expense.id!, 'approved')}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateExpenseStatus(expense.id!, 'paid')}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Mark as Paid
                              </button>
                            </>
                          )}
                          
                          {expense.status === 'approved' && (
                            <button
                              onClick={() => handleUpdateExpenseStatus(expense.id!, 'paid')}
                              className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Mark as Paid
                            </button>
                          )}
                          
                          {(expense.status === 'pending' || expense.status === 'approved') && (
                            <button
                              onClick={() => handleUpdateExpenseStatus(expense.id!, 'rejected')}
                              className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Reject
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteExpense(expense.id!)}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Expense Modal */}
      <EnhancedExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateExpense}
        categories={categories.map(cat => ({
          ...cat,
          icon: '📁',
          color: 'text-blue-600'
        }))}
        mode="create"
      />

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
