'use client'

import React, { useState, useEffect } from 'react'
import { MenuItem, CreateMenuItem, InventoryItem, MenuCategory, Recipe } from '@/lib/types/menu'
import { useAuth } from '@/lib/context/AuthContext'
import { useBranch } from '@/lib/context/BranchContext'
import { getPOSItems, addPOSItem, updatePOSItem, deletePOSItem } from '@/lib/firebase/pos'
import { getInventoryItems } from '@/lib/firebase/inventory'
import { getBranchLocationId } from '@/lib/utils/branchUtils'
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
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  // Helper functions for image validation
  const isEmoji = (str: string): boolean => {
    // Simple emoji detection - checks for short strings or common emojis
    return str.length <= 2 || str.includes('🍽️') || str.includes('🍔') || str.includes('🍕') || str.includes('🥗') || str.includes('🍰')
  }
  
  const isValidUrl = (str: string): boolean => {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  }
  
  // Real data from Firebase only
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const [categories] = useState<string[]>(['Main Course', 'Appetizer', 'Salad', 'Dessert', 'Beverage'])
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItem[]>([])
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<any>({})
  const [isSavingMenu, setIsSavingMenu] = useState(false)
  const [isImportingMenu, setIsImportingMenu] = useState(false)

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000) // Auto dismiss after 3 seconds
  }

  // Save entire menu function
  const handleSaveMenu = async () => {
    setIsSavingMenu(true)
    try {
      if (!profile?.tenantId || !selectedBranch) {
        throw new Error('No tenant ID or branch available')
      }

      // Create menu backup/export data
      const menuExport = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch.id),
        totalItems: menuItems.length,
        categories: categories,
        menuItems: menuItems.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          cost: item.cost,
          category: item.category,
          status: item.status,
          isAvailable: item.isAvailable,
          image: item.image,
          allergens: item.allergens,
          nutritionalInfo: item.nutritionalInfo,
          preparationTime: item.preparationTime,
          ingredients: item.ingredients,
          profitMargin: item.profitMargin,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
      }

      // Create downloadable file
      const dataStr = JSON.stringify(menuExport, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `CoreTrack_Menu_${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      console.log('✅ Menu exported successfully:', menuExport)
      showNotification('success', `Menu saved successfully! ${menuItems.length} items exported.`)
      
    } catch (error) {
      console.error('❌ Error saving menu:', error)
      showNotification('error', 'Failed to save menu. Please try again.')
    } finally {
      setIsSavingMenu(false)
    }
  }

  // Import menu function
  const handleImportMenu = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImportingMenu(true)
      try {
        const text = await file.text()
        const importedData = JSON.parse(text)
        
        if (!importedData.menuItems || !Array.isArray(importedData.menuItems)) {
          throw new Error('Invalid menu file format')
        }

        if (!profile?.tenantId || !selectedBranch) {
          throw new Error('No tenant ID or branch available')
        }

        // Import each menu item
        let importedCount = 0
        for (const item of importedData.menuItems) {
          try {
            const posItemData = {
              name: `${item.name} (Imported)`,
              category: item.category || 'Imported',
              price: item.price || 0,
              cost: item.cost || 0,
              description: item.description || 'Imported menu item',
              image: item.image || '',
              isAvailable: item.isAvailable !== false,
              preparationTime: item.preparationTime || 15,
              tenantId: profile.tenantId,
              locationId: getBranchLocationId(selectedBranch.id)
            }

            const newItemId = await addPOSItem(posItemData)
            
            // Add to local state
            const menuItem: MenuItem = {
              ...item,
              id: newItemId,
              name: `${item.name} (Imported)`,
              createdAt: new Date(),
              updatedAt: new Date()
            }
            
            setMenuItems(prev => [...prev, menuItem])
            importedCount++
            
          } catch (error) {
            console.error('❌ Error importing item:', item.name, error)
          }
        }

        console.log('✅ Menu imported successfully:', importedCount, 'items')
        showNotification('success', `Menu imported successfully! ${importedCount} items added.`)
        
      } catch (error) {
        console.error('❌ Error importing menu:', error)
        showNotification('error', 'Failed to import menu. Please check the file format.')
      } finally {
        setIsImportingMenu(false)
      }
    }
    input.click()
  }

  // Load menu items from Firebase
  useEffect(() => {
    const loadMenuFromFirebase = async () => {
      console.log('🔍 Menu Builder: Checking user auth...')
      console.log('🔍 Profile state:', { 
        profile: !!profile, 
        tenantId: profile?.tenantId, 
        user: !!user,
        uid: user?.uid,
        selectedBranch: selectedBranch?.id
      })
      
      if (!profile?.tenantId || !selectedBranch) {
        console.log('❌ No tenant ID or branch available. Profile:', profile, 'Branch:', selectedBranch)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        
        console.log('📞 Fetching data for:', {
          tenantId: profile.tenantId,
          locationId,
          branchName: selectedBranch.name
        })
        
        // Load both POS items and inventory
        const [posItems, inventoryItems] = await Promise.all([
          getPOSItems(profile.tenantId),
          getInventoryItems(profile.tenantId, locationId)
        ])
        
        console.log('📋 POS items received:', posItems)
        console.log('📦 Inventory items received:', inventoryItems)
        
        // Set inventory items for ingredient selection
        if (inventoryItems && inventoryItems.length > 0) {
          const formattedInventory: InventoryItem[] = inventoryItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            sku: item.sku || '',
            category: item.category || 'Uncategorized',
            quantity: item.currentStock || 0,
            unit: item.unit || 'piece',
            cost: item.costPerUnit || 0,
            price: item.price || 0,
            minStock: item.minStock || 0,
            maxStock: item.maxStock || 100,
            supplier: item.supplier || '',
            location: locationId,
            status: (item.status === 'good' || item.status === 'low' || item.status === 'critical') ? 'active' : 'inactive',
            lastUpdated: item.lastUpdated?.toDate ? item.lastUpdated.toDate() : new Date(),
            expiryDate: item.expiryDate?.toDate ? item.expiryDate.toDate() : undefined
          }))
          setInventory(formattedInventory)
          console.log('✅ Inventory loaded:', formattedInventory.length, 'items')
        } else {
          console.log('📭 No inventory items found')
          setInventory([])
        }
        
        if (posItems && posItems.length > 0) {
          console.log('✅ Found items, converting to Menu Builder format...')
          console.log('📋 Sample item structure:', posItems[0])
          
          // Convert POS items to Menu Builder format
          const convertedItems: MenuItem[] = posItems.map((item: any) => {
            console.log('🔄 Converting item:', { 
              id: item.id, 
              name: item.name, 
              image: item.image,
              description: item.description 
            })
            
            return {
              id: item.id,
              name: item.name,
              description: item.description || 'No description available',
              price: item.price || 0,
              cost: item.cost || 0,
              category: item.category || 'Uncategorized',
              status: 'active' as const,
              isAvailable: item.isAvailable !== false,
              image: item.image || null,
              allergens: item.allergens || [],
              nutritionalInfo: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0
              },
              preparationTime: item.preparationTime || 15,
              ingredients: item.ingredients?.map((ing: any) => ({
                id: ing.id || `ingredient-${ing.name?.toLowerCase().replace(/\s+/g, '-')}`,
                quantity: ing.quantity || 1,
                unit: ing.unit || 'piece'
              })) || [],
              profitMargin: (item.price && item.cost) ? ((item.price - item.cost) / item.price * 100) : 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          
          console.log('🔄 Converted items:', convertedItems)
          setMenuItems(convertedItems)
          console.log('✅ Menu Builder loaded', convertedItems.length, 'items')
        } else {
          console.log('📭 No menu items found')
          setMenuItems([])
        }
      } catch (error) {
        console.error('❌ Error loading menu:', error)
        setMenuItems([])
        setInventory([])
      } finally {
        setLoading(false)
      }
    }

    loadMenuFromFirebase()
  }, [profile?.tenantId, selectedBranch?.id])

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
    setIsSubmitting(true)
    try {
      if (!profile?.tenantId || !selectedBranch) {
        throw new Error('No tenant ID or branch available')
      }

      const cost = calculateItemCost(newItem.ingredients)
      const profitMargin = calculateProfitMargin(newItem.price, cost)
      
      // Prepare Firebase POS item format
      const posItemData = {
        name: newItem.name,
        category: newItem.category,
        price: newItem.price,
        cost: cost,
        description: newItem.description,
        image: newItem.image || '',
        isAvailable: newItem.isAvailable,
        preparationTime: newItem.preparationTime,
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch.id),
        // Store ingredients directly in POS item for inventory deduction
        ingredients: newItem.ingredients.map(ing => ({
          inventoryItemId: ing.id,
          inventoryItemName: inventory.find(inv => inv.id === ing.id)?.name || 'Unknown',
          quantity: ing.quantity,
          unit: ing.unit
        }))
      }

      console.log('🔥 Creating menu item in Firebase:', posItemData)
      
      // Save to Firebase
      const newItemId = await addPOSItem(posItemData)
      console.log('✅ Menu item created with ID:', newItemId)

      // Create local menu item for UI update
      const menuItem: MenuItem = {
        ...newItem,
        id: newItemId,
        cost,
        profitMargin,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setMenuItems(prev => [...prev, menuItem])
      console.log('✅ Local state updated with new menu item')
      showNotification('success', `Menu item "${newItem.name}" created successfully!`)
      
    } catch (error) {
      console.error('❌ Error creating menu item:', error)
      showNotification('error', 'Failed to create menu item. Please try again.')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle menu item editing
  const handleEditMenuItem = async (updatedItem: MenuItem) => {
    setIsSubmitting(true)
    try {
      if (!profile?.tenantId || !selectedBranch) {
        throw new Error('No tenant ID or branch available')
      }

      const cost = calculateItemCost(updatedItem.ingredients)
      const profitMargin = calculateProfitMargin(updatedItem.price, cost)
      
      // Prepare Firebase POS item format for update
      const posItemData = {
        name: updatedItem.name,
        category: updatedItem.category,
        price: updatedItem.price,
        cost: cost,
        description: updatedItem.description,
        image: updatedItem.image || '',
        isAvailable: updatedItem.isAvailable,
        preparationTime: updatedItem.preparationTime,
        locationId: getBranchLocationId(selectedBranch.id),
        // Store ingredients directly in POS item for inventory deduction
        ingredients: updatedItem.ingredients.map(ing => ({
          inventoryItemId: ing.id,
          inventoryItemName: inventory.find(inv => inv.id === ing.id)?.name || 'Unknown',
          quantity: ing.quantity,
          unit: ing.unit
        }))
      }

      console.log('🔥 Updating menu item in Firebase:', updatedItem.id, posItemData)
      
      // Update in Firebase
      await updatePOSItem(profile.tenantId, updatedItem.id, posItemData)
      console.log('✅ Menu item updated in Firebase')

      // Update local state
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
      console.log('✅ Local state updated')
      showNotification('success', `Menu item "${updatedItem.name}" updated successfully!`)
      
    } catch (error) {
      console.error('❌ Error updating menu item:', error)
      showNotification('error', 'Failed to update menu item. Please try again.')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bulk operations
  const handleBulkOperation = async (operation: string, items: MenuItem[]) => {
    try {
      if (!profile?.tenantId || !selectedBranch) {
        throw new Error('No tenant ID or branch available')
      }

      console.log(`🔥 Starting bulk ${operation} for ${items.length} items`)

      switch (operation) {
        case 'activate':
          for (const item of items) {
            await updatePOSItem(profile.tenantId, item.id, {
              name: item.name,
              category: item.category,
              price: item.price,
              cost: item.cost,
              description: item.description,
              image: item.image || '',
              isAvailable: true, // Activate item
              preparationTime: item.preparationTime,
              locationId: getBranchLocationId(selectedBranch.id)
            })
          }
          setMenuItems(prev => prev.map(item => 
            items.find(selected => selected.id === item.id) 
              ? { ...item, isAvailable: true, updatedAt: new Date() }
              : item
          ))
          break

        case 'deactivate':
          for (const item of items) {
            await updatePOSItem(profile.tenantId, item.id, {
              name: item.name,
              category: item.category,
              price: item.price,
              cost: item.cost,
              description: item.description,
              image: item.image || '',
              isAvailable: false, // Deactivate item
              preparationTime: item.preparationTime,
              locationId: getBranchLocationId(selectedBranch.id)
            })
          }
          setMenuItems(prev => prev.map(item => 
            items.find(selected => selected.id === item.id) 
              ? { ...item, isAvailable: false, updatedAt: new Date() }
              : item
          ))
          break

        case 'delete':
          for (const item of items) {
            await deletePOSItem(profile.tenantId, item.id)
          }
          setMenuItems(prev => prev.filter(item => 
            !items.find(selected => selected.id === item.id)
          ))
          break
      }
      
      setSelectedMenuItems([])
      console.log(`✅ Bulk ${operation} completed for ${items.length} items`)
      showNotification('success', `Successfully ${operation}d ${items.length} menu item${items.length > 1 ? 's' : ''}!`)
      
    } catch (error) {
      console.error(`❌ Error performing bulk ${operation}:`, error)
      showNotification('error', `Failed to ${operation} items. Please try again.`)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
          notification.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
          'bg-blue-50 text-blue-800 border-blue-200'
        } transition-all duration-300`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {notification.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-current hover:opacity-70"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
            onClick={handleImportMenu}
            disabled={isImportingMenu}
            className={`px-4 py-2 border rounded-lg transition-colors font-medium flex items-center gap-2 ${
              isImportingMenu
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            {isImportingMenu ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Import Menu
              </>
            )}
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

      {/* Show loading or empty state */}
      {loading ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-surface-900 mb-2">Loading Menu Items...</h3>
            <p className="text-surface-600">
              Fetching your menu items from Firebase
            </p>
          </div>
        </div>
      ) : menuItems.length === 0 ? (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-surface-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  {/* Card Header */}
                  <div className="relative">
                    <div className="h-64 bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center border-b border-surface-200">
                      {item.image && item.image !== null && item.image !== '' && item.image.length > 2 && 
                       !item.image.includes('🍽️') && !isEmoji(item.image) && isValidUrl(item.image) ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('✅ Image loaded successfully:', item.name)}
                            onError={(e) => {
                              console.log('❌ Image failed to load for', item.name, ':', item.image)
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.querySelector('.fallback-image')
                              if (fallback) {
                                (fallback as HTMLElement).style.display = 'flex'
                              }
                            }}
                          />
                          <div className="fallback-image absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-surface-100 to-surface-200">
                            <div className="text-center">
                              <svg className="w-12 h-12 text-surface-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-surface-500 font-medium">Image Error</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            {item.image && (isEmoji(item.image) || item.image.length <= 2) ? (
                              <span className="text-3xl">{item.image}</span>
                            ) : (
                              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <p className="text-sm text-surface-600 font-medium">{item.name}</p>
                          <p className="text-xs text-surface-400">
                            {item.image && (isEmoji(item.image) || item.image.length <= 2) ? 'Emoji Icon' : 'No Image Available'}
                          </p>
                        </div>
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
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-200">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium border border-blue-200 flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (!profile?.tenantId || !selectedBranch) {
                              throw new Error('No tenant ID or branch available')
                            }

                            // Prepare duplicate item data for Firebase
                            const duplicateData = {
                              name: `${item.name} (Copy)`,
                              category: item.category,
                              price: item.price,
                              cost: item.cost,
                              description: item.description,
                              image: item.image || '',
                              isAvailable: item.isAvailable,
                              preparationTime: item.preparationTime,
                              tenantId: profile.tenantId,
                              locationId: getBranchLocationId(selectedBranch.id)
                            }

                            console.log('🔥 Creating duplicate menu item in Firebase:', duplicateData)
                            
                            // Save duplicate to Firebase
                            const newItemId = await addPOSItem(duplicateData)
                            console.log('✅ Duplicate menu item created with ID:', newItemId)

                            // Create local menu item for UI update
                            const duplicatedItem = {
                              ...item,
                              id: newItemId,
                              name: `${item.name} (Copy)`,
                              createdAt: new Date(),
                              updatedAt: new Date()
                            }
                            
                            setMenuItems(prev => [...prev, duplicatedItem])
                            console.log('✅ Duplicated menu item added to local state')
                            showNotification('success', `Menu item "${item.name}" duplicated successfully!`)
                            
                          } catch (error) {
                            console.error('❌ Error duplicating menu item:', error)
                            showNotification('error', 'Failed to duplicate menu item. Please try again.')
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium border border-green-200 flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Duplicate
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                            try {
                              if (!profile?.tenantId) {
                                throw new Error('No tenant ID available')
                              }

                              console.log('🔥 Deleting menu item from Firebase:', item.id)
                              
                              // Delete from Firebase
                              await deletePOSItem(profile.tenantId, item.id)
                              console.log('✅ Menu item deleted from Firebase')

                              // Update local state
                              setMenuItems(prev => prev.filter(menuItem => menuItem.id !== item.id))
                              console.log('✅ Local state updated - item removed')
                              showNotification('success', `Menu item "${item.name}" deleted successfully!`)
                              
                            } catch (error) {
                              console.error('❌ Error deleting menu item:', error)
                              showNotification('error', 'Failed to delete menu item. Please try again.')
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium border border-red-200 flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
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
