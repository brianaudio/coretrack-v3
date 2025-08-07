'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { 
  getMenuItems, 
  addMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  getMenuCategories,
  createMenuTemplate,
  getMenuTemplates,
  activateMenuTemplate,
  deactivateMenuTemplate,
  getNutritionDatabase,
  createNutritionEntry,
  updateMenuItemPricing,
  calculateLocationSpecificPricing,
  createHierarchicalCategory,
  getCategoryHierarchy,
  calculateNutritionFromIngredients,
  calculateAllergenInfo,
  calculateDietaryLabels,
  calculateAdvancedPricing,
  createDefaultSchedule,
  type MenuItem,
  type MenuCategory,
  type CreateMenuItem,
  type MenuIngredient,
  type MenuTemplate,
  type NutritionData
} from '../../lib/firebase/menuBuilder'
import { 
  getInventoryItems,
  type InventoryItem
} from '../../lib/firebase/inventory'

export default function EnterpriseMenuBuilder() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [templates, setTemplates] = useState<MenuTemplate[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [nutritionDatabase, setNutritionDatabase] = useState<NutritionData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'menu' | 'nutrition' | 'pricing' | 'templates' | 'analytics'>('menu')

  // 📊 PHASE 1: NUTRITIONAL INFORMATION STATE
  const [showNutritionModal, setShowNutritionModal] = useState(false)
  const [editingNutrition, setEditingNutrition] = useState<NutritionData | null>(null)
  const [newNutrition, setNewNutrition] = useState({
    name: '',
    category: 'ingredient' as 'ingredient' | 'additive' | 'preparation_method',
    nutritionPer100g: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
      vitaminC: 0,
      calcium: 0,
      iron: 0
    },
    allergens: {
      contains: [] as string[],
      mayContain: [] as string[],
      processingFacility: [] as string[]
    },
    dietary: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false,
      isKeto: false,
      isPaleo: false,
      isDairyFree: false,
      isNutFree: false,
      isOrganic: false,
      isHalal: false,
      isKosher: false
    },
    costPer100g: 0,
    supplier: ''
  })

  // 💰 PHASE 2: ADVANCED PRICING STATE
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [pricingAnalysis, setPricingAnalysis] = useState({
    currentMargin: 0,
    suggestedPrice: 0,
    competitorPrice: 0,
    profitPerDay: 0,
    monthlyRevenue: 0
  })

  // 🏷️ PHASE 3: TEMPLATE MANAGEMENT STATE
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: 'scheduled' as 'scheduled' | 'event' | 'location' | 'seasonal',
    schedule: createDefaultSchedule(true),
    items: [] as any[],
    locations: [] as string[]
  })

  // Enhanced Menu Item Creation State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newItem, setNewItem] = useState<CreateMenuItem>({
    name: '',
    description: '',
    category: '',
    price: 0,
    ingredients: [],
    preparationTime: 0,
    allergens: [],
    emoji: '',
    tenantId: profile?.tenantId || '',
    
    // 📊 PHASE 1: Enhanced Fields
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
      vitaminC: 0,
      calcium: 0,
      iron: 0
    },
    allergenInfo: {
      contains: [],
      mayContain: [],
      freeFrom: [],
      severity: 'mild'
    },
    dietaryLabels: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false,
      isKeto: false,
      isPaleo: false,
      isDairyFree: false,
      isNutFree: false,
      isLowCarb: false,
      isLowSodium: false,
      isOrganic: false,
      isHalal: false,
      isKosher: false
    },
    portionSizes: [
      { id: 'regular', name: 'Regular', size: 1.0, priceMultiplier: 1.0, nutritionMultiplier: 1.0, description: 'Standard portion' }
    ],
    
    // 💰 PHASE 2: Enhanced Pricing
    pricing: {
      baseCost: 0,
      laborCost: 0,
      overheadCost: 0,
      totalCost: 0,
      targetMargin: 65,
      suggestedPrice: 0,
      dynamicPricing: {
        enabled: false,
        peakHours: { start: "18:00", end: "21:00", multiplier: 1.15 },
        offPeakDiscount: { start: "14:00", end: "17:00", multiplier: 0.9 },
        demandBased: { enabled: false, highDemandMultiplier: 1.2, lowDemandMultiplier: 0.85 }
      }
    },
    
    // 🏷️ PHASE 3: Enhanced Organization
    categoryHierarchy: {
      mainCategory: '',
      subCategory: '',
      subSubCategory: '',
      tags: []
    },
    menuScheduling: {
      availability: createDefaultSchedule(true),
      seasonalAvailability: {
        seasons: ['spring', 'summer', 'fall', 'winter'],
        autoActivate: true
      }
    },
    templateInfo: {
      isTemplateItem: false,
      templatePriority: 0
    }
  })

  useEffect(() => {
    if (profile?.tenantId) {
      loadData()
    }
  }, [profile?.tenantId, selectedBranch])

  const loadData = async () => {
    if (!profile?.tenantId) return
    
    setLoading(true)
    try {
      const [itemsData, categoriesData, inventoryData, templatesData, nutritionData] = await Promise.all([
        getMenuItems(profile.tenantId, selectedBranch?.id || ''),
        getCategoryHierarchy(profile.tenantId),
        getInventoryItems(profile.tenantId, selectedBranch?.id || ''),
        getMenuTemplates(profile.tenantId),
        getNutritionDatabase(profile.tenantId)
      ])
      
      setMenuItems(itemsData)
      setCategories(categoriesData)
      setInventoryItems(inventoryData)
      setTemplates(templatesData)
      setNutritionDatabase(nutritionData)
    } catch (error) {
      console.error('Error loading enterprise menu data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 📊 PHASE 1: NUTRITION FUNCTIONS
  const handleCreateNutritionEntry = async () => {
    if (!profile?.tenantId) return
    
    try {
      await createNutritionEntry(profile.tenantId, newNutrition)
      await loadData()
      setShowNutritionModal(false)
      resetNutritionForm()
    } catch (error) {
      console.error('Error creating nutrition entry:', error)
    }
  }

  const resetNutritionForm = () => {
    setNewNutrition({
      name: '',
      category: 'ingredient',
      nutritionPer100g: {
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
        sodium: 0, cholesterol: 0, vitaminC: 0, calcium: 0, iron: 0
      },
      allergens: { contains: [], mayContain: [], processingFacility: [] },
      dietary: {
        isVegan: false, isVegetarian: false, isGlutenFree: false, isKeto: false,
        isPaleo: false, isDairyFree: false, isNutFree: false, isOrganic: false,
        isHalal: false, isKosher: false
      },
      costPer100g: 0,
      supplier: ''
    })
  }

  const autoCalculateNutrition = () => {
    if (newItem.ingredients.length > 0 && nutritionDatabase.length > 0) {
      const calculatedNutrition = calculateNutritionFromIngredients(newItem.ingredients, nutritionDatabase)
      const calculatedAllergens = calculateAllergenInfo(newItem.ingredients, nutritionDatabase)
      const calculatedDietary = calculateDietaryLabels(newItem.ingredients, nutritionDatabase)
      
      setNewItem(prev => ({
        ...prev,
        nutrition: calculatedNutrition,
        allergenInfo: calculatedAllergens,
        dietaryLabels: calculatedDietary
      }))
    }
  }

  // 💰 PHASE 2: PRICING FUNCTIONS
  const analyzePricing = (item: MenuItem) => {
    const currentMargin = item.price > 0 ? ((item.price - (item.pricing?.totalCost || item.cost)) / item.price) * 100 : 0
    const suggestedPrice = item.pricing?.suggestedPrice || item.price
    
    setPricingAnalysis({
      currentMargin,
      suggestedPrice,
      competitorPrice: item.pricing?.competitorPrice || 0,
      profitPerDay: (item.profitAnalysis?.dailyVolume || 1) * (item.price - (item.pricing?.totalCost || item.cost)),
      monthlyRevenue: item.profitAnalysis?.monthlyRevenue || 0
    })
    
    setSelectedMenuItem(item)
    setShowPricingModal(true)
  }

  const updatePricing = async (newPrice: number) => {
    if (!selectedMenuItem || !profile?.tenantId) return
    
    try {
      const totalCost = selectedMenuItem.pricing?.totalCost || selectedMenuItem.cost
      const newMargin = ((newPrice - totalCost) / newPrice) * 100
      
      await updateMenuItemPricing(profile.tenantId, selectedMenuItem.id, {
        ...selectedMenuItem.pricing,
        suggestedPrice: newPrice,
        targetMargin: newMargin
      })
      
      await loadData()
      setShowPricingModal(false)
    } catch (error) {
      console.error('Error updating pricing:', error)
    }
  }

  // 🏷️ PHASE 3: TEMPLATE FUNCTIONS
  const createTemplate = async () => {
    if (!profile?.tenantId) return
    
    try {
      const templateData = {
        ...newTemplate,
        tenantId: profile.tenantId,
        config: {
          type: newTemplate.type,
          isActive: false,
          priority: 1
        },
        schedule: {
          dailySchedule: newTemplate.schedule,
          autoActivation: true
        }
      }
      
      await createMenuTemplate(templateData)
      await loadData()
      setShowTemplateModal(false)
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const toggleTemplate = async (template: MenuTemplate) => {
    if (!profile?.tenantId) return
    
    try {
      if (template.config.isActive) {
        await deactivateMenuTemplate(profile.tenantId, template.id)
      } else {
        await activateMenuTemplate(profile.tenantId, template.id)
      }
      await loadData()
    } catch (error) {
      console.error('Error toggling template:', error)
    }
  }

  // Enhanced Menu Item Creation
  const handleCreateItem = async () => {
    if (!profile?.tenantId) return
    
    try {
      // Auto-calculate advanced features before saving
      const enhancedItem = { ...newItem }
      
      if (enhancedItem.ingredients.length > 0) {
        const advancedPricing = calculateAdvancedPricing(enhancedItem)
        enhancedItem.pricing = { ...enhancedItem.pricing, ...advancedPricing }
      }
      
      await addMenuItem(enhancedItem, nutritionDatabase)
      await loadData()
      setShowCreateModal(false)
      resetItemForm()
    } catch (error) {
      console.error('Error creating enhanced menu item:', error)
    }
  }

  const resetItemForm = () => {
    setNewItem({
      name: '',
      description: '',
      category: '',
      price: 0,
      ingredients: [],
      preparationTime: 0,
      allergens: [],
      emoji: '',
      tenantId: profile?.tenantId || '',
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, vitaminC: 0, calcium: 0, iron: 0 },
      allergenInfo: { contains: [], mayContain: [], freeFrom: [], severity: 'mild' },
      dietaryLabels: { isVegan: false, isVegetarian: false, isGlutenFree: false, isKeto: false, isPaleo: false, isDairyFree: false, isNutFree: false, isLowCarb: false, isLowSodium: false, isOrganic: false, isHalal: false, isKosher: false },
      portionSizes: [{ id: 'regular', name: 'Regular', size: 1.0, priceMultiplier: 1.0, nutritionMultiplier: 1.0, description: 'Standard portion' }],
      pricing: { baseCost: 0, laborCost: 0, overheadCost: 0, totalCost: 0, targetMargin: 65, suggestedPrice: 0, dynamicPricing: { enabled: false, peakHours: { start: "18:00", end: "21:00", multiplier: 1.15 }, offPeakDiscount: { start: "14:00", end: "17:00", multiplier: 0.9 }, demandBased: { enabled: false, highDemandMultiplier: 1.2, lowDemandMultiplier: 0.85 } } },
      categoryHierarchy: { mainCategory: '', subCategory: '', subSubCategory: '', tags: [] },
      menuScheduling: { availability: createDefaultSchedule(true), seasonalAvailability: { seasons: ['spring', 'summer', 'fall', 'winter'], autoActivate: true } },
      templateInfo: { isTemplateItem: false, templatePriority: 0 }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Enterprise Menu Builder...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🏢 Enterprise Menu Builder</h1>
              <p className="text-gray-600">Advanced nutrition tracking, dynamic pricing, and intelligent menu management</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                ➕ Create Enhanced Menu Item
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'menu', name: '🍽️ Menu Items', desc: 'Manage menu with advanced features' },
                { id: 'nutrition', name: '📊 Nutrition Database', desc: 'Nutritional information management' },
                { id: 'pricing', name: '💰 Dynamic Pricing', desc: 'Advanced pricing & cost analysis' },
                { id: 'templates', name: '🏷️ Menu Templates', desc: 'Scheduled & seasonal menus' },
                { id: 'analytics', name: '📈 Analytics', desc: 'Performance insights' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{tab.name}</div>
                    <div className="text-xs text-gray-400">{tab.desc}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Item Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{item.emoji || '🍽️'}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">₱{item.price}</div>
                      <div className="text-xs text-gray-500">
                        {item.pricing?.targetMargin ? `${item.pricing.targetMargin.toFixed(1)}% margin` : `${((item.price - item.cost) / item.price * 100).toFixed(1)}% margin`}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Information */}
                  <div className="space-y-3">
                    {/* Nutrition Info */}
                    {item.nutrition && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Nutrition</span>
                        <span className="font-medium">{item.nutrition.calories} cal | {item.nutrition.protein}g protein</span>
                      </div>
                    )}

                    {/* Dietary Labels */}
                    {item.dietaryLabels && (
                      <div className="flex flex-wrap gap-1">
                        {item.dietaryLabels.isVegan && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">🌱 Vegan</span>}
                        {item.dietaryLabels.isGlutenFree && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">🌾 Gluten-Free</span>}
                        {item.dietaryLabels.isKeto && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">🥑 Keto</span>}
                      </div>
                    )}

                    {/* Allergen Warning */}
                    {item.allergenInfo && item.allergenInfo.contains.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500 text-xs">⚠️</span>
                        <span className="text-xs text-red-600">Contains: {item.allergenInfo.contains.join(', ')}</span>
                      </div>
                    )}

                    {/* Pricing Analysis */}
                    {item.pricing && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Cost:</span>
                          <span className="ml-1 font-medium">₱{item.pricing.totalCost?.toFixed(2) || item.cost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Suggested:</span>
                          <span className="ml-1 font-medium text-green-600">₱{item.pricing.suggestedPrice?.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => analyzePricing(item)}
                      className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      💰 Pricing
                    </button>
                    <button className="flex-1 bg-blue-50 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">📊 Nutrition Database</h2>
              <button
                onClick={() => setShowNutritionModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                ➕ Add Nutrition Data
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nutritionDatabase.map((nutrition) => (
                <div key={nutrition.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{nutrition.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Calories: {nutrition.nutritionPer100g.calories}/100g</div>
                    <div>Protein: {nutrition.nutritionPer100g.protein}g</div>
                    <div>Carbs: {nutrition.nutritionPer100g.carbs}g</div>
                    <div>Fat: {nutrition.nutritionPer100g.fat}g</div>
                  </div>
                  {nutrition.allergens.contains.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      ⚠️ Contains: {nutrition.allergens.contains.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">🏷️ Menu Templates</h2>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                ➕ Create Template
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      template.config.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {template.config.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>Type: {template.config.type}</div>
                    <div>Items: {template.items.reduce((sum, item) => sum + item.menuItemIds.length, 0)}</div>
                    {template.analytics && (
                      <div>Used: {template.analytics.timesUsed} times</div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => toggleTemplate(template)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      template.config.isActive
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {template.config.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals would go here - abbreviated for space */}
        {/* Create Item Modal, Nutrition Modal, Pricing Modal, Template Modal */}
      </div>
    </div>
  )
}
