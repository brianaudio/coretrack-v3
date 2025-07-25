'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { 
  getCashSummary, 
  openCashDrawer, 
  closeCashDrawer, 
  getCashDrawers,
  createCashDrawer,
  logCashTransaction,
  type CashSummary,
  type CashDrawer,
  type CreateCashTransaction
} from '@/lib/firebase/cashManagement'

export default function CashManagement() {
  const { user } = useAuth()
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null)
  const [cashDrawers, setCashDrawers] = useState<CashDrawer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showOpenDrawer, setShowOpenDrawer] = useState(false)
  const [showCloseDrawer, setShowCloseDrawer] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [selectedDrawer, setSelectedDrawer] = useState<CashDrawer | null>(null)

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    type: 'cash_in' as CreateCashTransaction['type'],
    amount: '',
    reason: '',
    paymentMethod: 'cash' as CreateCashTransaction['paymentMethod'],
    drawerId: ''
  })

  // Open/Close drawer form state
  const [drawerForm, setDrawerForm] = useState({
    startingCash: '',
    endingCash: '',
    notes: '',
    name: '',
    location: ''
  })

  useEffect(() => {
    if (user?.uid) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user?.uid) return
    
    try {
      setIsLoading(true)
      const [summary, drawers] = await Promise.all([
        getCashSummary(user.uid),
        getCashDrawers(user.uid)
      ])
      setCashSummary(summary)
      setCashDrawers(drawers)
      
      // Find active drawer as selected drawer
      const activeDrawer = drawers.find(d => d.isActive)
      setSelectedDrawer(activeDrawer || drawers[0] || null)
    } catch (error) {
      console.error('Error loading cash data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDrawer = async () => {
    if (!user?.uid) return

    try {
      await createCashDrawer({
        name: drawerForm.name,
        location: drawerForm.location,
        startingCash: parseFloat(drawerForm.startingCash),
        tenantId: user.uid
      })
      setShowCreateDrawer(false)
      setDrawerForm({ startingCash: '', endingCash: '', notes: '', name: '', location: '' })
      loadData()
    } catch (error) {
      console.error('Error creating drawer:', error)
    }
  }

  const handleOpenDrawer = async () => {
    if (!user?.uid || !selectedDrawer) return

    try {
      await openCashDrawer(
        user.uid,
        selectedDrawer.id,
        parseFloat(drawerForm.startingCash),
        user.uid,
        user.displayName || user.email || 'Unknown'
      )
      setShowOpenDrawer(false)
      setDrawerForm({ startingCash: '', endingCash: '', notes: '', name: '', location: '' })
      loadData()
    } catch (error) {
      console.error('Error opening drawer:', error)
    }
  }

  const handleCloseDrawer = async () => {
    if (!user?.uid || !selectedDrawer) return

    try {
      await closeCashDrawer(
        user.uid,
        selectedDrawer.id,
        parseFloat(drawerForm.endingCash),
        user.uid,
        user.displayName || user.email || 'Unknown'
      )
      setShowCloseDrawer(false)
      setDrawerForm({ startingCash: '', endingCash: '', notes: '', name: '', location: '' })
      loadData()
    } catch (error) {
      console.error('Error closing drawer:', error)
    }
  }

  const handleTransaction = async () => {
    if (!user?.uid || !selectedDrawer) return

    try {
      await logCashTransaction({
        drawerId: selectedDrawer.id,
        drawerName: selectedDrawer.name,
        type: transactionForm.type,
        amount: parseFloat(transactionForm.amount),
        paymentMethod: transactionForm.paymentMethod,
        reason: transactionForm.reason,
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown',
        tenantId: user.uid
      })
      setShowTransaction(false)
      setTransactionForm({
        type: 'cash_in',
        amount: '',
        reason: '',
        paymentMethod: 'cash',
        drawerId: ''
      })
      loadData()
    } catch (error) {
      console.error('Error recording transaction:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const activeDrawer = cashDrawers.find(d => d.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">Cash Management</h1>
          <p className="text-surface-600">Monitor and manage cash flow, card, and digital payments</p>
        </div>

        <div className="flex gap-3">
          {cashDrawers.length === 0 ? (
            <button
              onClick={() => setShowCreateDrawer(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Drawer
            </button>
          ) : activeDrawer ? (
            <button
              onClick={() => setShowCloseDrawer(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Close Drawer
            </button>
          ) : (
            <button
              onClick={() => setShowOpenDrawer(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Open Drawer
            </button>
          )}
          
          {activeDrawer && (
            <button
              onClick={() => setShowTransaction(true)}
              className="px-4 py-2 bg-surface-600 text-white rounded-lg hover:bg-surface-700 transition-colors"
            >
              Record Transaction
            </button>
          )}
        </div>
      </div>

      {/* Cash Drawer Status */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-medium text-surface-900 mb-4">Cash Drawer Status</h2>
        
        {cashDrawers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cashDrawers.map((drawer) => (
              <div key={drawer.id} className="p-4 bg-surface-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${drawer.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium text-surface-900">{drawer.name}</span>
                </div>
                <p className="text-sm text-surface-600">
                  Status: {drawer.isActive ? 'Open' : 'Closed'}
                </p>
                {drawer.isActive && (
                  <>
                    <p className="text-sm text-surface-600">Opened by: {drawer.openedBy}</p>
                    <p className="text-sm text-surface-600">
                      Cash: ${drawer.currentCash.toFixed(2)}
                    </p>
                  </>
                )}
                {drawer.location && (
                  <p className="text-sm text-surface-600">Location: {drawer.location}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-surface-600">No cash drawers found. Create one to get started.</p>
        )}
      </div>

      {/* Cash Summary */}
      {cashSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cash Balance */}
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-surface-900">Cash</h3>
                <p className="text-2xl font-bold text-green-600">${cashSummary.totalCash.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm text-surface-600">Physical cash in drawer</p>
          </div>

          {/* Card Balance */}
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-surface-900">Card</h3>
                <p className="text-2xl font-bold text-blue-600">${cashSummary.totalCard.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm text-surface-600">Credit/debit card sales</p>
          </div>

          {/* Digital Balance */}
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.48 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-surface-900">Digital</h3>
                <p className="text-2xl font-bold text-purple-600">${cashSummary.totalDigital.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm text-surface-600">Mobile payments & apps</p>
          </div>
        </div>
      )}

      {/* Total Summary */}
      {cashSummary && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium opacity-90">Total Revenue</h3>
              <p className="text-3xl font-bold">
                ${cashSummary.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-75">Today's Transactions</p>
              <p className="text-sm opacity-90">{cashSummary.todaysTransactions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Drawer Modal */}
      {showCreateDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Create Cash Drawer</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Drawer Name
                </label>
                <input
                  type="text"
                  value={drawerForm.name}
                  onChange={(e) => setDrawerForm({ ...drawerForm, name: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Main Register"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={drawerForm.location}
                  onChange={(e) => setDrawerForm({ ...drawerForm, location: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Front Counter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Starting Cash Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={drawerForm.startingCash}
                  onChange={(e) => setDrawerForm({ ...drawerForm, startingCash: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateDrawer(false)}
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDrawer}
                disabled={!drawerForm.name || !drawerForm.startingCash}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Drawer Modal */}
      {showOpenDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Open Cash Drawer</h3>
            
            <div className="space-y-4">
              {selectedDrawer && (
                <div className="p-3 bg-surface-50 rounded-lg">
                  <p className="font-medium text-surface-900">{selectedDrawer.name}</p>
                  {selectedDrawer.location && (
                    <p className="text-sm text-surface-600">{selectedDrawer.location}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Starting Cash Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={drawerForm.startingCash}
                  onChange={(e) => setDrawerForm({ ...drawerForm, startingCash: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOpenDrawer(false)}
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenDrawer}
                disabled={!drawerForm.startingCash}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Open Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Drawer Modal */}
      {showCloseDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Close Cash Drawer</h3>
            
            <div className="space-y-4">
              {activeDrawer && (
                <div className="p-3 bg-surface-50 rounded-lg">
                  <p className="font-medium text-surface-900">{activeDrawer.name}</p>
                  <p className="text-sm text-surface-600">
                    Expected Cash: ${activeDrawer.currentCash.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Actual Cash Count
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={drawerForm.endingCash}
                  onChange={(e) => setDrawerForm({ ...drawerForm, endingCash: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCloseDrawer(false)}
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseDrawer}
                disabled={!drawerForm.endingCash}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Record Transaction</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as CreateCashTransaction['type'] })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="cash_in">Cash In</option>
                  <option value="cash_out">Cash Out</option>
                  <option value="card_payment">Card Payment</option>
                  <option value="digital_payment">Digital Payment</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={transactionForm.paymentMethod}
                  onChange={(e) => setTransactionForm({ ...transactionForm, paymentMethod: e.target.value as CreateCashTransaction['paymentMethod'] })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="digital">Digital</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={transactionForm.reason}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reason: e.target.value })}
                  className="w-full p-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Transaction reason"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTransaction(false)}
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransaction}
                disabled={!transactionForm.amount || !transactionForm.reason}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
