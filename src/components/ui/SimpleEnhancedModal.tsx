'use client'

import React, { useState, useCallback } from 'react'

import { EnhancedMenuItem } from '../../lib/firebase/enhancedMenuBuilder'
import { addMenuCategory, type CreateMenuCategory } from '../../lib/firebase/menuBuilder'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'

interface SimpleEnhancedModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (product: Partial<EnhancedMenuItem>) => void
  inventoryItems: Array<{
    id: string
    name: string
    unit: string
    costPerUnit: number
    currentStock: number
  }>
  categories: Array<{
    id: string
    name: string
    description?: string
  }>
}

export default function SimpleEnhancedModal({
  isOpen,
  onClose,
  onSubmit,
  inventoryItems,
  categories
}: SimpleEnhancedModalProps) {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()

  
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    emoji: '',
    ingredients: [] as Array<{
      inventoryItemId: string
      inventoryItemName: string
      quantity: number
      unit: string
      cost: number
    }>,
    calories: 0,
    allergens: [] as string[],
    preparationTime: 15
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')

  const steps = [
    { title: 'Basic Info', icon: '📝' },
    { title: 'Recipe', icon: '🧪' },
    { title: 'Pricing', icon: '💰' },
    { title: 'Details', icon: '📋' }
  ]

  // Submit form
  const handleSubmit = async () => {
    if (!profile?.tenantId || !selectedBranch) return

    setIsSubmitting(true)

    try {
      // If the category doesn't exist yet (new category), create it first
      const existingCategory = categories.find(cat => cat.name === formData.category)
      if (!existingCategory && formData.category.trim()) {
        console.log('Creating new category:', formData.category)
        const newCategoryData: CreateMenuCategory = {
          name: formData.category.trim(),
          description: newCategoryDescription || `${formData.category} items`,
          displayOrder: categories.length,
          tenantId: profile.tenantId
        }
        
        // Add locationId for branch-specific category
        const categoryWithLocation = {
          ...newCategoryData,
          locationId: getBranchLocationId(selectedBranch.id)
        }
        
        try {
          await addMenuCategory(categoryWithLocation as any)
          console.log('✅ New category created successfully')
        } catch (error) {
          console.error('Error creating new category:', error)
          // Continue anyway - the category name will still be used
        }
      }

      // Skip image upload entirely for now
      const imageUrl = undefined

      const productData: Partial<EnhancedMenuItem> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        emoji: formData.emoji,
        imageUrl,
        ingredients: formData.ingredients,
        pricing: {
          basePrice: formData.price,
          bulkPricing: []
        },
        nutrition: {
          calories: formData.calories,
          allergens: formData.allergens,
          dietaryTags: []
        },
        metadata: {
          preparationTime: formData.preparationTime,
          difficulty: 'medium',
          tags: [],
          created: new Date(),
          lastModified: new Date(),
          createdBy: profile.uid
        },
        availability: {
          isAvailable: true,
          availableDays: [0, 1, 2, 3, 4, 5, 6],
          availableHours: {
            start: '06:00',
            end: '22:00'
          }
        },
        integration: {
          syncToPOS: true
        },
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch.id),
        status: 'active'
      }

      await onSubmit(productData)
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: '',
        price: 0,
        emoji: '',
        ingredients: [],
        calories: 0,
        allergens: [],
        preparationTime: 15
      })
      setCurrentStep(0)
      setShowNewCategoryInput(false)
      setNewCategoryName('')
      setNewCategoryDescription('')
      
      onClose()
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Error creating product. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 1,
        unit: '',
        cost: 0
      }]
    }))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newIngredients = [...prev.ingredients]
      newIngredients[index] = { ...newIngredients[index], [field]: value }
      
      // Auto-calculate cost if quantity or item changes
      if (field === 'inventoryItemId' || field === 'quantity') {
        const item = inventoryItems.find(i => i.id === newIngredients[index].inventoryItemId)
        if (item) {
          newIngredients[index].inventoryItemName = item.name
          newIngredients[index].unit = item.unit
          newIngredients[index].cost = newIngredients[index].quantity * item.costPerUnit
        }
      }
      
      return { ...prev, ingredients: newIngredients }
    })
  }

  if (!isOpen) return null

  const totalCost = formData.ingredients.reduce((sum, ing) => sum + ing.cost, 0)
  const profit = formData.price - totalCost
  const marginPercent = formData.price > 0 ? (profit / formData.price) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">Create New Product</h2>
              <p className="text-blue-100 text-sm">Professional product creation wizard</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress */}
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, index) => (
              <div key={index} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  index === currentStep 
                    ? 'bg-white text-blue-600' 
                    : index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white bg-opacity-20 text-white'
                }`}>
                  {index < currentStep ? '✓' : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded ${
                    index < currentStep ? 'bg-green-500' : 'bg-white bg-opacity-20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <p className="text-sm text-blue-100">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic Information</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Start with the essential details about your product.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="Enter product name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <div className="space-y-2">
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__new_category__') {
                          setShowNewCategoryInput(true)
                          setFormData(prev => ({ ...prev, category: '' }))
                        } else {
                          setShowNewCategoryInput(false)
                          setFormData(prev => ({ ...prev, category: e.target.value }))
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      {categories.map((category, index) => (
                        <option key={`category-${index}-${category.id}`} value={category.name}>
                          {category.name}
                          {category.description ? ` - ${category.description}` : ''}
                        </option>
                      ))}
                      <option value="__new_category__" className="border-t border-gray-200 font-medium text-blue-600">
                        + Create New Category
                      </option>
                    </select>
                    
                    {showNewCategoryInput && (
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              New Category Name *
                            </label>
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter category name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={newCategoryDescription}
                              onChange={(e) => setNewCategoryDescription(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Describe this category"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (newCategoryName.trim()) {
                                  setFormData(prev => ({ ...prev, category: newCategoryName.trim() }))
                                  setShowNewCategoryInput(false)
                                  setNewCategoryName('')
                                  setNewCategoryDescription('')
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                              Use This Category
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewCategoryInput(false)
                                setNewCategoryName('')
                                setNewCategoryDescription('')
                              }}
                              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emoji (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl"
                    placeholder="🍔"
                    maxLength={2}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your product..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Recipe */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Recipe & Ingredients</h3>
                  <p className="text-gray-600 text-sm">
                    Add ingredients to calculate cost and track inventory.
                  </p>
                </div>
                <button
                  onClick={addIngredient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Ingredient
                </button>
              </div>
              
              {formData.ingredients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No ingredients added yet</p>
                  <p className="text-sm">Add ingredients to calculate product cost</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateIngredient(index, 'inventoryItemId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Quantity"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={`₱${ingredient.cost.toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-right bg-green-50 p-4 rounded-lg">
                    <p className="text-lg font-semibold text-green-800">
                      Total Cost: ₱{totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Set your selling price. We recommend a 60-70% profit margin.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Cost</label>
                  <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                    ₱{totalCost.toFixed(2)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profit Margin</label>
                  <div className={`px-4 py-3 border border-gray-300 rounded-lg font-medium ${
                    marginPercent >= 60 ? 'bg-green-100 text-green-800' :
                    marginPercent >= 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    ₱{profit.toFixed(2)} ({marginPercent.toFixed(1)}%)
                  </div>
                </div>
              </div>
              
              {marginPercent < 40 && formData.price > 0 && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-orange-800">Low Profit Margin Warning</h4>
                      <p className="text-sm text-orange-700">
                        Consider increasing the price or reducing costs for better profitability.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Details</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Add nutritional information and preparation details.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calories (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="kcal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.preparationTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: parseInt(e.target.value) || 15 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergens (optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree nuts', 'Peanuts', 'Wheat', 'Soybeans'].map(allergen => (
                    <label key={allergen} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.allergens.includes(allergen)}
                        onChange={(e) => {
                          const newAllergens = e.target.checked
                            ? [...formData.allergens, allergen]
                            : formData.allergens.filter(a => a !== allergen)
                          setFormData(prev => ({ ...prev, allergens: newAllergens }))
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{allergen}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.name || !formData.category}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Create Product
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
