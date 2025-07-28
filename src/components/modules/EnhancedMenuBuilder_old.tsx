'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, CreateMenuItem, InventoryItem, MenuCategory, Recipe } from '@/lib/types/menu'
import AdvancedSearch from '@/components/AdvancedSearch'
import BulkOperations from '@/components/BulkOperations'
import CreateMenuItemModal from './CreateMenuItemModal'
import EditMenuItemModal from './EditMenuItemModal'
import RecipeModal from './RecipeModal'
import CreateCategoryModal from './CreateCategoryModal'

interface EnhancedMenuItem extends MenuItem {
  profitMargin?: number
  isAvailable?: boolean
  nutritionInfo?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    allergens: string[]
    dietaryInfo: string[]
  }
}

export default function EnhancedMenuBuilder() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  // Data States
  const [menuItems, setMenuItems] = useState<EnhancedMenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  
  // UI States
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedMenuItems, setSelectedMenuItems] = useState<EnhancedMenuItem[]>([])
  const [searchFilters, setSearchFilters] = useState<any>({})
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState<EnhancedMenuItem | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<EnhancedMenuItem | null>(null)

  // Form States
  const [newItem, setNewItem] = useState<Partial<CreateMenuItem>>({
    name: '',
    description: '',
    category: '',
    price: 0,
    ingredients: [],
    preparationTime: 0,
    calories: 0,
    allergens: []
  })

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    displayOrder: 0
  })

  // Load data
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) return

    const loadMenuData = async () => {
      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        
        const [itemsData, categoriesData, inventoryData] = await Promise.all([
          getMenuItems(profile.tenantId, locationId),
          getMenuCategories(profile.tenantId),
          getInventoryItems(profile.tenantId, locationId)
        ])
        
        // Enhance menu items with calculated data
        const enhancedItems = itemsData.map(item => ({
          ...item,
          profitMargin: calculateProfitMargin(item.price, item.cost),
          isAvailable: checkItemAvailability(item, inventoryData),
          nutritionInfo: {
            calories: item.calories || 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            allergens: item.allergens || [],
            dietaryInfo: []
          }
        }))
        
        setMenuItems(enhancedItems)
        setCategories(categoriesData)
        setInventoryItems(inventoryData)
      } catch (error) {
        console.error('Error loading menu data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMenuData()
  }, [profile?.tenantId, selectedBranch?.id])

  // Helper functions
  const calculateProfitMargin = (price: number, cost: number): number => {
    if (price <= 0) return 0
    return ((price - cost) / price) * 100
  }

  const checkItemAvailability = (item: MenuItem, inventory: InventoryItem[]): boolean => {
    return item.ingredients.every(ingredient => {
      const inventoryItem = inventory.find(inv => inv.id === ingredient.inventoryItemId)
      return inventoryItem && inventoryItem.currentStock >= ingredient.quantity
    })
  }

  const calculateItemCost = (ingredients: MenuIngredient[]): number => {
    return ingredients.reduce((total, ingredient) => {
      const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventoryItemId)
      if (inventoryItem && inventoryItem.costPerUnit) {
        return total + (inventoryItem.costPerUnit * ingredient.quantity)
      }
      return total
    }, 0)
  }

  // Enhanced filtering
  const filteredItems = menuItems.filter(item => {
    // Basic search
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Advanced filters
    let matchesFilters = true
    
    if (Object.keys(searchFilters).length > 0) {
      // Category filter
      if (searchFilters.category && searchFilters.category !== 'all') {
        matchesFilters = matchesFilters && item.category === searchFilters.category
      }
      
      // Status filter
      if (searchFilters.status && searchFilters.status !== 'all') {
        matchesFilters = matchesFilters && item.status === searchFilters.status
      }
      
      // Availability filter
      if (searchFilters.availability && searchFilters.availability !== 'all') {
        const isAvailable = item.isAvailable || false
        matchesFilters = matchesFilters && 
          (searchFilters.availability === 'available' ? isAvailable : !isAvailable)
      }
      
      // Price range filter
      if (searchFilters.priceMin !== undefined && searchFilters.priceMin !== '') {
        matchesFilters = matchesFilters && item.price >= parseFloat(searchFilters.priceMin)
      }
      if (searchFilters.priceMax !== undefined && searchFilters.priceMax !== '') {
        matchesFilters = matchesFilters && item.price <= parseFloat(searchFilters.priceMax)
      }
      
      // Profit margin filter
      if (searchFilters.profitMin !== undefined && searchFilters.profitMin !== '') {
        const margin = item.profitMargin || 0
        matchesFilters = matchesFilters && margin >= parseFloat(searchFilters.profitMin)
      }
    }
    
    return matchesSearch && matchesFilters
  })

  // Bulk operations
  const bulkOperations = [
    {
      id: 'activate',
      label: 'Activate Items',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: async (items: EnhancedMenuItem[]) => {
        const promises = items.map(item => 
          updateMenuItem(profile!.tenantId, item.id, { status: 'active' })
        )
        await Promise.all(promises)
        // Refresh data
        const locationId = getBranchLocationId(selectedBranch!.id)
        const updatedItems = await getMenuItems(profile!.tenantId, locationId)
        setMenuItems(updatedItems.map(item => ({
          ...item,
          profitMargin: calculateProfitMargin(item.price, item.cost),
          isAvailable: checkItemAvailability(item, inventoryItems)
        })))
      },
      color: 'success' as const
    },
    {
      id: 'deactivate',
      label: 'Deactivate Items',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: async (items: EnhancedMenuItem[]) => {
        const promises = items.map(item => 
          updateMenuItem(profile!.tenantId, item.id, { status: 'inactive' })
        )
        await Promise.all(promises)
        // Refresh data
        const locationId = getBranchLocationId(selectedBranch!.id)
        const updatedItems = await getMenuItems(profile!.tenantId, locationId)
        setMenuItems(updatedItems.map(item => ({
          ...item,
          profitMargin: calculateProfitMargin(item.price, item.cost),
          isAvailable: checkItemAvailability(item, inventoryItems)
        })))
      },
      color: 'warning' as const
    },
    {
      id: 'bulk-price-update',
      label: 'Update Prices',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      action: async (items: EnhancedMenuItem[]) => {
        const percentage = prompt('Enter percentage increase (e.g., 10 for 10% increase):')
        if (!percentage || isNaN(parseFloat(percentage))) return
        
        const multiplier = 1 + (parseFloat(percentage) / 100)
        const promises = items.map(item => 
          updateMenuItem(profile!.tenantId, item.id, { 
            price: Math.round(item.price * multiplier * 100) / 100 
          })
        )
        await Promise.all(promises)
        // Refresh data
        const locationId = getBranchLocationId(selectedBranch!.id)
        const updatedItems = await getMenuItems(profile!.tenantId, locationId)
        setMenuItems(updatedItems.map(item => ({
          ...item,
          profitMargin: calculateProfitMargin(item.price, item.cost),
          isAvailable: checkItemAvailability(item, inventoryItems)
        })))
      },
      color: 'primary' as const
    },
    {
      id: 'export-menu',
      label: 'Export Menu',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: async (items: EnhancedMenuItem[]) => {
        const csvContent = [
          ['Name', 'Category', 'Price', 'Cost', 'Profit Margin %', 'Status', 'Available', 'Prep Time'].join(','),
          ...items.map(item => [
            item.name,
            item.category,
            item.price,
            item.cost,
            item.profitMargin?.toFixed(2) || '0',
            item.status,
            item.isAvailable ? 'Yes' : 'No',
            `${item.preparationTime} min`
          ].join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `menu-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      },
      color: 'secondary' as const
    }
  ]

  const handleCreateMenuItem = async () => {
    if (!profile?.tenantId || !newItem.name || !newItem.category || !newItem.price || !selectedBranch) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      const cost = calculateItemCost(newItem.ingredients || [])
      
      const itemData: CreateMenuItem = {
        name: newItem.name!,
        description: newItem.description!,
        category: newItem.category!,
        price: newItem.price!,
        ingredients: newItem.ingredients || [],
        preparationTime: newItem.preparationTime || 0,
        calories: newItem.calories,
        allergens: newItem.allergens || [],
        tenantId: profile.tenantId,
        locationId
      }

      await addMenuItem(itemData)
      
      // Refresh data
      const updatedItems = await getMenuItems(profile.tenantId, locationId)
      setMenuItems(updatedItems.map(item => ({
        ...item,
        profitMargin: calculateProfitMargin(item.price, item.cost),
        isAvailable: checkItemAvailability(item, inventoryItems)
      })))
      
      // Reset form
      setNewItem({
        name: '',
        description: '',
        category: '',
        price: 0,
        ingredients: [],
        preparationTime: 0,
        calories: 0,
        allergens: []
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating menu item:', error)
      alert('Error creating menu item. Please try again.')
    }
  }

  const handleCreateCategory = async () => {
    if (!profile?.tenantId || !newCategory.name) return

    try {
      await addMenuCategory({
        ...newCategory,
        tenantId: profile.tenantId
      })
      
      // Refresh categories
      const updatedCategories = await getMenuCategories(profile.tenantId)
      setCategories(updatedCategories)
      
      // Reset form
      setNewCategory({
        name: '',
        description: '',
        displayOrder: 0
      })
      setShowCategoryModal(false)
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error creating category. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-surface-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Menu Builder</h1>
          <div className="flex items-center mt-1 text-sm text-surface-600">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-medium">{selectedBranch?.name || 'Main Branch'}</span>
            <span className="mx-2">•</span>
            <span>{menuItems.length} menu items</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center px-4 py-2 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Add Category
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Advanced Search and Filters */}
      <AdvancedSearch
        onSearch={(term, filters) => {
          setSearchTerm(term)
          setSearchFilters(filters)
        }}
        placeholder="Search menu items by name, description, or category..."
        filters={[
          {
            key: 'category',
            label: 'Category',
            type: 'select',
            options: [
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat.name, label: cat.name }))
            ]
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'out_of_stock', label: 'Out of Stock' }
            ]
          },
          {
            key: 'availability',
            label: 'Availability',
            type: 'select',
            options: [
              { value: 'all', label: 'All Items' },
              { value: 'available', label: 'Available' },
              { value: 'unavailable', label: 'Unavailable' }
            ]
          },
          {
            key: 'priceRange',
            label: 'Price Range',
            type: 'range',
            min: 0,
            max: 1000
          },
          {
            key: 'profitRange',
            label: 'Profit Margin %',
            type: 'range',
            min: 0,
            max: 100
          }
        ]}
      />

      {/* Bulk Operations */}
      <BulkOperations
        items={filteredItems}
        selectedItems={selectedMenuItems}
        onSelectionChange={setSelectedMenuItems}
        operations={bulkOperations}
        idField="id"
      />

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-surface-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Table
            </button>
          </div>
          
          <div className="text-sm text-surface-600">
            Showing {filteredItems.length} of {menuItems.length} items
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-600">Sort by:</span>
          <select 
            className="bg-white border border-surface-200 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onChange={(e) => {
              // Handle sorting logic here
            }}
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="profit">Profit Margin</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Menu Items Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              isSelected={selectedMenuItems.some(selected => selected.id === item.id)}
              onSelect={(selectedItem) => {
                if (selectedMenuItems.some(selected => selected.id === selectedItem.id)) {
                  setSelectedMenuItems(selectedMenuItems.filter(selected => selected.id !== selectedItem.id))
                } else {
                  setSelectedMenuItems([...selectedMenuItems, selectedItem])
                }
              }}
              onEdit={setEditingItem}
              onViewRecipe={(item) => {
                setSelectedItemForRecipe(item)
                setShowRecipeModal(true)
              }}
            />
          ))}
          
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-surface-900 mb-2">No menu items found</h3>
              <p className="text-surface-500 mb-4">
                {menuItems.length === 0 
                  ? "Get started by creating your first menu item"
                  : "Try adjusting your search filters"
                }
              </p>
              {menuItems.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create First Menu Item
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-surface-700 w-16">
                    <input
                      type="checkbox"
                      checked={selectedMenuItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMenuItems(filteredItems)
                        } else {
                          setSelectedMenuItems([])
                        }
                      }}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Item</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Category</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Price</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Cost</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-surface-700">Profit %</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-surface-700">Status</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-surface-700">Available</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-surface-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedMenuItems.some(selected => selected.id === item.id)}
                        onChange={() => {
                          if (selectedMenuItems.some(selected => selected.id === item.id)) {
                            setSelectedMenuItems(selectedMenuItems.filter(selected => selected.id !== item.id))
                          } else {
                            setSelectedMenuItems([...selectedMenuItems, item])
                          }
                        }}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-100 rounded-lg flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-surface-900">{item.name}</div>
                          <div className="text-sm text-surface-500 line-clamp-1">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-surface-700">{item.category}</td>
                    <td className="px-6 py-4 text-right font-medium text-surface-900">₱{item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-surface-700">₱{item.cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        (item.profitMargin || 0) >= 50 ? 'text-green-600' :
                        (item.profitMargin || 0) >= 30 ? 'text-blue-600' :
                        (item.profitMargin || 0) >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(item.profitMargin || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                        item.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                        item.status === 'inactive' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {item.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.isAvailable ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItemForRecipe(item)
                            setShowRecipeModal(true)
                          }}
                          className="p-2 text-surface-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-surface-500">
                      No menu items found. Try adjusting your search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateMenuItemModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          newItem={newItem}
          setNewItem={setNewItem}
          categories={categories}
          inventoryItems={inventoryItems}
          onSubmit={handleCreateMenuItem}
        />
      )}

      {showCategoryModal && (
        <CreateCategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          onSubmit={handleCreateCategory}
        />
      )}

      {showRecipeModal && selectedItemForRecipe && (
        <RecipeModal
          isOpen={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          menuItem={selectedItemForRecipe}
        />
      )}

      {editingItem && (
        <EditMenuItemModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          categories={categories}
          inventoryItems={inventoryItems}
          onSubmit={async (updatedItem) => {
            try {
              await updateMenuItem(profile!.tenantId, updatedItem.id, updatedItem)
              // Refresh data
              const locationId = getBranchLocationId(selectedBranch!.id)
              const updatedItems = await getMenuItems(profile!.tenantId, locationId)
              setMenuItems(updatedItems.map(item => ({
                ...item,
                profitMargin: calculateProfitMargin(item.price, item.cost),
                isAvailable: checkItemAvailability(item, inventoryItems)
              })))
              setEditingItem(null)
            } catch (error) {
              console.error('Error updating menu item:', error)
              alert('Error updating menu item. Please try again.')
            }
          }}
        />
      )}
    </div>
  )
}

// Menu Item Card Component
interface MenuItemCardProps {
  item: EnhancedMenuItem
  isSelected: boolean
  onSelect: (item: EnhancedMenuItem) => void
  onEdit: (item: EnhancedMenuItem) => void
  onViewRecipe: (item: EnhancedMenuItem) => void
}

function MenuItemCard({ item, isSelected, onSelect, onEdit, onViewRecipe }: MenuItemCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-surface-100 text-surface-800 border-surface-200'
    }
  }

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-600'
    if (margin >= 30) return 'text-blue-600'
    if (margin >= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div
      className={`
        bg-white rounded-2xl border-2 transition-all duration-200 cursor-pointer
        hover:shadow-lg hover:border-primary-200
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 shadow-md' 
          : 'border-surface-200'
        }
      `}
      onClick={() => onSelect(item)}
    >
      {/* Selection Indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${isSelected 
              ? 'bg-primary-600 border-primary-600' 
              : 'border-surface-300 bg-white hover:border-surface-400'
            }
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-surface-100 to-surface-200 rounded-t-2xl flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-t-2xl" />
        ) : (
          <div className="text-center">
            <svg className="w-12 h-12 text-surface-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-surface-500">No image</p>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
            {item.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Availability Badge */}
        {!item.isAvailable && (
          <div className="absolute bottom-4 right-4">
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-surface-900 mb-1">{item.name}</h3>
            <p className="text-sm text-surface-600 line-clamp-2">{item.description}</p>
          </div>
        </div>

        {/* Category */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-surface-100 text-surface-700">
            {item.category}
          </span>
          {item.preparationTime > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-surface-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {item.preparationTime}m
            </span>
          )}
        </div>

        {/* Pricing and Profit */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">Price</span>
            <span className="text-lg font-bold text-surface-900">₱{item.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">Cost</span>
            <span className="text-sm font-semibold text-surface-700">₱{item.cost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">Profit Margin</span>
            <span className={`text-sm font-bold ${getProfitMarginColor(item.profitMargin || 0)}`}>
              {(item.profitMargin || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Ingredients Count */}
        <div className="flex items-center gap-2 mb-4 text-sm text-surface-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>{item.ingredients.length} ingredients</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            className="px-3 py-2 text-sm font-medium text-surface-700 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
          >
            <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onViewRecipe(item)
            }}
            className="px-3 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
          >
            <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Recipe
          </button>
        </div>
      </div>
    </div>
  )
}
