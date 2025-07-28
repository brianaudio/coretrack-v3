'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { 
  getCashDrawerBalance, 
  getCashCounts, 
  addCashCount, 
  getPaymentMethodSummary,
  getDailyCashSummary,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  initializeDefaultPaymentMethods,
  initializeDefaultCashDrawer,
  type CashCount,
  type PaymentMethodSummary,
  type DailyCashSummary,
  type PaymentMethod,
  type CreatePaymentMethod
} from '../../lib/firebase/cashManagement'

export default function PaymentMonitoring() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cashDrawerBalance, setCashDrawerBalance] = useState(0)
  const [paymentSummary, setPaymentSummary] = useState<PaymentMethodSummary | null>(null)
  const [dailySummary, setDailySummary] = useState<DailyCashSummary | null>(null)
  const [cashCounts, setCashCounts] = useState<CashCount[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showAddCashCount, setShowAddCashCount] = useState(false)
  const [showPaymentMethodManager, setShowPaymentMethodManager] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [newCashCount, setNewCashCount] = useState({ amount: '', notes: '' })
  const [newPaymentMethod, setNewPaymentMethod] = useState<CreatePaymentMethod>({
    type: 'digital',
    name: '',
    tenantId: profile?.tenantId || ''
  })

  useEffect(() => {
    if (!profile?.tenantId) return

    const loadData = async () => {
      try {
        setLoading(true)
        
        // Initialize default payment methods and cash drawer if none exist
        await Promise.all([
          initializeDefaultPaymentMethods(profile.tenantId),
          initializeDefaultCashDrawer(profile.tenantId)
        ])
        
        const [balance, summary, daily, counts, methods] = await Promise.all([
          getCashDrawerBalance(profile.tenantId),
          getPaymentMethodSummary(profile.tenantId),
          getDailyCashSummary(profile.tenantId),
          getCashCounts(profile.tenantId),
          getPaymentMethods(profile.tenantId)
        ])
        
        setCashDrawerBalance(balance)
        setPaymentSummary(summary)
        setDailySummary(daily)
        setCashCounts(counts)
        setPaymentMethods(methods)
      } catch (error) {
        console.error('Error loading payment data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Set up real-time refresh every 30 seconds to catch updates from POS
    const refreshInterval = setInterval(async () => {
      try {
        const [balance, summary, daily] = await Promise.all([
          getCashDrawerBalance(profile.tenantId),
          getPaymentMethodSummary(profile.tenantId),
          getDailyCashSummary(profile.tenantId)
        ])
        
        setCashDrawerBalance(balance)
        setPaymentSummary(summary)
        setDailySummary(daily)
      } catch (error) {
        console.error('Error refreshing payment data:', error)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(refreshInterval)
  }, [profile?.tenantId])

  const handleAddCashCount = async () => {
    if (!profile?.tenantId || !newCashCount.amount) return

    try {
      await addCashCount(profile.tenantId, {
        amount: parseFloat(newCashCount.amount),
        notes: newCashCount.notes,
        countedBy: user?.email || 'Unknown User'
      })

      // Refresh data
      const [balance, counts] = await Promise.all([
        getCashDrawerBalance(profile.tenantId),
        getCashCounts(profile.tenantId)
      ])
      
      setCashDrawerBalance(balance)
      setCashCounts(counts)
      setNewCashCount({ amount: '', notes: '' })
      setShowAddCashCount(false)
    } catch (error) {
      console.error('Error adding cash count:', error)
    }
  }

  const handleAddPaymentMethod = async () => {
    if (!profile?.tenantId || !newPaymentMethod.name.trim()) return

    try {
      await addPaymentMethod({
        ...newPaymentMethod,
        tenantId: profile.tenantId
      })

      // Refresh payment methods and summary
      const [methods, summary] = await Promise.all([
        getPaymentMethods(profile.tenantId),
        getPaymentMethodSummary(profile.tenantId)
      ])
      
      setPaymentMethods(methods)
      setPaymentSummary(summary)
      setNewPaymentMethod({
        type: 'digital',
        name: '',
        tenantId: profile.tenantId
      })
      setShowPaymentMethodManager(false)
    } catch (error) {
      console.error('Error adding payment method:', error)
    }
  }

  const handleUpdatePaymentMethod = async () => {
    if (!profile?.tenantId || !editingMethod) return

    try {
      await updatePaymentMethod(profile.tenantId, editingMethod.id, {
        name: editingMethod.name,
        type: editingMethod.type,
        isActive: editingMethod.isActive
      })

      // Refresh payment methods and summary
      const [methods, summary] = await Promise.all([
        getPaymentMethods(profile.tenantId),
        getPaymentMethodSummary(profile.tenantId)
      ])
      
      setPaymentMethods(methods)
      setPaymentSummary(summary)
      setEditingMethod(null)
    } catch (error) {
      console.error('Error updating payment method:', error)
    }
  }

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!profile?.tenantId) return

    if (confirm('Are you sure you want to delete this payment method? This action cannot be undone.')) {
      try {
        await deletePaymentMethod(profile.tenantId, methodId)

        // Refresh payment methods and summary
        const [methods, summary] = await Promise.all([
          getPaymentMethods(profile.tenantId),
          getPaymentMethodSummary(profile.tenantId)
        ])
        
        setPaymentMethods(methods)
        setPaymentSummary(summary)
      } catch (error) {
        console.error('Error deleting payment method:', error)
      }
    }
  }

  const handleRefreshData = async () => {
    if (!profile?.tenantId) return

    try {
      setLoading(true)
      const [balance, summary, daily, counts] = await Promise.all([
        getCashDrawerBalance(profile.tenantId),
        getPaymentMethodSummary(profile.tenantId),
        getDailyCashSummary(profile.tenantId),
        getCashCounts(profile.tenantId)
      ])
      
      setCashDrawerBalance(balance)
      setPaymentSummary(summary)
      setDailySummary(daily)
      setCashCounts(counts)
    } catch (error) {
      console.error('Error refreshing payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Payment Monitoring</h1>
          <p className="text-surface-600 mt-1">Monitor cash drawer, card payments, and digital transactions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshData}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setShowPaymentMethodManager(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Manage Payment Methods
          </button>
          <button
            onClick={() => setShowAddCashCount(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Count Cash
          </button>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cash Drawer */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Cash Drawer</p>
              <p className="text-2xl font-bold text-surface-900">₱{cashDrawerBalance.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Card Payments */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Card Payments</p>
              <p className="text-2xl font-bold text-surface-900">
                ₱{paymentSummary?.cardTotal.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Digital Payments */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Digital Payments</p>
              <p className="text-2xl font-bold text-surface-900">
                ₱{paymentSummary?.digitalTotal.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Total Revenue</p>
              <p className="text-2xl font-bold text-surface-900">
                ₱{((paymentSummary?.cashTotal || 0) + (paymentSummary?.cardTotal || 0) + (paymentSummary?.digitalTotal || 0)).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      {dailySummary && (
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-xl font-semibold text-surface-900 mb-4">Today&apos;s Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-surface-600">Opening Balance</p>
              <p className="text-lg font-semibold text-surface-900">₱{dailySummary.openingBalance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-600">Net Cash Flow</p>
              <p className="text-lg font-semibold text-surface-900">₱{dailySummary.netCashFlow.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-600">Expected Balance</p>
              <p className="text-lg font-semibold text-surface-900">₱{dailySummary.expectedBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Cash Counts */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-xl font-semibold text-surface-900 mb-4">Recent Cash Counts</h2>
        {cashCounts.length === 0 ? (
          <p className="text-surface-600">No cash counts recorded today.</p>
        ) : (
          <div className="space-y-3">
            {cashCounts.slice(0, 5).map((count) => (
              <div key={count.id} className="flex justify-between items-center py-2 border-b border-surface-100 last:border-b-0">
                <div>
                  <p className="font-medium text-surface-900">₱{count.amount.toFixed(2)}</p>
                  <p className="text-sm text-surface-600">
                    {count.timestamp.toDate().toLocaleTimeString()} by {count.countedBy}
                  </p>
                  {count.notes && <p className="text-sm text-surface-500">{count.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Cash Count Modal */}
      {showAddCashCount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Count Cash Drawer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Amount Counted
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCashCount.amount}
                  onChange={(e) => setNewCashCount({ ...newCashCount, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newCashCount.notes}
                  onChange={(e) => setNewCashCount({ ...newCashCount, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Any discrepancies or notes..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddCashCount(false)}
                className="px-4 py-2 text-surface-700 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCashCount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Record Count
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Manager Modal */}
      {showPaymentMethodManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-surface-900">Manage Payment Methods</h3>
              <button
                onClick={() => setShowPaymentMethodManager(false)}
                className="text-surface-400 hover:text-surface-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Add New Payment Method */}
            <div className="bg-surface-50 rounded-lg p-4 mb-6">
              <h4 className="text-lg font-medium text-surface-900 mb-4">Add New Payment Method</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Type</label>
                  <select
                    value={newPaymentMethod.type}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value as 'cash' | 'card' | 'digital' })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="digital">Digital</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newPaymentMethod.name}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., GCash, Maya, Visa"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddPaymentMethod}
                    disabled={!newPaymentMethod.name.trim()}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-surface-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Method
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Payment Methods */}
            <div>
              <h4 className="text-lg font-medium text-surface-900 mb-4">Existing Payment Methods</h4>
              {paymentMethods.length === 0 ? (
                <p className="text-surface-600 text-center py-8">No payment methods configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border border-surface-200 rounded-lg">
                      {editingMethod?.id === method.id ? (
                        // Edit mode
                        <div className="flex items-center space-x-4 flex-1">
                          <select
                            value={editingMethod.type}
                            onChange={(e) => setEditingMethod({ ...editingMethod, type: e.target.value as 'cash' | 'card' | 'digital' })}
                            className="px-3 py-1 border border-surface-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            <option value="digital">Digital</option>
                            <option value="card">Card</option>
                            <option value="cash">Cash</option>
                          </select>
                          <input
                            type="text"
                            value={editingMethod.name}
                            onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                            className="flex-1 px-3 py-1 border border-surface-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editingMethod.isActive}
                              onChange={(e) => setEditingMethod({ ...editingMethod, isActive: e.target.checked })}
                              className="rounded border-surface-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-surface-700">Active</span>
                          </label>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center space-x-4 flex-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            method.type === 'cash' ? 'bg-green-100 text-green-800' :
                            method.type === 'card' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {method.type.charAt(0).toUpperCase() + method.type.slice(1)}
                          </span>
                          <span className="font-medium text-surface-900">{method.name}</span>
                          <span className={`text-sm ${method.isActive ? 'text-green-600' : 'text-surface-500'}`}>
                            {method.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        {editingMethod?.id === method.id ? (
                          <>
                            <button
                              onClick={handleUpdatePaymentMethod}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMethod(null)}
                              className="px-3 py-1 bg-surface-600 text-white text-sm rounded hover:bg-surface-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingMethod(method)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePaymentMethod(method.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPaymentMethodManager(false)}
                className="px-6 py-2 bg-surface-600 text-white rounded-lg hover:bg-surface-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
