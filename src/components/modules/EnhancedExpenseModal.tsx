'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

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
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    category: '',
    amount: 0,
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
    description: '',
    vendor: '',
    receiptUrl: '',
    tags: []
  })
  
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Quick expense templates
  const expenseTemplates = [
    { title: 'Office Supplies', category: 'Office', amount: 500, paymentMethod: 'card' as const, icon: '📎' },
    { title: 'Grocery Supplies', category: 'Food & Beverage', amount: 2000, paymentMethod: 'cash' as const, icon: '🛒' },
    { title: 'Utility Bill', category: 'Utilities', amount: 1500, paymentMethod: 'bank_transfer' as const, icon: '💡' },
    { title: 'Equipment Repair', category: 'Maintenance', amount: 3000, paymentMethod: 'card' as const, icon: '🔧' },
    { title: 'Staff Meal', category: 'Food & Beverage', amount: 800, paymentMethod: 'cash' as const, icon: '🍽️' }
  ]

  // Payment method configurations
  const paymentMethods = {
    cash: { label: 'Cash', icon: '💵', color: 'bg-green-100 text-green-800' },
    card: { label: 'Card', icon: '💳', color: 'bg-blue-100 text-blue-800' },
    check: { label: 'Check', icon: '📝', color: 'bg-purple-100 text-purple-800' },
    bank_transfer: { label: 'Bank Transfer', icon: '🏦', color: 'bg-indigo-100 text-indigo-800' }
  }

  // Initialize form when editing
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
        category: '',
        amount: 0,
        paymentMethod: 'cash',
        date: new Date().toISOString().split('T')[0],
        description: '',
        vendor: '',
        receiptUrl: '',
        tags: []
      })
    }
    setCurrentStep(1)
    setErrors({})
    setBudgetWarning(null)
  }, [editingExpense, isOpen])

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Check budget warnings
  useEffect(() => {
    if (formData.category && formData.amount > 0) {
      const category = categories.find(c => c.name === formData.category)
      if (category?.budget) {
        const spent = category.spent || 0
        const newTotal = spent + formData.amount
        const percentage = (newTotal / category.budget) * 100
        
        if (percentage > 100) {
          setBudgetWarning(`⚠️ This expense will exceed the ${category.name} budget by ₱${(newTotal - category.budget).toLocaleString()}`)
        } else if (percentage > 80) {
          setBudgetWarning(`⚡ This expense will use ${percentage.toFixed(0)}% of the ${category.name} budget`)
        } else {
          setBudgetWarning(null)
        }
      }
    }
  }, [formData.category, formData.amount, categories])

  // Generate title suggestions based on category
  useEffect(() => {
    if (formData.category) {
      const categoryTemplates = expenseTemplates.filter(t => t.category === formData.category)
      setSuggestions(categoryTemplates.map(t => t.title))
    } else {
      setSuggestions([])
    }
  }, [formData.category])

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required'
      if (!formData.category) newErrors.category = 'Category is required'
      if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleTemplateSelect = (template: typeof expenseTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      category: template.category,
      amount: template.amount,
      paymentMethod: template.paymentMethod
    }))
    setCurrentStep(2)
  }

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setReceiptPreview(result)
        setFormData(prev => ({ ...prev, receiptUrl: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'edit' ? '✏️ Edit Expense' : '➕ Add New Expense'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            {currentStep === 1 && 'Basic Information'}
            {currentStep === 2 && 'Payment & Details'}
            {currentStep === 3 && 'Additional Information'}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Quick Templates */}
              {mode === 'create' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">🚀 Quick Templates</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {expenseTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{template.icon}</span>
                          <span className="font-medium text-sm">{template.title}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.category} • ₱{template.amount.toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 my-6"></div>
                </div>
              )}

              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Expense Title *
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Office supplies for Q1"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                
                {/* Title Suggestions */}
                {suggestions.length > 0 && formData.title === '' && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setFormData(prev => ({ ...prev, title: suggestion }))}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📂 Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.icon} {category.name}
                      {category.budget && ` (Budget: ₱${category.budget.toLocaleString()})`}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                
                {/* Budget Warning */}
                {budgetWarning && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">{budgetWarning}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Payment & Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  💳 Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(paymentMethods).map(([key, method]) => (
                    <button
                      key={key}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: key as any }))}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        formData.paymentMethod === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{method.icon}</span>
                        <span className="font-medium">{method.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏪 Vendor/Supplier
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ABC Office Supplies"
                />
              </div>
            </div>
          )}

          {/* Step 3: Additional Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional details about this expense..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏷️ Tags
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a tag"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 hover:text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📷 Receipt (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {receiptPreview ? (
                    <div>
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="mx-auto max-h-40 rounded-lg mb-3"
                      />
                      <button
                        onClick={() => {
                          setReceiptPreview(null)
                          setFormData(prev => ({ ...prev, receiptUrl: '' }))
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove receipt
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 mb-2">Upload receipt image</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Choose file
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← Previous
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{mode === 'edit' ? '✅ Update Expense' : '✅ Create Expense'}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
