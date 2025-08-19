'use client'

import { useState, useEffect, useCallback } from 'react'
import { useShift } from '../../lib/context/ShiftContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getBranchLocationId } from '../../lib/utils/branchUtils'

// Import development utilities
if (process.env.NODE_ENV === 'development') {
  import('../../lib/utils/shiftResetHelpers')
}

interface PaymentMethodData {
  method: string
  amount: number
  count: number
  percentage: number
  icon: string
  color: string
  bgColor: string
  borderColor: string
}

interface PaymentBreakdown {
  cash: PaymentMethodData
  maya: PaymentMethodData
  gcash: PaymentMethodData
  card: PaymentMethodData
  total: number
  totalTransactions: number
}

export default function PaymentMethodsAnalytics() {
  const { currentShift } = useShift()
  const { selectedBranch } = useBranch()
  const { profile } = useAuth()
  
  const [paymentData, setPaymentData] = useState<PaymentBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'shift' | 'today' | 'week' | 'month'>('week') // Changed from 'today' to 'week' for broader data capture
  const [lastShiftId, setLastShiftId] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  // Clear analytics data when shift resets
  const clearAnalyticsData = useCallback(() => {
    setPaymentData(null)
    setLoading(true)
    setIsResetting(true)
  }, [])

  // Detect shift changes/resets
  useEffect(() => {
    if (currentShift?.id !== lastShiftId) {
      if (lastShiftId !== null && currentShift?.id) {
        // Shift has changed - clear data and show fresh analytics
        clearAnalyticsData()
      }
      setLastShiftId(currentShift?.id || null)
    }
  }, [currentShift?.id, lastShiftId, clearAnalyticsData])

  // Listen for shift reset events from localStorage or custom events
  useEffect(() => {
    const handleShiftReset = (event: CustomEvent) => {
      clearAnalyticsData()
      // Delay refetch to allow reset to complete
      setTimeout(() => {
        if (selectedBranch && profile?.uid) {
          fetchPaymentData()
        }
        setIsResetting(false)
      }, 2000) // Longer delay to ensure reset is complete
    }

    // 🔥 NUCLEAR FIREBASE RESET - Listen for forced reset events
    const handleForceReset = (event: any) => {
      console.log('💥 PAYMENT ANALYTICS NUCLEAR RESET TRIGGERED:', event.detail);
      setPaymentData(null);
      setLoading(true);
      setIsResetting(false);
      console.log('✅ Payment analytics nuclear reset complete!');
    };

    // Listen for custom shift reset events
    window.addEventListener('shiftReset', handleShiftReset as EventListener)
    window.addEventListener('forceFirebaseReset', handleForceReset);
    
    return () => {
      window.removeEventListener('shiftReset', handleShiftReset as EventListener)
      window.removeEventListener('forceFirebaseReset', handleForceReset);
    }
  }, [selectedBranch, profile?.tenantId, clearAnalyticsData])

  // Payment method configurations
  const paymentMethods = {
    cash: {
      method: 'Cash',
      icon: '💵',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200'
    },
    maya: {
      method: 'Maya',
      icon: '📱',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200'
    },
    gcash: {
      method: 'GCash',
      icon: '💰',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      borderColor: 'border-indigo-200'
    },
    card: {
      method: 'Card',
      icon: '💳',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-200'
    }
  }

    const fetchPaymentData = async () => {
    if (!selectedBranch || !profile?.uid) {
      setPaymentData(null)
      setLoading(false)
      return
    }

    // 🔥 CRITICAL: Block Firebase data fetch when no active shift
    if (!currentShift?.id) {
      console.log('[PaymentAnalytics] 🚫 NO ACTIVE SHIFT - Blocking Firebase fetch to prevent payment data leak!')
      setPaymentData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const effectiveTenantId = (profile as any).tenantId || profile.uid // Use same pattern as EnhancedAnalytics
      
      // Calculate start date based on filter
      const now = new Date()
      const startDate = new Date()
      
      switch (timeFilter) {
        case 'shift':
          if (currentShift?.startTime) {
            startDate.setTime(currentShift.startTime.toDate().getTime())
          } else {
            startDate.setHours(0, 0, 0, 0)
          }
          break
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setDate(startDate.getDate() - 30)
          break
      }

      // Query orders from the correct tenant orders collection (same as Expenses component)
      // Using minimal query to avoid any Firebase index requirement, then filter everything client-side
      const locationId = getBranchLocationId(selectedBranch.id)
      const ordersRef = collection(db, `tenants/${effectiveTenantId}/orders`)
      
      const ordersQuery = query(
        ordersRef,
        orderBy('createdAt', 'desc'),
        limit(1000)
      )

      const ordersSnapshot = await getDocs(ordersQuery)
      const allOrders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Filter client-side for status, location and date to avoid any index requirements
      const orders = allOrders.filter((order: any) => {
        const matchesStatus = order.status === 'completed'
        const matchesLocation = !locationId || order.locationId === locationId
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
        const matchesDate = orderDate >= startDate
        return matchesStatus && matchesLocation && matchesDate
      })

      // Initialize payment totals
      const totals = {
        cash: { amount: 0, count: 0 },
        maya: { amount: 0, count: 0 },
        gcash: { amount: 0, count: 0 },
        card: { amount: 0, count: 0 }
      }

      let totalAmount = 0
      let totalTransactions = orders.length

      // Process each order
      orders.forEach((order: any) => {
        const orderTotal = order.total || 0
        totalAmount += orderTotal

        // Process payment methods - prioritize paymentMethods array for detailed breakdown
        if (order.paymentMethods && Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
          // Handle multiple payment methods (detailed breakdown)
          order.paymentMethods.forEach((payment: any) => {
            const method = payment.method?.toLowerCase()
            const amount = payment.amount || 0

            // Map payment method names to our categories
            let mappedMethod = method
            if (method === 'paymaya' || method === 'maya') {
              mappedMethod = 'maya'
            } else if (method === 'cash') {
              mappedMethod = 'cash'
            } else if (method === 'gcash') {
              mappedMethod = 'gcash'
            } else if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
              mappedMethod = 'card'
            }

            if (totals[mappedMethod as keyof typeof totals]) {
              totals[mappedMethod as keyof typeof totals].amount += amount
              totals[mappedMethod as keyof typeof totals].count += 1
            }
          })
        } else if (order.paymentMethod) {
          // Handle single payment method (fallback for legacy data)
          const method = order.paymentMethod.toLowerCase()
          
          // Map payment method names to our categories
          let mappedMethod = method
          if (method === 'paymaya' || method === 'maya') {
            mappedMethod = 'maya'
          } else if (method === 'cash') {
            mappedMethod = 'cash'
          } else if (method === 'gcash') {
            mappedMethod = 'gcash'
          } else if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
            mappedMethod = 'card'
          }

          if (totals[mappedMethod as keyof typeof totals]) {
            totals[mappedMethod as keyof typeof totals].amount += orderTotal
            totals[mappedMethod as keyof typeof totals].count += 1
          }
        } else {
          // If no payment method specified, assume cash (fallback)
          totals.cash.amount += orderTotal
          totals.cash.count += 1
        }
      })

      // Build final data structure
      const breakdown: PaymentBreakdown = {
        cash: {
          ...paymentMethods.cash,
          amount: totals.cash.amount,
          count: totals.cash.count,
          percentage: totalAmount > 0 ? (totals.cash.amount / totalAmount) * 100 : 0
        },
        maya: {
          ...paymentMethods.maya,
          amount: totals.maya.amount,
          count: totals.maya.count,
          percentage: totalAmount > 0 ? (totals.maya.amount / totalAmount) * 100 : 0
        },
        gcash: {
          ...paymentMethods.gcash,
          amount: totals.gcash.amount,
          count: totals.gcash.count,
          percentage: totalAmount > 0 ? (totals.gcash.amount / totalAmount) * 100 : 0
        },
        card: {
          ...paymentMethods.card,
          amount: totals.card.amount,
          count: totals.card.count,
          percentage: totalAmount > 0 ? (totals.card.amount / totalAmount) * 100 : 0
        },
        total: totalAmount,
        totalTransactions
      }

      setPaymentData(breakdown)
      setIsResetting(false) // Clear reset state when data is loaded
    } catch (error) {
      console.error('Failed to fetch payment data:', error)
      setIsResetting(false) // Clear reset state even on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedBranch && profile?.uid && (timeFilter !== 'shift' || currentShift)) {
      fetchPaymentData()
    }
  }, [selectedBranch, currentShift, timeFilter, profile?.uid])

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'shift': 
        if (currentShift) {
          return `Current Shift (${currentShift.name})`
        } else {
          return 'No Active Shift - Showing Today'
        }
      case 'today': return 'Today'
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-surface-200 rounded w-48"></div>
            <div className="h-8 bg-surface-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-surface-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-surface-200 rounded-lg"></div>
          
          {/* Show reset indicator if resetting */}
          {isResetting && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Shift Reset in Progress</p>
                  <p className="text-xs text-yellow-600">Analytics data is being refreshed...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-surface-500 mb-4">No payment data available</p>
          <p className="text-sm text-surface-400">Complete some transactions to see payment method analytics</p>
        </div>
      </div>
    )
  }

  const sortedPayments = Object.values(paymentData)
    .filter(p => typeof p === 'object' && 'amount' in p)
    .sort((a, b) => (b as PaymentMethodData).amount - (a as PaymentMethodData).amount) as PaymentMethodData[]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-surface-900">Payment Summary</h3>
          <p className="text-sm text-surface-600">{getTimeFilterLabel()}</p>
        </div>

        {/* Time Filter */}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {/* Payment Method Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sortedPayments.map((payment) => (
          <div
            key={payment.method}
            className={`${payment.bgColor} ${payment.borderColor} border rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{payment.icon}</span>
                <span className={`font-medium ${payment.color}`}>{payment.method}</span>
              </div>
              <span className={`text-xs font-medium ${payment.color} bg-white px-2 py-1 rounded`}>
                {payment.percentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="space-y-1">
              <p className={`text-xl font-bold ${payment.color}`}>
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-sm text-gray-600">
                {payment.count} transaction{payment.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Progress Bars */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-surface-900">Payment Distribution</h4>
        {sortedPayments.map((payment) => (
          <div key={payment.method} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{payment.icon}</span>
                <span className="font-medium">{payment.method}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                <span className="text-gray-500 ml-2">({payment.percentage.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${payment.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`}
                style={{ width: `${Math.max(payment.percentage, 2)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600">{formatCurrency(paymentData.total)}</p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{paymentData.totalTransactions}</p>
          <p className="text-sm text-gray-600">Total Transactions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {paymentData.totalTransactions > 0 ? formatCurrency(paymentData.total / paymentData.totalTransactions) : '₱0.00'}
          </p>
          <p className="text-sm text-gray-600">Average Order Value</p>
        </div>
      </div>
    </div>
  )
}
