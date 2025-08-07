'use client'

import React, { useState, useCallback, useRef } from 'react'
// import { motion, AnimatePresence } from 'framer-motion'
import { uploadProductImage, resizeImage, type UploadProgress } from '../../lib/firebase/storage'
import { EnhancedMenuItem, ProductFormState, WizardStep } from '../../lib/firebase/enhancedMenuBuilder'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

interface EnhancedAddProductModalProps {
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
  categories: string[]
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Product name, category, and description',
    icon: '📝',
    isRequired: true,
    isCompleted: false,
    validationRules: ['name', 'category', 'description']
  },
  {
    id: 'recipe',
    title: 'Recipe & Ingredients',
    description: 'Cost calculation and inventory tracking',
    icon: '🧪',
    isRequired: true,
    isCompleted: false,
    validationRules: ['ingredients']
  },
  {
    id: 'pricing',
    title: 'Pricing Strategy',
    description: 'Base price and advanced pricing options',
    icon: '💰',
    isRequired: true,
    isCompleted: false,
    validationRules: ['basePrice']
  },
  {
    id: 'nutrition',
    title: 'Nutrition & Dietary',
    description: 'Nutritional information and allergens',
    icon: '🍎',
    isRequired: false,
    isCompleted: false,
    validationRules: []
  },
  {
    id: 'settings',
    title: 'Availability & Settings',
    description: 'When and where this product is available',
    icon: '⚙️',
    isRequired: false,
    isCompleted: false,
    validationRules: []
  }
]

export default function EnhancedAddProductModal({
  isOpen,
  onClose,
  onSubmit,
  inventoryItems,
  categories
}: EnhancedAddProductModalProps) {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formState, setFormState] = useState<ProductFormState>({
    currentStep: 0,
    totalSteps: WIZARD_STEPS.length,
    data: {
      name: '',
      description: '',
      category: '',
      pricing: {
        basePrice: 0,
        bulkPricing: [],
        memberPrice: undefined
      },
      nutrition: {
        calories: undefined,
        allergens: [],
        dietaryTags: []
      },
      ingredients: [],
      metadata: {
        preparationTime: 15,
        difficulty: 'medium',
        tags: [],
        created: new Date(),
        lastModified: new Date(),
        createdBy: profile?.uid || ''
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
      }
    },
    validation: {
      isValid: false,
      errors: {},
      warnings: {}
    },
    isDirty: false,
    isSaving: false
  })

  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Update form data
  const updateFormData = useCallback((updates: Partial<EnhancedMenuItem>) => {
    setFormState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
      isDirty: true
    }))
  }, [])

  // Handle image selection
  const handleImageSelect = useCallback(async (file: File) => {
    try {
      // Resize image before preview
      const resizedFile = await resizeImage(file, 800, 600, 0.8)
      setSelectedImage(resizedFile)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(resizedFile)
    } catch (error) {
      console.error('Error processing image:', error)
    }
  }, [])

  // Upload image to Firebase Storage
  const uploadImage = useCallback(async (): Promise<string | undefined> => {
    if (!selectedImage || !profile?.tenantId) return undefined

    try {
      const productId = `product_${Date.now()}`
      const imageUrl = await uploadProductImage(
        selectedImage,
        profile.tenantId,
        productId,
        setUploadProgress
      )
      return imageUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return undefined
    }
  }, [selectedImage, profile?.tenantId])

  // Navigate between steps
  const nextStep = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps - 1)
    }))
  }, [])

  const prevStep = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }))
  }, [])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!profile?.tenantId || !selectedBranch) return

    setFormState(prev => ({ ...prev, isSaving: true }))

    try {
      // Upload image if selected
      let imageUrl = undefined
      if (selectedImage) {
        imageUrl = await uploadImage()
      }

      // Prepare final product data
      const productData: Partial<EnhancedMenuItem> = {
        ...formState.data,
        imageUrl,
        tenantId: profile.tenantId,
        locationId: selectedBranch.id,
        status: 'active'
      }

      await onSubmit(productData)
      onClose()
    } catch (error) {
      console.error('Error creating product:', error)
    } finally {
      setFormState(prev => ({ ...prev, isSaving: false }))
    }
  }, [formState.data, selectedImage, profile, selectedBranch, uploadImage, onSubmit, onClose])

  if (!isOpen) return null

  const currentStepData = WIZARD_STEPS[formState.currentStep]
  const progressPercentage = ((formState.currentStep + 1) / formState.totalSteps) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <p className="text-blue-100 text-sm">Create a new menu item for your business</p>
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
          
          {/* Progress Bar */}
          <div className="bg-white bg-opacity-20 rounded-full h-2 mb-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Step Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="text-2xl">{currentStepData.icon}</span>
              <span className="font-medium">{currentStepData.title}</span>
            </span>
            <span className="text-blue-100">
              Step {formState.currentStep + 1} of {formState.totalSteps}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-180px)]">
          {/* Step Navigation */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <div className="space-y-2">
              {WIZARD_STEPS.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setFormState(prev => ({ ...prev, currentStep: index }))}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    index === formState.currentStep
                      ? 'bg-blue-100 border-blue-300 border-2 text-blue-800'
                      : index < formState.currentStep
                      ? 'bg-green-50 border-green-200 border text-green-700'
                      : 'bg-white border-gray-200 border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{step.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{step.title}</div>
                      <div className="text-xs opacity-75 truncate">{step.description}</div>
                    </div>
                    {index < formState.currentStep && (
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto">
            <div
              className="p-6"
            >
                {/* Step content will be rendered here based on currentStep */}
                {formState.currentStep === 0 && (
                  <BasicInfoStep
                    data={formState.data}
                    categories={categories}
                    onChange={updateFormData}
                  />
                )}
                
                {formState.currentStep === 1 && (
                  <MediaStep
                    imagePreview={imagePreview}
                    uploadProgress={uploadProgress}
                    onImageSelect={handleImageSelect}
                    fileInputRef={fileInputRef}
                  />
                )}
                
                {formState.currentStep === 2 && (
                  <RecipeStep
                    data={formState.data}
                    inventoryItems={inventoryItems}
                    onChange={updateFormData}
                  />
                )}
                
                {formState.currentStep === 3 && (
                  <PricingStep
                    data={formState.data}
                    onChange={updateFormData}
                  />
                )}
                
                {formState.currentStep === 4 && (
                  <NutritionStep
                    data={formState.data}
                    onChange={updateFormData}
                  />
                )}
                
                {formState.currentStep === 5 && (
                  <SettingsStep
                    data={formState.data}
                    onChange={updateFormData}
                  />
                )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={formState.currentStep === 0}
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
              
              {formState.currentStep === formState.totalSteps - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={formState.isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {formState.isSaving && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Create Product
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleImageSelect(file)
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  )
}

// Step Components
interface StepProps {
  data: Partial<EnhancedMenuItem>
  onChange: (updates: Partial<EnhancedMenuItem>) => void
}

function BasicInfoStep({ data, categories, onChange }: StepProps & { categories: string[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic Information</h3>
        <p className="text-gray-600 text-sm mb-6">
          Start by providing the essential details about your product.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            placeholder="Enter product name (e.g., Classic Burger)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={data.category || ''}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emoji (Optional)
          </label>
          <input
            type="text"
            value={data.emoji || ''}
            onChange={(e) => onChange({ emoji: e.target.value })}
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
            value={data.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your product in detail..."
          />
        </div>
      </div>
    </div>
  )
}

function MediaStep({ imagePreview, uploadProgress, onImageSelect, fileInputRef }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Photo</h3>
        <p className="text-gray-600 text-sm mb-6">
          Add an appetizing photo to showcase your product. High-quality images increase sales by up to 30%.
        </p>
      </div>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        {imagePreview ? (
          <div className="space-y-4">
            <img
              src={imagePreview}
              alt="Product preview"
              className="mx-auto max-h-64 rounded-lg shadow-lg"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Change Photo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl text-gray-400">📸</div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">Upload Product Photo</p>
              <p className="text-gray-600">
                Drag and drop an image, or click to browse
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Choose Photo
            </button>
          </div>
        )}
        
        {uploadProgress && (
          <div className="mt-4">
            <div className="bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Uploading... {Math.round(uploadProgress.progress)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function RecipeStep({ data, inventoryItems, onChange }: StepProps & { inventoryItems: any[] }) {
  const addIngredient = () => {
    const newIngredient = {
      inventoryItemId: '',
      inventoryItemName: '',
      quantity: 1,
      unit: '',
      cost: 0
    }
    onChange({
      ingredients: [...(data.ingredients || []), newIngredient]
    })
  }

  const removeIngredient = (index: number) => {
    const updatedIngredients = [...(data.ingredients || [])]
    updatedIngredients.splice(index, 1)
    onChange({ ingredients: updatedIngredients })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Recipe & Ingredients</h3>
        <p className="text-gray-600 text-sm mb-6">
          Add ingredients to calculate product cost and track inventory usage.
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900">Ingredients</h4>
        <button
          onClick={addIngredient}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>+</span>
          <span>Add Ingredient</span>
        </button>
      </div>
      
      {(data.ingredients || []).length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <p>No ingredients added yet</p>
          <p className="text-sm">Add ingredients to automatically calculate product cost</p>
          <button
            onClick={addIngredient}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add First Ingredient
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(data.ingredients || []).map((ingredient, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg relative">
              {/* Remove Button */}
              <button
                onClick={() => removeIngredient(index)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
                title="Remove ingredient"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inventory Item
                  </label>
                  <select
                    value={ingredient.inventoryItemId}
                    onChange={(e) => {
                      const item = inventoryItems.find(i => i.id === e.target.value)
                      const updatedIngredients = [...(data.ingredients || [])]
                      updatedIngredients[index] = {
                        ...ingredient,
                        inventoryItemId: e.target.value,
                        inventoryItemName: item?.name || '',
                        unit: item?.unit || '',
                        cost: (ingredient.quantity || 0) * (item?.costPerUnit || 0)
                      }
                      onChange({ ingredients: updatedIngredients })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select ingredient</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit}) - ₱{item.costPerUnit?.toFixed(2) || '0.00'}/unit
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ingredient.quantity}
                    onChange={(e) => {
                      const quantity = parseFloat(e.target.value) || 0
                      const item = inventoryItems.find(i => i.id === ingredient.inventoryItemId)
                      const updatedIngredients = [...(data.ingredients || [])]
                      updatedIngredients[index] = {
                        ...ingredient,
                        quantity,
                        cost: quantity * (item?.costPerUnit || 0)
                      }
                      onChange({ ingredients: updatedIngredients })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost
                  </label>
                  <input
                    type="text"
                    value={`₱${ingredient.cost?.toFixed(2) || '0.00'}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Total Recipe Cost</h4>
                <p className="text-sm text-gray-600">Sum of all ingredient costs</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  ₱{(data.ingredients || []).reduce((sum, ing) => sum + (ing.cost || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PricingStep({ data, onChange }: StepProps) {
  const totalCost = (data.ingredients || []).reduce((sum, ing) => sum + ing.cost, 0)
  const basePrice = data.pricing?.basePrice || 0
  const profit = basePrice - totalCost
  const marginPercent = basePrice > 0 ? (profit / basePrice) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing Strategy</h3>
        <p className="text-gray-600 text-sm mb-6">
          Set your product pricing. We recommend a 60-70% profit margin for food items.
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
              min="0"
              value={data.pricing?.basePrice || 0}
              onChange={(e) => onChange({
                pricing: {
                  ...data.pricing,
                  basePrice: parseFloat(e.target.value) || 0
                }
              })}
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Cost
          </label>
          <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
            ₱{totalCost.toFixed(2)}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profit Margin
          </label>
          <div className={`px-4 py-3 border border-gray-300 rounded-lg font-medium ${
            marginPercent >= 60 ? 'bg-green-100 text-green-800' :
            marginPercent >= 40 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            ₱{profit.toFixed(2)} ({marginPercent.toFixed(1)}%)
          </div>
        </div>
      </div>
      
      {marginPercent < 40 && basePrice > 0 && (
        <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-orange-800">Low Profit Margin Warning</h4>
              <p className="text-sm text-orange-700">
                Your profit margin is below 40%. Consider increasing the price or reducing costs for better profitability.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NutritionStep({ data, onChange }: StepProps) {
  const commonAllergens = [
    'Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree nuts', 'Peanuts', 'Wheat', 'Soybeans'
  ]
  
  const dietaryTags = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'keto', 'halal', 'kosher'
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nutrition & Dietary Information</h3>
        <p className="text-gray-600 text-sm mb-6">
          Provide nutritional information and dietary tags to help customers make informed choices.
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calories
          </label>
          <input
            type="number"
            min="0"
            value={data.nutrition?.calories || ''}
            onChange={(e) => onChange({
              nutrition: {
                ...data.nutrition,
                allergens: data.nutrition?.allergens || [],
                dietaryTags: data.nutrition?.dietaryTags || [],
                calories: parseInt(e.target.value) || undefined
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="kcal"
          />
        </div>
        {/* Add more nutrition fields as needed */}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allergens
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {commonAllergens.map(allergen => (
            <label key={allergen} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={(data.nutrition?.allergens || []).includes(allergen)}
                onChange={(e) => {
                  const allergens = data.nutrition?.allergens || []
                  const newAllergens = e.target.checked
                    ? [...allergens, allergen]
                    : allergens.filter(a => a !== allergen)
                  onChange({
                    nutrition: {
                      ...data.nutrition,
                      allergens: newAllergens,
                      dietaryTags: data.nutrition?.dietaryTags || []
                    }
                  })
                }}
                className="rounded"
              />
              <span className="text-sm">{allergen}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dietary Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {dietaryTags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                const tags = data.nutrition?.dietaryTags || []
                const newTags = tags.includes(tag as any)
                  ? tags.filter(t => t !== tag)
                  : [...tags, tag as any]
                onChange({
                  nutrition: {
                    ...data.nutrition,
                    allergens: data.nutrition?.allergens || [],
                    dietaryTags: newTags
                  }
                })
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                (data.nutrition?.dietaryTags || []).includes(tag as any)
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsStep({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Availability & Settings</h3>
        <p className="text-gray-600 text-sm mb-6">
          Configure when and how this product is available to customers.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="syncToPOS"
            checked={data.integration?.syncToPOS || false}
            onChange={(e) => onChange({
              integration: {
                ...data.integration,
                syncToPOS: e.target.checked
              }
            })}
            className="rounded"
          />
          <label htmlFor="syncToPOS" className="text-sm font-medium text-gray-700">
            Automatically sync to POS system
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preparation Time (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={data.metadata?.preparationTime || 15}
              onChange={(e) => onChange({
                metadata: {
                  ...data.metadata,
                  preparationTime: parseInt(e.target.value) || 15,
                  difficulty: data.metadata?.difficulty || 'medium',
                  tags: data.metadata?.tags || [],
                  created: data.metadata?.created || new Date(),
                  lastModified: data.metadata?.lastModified || new Date(),
                  createdBy: data.metadata?.createdBy || ''
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              value={data.metadata?.difficulty || 'medium'}
              onChange={(e) => onChange({
                metadata: {
                  ...data.metadata,
                  difficulty: e.target.value as any,
                  preparationTime: data.metadata?.preparationTime || 15,
                  tags: data.metadata?.tags || [],
                  created: data.metadata?.created || new Date(),
                  lastModified: data.metadata?.lastModified || new Date(),
                  createdBy: data.metadata?.createdBy || ''
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
