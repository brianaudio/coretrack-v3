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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white space-y-12">
      {/* Modern Ultra-Clean Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white backdrop-blur-lg border border-white/20 rounded-3xl p-12 shadow-2xl shadow-gray-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Financial Management</h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
                Track expenses, monitor profitability, and maintain complete financial transparency across your business operations.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
            >
              <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Complete Financial Metrics */}
        <div className="mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
            {/* Revenue Card */}
            <div className="group">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-lg p-6 rounded-2xl border border-blue-200/50 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Revenue</p>
                    <p className="text-2xl font-light text-blue-900 tracking-tight">₱{profitData.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* COGS Card */}
            <div className="group">
              <div className="bg-gradient-to-br from-amber-50 to-orange-100/50 backdrop-blur-lg p-6 rounded-2xl border border-amber-200/50 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">COGS</p>
                    <p className="text-2xl font-light text-amber-900 tracking-tight">₱{profitData.totalCOGS.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Gross Profit Card */}
            <div className="group">
              <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 backdrop-blur-lg p-6 rounded-2xl border border-emerald-200/50 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Gross Profit</p>
                    <p className="text-2xl font-light text-emerald-900 tracking-tight">₱{profitData.grossProfit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expenses Card */}
            <div className="group">
              <div className="bg-gradient-to-br from-red-50 to-pink-100/50 backdrop-blur-lg p-6 rounded-2xl border border-red-200/50 shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/15 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Expenses</p>
                    <p className="text-2xl font-light text-red-900 tracking-tight">₱{profitData.totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Net Profit Card */}
            <div className="group">
              <div className={`backdrop-blur-lg p-6 rounded-2xl border shadow-lg transition-all duration-300 ${
                profitData.netProfit >= 0 
                  ? 'bg-gradient-to-br from-violet-50 to-purple-100/50 border-violet-200/50 shadow-violet-500/10 hover:shadow-xl hover:shadow-violet-500/15' 
                  : 'bg-gradient-to-br from-rose-50 to-red-100/50 border-rose-200/50 shadow-rose-500/10 hover:shadow-xl hover:shadow-rose-500/15'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                    profitData.netProfit >= 0 
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25' 
                      : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={profitData.netProfit >= 0 ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      profitData.netProfit >= 0 ? 'text-violet-700' : 'text-rose-700'
                    }`}>Net Profit</p>
                    <p className={`text-2xl font-light tracking-tight ${
                      profitData.netProfit >= 0 ? 'text-violet-900' : 'text-rose-900'
                    }`}>
                      ₱{profitData.netProfit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mt-8 bg-gradient-to-br from-gray-50/50 to-white backdrop-blur-lg p-6 rounded-2xl border border-gray-200/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-gray-600 mb-1">Gross Margin</p>
                <p className="text-lg font-medium text-gray-900">
                  {profitData.totalRevenue > 0 ? ((profitData.grossProfit / profitData.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Net Margin</p>
                <p className={`text-lg font-medium ${
                  profitData.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {profitData.totalRevenue > 0 ? ((profitData.netProfit / profitData.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Expense Ratio</p>
                <p className="text-lg font-medium text-gray-900">
                  {profitData.totalRevenue > 0 ? ((profitData.totalExpenses / profitData.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-lg p-8 rounded-2xl border border-gray-200/50 shadow-lg shadow-gray-500/5 hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg shadow-gray-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Records</p>
              <p className="text-3xl font-light text-gray-900 tracking-tight">{expenses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 backdrop-blur-lg p-8 rounded-2xl border border-orange-200/50 shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/15 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-orange-700 mb-1">This Month</p>
              <p className="text-3xl font-light text-orange-900 tracking-tight">
                ₱{getTotalExpenses(expenses.filter(e => {
                  const expenseDate = e.date.toDate()
                  const now = new Date()
                  return expenseDate.getMonth() === now.getMonth() && 
                         expenseDate.getFullYear() === now.getFullYear()
                })).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-lg p-8 rounded-2xl border border-blue-200/50 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Categories</p>
              <p className="text-3xl font-light text-blue-900 tracking-tight">{categories.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 backdrop-blur-lg p-8 rounded-2xl border border-emerald-200/50 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/15 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700 mb-1">Filtered</p>
              <p className="text-3xl font-light text-emerald-900 tracking-tight">₱{totalExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Filter Controls */}
      <div className="bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-lg p-8 rounded-2xl border border-gray-200/50 shadow-lg shadow-gray-500/5">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-light text-gray-900 tracking-tight">Filter & Search</h3>
            <p className="text-gray-500 font-light">Refine your expense view</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:shadow-md"
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month' | 'all')}
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:shadow-md"
              />
              <svg 
                className="absolute left-4 top-4 h-5 w-5 text-gray-400" 
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
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Showing {filteredExpenses.length} of {expenses.length} expenses</span>
            {selectedCategory !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {selectedCategory}
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                {dateRange === 'today' ? 'Today' : 
                 dateRange === 'week' ? 'This Week' : 
                 dateRange === 'month' ? 'This Month' : dateRange}
              </span>
            )}
            {searchTerm && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
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
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Modern Expenses Table */}
      <div className="bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-lg rounded-2xl border border-gray-200/50 shadow-lg shadow-gray-500/5 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-light text-gray-900 tracking-tight">Expense Records</h3>
              <p className="text-gray-500 font-light">Comprehensive expense management</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Expense Details
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-8 py-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((expense) => (
                <React.Fragment key={expense.id}>
                  {/* Main Row */}
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">{expense.title}</div>
                        {expense.description && (
                          <div className="text-sm text-gray-500">{expense.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex px-3 py-2 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-lg font-semibold text-gray-900">₱{expense.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex px-3 py-2 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm text-gray-600 font-medium">
                        {expense.date.toDate().toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => toggleRowExpansion(expense.id!)}
                        className="inline-flex items-center px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-colors"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${expandedRows.has(expense.id!) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="ml-2">{expandedRows.has(expense.id!) ? 'Close' : 'Actions'}</span>
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expandable Actions Row */}
                  {expandedRows.has(expense.id!) && (
                    <tr className="bg-gray-50/80">
                      <td colSpan={6} className="px-8 py-6">
                        <div className="flex flex-wrap items-center gap-3 justify-center">
                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="inline-flex items-center px-6 py-3 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          
                          {/* Status Actions */}
                          {expense.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateExpenseStatus(expense.id!, 'approved')}
                                className="inline-flex items-center px-6 py-3 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all hover:scale-105"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateExpenseStatus(expense.id!, 'paid')}
                                className="inline-flex items-center px-6 py-3 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all hover:scale-105"
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
                              className="inline-flex items-center px-6 py-3 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all hover:scale-105"
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
                              className="inline-flex items-center px-6 py-3 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all hover:scale-105"
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
                            className="inline-flex items-center px-6 py-3 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all hover:scale-105"
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

      {/* Modern Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-gray-500/20 border border-white/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-light text-gray-900 tracking-tight">Edit Expense</h3>
                <p className="text-gray-500 font-light">Update expense details</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingExpense.description || ''}
                  onChange={(e) => setEditingExpense(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => setEditingExpense(null)}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateExpense}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
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
