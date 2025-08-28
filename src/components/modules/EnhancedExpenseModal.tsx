'use client'

import { useState, useEffect, useRef } from 'react'

interface ExpenseFormData {
  title: string
  category: string
  amount: number
  paymentMethod: 'cash' | 'card' | 'check' | 'bank_transfer'
  date: string
  description: string
  vendor: string
  receiptUrl?: string
  tags: string[]
}

interface ExpenseCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  budget?: number
  spent?: number
}

interface EnhancedExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (expense: ExpenseFormData) => Promise<void>
  categories: ExpenseCategory[]
  editingExpense?: ExpenseFormData & { id: string }
  mode: 'create' | 'edit'
}

export default function EnhancedExpenseModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories, 
  editingExpense,
  mode = 'create'
}: EnhancedExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    category: 'General',
    amount: 0,
    paymentMethod: 'cash',
    // FIX TIMEZONE ISSUE: Use local date, not UTC
    date: (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })(),
    description: '',
    vendor: '',
    receiptUrl: '',
    tags: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Payment method configurations with modern icons
  const paymentMethods = [
    { 
      value: 'cash', 
      label: 'Cash', 
      icon: '💵', 
      gradient: 'from-green-400 to-green-600',
      ring: 'ring-green-200' 
    },
    { 
      value: 'card', 
      label: 'Card', 
      icon: '💳', 
      gradient: 'from-blue-400 to-blue-600',
      ring: 'ring-blue-200' 
    },
    { 
      value: 'bank_transfer', 
      label: 'Transfer', 
      icon: '🏦', 
      gradient: 'from-purple-400 to-purple-600',
      ring: 'ring-purple-200' 
    },
    { 
      value: 'check', 
      label: 'Check', 
      icon: '📝', 
      gradient: 'from-gray-400 to-gray-600',
      ring: 'ring-gray-200' 
    }
  ]

  // Initialize form when editing or opening
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        title: editingExpense.title,
        category: editingExpense.category,
        amount: editingExpense.amount,
        paymentMethod: editingExpense.paymentMethod,
        date: editingExpense.date,
        description: editingExpense.description,
        vendor: editingExpense.vendor,
        receiptUrl: editingExpense.receiptUrl,
        tags: editingExpense.tags || []
      })
    } else {
      setFormData({
        title: '',
        category: 'General',
        amount: 0,
        paymentMethod: 'cash',
        // FIX TIMEZONE ISSUE: Use local date, not UTC
        date: (() => {
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        })(),
        description: '',
        vendor: '',
        receiptUrl: '',
        tags: []
      })
    }
    setErrors({})
  }, [editingExpense, isOpen])

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 200)
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'What did you spend on?'
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Enter the amount'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting expense:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-0 w-full max-w-md transform transition-all duration-300 scale-100">
        {/* Modern Header */}
        <div className="relative px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">💸</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {mode === 'edit' ? 'Edit Expense' : 'New Expense'}
              </h3>
              <p className="text-sm text-gray-500">Track your business spending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Streamlined Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title - Most Important Field */}
          <div>
            <input
              ref={titleInputRef}
              type="text"
              placeholder="What did you spend on?"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-4 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                errors.title 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-400 bg-gray-50 hover:bg-white'
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span>⚠️</span> {errors.title}
              </p>
            )}
          </div>

          {/* Amount - Second Most Important */}
          <div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <span className="text-2xl font-semibold text-gray-600">₱</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className={`w-full pl-12 pr-4 py-4 text-lg font-semibold border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-100 transition-all ${
                  errors.amount 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 focus:border-green-400 bg-gray-50 hover:bg-white'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span>⚠️</span> {errors.amount}
              </p>
            )}
          </div>

          {/* Payment Method - Beautiful Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">How did you pay?</label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value as any }))}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    formData.paymentMethod === method.value
                      ? `border-transparent bg-gradient-to-r ${method.gradient} text-white shadow-lg transform scale-105`
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Details - Collapsible */}
          <div className="border-t border-gray-100 pt-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center gap-2">
                <span>More details (optional)</span>
                <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Vendor (optional)"
                  value={formData.vendor}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 hover:bg-white transition-all"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 hover:bg-white transition-all resize-none"
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 hover:bg-white transition-all"
                />
              </div>
            </details>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{mode === 'edit' ? 'Update' : 'Add'} Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
