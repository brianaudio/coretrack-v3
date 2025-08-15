'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, CreateMenuItem, InventoryItem } from '@/lib/types/menu'

// Category to Icon mapping for seamless selection
const CATEGORY_ICON_MAP: Record<string, string[]> = {
  'Coffee': ['☕', '🥤', '🫖', '🧋', '☕', '🫘', '🤎', '🍵'],
  'Tea': ['🫖', '🍵', '🧋', '🍃', '🌿', '🫖', '🟫', '☕'],
  'Cold Drinks': ['🥤', '🧃', '🥛', '🍹', '🧊', '💧', '🫗', '🍻'],
  'Desserts': ['🧁', '🍰', '🎂', '🍪', '🍩', '🍮', '🍫', '🍬'],
  'Appetizers': ['🍟', '🥨', '🧀', '🥜', '🍿', '🥖', '🫓', '🥙'],
  'Main Course': ['🍔', '🍕', '🍝', '🍜', '🍛', '🥗', '🌮', '🥩'],
  'Breakfast': ['🍳', '🥞', '🧇', '🥓', '🥖', '🍞', '🥐', '☕'],
  'Salads': ['🥗', '🥬', '🍃', '🫒', '🥒', '🍅', '🫑', '🥕'],
  'Sandwiches': ['🥪', '🍔', '🌭', '🥙', '🫓', '🥖', '🍞', '🧀'],
  'Pizza': ['🍕', '🫓', '🧀', '🍅', '🫒', '🌿', '🍄', '🥓'],
  'Pasta': ['🍝', '🍜', '🧀', '🍅', '🌿', '🥄', '🫒', '🧄'],
  'Burgers': ['🍔', '🍟', '🥓', '🧀', '🍅', '🥬', '🥒', '🧅'],
  'Sides': ['🍟', '🥨', '🧀', '🥖', '🍿', '🫓', '🥜', '🧅'],
  'Beverages': ['🥤', '☕', '🧋', '🍹', '🧃', '🥛', '🫖', '💧'],
  'Alcohol': ['🍻', '🍷', '🥂', '🍸', '🍺', '🥃', '🍾', '🍹'],
  'Smoothies': ['🥤', '🍓', '🍌', '🥭', '🫐', '🍑', '🥝', '🧊'],
  'Bakery': ['🥐', '🥖', '🍞', '🧁', '🍪', '🥯', '🫓', '🍩'],
  'Soups': ['🍜', '🥣', '🫕', '🥄', '🧄', '🥕', '🧅', '🌿'],
  'Default': ['🍽️', '🥘', '🍴', '🥄', '🍶', '🫖', '🥪', '🍱']
}

// Helper function to get default icon for category
const getDefaultIconForCategory = (category: string): string => {
  const icons = CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP['Default']
  return icons[0] // Return first icon as default
}

// Seamless Icon Selector Component
interface CategoryIconSelectorProps {
  category: string
  selectedIcon: string
  onIconChange: (icon: string) => void
}

function CategoryIconSelector({ category, selectedIcon, onIconChange }: CategoryIconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const availableIcons = CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP['Default']
  
  // Auto-select default icon when category changes
  React.useEffect(() => {
    if (category && !selectedIcon) {
      onIconChange(getDefaultIconForCategory(category))
    }
  }, [category, selectedIcon, onIconChange])

  const handleIconSelect = (icon: string) => {
    onIconChange(icon)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 w-full">
          <div className="flex items-center bg-slate-50 rounded-xl p-3 min-w-[80px] justify-center">
            <div className="text-3xl">{selectedIcon || getDefaultIconForCategory(category)}</div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-700 mb-1">Category Icon</div>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
            >
              Change Icon
              <svg className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Icon Selection Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-20 min-w-[320px]">
          <div className="text-sm text-slate-600 mb-3 font-medium">Choose icon for {category}:</div>
          <div className="grid grid-cols-8 gap-2">
            {availableIcons.map((icon, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleIconSelect(icon)}
                className={`p-2 text-2xl rounded-lg transition-all hover:bg-blue-50 ${
                  selectedIcon === icon 
                    ? 'bg-blue-100 ring-2 ring-blue-500 shadow-sm' 
                    : 'bg-slate-50 hover:bg-blue-50 hover:shadow-sm'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
    emoji: '',
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

  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('basic') // Navigation state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null)

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

  // Auto-update form ingredients when selectedIngredients changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ingredients: selectedIngredients
      // Note: modifiers handled separately for now
    }))
  }, [selectedIngredients])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: '',
        emoji: '',
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
      setSelectedCategoryIcon('')
      setActiveSection('basic')
      setIsSubmitting(false)
    }
  }, [isOpen, categories, inventory])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) return

    setIsSubmitting(true)
    try {
      const cost = calculateItemCost(selectedIngredients)
      const profitAmount = formData.price - cost
      const profitMargin = formData.price > 0 ? (profitAmount / formData.price) * 100 : 0

      await onSubmit({
        ...formData,
        emoji: selectedCategoryIcon || getDefaultIconForCategory(formData.category), // Use selected or default icon
        ingredients: selectedIngredients,
        cost,
        profitMargin,
        profitAmount
        // Note: modifiers will be handled separately or added to the interface
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
      const newIngredients = [...selectedIngredients, {
        id: inventoryItem.id,
        quantity: 1,
        unit: inventoryItem.unit
      }]
      setSelectedIngredients(newIngredients)
      
      // Show notification
      setNotification({
        message: `Added ${inventoryItem.name} to ingredients`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 2000)
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

  // Ensure we always have categories available
  const availableCategories = categories.length > 0 
    ? categories 
    : ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Sides', 'Salads', 'Soups', 'Pasta', 'Pizza', 'Burgers']

  const renderSectionIcon = (iconType: string) => {
    const iconClass = "w-5 h-5"
    switch (iconType) {
      case 'info':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      case 'dollar':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
      case 'book':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      case 'plus':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
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
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg border bg-green-50 text-green-800 border-green-200 transition-all duration-300">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative mx-auto my-8 w-full max-w-[1400px] h-[calc(100vh-4rem)] flex bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Floating Save Button - Only visible on settings tab */}
          {activeSection === 'settings' && (
            <div className="absolute top-6 right-6 z-10">
              <button
                type="submit"
                form="menu-item-form"
                disabled={isSubmitting || !formData.name || !formData.category}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg transform hover:scale-105 ${
                  isSubmitting || !formData.name || !formData.category
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 animate-pulse'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Menu Item
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Sidebar Navigation */}
          <div className="w-80 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Menu Builder</h2>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Enterprise Edition</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Create professional menu items with advanced cost analysis and profit optimization.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-6">
              <nav className="space-y-3">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-300 group ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 transform scale-[1.02]'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:shadow-md'
                    }`}
                  >
                    <div className={`relative p-3 rounded-lg transition-all duration-300 ${
                      activeSection === section.id
                        ? 'bg-white/20 shadow-md'
                        : 'bg-slate-700 group-hover:bg-slate-600'
                    }`}>
                      {/* Step number indicator */}
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                        activeSection === section.id
                          ? 'bg-white text-indigo-600'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div className={activeSection === section.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}>
                        {renderSectionIcon(section.icon)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base">{section.label}</div>
                      <div className={`text-xs mt-1 ${
                        activeSection === section.id ? 'text-white/80' : 'text-slate-400'
                      }`}>
                        {section.id === 'basic' && 'Essential information'}
                        {section.id === 'pricing' && 'Cost & profit analysis'}
                        {section.id === 'recipe' && 'Ingredients & instructions'}
                        {section.id === 'nutrition' && 'Health information'}
                        {section.id === 'settings' && 'Final review & save'}
                      </div>
                    </div>
                    {/* Active indicator */}
                    {activeSection === section.id && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Progress Indicator */}
            <div className="p-6 border-t border-slate-700">
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span className="font-medium">Progress</span>
                  <span className="font-bold">
                    {sections.findIndex(s => s.id === activeSection) + 1} of {sections.length}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-slate-400 text-center">
                Complete all sections to create your menu item
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <form id="menu-item-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              {/* Content Area */}
              <div className="flex-1 p-10 overflow-y-auto min-h-0">
                
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
                            onChange={(e) => {
                              const newCategory = e.target.value
                              setFormData({ ...formData, category: newCategory })
                              // Auto-select default icon for the new category
                              if (newCategory) {
                                setSelectedCategoryIcon(getDefaultIconForCategory(newCategory))
                              }
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            required
                          >
                            <option value="">Select a category</option>
                            {availableCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Category Icon Selector - Only show if category is selected */}
                        {formData.category && (
                          <CategoryIconSelector
                            category={formData.category}
                            selectedIcon={selectedCategoryIcon}
                            onIconChange={setSelectedCategoryIcon}
                          />
                        )}

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
                              Cost Per Item (₱) - Auto-calculated
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-lg">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={calculateItemCost(selectedIngredients).toFixed(2)}
                                className="w-full pl-10 pr-4 py-4 border border-slate-300 rounded-xl bg-blue-50 text-xl font-semibold text-blue-700 cursor-not-allowed"
                                readOnly
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Calculated automatically from selected ingredients
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-200 p-8 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <h4 className="text-xl font-bold text-slate-900">Profitability Analytics</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                          {/* Profit Margin with Visual Indicator */}
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Profit Margin</div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 60 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 30 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {(formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 60 
                                  ? 'EXCELLENT' 
                                  : (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 30 
                                    ? 'GOOD' 
                                    : 'LOW'}
                              </div>
                            </div>
                            <div className="flex items-baseline gap-2 mb-3">
                              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100).toFixed(1) : 0}%
                              </div>
                              <div className="text-sm text-slate-500 font-medium">margin</div>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 60 
                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                                    : (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 30 
                                      ? 'bg-gradient-to-r from-amber-400 to-amber-600' 
                                      : 'bg-gradient-to-r from-red-400 to-red-600'
                                }`}
                                style={{ 
                                  width: `${Math.min((formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0), 100)}%` 
                                }}
                              />
                            </div>
                            <div className="text-xs text-slate-500">Target: 60%+ for optimal profitability</div>
                          </div>
                          
                          {/* Profit Amount */}
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                            <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Profit Per Item</div>
                            <div className="flex items-baseline gap-2 mb-2">
                              <div className="text-3xl font-bold text-emerald-600">
                                ₱{(formData.price - calculateItemCost(selectedIngredients)).toFixed(2)}
                              </div>
                              <div className="text-sm text-slate-500 font-medium">per sale</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Revenue: ₱{formData.price.toFixed(2)} - Cost: ₱{calculateItemCost(selectedIngredients).toFixed(2)}
                            </div>
                          </div>

                          {/* Break-even Analysis */}
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                            <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Break-even Point</div>
                            <div className="flex items-baseline gap-2 mb-2">
                              <div className="text-2xl font-bold text-slate-700">
                                ₱{calculateItemCost(selectedIngredients).toFixed(2)}
                              </div>
                              <div className="text-sm text-slate-500 font-medium">minimum price</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Price must exceed this to generate profit
                            </div>
                          </div>

                          {/* Quick Financial Summary */}
                          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-slate-500 font-medium">Daily Target (10 sales)</div>
                                <div className="font-bold text-slate-700">₱{((formData.price - calculateItemCost(selectedIngredients)) * 10).toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-slate-500 font-medium">Monthly Target (300 sales)</div>
                                <div className="font-bold text-slate-700">₱{((formData.price - calculateItemCost(selectedIngredients)) * 300).toFixed(2)}</div>
                              </div>
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
                      <p className="text-slate-600 text-lg">Build your recipe with ingredients and cooking instructions.</p>
                    </div>

                    <div className="space-y-8">
                      {/* Ingredients Section */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-slate-900">Ingredients</h4>
                              <p className="text-sm text-slate-600 mt-1">
                                {selectedIngredients.length === 0 ? 'No ingredients added' : `${selectedIngredients.length} ingredient${selectedIngredients.length === 1 ? '' : 's'} selected`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowIngredientSelector(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Ingredient
                            </button>
                          </div>
                        </div>

                        <div className="p-6">
                          {selectedIngredients.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <p className="text-slate-600 font-medium">Start building your recipe</p>
                              <p className="text-slate-500 text-sm">Add ingredients to calculate costs and create your recipe</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {selectedIngredients.map((ingredient) => {
                                const inventoryItem = inventory.find(item => item.id === ingredient.id)
                                const itemCost = ((inventoryItem?.cost || 0) * ingredient.quantity)
                                return (
                                  <div key={ingredient.id} className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-slate-900 truncate">{inventoryItem?.name || 'Unknown Item'}</h5>
                                          <p className="text-sm text-slate-600">₱{itemCost.toFixed(2)} total cost</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-right">
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={ingredient.quantity}
                                            onChange={(e) => updateIngredientQuantity(ingredient.id, parseFloat(e.target.value) || 0)}
                                            className="w-16 px-2 py-1 text-center border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                          />
                                          <span className="text-sm text-slate-500 min-w-0">{ingredient.unit}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeIngredient(ingredient.id)}
                                      className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Cost Summary */}
                          {selectedIngredients.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-700 font-medium">Total Recipe Cost</span>
                                <span className="text-xl font-bold text-primary-600">₱{calculateItemCost(selectedIngredients).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recipe Instructions */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                          <h4 className="text-lg font-semibold text-slate-900">Cooking Instructions</h4>
                          <p className="text-sm text-slate-600 mt-1">Step-by-step preparation guide</p>
                        </div>
                        <div className="p-6">
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={12}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-base leading-relaxed"
                            placeholder="1. First, prepare your ingredients by washing and chopping them...&#10;2. Heat the pan over medium heat...&#10;3. Add the ingredients in order..."
                          />
                          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                            <span>Write clear, step-by-step instructions</span>
                            <span>{formData.description.length} characters</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nutrition Section */}
                {activeSection === 'nutrition' && (
                  <div className="max-w-4xl">
                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-slate-900 mb-3">Nutritional Information</h3>
                      <p className="text-slate-600 text-lg">Add nutritional details for health-conscious customers.</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Calories</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.nutritionalInfo.calories}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, calories: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Protein (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.nutritionalInfo.protein}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, protein: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Carbs (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.nutritionalInfo.carbs}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, carbs: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Fat (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.nutritionalInfo.fat}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, fat: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Fiber (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.nutritionalInfo.fiber}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, fiber: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Sugar (g)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.nutritionalInfo.sugar}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, sugar: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Sodium (mg)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.nutritionalInfo.sodium}
                            onChange={(e) => setFormData({
                              ...formData,
                              nutritionalInfo: { ...formData.nutritionalInfo, sodium: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Allergens</label>
                          <input
                            type="text"
                            value={formData.allergens.join(', ')}
                            onChange={(e) => setFormData({
                              ...formData,
                              allergens: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                            })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            placeholder="nuts, dairy, gluten"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings Section */}
                {activeSection === 'settings' && (
                  <div className="max-w-4xl">
                    <div className="mb-8">
                      <h3 className="text-3xl font-bold text-slate-900 mb-3">Item Settings</h3>
                      <p className="text-slate-600 text-lg">Configure availability and status settings, and review your menu item.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="text-xl font-bold text-slate-900 mb-6">Availability Settings</h4>
                        
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                              <div className="font-semibold text-slate-900">Item Available</div>
                              <div className="text-sm text-slate-600">Show this item in POS and ordering systems</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.isAvailable}
                                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
                            <select
                              value={formData.status}
                              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'out_of_stock' })}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="out_of_stock">Out of Stock</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h4 className="text-2xl font-bold text-slate-900">Menu Item Overview</h4>
                        </div>
                        
                        {/* Main Details Grid */}
                        <div className="grid grid-cols-1 gap-4 mb-8">
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Item Name:</span>
                              <span className="font-bold text-slate-900 text-lg">{formData.name || 'Not set'}</span>
                            </div>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Category:</span>
                              <span className="font-bold text-slate-900">{formData.category || 'Not set'}</span>
                            </div>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Selling Price:</span>
                              <span className="font-bold text-slate-900 text-lg">₱{formData.price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Ingredient Cost:</span>
                              <span className="font-bold text-slate-900">₱{calculateItemCost(selectedIngredients).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Profitability Metrics */}
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border-2 border-emerald-200 mb-6">
                          <h5 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Profitability Analysis
                          </h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-emerald-200">
                              <div className="text-sm font-medium text-slate-600 mb-1">Profit Margin</div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-emerald-600">
                                  {formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100).toFixed(1) : 0}%
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 60 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 30 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-red-100 text-red-700'
                                }`}>
                                  {(formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 60 
                                    ? 'EXCELLENT' 
                                    : (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 30 
                                      ? 'GOOD' 
                                      : 'LOW'}
                                </span>
                              </div>
                              {/* Mini Progress Bar */}
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 60 
                                      ? 'bg-emerald-500' 
                                      : (formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0) >= 30 
                                        ? 'bg-amber-500' 
                                        : 'bg-red-500'
                                  }`}
                                  style={{ 
                                    width: `${Math.min((formData.price > 0 ? (((formData.price - calculateItemCost(selectedIngredients)) / formData.price) * 100) : 0), 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-emerald-200">
                              <div className="text-sm font-medium text-slate-600 mb-1">Profit Per Item</div>
                              <div className="text-2xl font-bold text-green-600">
                                ₱{(formData.price - calculateItemCost(selectedIngredients)).toFixed(2)}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Revenue - Cost = Profit
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Ingredients:</span>
                              <span className="font-bold text-slate-900">{selectedIngredients.length} items</span>
                            </div>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Prep Time:</span>
                              <span className="font-bold text-slate-900">{formData.preparationTime} min</span>
                            </div>
                          </div>
                        </div>

                        {/* Validation Warning */}
                        {(!formData.name || !formData.category) && (
                          <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 text-amber-800">
                              <div className="p-2 bg-amber-200 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              </div>
                              <div>
                                <div className="font-bold">Required Fields Missing</div>
                                <div className="text-sm">Please complete item name and category before saving.</div>
                              </div>
                            </div>
                          </div>
                        )}
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
                    
                    {/* Back button - shows on all tabs except first */}
                    {sections.findIndex(s => s.id === activeSection) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentIndex = sections.findIndex(s => s.id === activeSection)
                          if (currentIndex > 0) {
                            setActiveSection(sections[currentIndex - 1].id)
                          }
                        }}
                        className="px-6 py-3 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                      >
                        Back
                      </button>
                    )}
                    
                    {/* Next button - shows on all tabs except last */}
                    {activeSection !== 'settings' && (
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
                        Next Step
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
              
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Select Ingredients</h3>
                      {selectedIngredients.length > 0 && (
                        <div className="mt-2 flex items-center gap-4">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{selectedIngredients.length}</span> ingredients selected
                          </div>
                          <div className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            Total Cost: ₱{calculateItemCost(selectedIngredients).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Debug info */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    Debug: {inventory.length} total inventory items, {inventory.filter(item => 
                      item.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase()) &&
                      !selectedIngredients.some(selected => selected.id === item.id)
                    ).length} available to add
                  </div>
                  
                  <div className="space-y-2">
                    {inventory
                      .filter(item => 
                        item.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase()) &&
                        !selectedIngredients.some(selected => selected.id === item.id)
                      )
                      .map((item) => (
                        <div key={item.id} className="group flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-900 truncate">{item.name}</h4>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-sm text-slate-600">₱{item.cost.toFixed(2)} per {item.unit}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    item.quantity > 10 
                                      ? 'text-green-700 bg-green-100' 
                                      : item.quantity > 0 
                                      ? 'text-yellow-700 bg-yellow-100' 
                                      : 'text-red-700 bg-red-100'
                                  }`}>
                                    {item.quantity > 0 ? `${item.quantity} ${item.unit} available` : 'Out of stock'}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => addIngredient(item)}
                                disabled={item.quantity === 0}
                                className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  item.quantity === 0 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                                }`}
                              >
                                {item.quantity === 0 ? 'Out of Stock' : 'Add'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {inventory.filter(item => 
                    item.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase()) &&
                    !selectedIngredients.some(selected => selected.id === item.id)
                  ).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-slate-700 font-medium mb-1">No ingredients found</h3>
                      <p className="text-slate-500 text-sm">Try adjusting your search terms</p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      {selectedIngredients.length === 0 ? (
                        "No ingredients selected yet"
                      ) : (
                        <>
                          <span className="font-medium">{selectedIngredients.length}</span> ingredient{selectedIngredients.length === 1 ? '' : 's'} • 
                          <span className="font-semibold text-primary-600"> ₱{calculateItemCost(selectedIngredients).toFixed(2)}</span> total cost
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowIngredientSelector(false)}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Done
                    </button>
                  </div>
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
