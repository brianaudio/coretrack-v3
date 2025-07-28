'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, Recipe, InventoryItem } from '@/lib/types/menu'

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  menuItem: MenuItem | null
  inventory: InventoryItem[]
  onSaveRecipe?: (recipe: Recipe) => Promise<void>
}

const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  menuItem,
  inventory,
  onSaveRecipe
}) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newInstruction, setNewInstruction] = useState('')

  useEffect(() => {
    if (isOpen && menuItem) {
      // In a real app, you'd fetch the recipe from your backend
      // For now, we'll create a sample recipe structure
      setRecipe({
        id: `recipe-${menuItem.id}`,
        menuItemId: menuItem.id,
        name: `${menuItem.name} Recipe`,
        description: menuItem.description,
        instructions: [
          'Prepare all ingredients according to the quantities listed',
          'Follow cooking instructions below',
          'Plate and serve immediately'
        ],
        prepTime: Math.floor(menuItem.preparationTime * 0.3),
        cookTime: Math.floor(menuItem.preparationTime * 0.7),
        servings: 1,
        difficulty: 'medium',
        ingredients: menuItem.ingredients.map(ing => {
          const inventoryItem = inventory.find(item => item.id === ing.id)
          return {
            id: ing.id,
            name: inventoryItem?.name || 'Unknown Ingredient',
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ''
          }
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } else if (!isOpen) {
      setRecipe(null)
      setIsEditing(false)
      setIsSaving(false)
      setNewInstruction('')
    }
  }, [isOpen, menuItem, inventory])

  const handleSave = async () => {
    if (!recipe || !onSaveRecipe) return

    try {
      setIsSaving(true)
      await onSaveRecipe({
        ...recipe,
        updatedAt: new Date()
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving recipe:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addInstruction = () => {
    if (newInstruction.trim() && recipe) {
      setRecipe({
        ...recipe,
        instructions: [...recipe.instructions, newInstruction.trim()]
      })
      setNewInstruction('')
    }
  }

  const removeInstruction = (index: number) => {
    if (recipe) {
      setRecipe({
        ...recipe,
        instructions: recipe.instructions.filter((_, i) => i !== index)
      })
    }
  }

  const updateInstruction = (index: number, value: string) => {
    if (recipe) {
      setRecipe({
        ...recipe,
        instructions: recipe.instructions.map((inst, i) => i === index ? value : inst)
      })
    }
  }

  const calculateTotalCost = () => {
    if (!recipe) return 0
    return recipe.ingredients.reduce((total, ingredient) => {
      const inventoryItem = inventory.find(item => item.id === ingredient.id)
      return total + (inventoryItem?.cost || 0) * ingredient.quantity
    }, 0)
  }

  if (!isOpen || !menuItem || !recipe) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-surface-900 bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 sticky top-0 bg-white">
            <div>
              <h3 className="text-lg font-semibold text-surface-900">{recipe.name}</h3>
              <p className="text-sm text-surface-500">{menuItem.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {onSaveRecipe && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recipe Overview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-medium text-surface-900 mb-2">Description</h4>
                  {isEditing ? (
                    <textarea
                      value={recipe.description}
                      onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  ) : (
                    <p className="text-surface-700">{recipe.description}</p>
                  )}
                </div>

                {/* Recipe Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-50 p-3 rounded-lg">
                    <div className="text-sm text-surface-500">Prep Time</div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={recipe.prepTime}
                        onChange={(e) => setRecipe({ ...recipe, prepTime: parseInt(e.target.value) || 0 })}
                        className="w-full mt-1 text-lg font-semibold text-surface-900 bg-transparent border-none focus:ring-0 p-0"
                      />
                    ) : (
                      <div className="text-lg font-semibold text-surface-900">{recipe.prepTime} min</div>
                    )}
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg">
                    <div className="text-sm text-surface-500">Cook Time</div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={recipe.cookTime}
                        onChange={(e) => setRecipe({ ...recipe, cookTime: parseInt(e.target.value) || 0 })}
                        className="w-full mt-1 text-lg font-semibold text-surface-900 bg-transparent border-none focus:ring-0 p-0"
                      />
                    ) : (
                      <div className="text-lg font-semibold text-surface-900">{recipe.cookTime} min</div>
                    )}
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg">
                    <div className="text-sm text-surface-500">Servings</div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={recipe.servings}
                        onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 1 })}
                        className="w-full mt-1 text-lg font-semibold text-surface-900 bg-transparent border-none focus:ring-0 p-0"
                      />
                    ) : (
                      <div className="text-lg font-semibold text-surface-900">{recipe.servings}</div>
                    )}
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg">
                    <div className="text-sm text-surface-500">Difficulty</div>
                    {isEditing ? (
                      <select
                        value={recipe.difficulty}
                        onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value as any })}
                        className="w-full mt-1 text-lg font-semibold text-surface-900 bg-transparent border-none focus:ring-0 p-0"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    ) : (
                      <div className={`text-lg font-semibold capitalize ${
                        recipe.difficulty === 'easy' ? 'text-green-600' :
                        recipe.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {recipe.difficulty}
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-surface-900">Instructions</h4>
                    {isEditing && (
                      <button
                        onClick={addInstruction}
                        disabled={!newInstruction.trim()}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-surface-400"
                      >
                        Add Step
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {recipe.instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <textarea
                              value={instruction}
                              onChange={(e) => updateInstruction(index, e.target.value)}
                              rows={2}
                              className="flex-1 px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button
                              onClick={() => removeInstruction(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <p className="flex-1 text-surface-700">{instruction}</p>
                        )}
                      </div>
                    ))}
                    
                    {isEditing && (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-surface-100 text-surface-400 rounded-full flex items-center justify-center text-sm font-medium">
                          {recipe.instructions.length + 1}
                        </div>
                        <textarea
                          value={newInstruction}
                          onChange={(e) => setNewInstruction(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              addInstruction()
                            }
                          }}
                          placeholder="Add new instruction step... (Ctrl+Enter to add)"
                          rows={2}
                          className="flex-1 px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ingredients & Cost */}
              <div className="space-y-6">
                {/* Ingredients */}
                <div>
                  <h4 className="font-medium text-surface-900 mb-3">Ingredients</h4>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ingredient) => {
                      const inventoryItem = inventory.find(item => item.id === ingredient.id)
                      const cost = (inventoryItem?.cost || 0) * ingredient.quantity
                      
                      return (
                        <div key={ingredient.id} className="p-3 bg-surface-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-surface-900">{ingredient.name}</div>
                              <div className="text-sm text-surface-500">
                                {ingredient.quantity} {ingredient.unit}
                              </div>
                              {ingredient.notes && (
                                <div className="text-xs text-surface-400 mt-1">{ingredient.notes}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-surface-900">₱{cost.toFixed(2)}</div>
                              <div className="text-xs text-surface-500">
                                ₱{(inventoryItem?.cost || 0).toFixed(2)}/{inventoryItem?.unit}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <h4 className="font-medium text-primary-900 mb-2">Cost Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-primary-700">Total Cost:</span>
                      <span className="font-medium text-primary-900">₱{calculateTotalCost().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-700">Selling Price:</span>
                      <span className="font-medium text-primary-900">₱{menuItem.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-primary-200 pt-2">
                      <span className="text-primary-700">Profit:</span>
                      <span className="font-medium text-primary-900">
                        ₱{(menuItem.price - calculateTotalCost()).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-700">Margin:</span>
                      <span className={`font-medium ${
                        menuItem.profitMargin && menuItem.profitMargin >= 50 ? 'text-green-600' :
                        menuItem.profitMargin && menuItem.profitMargin >= 30 ? 'text-primary-900' :
                        menuItem.profitMargin && menuItem.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {menuItem.profitMargin?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nutritional Info */}
                {menuItem.nutritionalInfo && (
                  <div className="bg-surface-50 p-4 rounded-lg">
                    <h4 className="font-medium text-surface-900 mb-2">Nutritional Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Calories: {menuItem.nutritionalInfo.calories}</div>
                      <div>Protein: {menuItem.nutritionalInfo.protein}g</div>
                      <div>Carbs: {menuItem.nutritionalInfo.carbs}g</div>
                      <div>Fat: {menuItem.nutritionalInfo.fat}g</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {isEditing && onSaveRecipe && (
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-200 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-surface-700 hover:text-surface-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save Recipe'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipeModal
