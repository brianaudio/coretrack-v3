'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, InventoryItem } from '@/lib/types/menu'

interface EditMenuItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (item: MenuItem) => Promise<void>
  item: MenuItem | null
  categories: string[]
  inventory: InventoryItem[]
}

const EditMenuItemModal: React.FC<EditMenuItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  item,
  categories,
  inventory
}) => {
  const [formData, setFormData] = useState<MenuItem | null>(null)
  const [selectedIngredients, setSelectedIngredients] = useState<Array<{
    id: string
    quantity: number
    unit: string
  }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)

  const allergenOptions = [
    'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 
    'Wheat', 'Soybeans', 'Sesame', 'Gluten'
  ]

  useEffect(() => {
    if (isOpen && item) {
      setFormData({ ...item })
      setSelectedIngredients(item.ingredients || [])
    } else if (!isOpen) {
      setFormData(null)
      setSelectedIngredients([])
      setIsSubmitting(false)
    }
  }, [isOpen, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || !formData) return

    try {
      setIsSubmitting(true)
      await onSubmit({
        ...formData,
        ingredients: selectedIngredients,
        updatedAt: new Date()
      })
      onClose()
    } catch (error) {
      console.error('Error updating menu item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addIngredient = (inventoryItem: InventoryItem) => {
    if (!selectedIngredients.find(ing => ing.id === inventoryItem.id)) {
      setSelectedIngredients([
        ...selectedIngredients,
        {
          id: inventoryItem.id,
          quantity: 1,
          unit: inventoryItem.unit
        }
      ])
    }
    setShowIngredientSelector(false)
  }

  const removeIngredient = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing.id !== id))
  }

  const updateIngredientQuantity = (id: string, quantity: number) => {
    setSelectedIngredients(selectedIngredients.map(ing =>
      ing.id === id ? { ...ing, quantity } : ing
    ))
  }

  if (!isOpen || !formData) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-surface-900 bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 w-full max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
            <h3 className="text-lg font-semibold text-surface-900">Edit Menu Item</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-surface-900">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Cost (₱)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Preparation Time (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.preparationTime}
                      onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
                    />
                    <span className="ml-2 text-sm text-surface-700">Available for ordering</span>
                  </label>
                </div>
              </div>

              {/* Advanced Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-surface-900">Advanced Information</h4>

                {/* Allergens */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Allergens
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {allergenOptions.map(allergen => (
                      <label key={allergen} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.allergens.includes(allergen)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                allergens: [...formData.allergens, allergen]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                allergens: formData.allergens.filter((a: string) => a !== allergen)
                              })
                            }
                          }}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
                        />
                        <span className="ml-2 text-sm text-surface-700">{allergen}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Nutritional Information */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Nutritional Information (per serving)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Calories"
                      value={formData.nutritionalInfo.calories}
                      onChange={(e) => setFormData({
                        ...formData,
                        nutritionalInfo: {
                          ...formData.nutritionalInfo,
                          calories: parseInt(e.target.value) || 0
                        }
                      })}
                      className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Protein (g)"
                      value={formData.nutritionalInfo.protein}
                      onChange={(e) => setFormData({
                        ...formData,
                        nutritionalInfo: {
                          ...formData.nutritionalInfo,
                          protein: parseInt(e.target.value) || 0
                        }
                      })}
                      className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Carbs (g)"
                      value={formData.nutritionalInfo.carbs}
                      onChange={(e) => setFormData({
                        ...formData,
                        nutritionalInfo: {
                          ...formData.nutritionalInfo,
                          carbs: parseInt(e.target.value) || 0
                        }
                      })}
                      className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Fat (g)"
                      value={formData.nutritionalInfo.fat}
                      onChange={(e) => setFormData({
                        ...formData,
                        nutritionalInfo: {
                          ...formData.nutritionalInfo,
                          fat: parseInt(e.target.value) || 0
                        }
                      })}
                      className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-surface-700">
                      Ingredients & Recipe
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowIngredientSelector(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedIngredients.map(ingredient => {
                      const inventoryItem = inventory.find(item => item.id === ingredient.id)
                      return (
                        <div key={ingredient.id} className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg">
                          <span className="flex-1 text-sm">{inventoryItem?.name}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredientQuantity(ingredient.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-surface-300 rounded"
                          />
                          <span className="text-sm text-surface-500">{ingredient.unit}</span>
                          <button
                            type="button"
                            onClick={() => removeIngredient(ingredient.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                    {selectedIngredients.length === 0 && (
                      <p className="text-sm text-surface-500 text-center py-4">
                        No ingredients added yet. Click &ldquo;Add Ingredient&rdquo; to start.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredient Selector Modal */}
            {showIngredientSelector && (
              <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                  <div className="fixed inset-0 bg-surface-900 bg-opacity-50" onClick={() => setShowIngredientSelector(false)} />
                  <div className="relative bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
                    <div className="p-4 border-b">
                      <h4 className="font-medium">Select Ingredient</h4>
                    </div>
                    <div className="p-4 space-y-2">
                      {inventory.filter(item => !selectedIngredients.find(ing => ing.id === item.id)).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addIngredient(item)}
                          className="w-full text-left p-2 hover:bg-surface-50 rounded border border-surface-200"
                        >
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-surface-500">Stock: {item.quantity} {item.unit}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-surface-700 hover:text-surface-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.category}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Updating...' : 'Update Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditMenuItemModal
