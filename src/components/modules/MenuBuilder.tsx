'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { 
  getMenuItems, 
  addMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  getMenuCategories,
  type MenuItem,
  type MenuCategory,
  type CreateMenuItem,
  type MenuIngredient
} from '../../lib/firebase/menuBuilder'
import { 
  getInventoryItems,
  type InventoryItem
} from '../../lib/firebase/inventory'
import {
  syncMenuItemToPOS,
  handleMenuItemUpdate,
  handleMenuItemDeletion,
  getAffectedMenuItems
} from '../../lib/firebase/integration'

export default function MenuBuilder() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    ingredients: [] as MenuIngredient[]
  })

  // Load menu items and categories
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) return

    const loadData = async () => {
      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        const [itemsData, categoriesData, inventoryData] = await Promise.all([
          getMenuItems(profile.tenantId, locationId),
          getMenuCategories(profile.tenantId),
          getInventoryItems(profile.tenantId, locationId)
        ])
        setMenuItems(itemsData)
        setCategories(categoriesData)
        setInventoryItems(inventoryData)
      } catch (error) {
        console.error('Error loading menu data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.tenantId, selectedBranch?.id])

  const handleCreateMenuItem = async () => {
    if (!profile?.tenantId || !newItem.name || !newItem.category || !newItem.price || !selectedBranch) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      
      const itemData: CreateMenuItem = {
        name: newItem.name,
        description: newItem.description,
        category: newItem.category,
        price: newItem.price,
        ingredients: newItem.ingredients,
        preparationTime: 0, // Default value
        calories: 0, // Default value  
        allergens: [], // Default empty array
        tenantId: profile.tenantId,
        locationId // Add branch-specific locationId
      }

      const newMenuItemId = await addMenuItem(itemData)
      
      // Get the created menu item
      const updatedItems = await getMenuItems(profile.tenantId)
      const createdItem = updatedItems.find(item => item.id === newMenuItemId)
      
      if (createdItem) {
        // Sync to POS automatically (silent sync)
        try {
          await syncMenuItemToPOS(createdItem)
          console.log('✅ Menu item created and synced to POS:', createdItem.name)
        } catch (syncError) {
          console.error('❌ Error syncing to POS:', syncError)
          // Don't alert user about sync errors, just log them
        }
      }
      
      setMenuItems(updatedItems)
      
      // Reset form
      setNewItem({
        name: '',
        description: '',
        category: '',
        price: 0,
        cost: 0,
        ingredients: []
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating menu item:', error)
      alert('Error creating menu item. Please try again.')
    }
  }

  const handleUpdateMenuItem = async () => {
    if (!profile?.tenantId || !editingItem) return

    try {
      await updateMenuItem(profile.tenantId, editingItem.id!, {
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        status: editingItem.status,
        ingredients: editingItem.ingredients
      })
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === editingItem.id ? editingItem : item
      ))
      
      // Sync changes to POS (silent sync)
      try {
        await handleMenuItemUpdate(editingItem)
        console.log('✅ Menu item updated and synced to POS:', editingItem.name)
      } catch (syncError) {
        console.error('❌ Error syncing update to POS:', syncError)
      }
      
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating menu item:', error)
      alert('Error updating menu item. Please try again.')
    }
  }

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!profile?.tenantId || !confirm('Are you sure you want to delete this menu item?')) return

    try {
      await deleteMenuItem(profile.tenantId, itemId)
      
      // Remove from POS system (silent sync)
      try {
        await handleMenuItemDeletion(profile.tenantId, itemId)
        console.log('✅ Menu item deleted and removed from POS')
      } catch (syncError) {
        console.error('❌ Error removing from POS:', syncError)
      }
      
      setMenuItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error deleting menu item:', error)
      alert('Error deleting menu item. Please try again.')
    }
  }

  const handleDuplicateMenuItem = (item: MenuItem) => {
    // Copy all item details except the ID
    setNewItem({
      name: `${item.name} (Copy)`,
      description: item.description,
      category: item.category,
      price: item.price,
      cost: item.cost,
      ingredients: [...item.ingredients] // Deep copy the ingredients array
    })
    
    // Open the create modal
    setShowCreateModal(true)
  }

  // Bulk action functions
  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const filteredItems = getFilteredItems()
    setSelectedItems(new Set(filteredItems.map(item => item.id!)))
  }

  const handleDeselectAll = () => {
    setSelectedItems(new Set())
  }

  const handleBulkStatusChange = async (newStatus: 'active' | 'inactive') => {
    if (!profile?.tenantId || selectedItems.size === 0) return
    
    try {
      const updatePromises = Array.from(selectedItems).map(itemId =>
        updateMenuItem(profile.tenantId, itemId, { status: newStatus })
      )
      
      await Promise.all(updatePromises)
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        selectedItems.has(item.id!) ? { ...item, status: newStatus } : item
      ))
      
      // Clear selection
      setSelectedItems(new Set())
      setBulkMode(false)
    } catch (error) {
      console.error('Error updating items status:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (!profile?.tenantId || selectedItems.size === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} product(s)?`
    if (!confirm(confirmMessage)) return
    
    try {
      const deletePromises = Array.from(selectedItems).map(itemId =>
        deleteMenuItem(profile.tenantId, itemId)
      )
      
      await Promise.all(deletePromises)
      
      // Update local state
      setMenuItems(prev => prev.filter(item => !selectedItems.has(item.id!)))
      
      // Clear selection
      setSelectedItems(new Set())
      setBulkMode(false)
    } catch (error) {
      console.error('Error deleting items:', error)
    }
  }

  // Sorting functions
  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const getSortLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      name: 'Name',
      price: 'Price',
      cost: 'Cost',
      margin: 'Profit Margin',
      category: 'Category',
      status: 'Status'
    }
    return labels[field] || field
  }

  const toggleStatus = async (item: MenuItem) => {
    if (!profile?.tenantId) return

    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active'
      await updateMenuItem(profile.tenantId, item.id!, { status: newStatus })
      
      // Update local state
      setMenuItems(prev => prev.map(menuItem => 
        menuItem.id === item.id ? { ...menuItem, status: newStatus } : menuItem
      ))
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  // Helper functions for ingredient management
  const addIngredient = () => {
    setNewItem(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        cost: 0
      }]
    }))
  }

  const updateIngredient = (index: number, field: keyof MenuIngredient, value: any) => {
    setNewItem(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i !== index) return ingredient
        
        const updatedIngredient = { ...ingredient, [field]: value }
        
        // Auto-populate details when inventory item is selected
        if (field === 'inventoryItemId' && value) {
          const inventoryItem = inventoryItems.find(item => item.id === value)
          if (inventoryItem) {
            updatedIngredient.inventoryItemName = inventoryItem.name
            updatedIngredient.unit = inventoryItem.unit
            updatedIngredient.cost = (inventoryItem.costPerUnit || 0) * updatedIngredient.quantity
          }
        }
        
        // Recalculate cost when quantity changes
        if (field === 'quantity') {
          const inventoryItem = inventoryItems.find(item => item.id === updatedIngredient.inventoryItemId)
          if (inventoryItem && inventoryItem.costPerUnit) {
            updatedIngredient.cost = inventoryItem.costPerUnit * value
          }
        }
        
        return updatedIngredient
      }),
      // Auto-calculate total cost
      cost: prev.ingredients.reduce((total, ing, i) => {
        if (i === index) {
          const inventoryItem = inventoryItems.find(item => item.id === (field === 'inventoryItemId' ? value : ing.inventoryItemId))
          if (inventoryItem && inventoryItem.costPerUnit) {
            return total + (inventoryItem.costPerUnit * (field === 'quantity' ? value : ing.quantity))
          }
        }
        return total + ing.cost
      }, 0)
    }))
  }

  const removeIngredient = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
      cost: prev.ingredients
        .filter((_, i) => i !== index)
        .reduce((total, ing) => total + ing.cost, 0)
    }))
  }

  // Helper functions for ingredient management in edit mode
  const addIngredientToEdit = () => {
    setEditingItem(prev => prev ? ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        cost: 0
      }]
    }) : null)
  }

  const updateIngredientInEdit = (index: number, field: keyof MenuIngredient, value: any) => {
    setEditingItem(prev => prev ? ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i !== index) return ingredient
        
        const updatedIngredient = { ...ingredient, [field]: value }
        
        // Auto-populate details when inventory item is selected
        if (field === 'inventoryItemId' && value) {
          const inventoryItem = inventoryItems.find(item => item.id === value)
          if (inventoryItem) {
            updatedIngredient.inventoryItemName = inventoryItem.name
            updatedIngredient.unit = inventoryItem.unit
            updatedIngredient.cost = (inventoryItem.costPerUnit || 0) * updatedIngredient.quantity
          }
        }
        
        // Recalculate cost when quantity changes
        if (field === 'quantity') {
          const inventoryItem = inventoryItems.find(item => item.id === updatedIngredient.inventoryItemId)
          if (inventoryItem && inventoryItem.costPerUnit) {
            updatedIngredient.cost = inventoryItem.costPerUnit * value
          }
        }
        
        return updatedIngredient
      })
    }) : null)
  }

  const removeIngredientFromEdit = (index: number) => {
    setEditingItem(prev => prev ? ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }) : null)
  }

  // Inventory Integration Helper Functions
  const calculateMaxServings = (item: MenuItem) => {
    if (item.ingredients.length === 0) return Infinity
    
    let maxServings = Infinity
    
    for (const ingredient of item.ingredients) {
      const inventoryItem = inventoryItems.find(inv => inv.id === ingredient.inventoryItemId)
      if (inventoryItem) {
        const servingsFromThisIngredient = Math.floor(inventoryItem.currentStock / ingredient.quantity)
        maxServings = Math.min(maxServings, servingsFromThisIngredient)
      } else {
        // If ingredient not found in inventory, assume 0 servings possible
        maxServings = 0
      }
    }
    
    return maxServings === Infinity ? 0 : maxServings
  }

  const getStockStatus = (item: MenuItem) => {
    const maxServings = calculateMaxServings(item)
    
    if (maxServings === 0) return 'out_of_stock'
    if (maxServings <= 5) return 'low_stock'
    if (maxServings <= 10) return 'medium_stock'
    return 'in_stock'
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      case 'low_stock': return 'bg-orange-100 text-orange-800'
      case 'medium_stock': return 'bg-yellow-100 text-yellow-800'
      case 'in_stock': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStockStatusText = (status: string, maxServings: number) => {
    switch (status) {
      case 'out_of_stock': return 'Out of Stock'
      case 'low_stock': return `Low Stock (${maxServings})`
      case 'medium_stock': return `Medium Stock (${maxServings})`
      case 'in_stock': return `In Stock (${maxServings > 50 ? '50+' : maxServings})`
      default: return 'Unknown'
    }
  }

  const getLowStockIngredients = (item: MenuItem) => {
    const lowStockIngredients = []
    
    for (const ingredient of item.ingredients) {
      const inventoryItem = inventoryItems.find(inv => inv.id === ingredient.inventoryItemId)
      if (inventoryItem) {
        const servingsFromThisIngredient = Math.floor(inventoryItem.currentStock / ingredient.quantity)
        if (servingsFromThisIngredient <= 5) {
          lowStockIngredients.push({
            name: ingredient.inventoryItemName,
            available: inventoryItem.currentStock,
            needed: ingredient.quantity,
            maxServings: servingsFromThisIngredient,
            unit: ingredient.unit
          })
        }
      }
    }
    
    return lowStockIngredients
  }

  const getFilteredItems = () => {
    let filtered = menuItems

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    // Filter by stock availability
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        const stockStatus = getStockStatus(item)
        switch (stockFilter) {
          case 'in_stock':
            return stockStatus === 'in_stock' || stockStatus === 'medium_stock'
          case 'low_stock':
            return stockStatus === 'low_stock'
          case 'out_of_stock':
            return stockStatus === 'out_of_stock'
          default:
            return true
        }
      })
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let valueA: any, valueB: any

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'price':
          valueA = a.price
          valueB = b.price
          break
        case 'cost':
          valueA = a.cost
          valueB = b.cost
          break
        case 'margin':
          valueA = calculateProfitMargin(a.price, a.cost)
          valueB = calculateProfitMargin(b.price, b.cost)
          break
        case 'category':
          valueA = a.category.toLowerCase()
          valueB = b.category.toLowerCase()
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        default:
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const calculateProfitMargin = (price: number, cost: number) => {
    if (cost === 0) return 0
    return ((price - cost) / price) * 100
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredItems = getFilteredItems()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Product Builder</h2>
          {bulkMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedItems.size} selected
              </span>
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => setBulkMode(false)}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bulkMode && selectedItems.size > 0 && (
            <>
              <button
                onClick={() => handleBulkStatusChange('active')}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Activate ({selectedItems.size})
              </button>
              <button
                onClick={() => handleBulkStatusChange('inactive')}
                className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Deactivate ({selectedItems.size})
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete ({selectedItems.size})
              </button>
            </>
          )}
          {!bulkMode && (
            <>
              <button
                onClick={() => setBulkMode(true)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Select Items
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{menuItems.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {menuItems.filter(item => item.status === 'active').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">In Stock</div>
          <div className="text-2xl font-bold text-blue-600">
            {menuItems.filter(item => {
              const status = getStockStatus(item)
              return status === 'in_stock' || status === 'medium_stock'
            }).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Low Stock</div>
          <div className="text-2xl font-bold text-orange-600">
            {menuItems.filter(item => getStockStatus(item) === 'low_stock').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Avg Price</div>
          <div className="text-2xl font-bold text-purple-600">
            ₱{menuItems.length > 0 ? (menuItems.reduce((sum, item) => sum + item.price, 0) / menuItems.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search products by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {Array.from(new Set(menuItems.map(item => item.category)))
            .filter(category => category.trim() !== '')
            .sort()
            .map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Items</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Stock Levels</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">No Stock</option>
        </select>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="cost">Sort by Cost</option>
            <option value="margin">Sort by Profit Margin</option>
            <option value="category">Sort by Category</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6 relative">
            {bulkMode && (
              <div className="absolute top-4 left-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id!)}
                  onChange={() => handleSelectItem(item.id!)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
            )}
            <div className={`flex justify-between items-start mb-4 ${bulkMode ? 'ml-6' : ''}`}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{item.category}</span>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Synced to POS
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(item)}
                className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}
              >
                {item.status}
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Category:</span>
                <span className="text-sm font-medium">{item.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Price:</span>
                <span className="text-sm font-medium">₱{item.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cost:</span>
                <span className="text-sm font-medium">₱{item.cost.toFixed(2)}</span>
              </div>
              {(item.price > 0 && item.cost > 0) && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Margin:</span>
                  <span className="text-sm font-medium">
                    {calculateProfitMargin(item.price, item.cost).toFixed(1)}%
                  </span>
                </div>
              )}
              {item.preparationTime > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Prep Time:</span>
                  <span className="text-sm font-medium">{item.preparationTime} min</span>
                </div>
              )}
              {item.calories && item.calories > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Calories:</span>
                  <span className="text-sm font-medium">{item.calories}</span>
                </div>
              )}
            </div>

            {item.allergens && item.allergens.length > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-500">Allergens:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.allergens.map((allergen) => (
                    <span
                      key={allergen}
                      className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Info */}
            <div className="mb-4">
              <span className="text-sm text-gray-500">Stock Status:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium rounded-full px-3 py-1 ${getStockStatusColor(getStockStatus(item))}`}>
                  {getStockStatusText(getStockStatus(item), calculateMaxServings(item))}
                </span>
                {getStockStatus(item) === 'low_stock' && (
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {getStockStatus(item) === 'out_of_stock' && (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            {/* Low Stock Ingredients Warning */}
            {(() => {
              const lowStockIngredients = getLowStockIngredients(item)
              return lowStockIngredients.length > 0 ? (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800 mb-2">⚠️ Low Stock Ingredients:</p>
                  <ul className="text-xs text-orange-700 space-y-1">
                    {lowStockIngredients.map((ingredient, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{ingredient.name}</span>
                        <span>{ingredient.available} {ingredient.unit} (need {ingredient.needed})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            })()}

            {!bulkMode && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicateMenuItem(item)}
                  className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteMenuItem(item.id!)}
                  className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Menu Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Product</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Item name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category (e.g., Burgers, Drinks, Desserts)"
                    list="categories-datalist"
                  />
                  <datalist id="categories-datalist">
                    {Array.from(new Set(menuItems.map(item => item.category)))
                      .filter(category => category.trim() !== '')
                      .sort()
                      .map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  {menuItems.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Existing categories: {Array.from(new Set(menuItems.map(item => item.category)))
                        .filter(category => category.trim() !== '')
                        .sort()
                        .slice(0, 5)
                        .join(', ')}
                      {Array.from(new Set(menuItems.map(item => item.category))).filter(category => category.trim() !== '').length > 5 && 
                        ` +${Array.from(new Set(menuItems.map(item => item.category))).filter(category => category.trim() !== '').length - 5} more`}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Item description..."
                />
              </div>

              {/* Ingredients Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Recipe Ingredients</h4>
                    <p className="text-sm text-gray-600">Add ingredients from your inventory to calculate product cost</p>
                  </div>
                  <button
                    onClick={addIngredient}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Ingredient
                  </button>
                </div>

                {newItem.ingredients.length > 0 && (
                  <div className="space-y-3">
                    {newItem.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory Item
                          </label>
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateIngredient(index, 'inventoryItemId', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="w-20">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={ingredient.unit}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Cost
                          </label>
                          <input
                            type="text"
                            value={`₱${ingredient.cost.toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                        <button
                          onClick={() => removeIngredient(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Total Ingredient Cost: <span className="text-green-600">₱{newItem.cost.toFixed(2)}</span>
                      </p>
                    </div>
                    
                    {/* Stock Impact Preview */}
                    {newItem.ingredients.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">📦 Stock Impact Preview</h5>
                        <div className="space-y-2">
                          {newItem.ingredients.map((ingredient, index) => {
                            const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventoryItemId)
                            const maxServings = inventoryItem ? Math.floor(inventoryItem.currentStock / ingredient.quantity) : 0
                            const stockStatus = maxServings === 0 ? 'out' : maxServings <= 5 ? 'low' : 'good'
                            
                            return (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-blue-700">{ingredient.inventoryItemName}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-blue-600">
                                    {inventoryItem ? inventoryItem.currentStock : 0} {ingredient.unit} available
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    stockStatus === 'out' ? 'bg-red-100 text-red-800' :
                                    stockStatus === 'low' ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {maxServings} servings
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {newItem.ingredients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No ingredients added yet</p>
                    <p className="text-sm">Add ingredients to automatically calculate product cost</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={`₱${newItem.cost.toFixed(2)}`}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profit Margin
                  </label>
                  <input
                    type="text"
                    value={newItem.price > 0 && newItem.cost > 0 ? `₱${(newItem.price - newItem.cost).toFixed(2)} (${(((newItem.price - newItem.cost) / newItem.price) * 100).toFixed(1)}%)` : 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-green-50 text-green-700 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMenuItem}
                disabled={!newItem.name || !newItem.category || !newItem.price}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Menu Item</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editingItem.status}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Cost Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ingredient Cost:</span>
                      <span className="font-medium">₱{editingItem.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium">₱{editingItem.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className="font-medium text-green-600">
                        {editingItem.price > 0 && editingItem.ingredients.length > 0 ? 
                          `₱${(editingItem.price - editingItem.ingredients.reduce((sum, ing) => sum + ing.cost, 0)).toFixed(2)} (${(((editingItem.price - editingItem.ingredients.reduce((sum, ing) => sum + ing.cost, 0)) / editingItem.price) * 100).toFixed(1)}%)`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">Recipe Ingredients</h4>
                    <p className="text-sm text-gray-600">Manage ingredients to calculate product cost</p>
                  </div>
                  <button
                    onClick={addIngredientToEdit}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Ingredient
                  </button>
                </div>

                {editingItem.ingredients.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {editingItem.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory Item
                          </label>
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateIngredientInEdit(index, 'inventoryItemId', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-16">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredientInEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="w-12">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={ingredient.unit}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div className="w-16">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Cost
                          </label>
                          <input
                            type="text"
                            value={`₱${ingredient.cost.toFixed(2)}`}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <button
                          onClick={() => removeIngredientFromEdit(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded mt-5"
                          title="Remove ingredient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No ingredients added yet</p>
                    <p className="text-xs text-gray-400">Click &quot;Add Ingredient&quot; to start building your recipe</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMenuItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
