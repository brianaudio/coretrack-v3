'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, CreateMenuItem, InventoryItem, MenuCategory, Recipe } from '@/lib/types/menu'
import AdvancedSearch from '@/components/AdvancedSearch'
import BulkOperations from '@/components/BulkOperations'
import CreateMenuItemModal from './CreateMenuItemModal'
import EditMenuItemModal from './EditMenuItemModal'
import RecipeModal from './RecipeModal'
import CreateCategoryModal from './CreateCategoryModal'

interface EnhancedMenuBuilderProps {
  onItemSelect?: (item: MenuItem) => void
}

const EnhancedMenuBuilder: React.FC<EnhancedMenuBuilderProps> = ({
  onItemSelect
}) => {
  // Real data from user input only - no sample data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  const [categories] = useState<string[]>(['Main Course', 'Appetizer', 'Salad', 'Dessert', 'Beverage'])
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItem[]>([])
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})

  // Utility functions
  const calculateProfitMargin = (price: number, cost: number): number => {
    if (price === 0) return 0
    return ((price - cost) / price) * 100
  }

  const isIngredientsAvailable = (ingredients: MenuItem['ingredients']): boolean => {
    return ingredients.every(ingredient => {
      const inventoryItem = inventory.find(inv => inv.id === ingredient.id)
      return inventoryItem && inventoryItem.quantity >= ingredient.quantity
    })
  }

  const calculateItemCost = (ingredients: MenuItem['ingredients']): number => {
    return ingredients.reduce((total, ingredient) => {
      const inventoryItem = inventory.find(inv => inv.id === ingredient.id)
      if (inventoryItem) {
        return total + (inventoryItem.cost * ingredient.quantity)
      }
      return total
    }, 0)
  }

  // Filter menu items based on search and filters
  const filteredItems = menuItems.filter(item => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Category filter
    if (filters.category && item.category !== filters.category) {
      return false
    }

    // Status filter
    if (filters.status && item.status !== filters.status) {
      return false
    }

    // Availability filter
    if (filters.isAvailable !== undefined) {
      const isAvailable = filters.isAvailable === 'true'
      if (item.isAvailable !== isAvailable) {
        return false
      }
    }

    return true
  })

  // Handle menu item creation
  const handleCreateMenuItem = async (newItem: CreateMenuItem) => {
    try {
      const id = Date.now().toString()
      const cost = calculateItemCost(newItem.ingredients)
      const profitMargin = calculateProfitMargin(newItem.price, cost)
      
      const menuItem: MenuItem = {
        ...newItem,
        id,
        cost,
        profitMargin,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setMenuItems(prev => [...prev, menuItem])
      
      // In a real app, you'd save to Firebase here
      console.log('Creating menu item:', menuItem)
    } catch (error) {
      console.error('Error creating menu item:', error)
      throw error
    }
  }

  // Handle menu item editing
  const handleEditMenuItem = async (updatedItem: MenuItem) => {
    try {
      const cost = calculateItemCost(updatedItem.ingredients)
      const profitMargin = calculateProfitMargin(updatedItem.price, cost)
      
      const menuItem: MenuItem = {
        ...updatedItem,
        cost,
        profitMargin,
        updatedAt: new Date()
      }

      setMenuItems(prev => prev.map(item => 
        item.id === menuItem.id ? menuItem : item
      ))
      
      setEditingItem(null)
      
      // In a real app, you'd update in Firebase here
      console.log('Updating menu item:', menuItem)
    } catch (error) {
      console.error('Error updating menu item:', error)
      throw error
    }
  }

  // Handle bulk operations
  const handleBulkOperation = async (operation: string, items: MenuItem[]) => {
    try {
      switch (operation) {
        case 'activate':
          setMenuItems(prev => prev.map(item => 
            items.find(selected => selected.id === item.id) 
              ? { ...item, status: 'active' as const, updatedAt: new Date() }
              : item
          ))
          break
        case 'deactivate':
          setMenuItems(prev => prev.map(item => 
            items.find(selected => selected.id === item.id) 
              ? { ...item, status: 'inactive' as const, updatedAt: new Date() }
              : item
          ))
          break
        case 'delete':
          setMenuItems(prev => prev.filter(item => 
            !items.find(selected => selected.id === item.id)
          ))
          break
      }
      
      setSelectedMenuItems([])
      console.log(`Bulk ${operation} completed for ${items.length} items`)
    } catch (error) {
      console.error(`Error performing bulk ${operation}:`, error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Menu Builder</h2>
          <p className="text-surface-600 text-sm">
            Manage your restaurant menu items, recipes, and pricing
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 text-surface-600 hover:text-surface-900 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors font-medium"
          >
            + Category
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Total Items</p>
              <p className="text-2xl font-bold text-surface-900">{menuItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Active Items</p>
              <p className="text-2xl font-bold text-green-600">
                {menuItems.filter(item => item.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Avg. Profit Margin</p>
              <p className="text-2xl font-bold text-primary-600">
                {menuItems.length > 0 
                  ? (menuItems.reduce((sum, item) => sum + (item.profitMargin || 0), 0) / menuItems.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-500">Categories</p>
              <p className="text-2xl font-bold text-surface-900">{categories.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-surface-200 p-4">
        <AdvancedSearch
          onSearch={(searchTerm: string, filters: any) => {
            setSearchQuery(searchTerm)
            setFilters(filters)
          }}
          filters={[
            {
              key: 'category',
              label: 'Category',
              type: 'select',
              options: categories.map(cat => ({ value: cat, label: cat }))
            },
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'out_of_stock', label: 'Out of Stock' }
              ]
            },
            {
              key: 'isAvailable',
              label: 'Availability',
              type: 'select',
              options: [
                { value: 'true', label: 'Available' },
                { value: 'false', label: 'Not Available' }
              ]
            }
          ]}
          placeholder="Search menu items..."
        />
      </div>

      {/* Show empty state when no menu items */}
      {menuItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12">
          <div className="text-center">
            <svg className="w-16 h-16 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-surface-900 mb-2">No Menu Items Yet</h3>
            <p className="text-surface-600 mb-6">
              Start building your restaurant menu by creating your first menu item.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Create Your First Menu Item
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Bulk Operations */}
          {selectedMenuItems.length > 0 && (
            <BulkOperations
              items={filteredItems}
              selectedItems={selectedMenuItems}
              onSelectionChange={setSelectedMenuItems}
              operations={[
                {
                  id: 'activate',
                  label: 'Activate Items',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ),
                  action: (items: MenuItem[]) => handleBulkOperation('activate', items),
                  color: 'success' as const
                },
                {
                  id: 'deactivate',
                  label: 'Deactivate Items',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ),
                  action: (items: MenuItem[]) => handleBulkOperation('deactivate', items),
                  color: 'warning' as const
                },
                {
                  id: 'delete',
                  label: 'Delete Items',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                  action: (items: MenuItem[]) => handleBulkOperation('delete', items),
                  color: 'danger' as const,
                  confirmMessage: 'Are you sure you want to delete the selected items?'
                }
              ]}
            />
          )}

          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-500">
                Showing {filteredItems.length} of {menuItems.length} items
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Menu Items Display */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-12">
              <div className="text-center">
                <svg className="w-12 h-12 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-surface-500 text-lg">No menu items found</p>
                <p className="text-surface-400">Try adjusting your search filters or create a new item</p>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Card Header */}
                  <div className="relative">
                    <div className="h-48 bg-surface-100 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-16 h-16 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3">
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
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-surface-300 rounded bg-white"
                      />
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                        item.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                        item.status === 'inactive' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {item.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-surface-900 text-lg">{item.name}</h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-surface-900">₱{item.price.toFixed(2)}</div>
                        <div className="text-sm text-surface-500">Cost: ₱{item.cost.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <p className="text-surface-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-surface-500">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          (item.profitMargin || 0) >= 50 ? 'text-green-600' :
                          (item.profitMargin || 0) >= 30 ? 'text-blue-600' :
                          (item.profitMargin || 0) >= 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(item.profitMargin || 0).toFixed(1)}% profit
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-surface-500">{item.preparationTime} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.isAvailable ? (
                          <span className="inline-flex items-center text-green-600 text-sm">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600 text-sm">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="flex-1 px-3 py-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItemForRecipe(item)
                          setShowRecipeModal(true)
                        }}
                        className="flex-1 px-3 py-2 text-surface-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Recipe
                      </button>
                      {onItemSelect && (
                        <button
                          onClick={() => onItemSelect(item)}
                          className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateMenuItemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateMenuItem}
        categories={categories}
        inventory={inventory}
      />

      <CreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSubmit={async (category) => {
          console.log('Creating category:', category)
          // In a real app, you'd save to Firebase here
          setShowCategoryModal(false)
        }}
        existingCategories={[]}
      />

      <RecipeModal
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false)
          setSelectedItemForRecipe(null)
        }}
        menuItem={selectedItemForRecipe}
        inventory={inventory}
        onSaveRecipe={async (recipe) => {
          console.log('Saving recipe:', recipe)
          // In a real app, you'd save to Firebase here
        }}
      />

      <EditMenuItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSubmit={handleEditMenuItem}
        categories={categories}
        inventory={inventory}
      />
    </div>
  )
}

export default EnhancedMenuBuilder
