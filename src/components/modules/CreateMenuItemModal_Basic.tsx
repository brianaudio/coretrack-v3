'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, CreateMenuItem, InventoryItem } from '@/lib/types/menu'

interface CreateMenuItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (item: CreateMenuItem) => Promise<void>
  categories: string[]
  inventory: InventoryItem[]
}

const CreateMenuItemModal: React.FC<CreateMenuItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  inventory
}) => {
  const [formData, setFormData] = useState<CreateMenuItem>({
    name: '',
    description: '',
    price: 0,
    category: '',
    status: 'active',
    isAvailable: true,
    allergens: [],
    nutritionalInfo: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    },
    preparationTime: 0,
    ingredients: []
  })

  const [selectedIngredients, setSelectedIngredients] = useState<Array<{
    id: string
    quantity: number
    unit: string
  }>>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('basic') // Navigation state

  // Helper function to calculate item cost from ingredients
  const calculateItemCost = (ingredients: Array<{ id: string; quantity: number; unit: string }>) => {
    return ingredients.reduce((total, ingredient) => {
      const inventoryItem = inventory.find(item => item.id === ingredient.id)
      if (inventoryItem) {
        return total + (inventoryItem.cost * ingredient.quantity)
      }
      return total
    }, 0)
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: '',
        status: 'active',
        isAvailable: true,
        allergens: [],
        nutritionalInfo: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0
        },
        preparationTime: 0,
        ingredients: []
      })
      setSelectedIngredients([])
      setActiveSection('basic')
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        ingredients: selectedIngredients
      })
      onClose()
    } catch (error) {
      console.error('Error creating menu item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add ingredient to selection
  const addIngredient = (inventoryItem: InventoryItem) => {
    const exists = selectedIngredients.find(ing => ing.id === inventoryItem.id)
    if (!exists) {
      setSelectedIngredients([...selectedIngredients, {
        id: inventoryItem.id,
        quantity: 1,
        unit: inventoryItem.unit
      }])
    }
  }

  // Remove ingredient from selection
  const removeIngredient = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing.id !== id))
  }

  // Update ingredient quantity
  const updateIngredientQuantity = (id: string, quantity: number) => {
    setSelectedIngredients(selectedIngredients.map(ing =>
      ing.id === id ? { ...ing, quantity } : ing
    ))
  }

  if (!isOpen) return null

  // Section navigation items
  const sections = [
    { id: 'basic', label: 'Basic Info', icon: 'info' },
    { id: 'pricing', label: 'Pricing', icon: 'dollar' },
    { id: 'recipe', label: 'Recipe & Ingredients', icon: 'book' },
    { id: 'nutrition', label: 'Nutrition', icon: 'heart' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ]

  const renderSectionIcon = (iconType: string) => {
    const iconClass = "w-5 h-5"
    switch (iconType) {
      case 'info':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      case 'dollar':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
      case 'book':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      case 'heart':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
      case 'settings':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      default:
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex min-h-screen">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative mx-auto my-8 w-full max-w-[1400px] flex bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Sidebar Navigation */}
          <div className="w-80 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Create Menu Item</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Build your menu item with our comprehensive creation wizard. Navigate through each section to complete your item setup.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-6">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                      activeSection === section.id
                        ? 'bg-primary-600 text-white shadow-lg transform scale-[1.02]'
                        : 'text-slate-700 hover:bg-white hover:shadow-md hover:text-slate-900'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      activeSection === section.id
                        ? 'bg-white/20'
                        : 'bg-slate-200 group-hover:bg-primary-100'
                    }`}>
                      <div className={activeSection === section.id ? 'text-white' : 'text-slate-600 group-hover:text-primary-600'}>
                        {renderSectionIcon(section.icon)}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">{section.label}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Progress Indicator */}
            <div className="p-6 border-t border-slate-200">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%` }}
                  />
                </div>
                <span className="font-medium">
                  {sections.findIndex(s => s.id === activeSection) + 1} of {sections.length}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              {/* Content Area */}
              <div className="flex-1 p-10 overflow-y-auto">
                
                {/* Basic Information Section */}
                {activeSection === 'basic' && (
                  <div className="max-w-4xl">
                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-slate-900 mb-3">Basic Information</h3>
                      <p className="text-slate-600 text-lg">Enter the essential details for your menu item.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Item Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="Enter menu item name"
                            required
                          />
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Category *
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            required
                          >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Preparation Time (minutes)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.preparationTime}
                            onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="15"
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Description
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg resize-none"
                            placeholder="Describe your menu item..."
                          />
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Image URL
                          </label>
                          <input
                            type="url"
                            value={formData.image || ''}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pricing Section */}
                {activeSection === 'pricing' && (
                  <div className="max-w-4xl">
                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-slate-900 mb-3">Pricing & Cost</h3>
                      <p className="text-slate-600 text-lg">Set the selling price and track profitability.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                        <h4 className="text-xl font-bold text-slate-900 mb-6">Pricing Details</h4>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                              Selling Price (₱) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-lg">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="w-full pl-10 pr-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xl font-semibold"
                                placeholder="0.00"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                              Cost Per Item (₱)
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-lg">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={calculateItemCost(selectedIngredients)}
                                className="w-full pl-10 pr-4 py-4 border border-slate-300 rounded-xl bg-slate-50 text-xl font-semibold text-slate-600"
                                readOnly
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-sm text-slate-500 mt-2">Calculated from ingredients cost</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border border-primary-200 p-8 shadow-sm">
                        <h4 className="text-xl font-bold text-slate-900 mb-6">Profit Analysis</h4>
                        
                        <div className="space-y-6">
                          <div className="bg-white rounded-xl p-4 border border-primary-200">
                            <div className="text-sm font-medium text-slate-700 mb-1">Profit Margin</div>
                            <div className="text-3xl font-bold text-primary-600">
                              {formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-primary-200">
                            <div className="text-sm font-medium text-slate-700 mb-1">Profit Per Item</div>
                            <div className="text-2xl font-bold text-green-600">
                              ₱{(formData.price - calculateItemCost(selectedIngredients)).toFixed(2)}
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 border border-primary-200">
                            <div className="text-sm font-medium text-slate-700 mb-1">Break-even Point</div>
                            <div className="text-lg font-semibold text-slate-700">
                              ₱{calculateItemCost(selectedIngredients).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recipe & Ingredients Section */}
                {activeSection === 'recipe' && (
                  <div className="max-w-6xl">
                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-slate-900 mb-3">Recipe & Ingredients</h3>
                      <p className="text-slate-600 text-lg">Manage ingredients and recipe details for this menu item.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Ingredients List */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xl font-bold text-slate-900">Selected Ingredients</h4>
                          <button
                            type="button"
                            onClick={() => setShowIngredientSelector(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                          >
                            Add Ingredient
                          </button>
                        </div>

                        {selectedIngredients.length === 0 ? (
                          <div className="text-center py-12">
                            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="text-slate-500 text-lg font-medium mb-2">No ingredients added yet</p>
                            <p className="text-slate-400">Click &ldquo;Add Ingredient&rdquo; to start building your recipe</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedIngredients.map((ingredient) => {
                              const inventoryItem = inventory.find(item => item.id === ingredient.id)
                              return (
                                <div key={ingredient.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                  <div className="flex-1">
                                    <div className="font-semibold text-slate-900">{inventoryItem?.name || 'Unknown Item'}</div>
                                    <div className="text-sm text-slate-600">
                                      {ingredient.quantity} {ingredient.unit} • ₱{((inventoryItem?.cost || 0) * ingredient.quantity).toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={ingredient.quantity}
                                      onChange={(e) => updateIngredientQuantity(ingredient.id, parseFloat(e.target.value) || 0)}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeIngredient(ingredient.id)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {selectedIngredients.length > 0 && (
                          <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-900">Total Ingredient Cost:</span>
                              <span className="text-xl font-bold text-primary-600">₱{calculateItemCost(selectedIngredients).toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recipe Instructions */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="text-xl font-bold text-slate-900 mb-6">Recipe Instructions</h4>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={15}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg resize-none"
                          placeholder="Enter step-by-step cooking instructions..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional sections would go here... */}

              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 px-10 py-6 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">
                      Step {sections.findIndex(s => s.id === activeSection) + 1} of {sections.length}
                    </span>
                    <div className="h-4 w-px bg-slate-300" />
                    <span className="text-sm text-slate-600">
                      {formData.name ? `Creating "${formData.name}"` : 'New Menu Item'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 text-slate-700 hover:text-slate-900 font-medium border border-slate-300 rounded-xl hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    
                    {activeSection !== 'settings' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const currentIndex = sections.findIndex(s => s.id === activeSection)
                          if (currentIndex < sections.length - 1) {
                            setActiveSection(sections[currentIndex + 1].id)
                          }
                        }}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                      >
                        Next Section
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.name || !formData.category}
                        className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold transition-colors shadow-lg"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Menu Item'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Ingredient Selector Modal */}
        {showIngredientSelector && (
          <div className="fixed inset-0 z-60 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowIngredientSelector(false)} />
              
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Select Ingredients</h3>
                    <button
                      onClick={() => setShowIngredientSelector(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <input
                      type="text"
                      value={ingredientSearchTerm}
                      onChange={(e) => setIngredientSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Search ingredients..."
                    />
                  </div>
                </div>

                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {inventory
                      .filter(item => 
                        item.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase()) &&
                        !selectedIngredients.some(selected => selected.id === item.id)
                      )
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                          <div>
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="text-sm text-slate-600">
                              ₱{item.cost.toFixed(2)} per {item.unit} • {item.quantity} available
                            </div>
                          </div>
                          <button
                            onClick={() => addIngredient(item)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowIngredientSelector(false)}
                    className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateMenuItemModal
