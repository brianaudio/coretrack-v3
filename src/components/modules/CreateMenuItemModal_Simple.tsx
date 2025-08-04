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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('')

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
      setIsSubmitting(false)
    }
  }, [isOpen])

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
        ingredients: selectedIngredients,
        cost,
        profitMargin,
        profitAmount
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Simple backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Clean, centered modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        
        {/* Simple header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Item</h2>
            <p className="text-sm text-gray-500 mt-1">Create a new menu item for your restaurant</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Basic Info - Clean grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category and Emoji */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.emoji || ''}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    className="w-16 px-3 py-3 border border-gray-200 rounded-lg text-center text-xl"
                    placeholder="🍔"
                    maxLength={2}
                  />
                  <div className="flex gap-2">
                    {['🍔', '🍕', '🍟', '🥤', '☕', '🍰'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, emoji })}
                        className="text-lg p-2 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Describe your menu item..."
              />
            </div>

            {/* Simple Ingredients Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Ingredients (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowIngredientSelector(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Ingredient
                </button>
              </div>

              {selectedIngredients.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedIngredients.map((ingredient, index) => {
                    const inventoryItem = inventory.find(item => item.id === ingredient.id)
                    return (
                      <div key={ingredient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900">{inventoryItem?.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeIngredient(ingredient.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick Options */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prep Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.preparationTime}
                  onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calories (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.nutritionalInfo.calories}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    nutritionalInfo: { 
                      ...formData.nutritionalInfo, 
                      calories: parseInt(e.target.value) || 0 
                    }
                  })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="250"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Simple footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedIngredients.length > 0 && (
              <span>Cost: ₱{calculateItemCost(selectedIngredients).toFixed(2)}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.category}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </div>

      </div>

      {/* Ingredient Selector Modal */}
      {showIngredientSelector && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowIngredientSelector(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Add Ingredient</h3>
              <input
                type="text"
                value={ingredientSearchTerm}
                onChange={(e) => setIngredientSearchTerm(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Search ingredients..."
              />
            </div>
            <div className="overflow-y-auto max-h-64">
              {inventory
                .filter(item => 
                  item.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
                )
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      addIngredient(item)
                      setShowIngredientSelector(false)
                      setIngredientSearchTerm('')
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.unit} • Stock: {item.quantity}</div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default CreateMenuItemModal
