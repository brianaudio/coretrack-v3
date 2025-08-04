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
  getAddons,
  createAddon,
  updateAddon,
  deleteAddon,
  toggleAddonStatus,
  type Addon,
  type CreateAddon
} from '../../lib/firebase/addons'
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
  const [addons, setAddons] = useState<Addon[]>([])
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [showCreateAddonModal, setShowCreateAddonModal] = useState(false);
  const [newAddon, setNewAddon] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    inventoryItemId: '', // Keep for backward compatibility
    inventoryItemName: '', // Keep for backward compatibility  
    inventoryQuantity: 1, // Keep for backward compatibility
    ingredients: [] as Array<{
      inventoryItemId: string;
      inventoryItemName: string;
      quantity: number;
      unit: string;
      cost: number;
    }>
  });
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addonSearchQuery, setAddonSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState<'menu-items' | 'addons'>('menu-items')

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
        const [itemsData, categoriesData, inventoryData, addonsData] = await Promise.all([
          getMenuItems(profile.tenantId, locationId),
          getMenuCategories(profile.tenantId),
          getInventoryItems(profile.tenantId, locationId),
          getAddons(profile.tenantId, locationId)
        ])
        console.log('📊 MenuBuilder: Raw data loaded:', {
          menuItems: itemsData.length,
          categories: categoriesData.length,
          inventory: inventoryData.length,
          addons: addonsData.length,
          addonsData
        })
        setMenuItems(itemsData)
        setCategories(categoriesData)
        setInventoryItems(inventoryData)
        setAddons(addonsData)
        console.log('📊 MenuBuilder: State updated, addons.length should be:', addonsData.length)
      } catch (error) {
        console.error('Error loading menu data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.tenantId, selectedBranch?.id])

  // Debug addons state changes
  useEffect(() => {
    console.log('🔍 MenuBuilder: addons state changed, length =', addons.length, 'addons =', addons)
  }, [addons])

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

  // Addon handlers
  const handleDeleteAddon = async (addonId: string) => {
    if (!profile?.tenantId || !confirm('Are you sure you want to delete this add-on?')) return

    try {
      await deleteAddon(profile.tenantId, addonId)
      setAddons(prev => prev.filter(addon => addon.id !== addonId))
    } catch (error) {
      console.error('Error deleting add-on:', error)
      alert('Error deleting add-on. Please try again.')
    }
  }

  const handleEditAddon = (addon: Addon) => {
    setEditingAddon(addon)
  }

  const handleUpdateAddon = async () => {
    if (!profile?.tenantId || !editingAddon) return

    try {
      const updateData: any = {
        name: editingAddon.name,
        description: editingAddon.description,
        price: editingAddon.price,
        cost: editingAddon.cost
      }

      // Handle ingredients if they exist
      if (editingAddon.ingredients && editingAddon.ingredients.length > 0) {
        updateData.ingredients = editingAddon.ingredients.map(ingredient => ({
          inventoryItemId: ingredient.inventoryItemId,
          inventoryItemName: ingredient.inventoryItemName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          costPerUnit: ingredient.costPerUnit
        }))
      } else {
        // Handle legacy single inventory item
        const inventoryItem = inventoryItems.find(item => item.id === editingAddon.inventoryItemId)
        if (inventoryItem) {
          updateData.inventoryItemId = editingAddon.inventoryItemId
          updateData.inventoryItemName = inventoryItem.name
          updateData.inventoryQuantity = editingAddon.inventoryQuantity
        }
      }

      await updateAddon(profile.tenantId, editingAddon.id, updateData)
      
      // Reload addons to get fresh data
      const locationId = getBranchLocationId(selectedBranch?.id || '')
      const updatedAddons = await getAddons(profile.tenantId, locationId)
      setAddons(updatedAddons)
      
      setEditingAddon(null)
    } catch (error) {
      console.error('Error updating add-on:', error)
      alert('Error updating add-on. Please try again.')
    }
  }

  const handleToggleAddon = async (addon: Addon) => {
    if (!profile?.tenantId) return

    try {
      const newStatus = addon.status === 'active' ? 'inactive' : 'active'
      await updateAddon(profile.tenantId, addon.id, { status: newStatus })
      setAddons(prev => prev.map(a => 
        a.id === addon.id ? { ...a, status: newStatus } : a
      ))
    } catch (error) {
      console.error('Error toggling add-on status:', error)
      alert('Error updating add-on status. Please try again.')
    }
  }

  const handleCreateAddon = async () => {
    if (!profile?.tenantId || !selectedBranch?.id || !newAddon.name) return
    
    // Validate that we have either ingredients or a single inventory item
    if (newAddon.ingredients.length === 0 && !newAddon.inventoryItemId) {
      alert('Please add at least one ingredient or select a single inventory item.')
      return
    }

    try {
      const addonData: any = {
        name: newAddon.name,
        description: newAddon.description,
        price: newAddon.price,
        cost: newAddon.cost,
        status: 'active' as const
      }

      // If using multiple ingredients, include them
      if (newAddon.ingredients.length > 0) {
        addonData.ingredients = newAddon.ingredients.map(ingredient => ({
          inventoryItemId: ingredient.inventoryItemId,
          inventoryItemName: ingredient.inventoryItemName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          costPerUnit: (inventoryItems.find(item => item.id === ingredient.inventoryItemId)?.costPerUnit || 0)
        }))
      } else {
        // Fallback to single inventory item for backward compatibility
        const inventoryItem = inventoryItems.find(item => item.id === newAddon.inventoryItemId)
        if (inventoryItem) {
          addonData.inventoryItemId = newAddon.inventoryItemId
          addonData.inventoryItemName = inventoryItem.name
          addonData.inventoryQuantity = newAddon.inventoryQuantity
        }
      }

      const locationId = getBranchLocationId(selectedBranch.id)
      await createAddon(profile.tenantId, locationId, addonData)
      
      // Reset form and close modal using the reset function
      resetAddonForm()
      
      // Reload addons
      const updatedAddons = await getAddons(profile.tenantId, locationId)
      setAddons(updatedAddons)
    } catch (error) {
      console.error('Error creating add-on:', error)
      alert('Error creating add-on. Please try again.')
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

  // Helper functions for addon ingredient management
  const addAddonIngredient = () => {
    setNewAddon(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        cost: 0
      }],
      cost: prev.ingredients.reduce((total, ing) => total + ing.cost, 0)
    }))
  }

  const updateAddonIngredient = (index: number, field: string, value: any) => {
    setNewAddon(prev => {
      const updatedIngredients = prev.ingredients.map((ingredient, i) => {
        if (i === index) {
          if (field === 'inventoryItemId') {
            const selectedItem = inventoryItems.find(item => item.id === value)
            if (selectedItem) {
              const cost = (selectedItem.costPerUnit || 0) * ingredient.quantity
              return {
                ...ingredient,
                inventoryItemId: value,
                inventoryItemName: selectedItem.name,
                unit: selectedItem.unit,
                cost: cost
              }
            }
          } else if (field === 'quantity') {
            const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventoryItemId)
            const cost = inventoryItem ? (inventoryItem.costPerUnit || 0) * value : 0
            return {
              ...ingredient,
              quantity: value,
              cost: cost
            }
          }
          return { ...ingredient, [field]: value }
        }
        return ingredient
      })
      
      return {
        ...prev,
        ingredients: updatedIngredients,
        cost: updatedIngredients.reduce((total, ing) => total + ing.cost, 0)
      }
    })
  }

  const removeAddonIngredient = (index: number) => {
    setNewAddon(prev => {
      const filteredIngredients = prev.ingredients.filter((_, i) => i !== index)
      return {
        ...prev,
        ingredients: filteredIngredients,
        cost: filteredIngredients.reduce((total, ing) => total + ing.cost, 0)
      }
    })
  }

  // Helper functions for addon ingredient management in edit mode
  const addAddonIngredientToEdit = () => {
    setEditingAddon(prev => prev ? ({
      ...prev,
      ingredients: [...(prev.ingredients || []), {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        costPerUnit: 0
      }]
    }) : null)
  }

  const updateAddonIngredientInEdit = (index: number, field: string, value: any) => {
    setEditingAddon(prev => prev ? ({
      ...prev,
      ingredients: (prev.ingredients || []).map((ingredient, i) => {
        if (i === index) {
          if (field === 'inventoryItemId') {
            const selectedItem = inventoryItems.find(item => item.id === value)
            if (selectedItem) {
              return {
                ...ingredient,
                inventoryItemId: value,
                inventoryItemName: selectedItem.name,
                unit: selectedItem.unit,
                costPerUnit: selectedItem.costPerUnit || 0
              }
            }
          }
          return { ...ingredient, [field]: value }
        }
        return ingredient
      })
    }) : null)
  }

  const removeAddonIngredientFromEdit = (index: number) => {
    setEditingAddon(prev => prev ? ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
    }) : null)
  }

  // Helper function to reset addon form
  const resetAddonForm = () => {
    setNewAddon({
      name: '',
      description: '',
      price: 0,
      cost: 0,
      inventoryItemId: '',
      inventoryItemName: '',
      inventoryQuantity: 1,
      ingredients: []
    })
    setShowCreateAddonModal(false)
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

  // Filter add-ons based on search query
  const filteredAddons = addons.filter(addon => {
    const matchesSearch = addonSearchQuery === '' || 
      addon.name.toLowerCase().includes(addonSearchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(addonSearchQuery.toLowerCase())
    
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-gray-900">Menu Builder</h2>
            
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('menu-items')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'menu-items'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Menu Items
              </button>
              <button
                onClick={() => setActiveTab('addons')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'addons'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Add-ons
              </button>
            </div>
          </div>

          {/* Primary Action Buttons - Clean Layout */}
          <div className="flex items-center gap-3">
            {activeTab === 'menu-items' && !bulkMode && (
              <>
                <button
                  onClick={() => setBulkMode(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bulk Operations
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Menu Item
                </button>
              </>
            )}
            {activeTab === 'addons' && (
              <button
                onClick={() => setShowCreateAddonModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Add-on
              </button>
            )}
          </div>
        </div>

        {/* Bulk Mode Bar - Separate Clean Row */}
        {activeTab === 'menu-items' && bulkMode && (
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
            <div className="flex items-center justify-between">
              {/* Left: Mode Indicator & Selection Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-900">Bulk Selection Mode</span>
                </div>
                {selectedItems.size > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 border border-blue-200 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-800">
                      {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-blue-700">Click items to select for bulk operations</span>
                )}
              </div>

              {/* Right: Action Controls */}
              <div className="flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <>
                    {/* Selection Controls */}
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded transition-colors font-medium"
                      >
                        All
                      </button>
                      <span className="text-blue-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded transition-colors font-medium"
                      >
                        None
                      </button>
                    </div>
                    
                    {/* Bulk Actions */}
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        onClick={() => handleBulkStatusChange('active')}
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors font-medium"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('inactive')}
                        className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors font-medium"
                      >
                        Deactivate
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
                
                {/* Exit Button */}
                <button
                  onClick={() => setBulkMode(false)}
                  className="px-3 py-1 text-xs text-gray-700 hover:bg-white border border-blue-200 rounded transition-colors font-medium"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {activeTab === 'menu-items' && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Total:</span>
                <span className="font-semibold text-gray-900">{menuItems.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Active:</span>
                <span className="font-semibold text-green-600">
                  {menuItems.filter(item => item.status === 'active').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">In Stock:</span>
                <span className="font-semibold text-blue-600">
                  {menuItems.filter(item => {
                    const status = getStockStatus(item)
                    return status === 'in_stock' || status === 'medium_stock'
                  }).length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Low Stock:</span>
                <span className="font-semibold text-orange-600">
                  {menuItems.filter(item => getStockStatus(item) === 'low_stock').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'menu-items' ? (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="px-6 py-3 bg-white border-b border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Menu Items Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  Showing {filteredItems.length} of {menuItems.length} items
                </div>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="price">Sort by Price</option>
                    <option value="cost">Sort by Cost</option>
                    <option value="category">Sort by Category</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              {/* Menu Items Grid with Empty State */}
              {menuItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                    <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                      <path d="M17 8H7V10H17V8ZM17 11H7V13H17V11ZM17 14H7V16H17V14Z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Menu Available</h3>
                  <p className="text-gray-600 text-center mb-6 max-w-sm">
                    You haven't created any menu items yet. Start building your menu by adding your first item.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Your First Menu Item
                  </button>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Found</h3>
                  <p className="text-gray-600 text-center mb-6 max-w-sm">
                    No menu items match your current filters. Try adjusting your search or filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setCategoryFilter('all')
                      setStatusFilter('all')
                      setStockFilter('all')
                    }}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`relative bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-all ${
                      bulkMode ? 'cursor-pointer' : ''
                    } ${
                      bulkMode 
                        ? selectedItems.has(item.id!) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300'
                        : 'border-gray-200'
                    }`}
                    onClick={bulkMode ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectItem(item.id!);
                    } : undefined}
                  >
                    {/* Bulk Mode Checkbox */}
                    {bulkMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id!)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item.id!);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    {/* Card Header */}
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">{item.name}</h3>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                      <div className="text-xs text-gray-500">{item.category}</div>
                    </div>

                    {/* Card Body */}
                    <div className="px-4 pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-gray-900">₱{item.price.toFixed(2)}</span>
                        <span className="text-xs text-gray-500">Cost: ₱{item.cost.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-green-600">
                          Profit: ₱{(item.price - item.cost).toFixed(2)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStockStatusColor(getStockStatus(item))}`}>
                          {getStockStatusText(getStockStatus(item), calculateMaxServings(item))}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    {!bulkMode && (
                      <div className="px-4 pb-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="flex-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDuplicateMenuItem(item)}
                            className="flex-1 px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id!)}
                            className="flex-1 px-2 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        ) : (
          /* Add-ons Tab Content */
          <div className="h-full flex flex-col">
            {/* Add-ons Filters */}
            <div className="px-6 py-3 bg-white border-b border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search add-ons..."
                  value={addonSearchQuery}
                  onChange={(e) => setAddonSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Add-ons Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {addons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                    <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      <path d="M16 6V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2h4v2h-4V4z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Add-ons Available</h3>
                  <p className="text-gray-600 text-center mb-6 max-w-sm">
                    You haven't created any add-ons yet. Add-ons are extras like sauces, drinks, or sides that customers can add to their orders.
                  </p>
                  <button
                    onClick={() => setShowCreateAddonModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Your First Add-on
                  </button>
                </div>
              ) : filteredAddons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Add-ons Found</h3>
                  <p className="text-gray-600 text-center mb-6 max-w-sm">
                    No add-ons match your current search criteria. Try adjusting your search terms.
                  </p>
                  <button
                    onClick={() => setAddonSearchQuery('')}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAddons.map((addon) => (
                    <div key={addon.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Card Header */}
                      <div className="p-4 pb-2">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">{addon.name}</h3>
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${addon.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {addon.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{addon.description}</p>
                        <div className="text-xs text-gray-500">
                          {addon.ingredients && addon.ingredients.length > 0 
                            ? `Multi-ingredient (${addon.ingredients.length} items)`
                            : `Inventory: ${addon.inventoryItemName || 'N/A'}`
                          }
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="px-4 pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-gray-900">₱{addon.price.toFixed(2)}</span>
                          <span className="text-xs text-gray-500">Cost: ₱{addon.cost.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-green-600">
                            Profit: ₱{(addon.price - addon.cost).toFixed(2)}
                          </span>
                          <span className="text-xs text-blue-600">
                            {addon.ingredients && addon.ingredients.length > 0 
                              ? `${addon.ingredients.length} ingredients`
                              : `Qty: ${addon.inventoryQuantity || 'N/A'}`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="px-4 pb-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditAddon(addon)}
                            className="flex-1 px-2 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleAddon(addon)}
                            className={`flex-1 px-2 py-1.5 text-xs rounded ${addon.status === 'active' ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                          >
                            {addon.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteAddon(addon.id!)}
                            className="flex-1 px-2 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Create Addon Modal */}
      {showCreateAddonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Add-on</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newAddon.name}
                    onChange={(e) => setNewAddon(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add-on name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAddon.price}
                    onChange={(e) => setNewAddon(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newAddon.description}
                  onChange={(e) => setNewAddon(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description"
                />
              </div>

              {/* Ingredients Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Add-on Ingredients</h4>
                    <p className="text-sm text-gray-600">Add ingredients from your inventory to calculate add-on cost</p>
                  </div>
                  <button
                    onClick={addAddonIngredient}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Ingredient
                  </button>
                </div>

                {newAddon.ingredients.length > 0 && (
                  <div className="space-y-3">
                    {newAddon.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory Item
                          </label>
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateAddonIngredient(index, 'inventoryItemId', e.target.value)}
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
                            onChange={(e) => updateAddonIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                          onClick={() => removeAddonIngredient(index)}
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
                        Total Ingredient Cost: <span className="text-green-600">₱{newAddon.cost.toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Profit: <span className="text-green-600">₱{(newAddon.price - newAddon.cost).toFixed(2)}</span>
                        {newAddon.price > 0 && ` (${(((newAddon.price - newAddon.cost) / newAddon.price) * 100).toFixed(1)}%)`}
                      </p>
                    </div>
                  </div>
                )}

                {newAddon.ingredients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No ingredients added yet</p>
                    <p className="text-sm">Add ingredients to automatically calculate add-on cost</p>
                  </div>
                )}
              </div>

              {/* Legacy single inventory item support for backward compatibility */}
              {newAddon.ingredients.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Single Inventory Item (Legacy)
                  </label>
                  <select 
                    value={newAddon.inventoryItemId}
                    onChange={(e) => {
                      const selectedItem = inventoryItems.find(item => item.id === e.target.value)
                      setNewAddon(prev => ({ 
                        ...prev, 
                        inventoryItemId: e.target.value,
                        inventoryItemName: selectedItem?.name || '',
                        cost: selectedItem?.costPerUnit || 0
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select inventory item (or use ingredients above)</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currentStock} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={resetAddonForm}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAddon}
                disabled={!newAddon.name || (!newAddon.inventoryItemId && newAddon.ingredients.length === 0) || !newAddon.price}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Create Add-on
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Addon Modal */}
      {editingAddon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Add-on</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingAddon.name}
                    onChange={(e) => setEditingAddon(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add-on name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAddon.price}
                    onChange={(e) => setEditingAddon(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingAddon.description}
                  onChange={(e) => setEditingAddon(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description"
                />
              </div>

              {/* Ingredients Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Add-on Ingredients</h4>
                    <p className="text-sm text-gray-600">Manage ingredients to calculate add-on cost</p>
                  </div>
                  <button
                    onClick={addAddonIngredientToEdit}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Ingredient
                  </button>
                </div>

                {editingAddon.ingredients && editingAddon.ingredients.length > 0 ? (
                  <div className="space-y-3">
                    {editingAddon.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory Item
                          </label>
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateAddonIngredientInEdit(index, 'inventoryItemId', e.target.value)}
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
                            onChange={(e) => updateAddonIngredientInEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                            Cost/U
                          </label>
                          <input
                            type="text"
                            value={`₱${ingredient.costPerUnit.toFixed(2)}`}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <button
                          onClick={() => removeAddonIngredientFromEdit(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded mt-5"
                          title="Remove ingredient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Total Ingredient Cost: <span className="text-green-600">₱{((editingAddon.ingredients || []).reduce((sum, ing) => sum + (ing.quantity * ing.costPerUnit), 0)).toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Profit: <span className="text-green-600">₱{(editingAddon.price - (editingAddon.ingredients || []).reduce((sum, ing) => sum + (ing.quantity * ing.costPerUnit), 0)).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No ingredients added yet</p>
                    <p className="text-xs text-gray-400">Click "Add Ingredient" to start building your add-on recipe</p>
                  </div>
                )}
              </div>

              {/* Legacy single inventory item support for backward compatibility */}
              {(!editingAddon.ingredients || editingAddon.ingredients.length === 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legacy Single Inventory Item
                  </label>
                  <select 
                    value={editingAddon.inventoryItemId || ''}
                    onChange={(e) => {
                      const selectedItem = inventoryItems.find(item => item.id === e.target.value)
                      setEditingAddon(prev => prev ? { 
                        ...prev, 
                        inventoryItemId: e.target.value,
                        inventoryItemName: selectedItem?.name || '',
                        cost: selectedItem?.costPerUnit || prev.cost
                      } : null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select inventory item (or use ingredients above)</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currentStock} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manual Cost Override
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAddon.cost || 0}
                  onChange={(e) => setEditingAddon(prev => prev ? { ...prev, cost: parseFloat(e.target.value) || 0 } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Override calculated cost from ingredients if needed</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditingAddon(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAddon}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Add-on
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
