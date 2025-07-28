'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useUserPermissions } from '../../lib/context/UserPermissionsContext'
import { FeatureGate, UsageLimit } from '../subscription/FeatureGate'
import { PermissionGate, NoPermissionMessage } from '../permissions/PermissionGate'
import { useFeatureAccess } from '../../lib/hooks/useFeatureAccess'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { debugTrace, debugStep, debugError, debugSuccess, debugInspect } from '../../lib/utils/debugHelper'
import { 
  InventoryItem, 
  InventoryMovement,
  subscribeToInventoryItems, 
  addInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem, 
  updateStockQuantity,
  getInventoryMovements,
  getRecentInventoryMovements
} from '../../lib/firebase/inventory'
import { Timestamp } from 'firebase/firestore'
import { getAffectedMenuItems } from '../../lib/firebase/integration'
import { MenuItem } from '../../lib/firebase/menuBuilder'
import AdvancedSearch from '../AdvancedSearch'
import BulkOperations, { SelectableItem } from '../BulkOperations'
import { notifyLowStock, notifyInventoryUpdate } from '../../lib/firebase/notifications'

export default function InventoryCenter() {
  const { profile } = useAuth()
  const { hasPermission, isOwner, isManager } = useUserPermissions()
  const { canAddProduct, blockActionWithLimit } = useFeatureAccess()
  const { selectedBranch } = useBranch()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  const [bulkStockAdjustment, setBulkStockAdjustment] = useState({ type: 'add', quantity: 1 })
  const [showMovementHistory, setShowMovementHistory] = useState(false)
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null)
  const [movementHistory, setMovementHistory] = useState<InventoryMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [affectedMenuItems, setAffectedMenuItems] = useState<{ [key: string]: MenuItem[] }>({})
  const [loadingAffectedItems, setLoadingAffectedItems] = useState<Set<string>>(new Set())
  const [showLowStock, setShowLowStock] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [searchFilters, setSearchFilters] = useState<any>({})
  
  // Get unique categories from existing inventory items
  const getCategories = () => {
    const uniqueCategories = Array.from(new Set(inventoryItems.map(item => item.category).filter(Boolean)))
    return ['All', ...uniqueCategories.sort()]
  }

  // Firebase real-time subscription
  useEffect(() => {
    debugTrace('Inventory Data Loading Effect', {
      hasTenantId: !!profile?.tenantId,
      hasSelectedBranch: !!selectedBranch,
      branchId: selectedBranch?.id,
      tenantId: profile?.tenantId
    }, { component: 'InventoryCenter', sensitive: true })

    if (!profile?.tenantId || !selectedBranch) {
      debugStep('Inventory Loading Cancelled - Missing Requirements', {
        tenantId: !!profile?.tenantId,
        selectedBranch: !!selectedBranch
      }, { component: 'InventoryCenter', level: 'warn' })
      return
    }

    // Use branch-based location ID
    const locationId = getBranchLocationId(selectedBranch.id)
    debugStep('Location ID Generated for Inventory', { 
      branchId: selectedBranch.id, 
      locationId 
    }, { component: 'InventoryCenter' })

    debugStep('Setting Up Inventory Subscription', {
      tenantId: profile.tenantId,
      locationId
    }, { component: 'InventoryCenter' })

    const unsubscribe = subscribeToInventoryItems(
      profile.tenantId,
      locationId,
      (items: InventoryItem[]) => {
        debugStep('Inventory Items Updated', {
          itemCount: items?.length || 0,
          hasItems: (items?.length || 0) > 0
        }, { component: 'InventoryCenter', level: 'success' })
        
        debugInspect(items, 'Inventory Items', { component: 'InventoryCenter' })
        
        setInventoryItems(items || [])
        setLoading(false)
      }
    )

    // Set loading to false after a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 3000)

    return () => {
      if (unsubscribe) unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [profile?.tenantId, selectedBranch])

  // Listen for branch changes and reload inventory
  useEffect(() => {
    const handleBranchChange = () => {
      // Branch changes are now handled by the BranchContext
      // This effect is kept for backward compatibility with any legacy events
      setLoading(true)
    }

    window.addEventListener('branchChanged', handleBranchChange)
    return () => window.removeEventListener('branchChanged', handleBranchChange)
  }, [selectedBranch?.id])

  // Enhanced filtering with advanced search
  const filteredItems = inventoryItems.filter(item => {
    // Basic filters
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLowStock = !showLowStock || item.currentStock <= item.minStock
    
    // Advanced search filters
    let matchesAdvancedFilters = true
    
    if (Object.keys(searchFilters).length > 0) {
      // Category filter
      if (searchFilters.category && searchFilters.category !== 'all') {
        matchesAdvancedFilters = matchesAdvancedFilters && item.category === searchFilters.category
      }
      
      // Stock status filter
      if (searchFilters.stockStatus && searchFilters.stockStatus !== 'all') {
        const stockStatus = item.currentStock <= 0 ? 'out' : 
                           item.currentStock <= item.minStock ? 'low' : 'good'
        matchesAdvancedFilters = matchesAdvancedFilters && stockStatus === searchFilters.stockStatus
      }
      
      // Price range filter
      if (searchFilters.priceMin !== undefined && searchFilters.priceMin !== '' && item.costPerUnit) {
        matchesAdvancedFilters = matchesAdvancedFilters && item.costPerUnit >= parseFloat(searchFilters.priceMin)
      }
      if (searchFilters.priceMax !== undefined && searchFilters.priceMax !== '' && item.costPerUnit) {
        matchesAdvancedFilters = matchesAdvancedFilters && item.costPerUnit <= parseFloat(searchFilters.priceMax)
      }
      
      // Stock range filter
      if (searchFilters.stockMin !== undefined && searchFilters.stockMin !== '') {
        matchesAdvancedFilters = matchesAdvancedFilters && item.currentStock >= parseInt(searchFilters.stockMin)
      }
      if (searchFilters.stockMax !== undefined && searchFilters.stockMax !== '') {
        matchesAdvancedFilters = matchesAdvancedFilters && item.currentStock <= parseInt(searchFilters.stockMax)
      }
      
      // Date range filter (last updated)
      if (searchFilters.dateFrom) {
        const fromDate = new Date(searchFilters.dateFrom)
        matchesAdvancedFilters = matchesAdvancedFilters && item.updatedAt.toDate() >= fromDate
      }
      if (searchFilters.dateTo) {
        const toDate = new Date(searchFilters.dateTo)
        toDate.setHours(23, 59, 59, 999) // End of day
        matchesAdvancedFilters = matchesAdvancedFilters && item.updatedAt.toDate() <= toDate
      }
    }
    
    return matchesCategory && matchesSearch && matchesLowStock && matchesAdvancedFilters
  })

  // Check for low stock and notify
  useEffect(() => {
    if (!profile?.tenantId) return
    
    const lowStockItems = inventoryItems.filter(item => 
      item.currentStock <= item.minStock && item.currentStock > 0
    )
    
    lowStockItems.forEach(item => {
      notifyLowStock(
        profile.tenantId,
        item.name,
        item.currentStock,
        item.minStock,
        selectedBranch?.id
      ).catch(error => {
        console.error('Failed to send low stock notification:', error)
      })
    })
  }, [inventoryItems, profile?.tenantId, selectedBranch?.id])

  // Bulk operations for inventory
  const bulkOperations = [
    {
      id: 'adjust-stock',
      label: 'Adjust Stock',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v11a3 3 0 01-3 3H7a3 3 0 01-3-3V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zm0 4v8h6V7H9z" />
        </svg>
      ),
      action: async (items: InventoryItem[]) => {
        setShowBulkStockModal(true)
      },
      color: 'primary' as const
    },
    {
      id: 'update-reorder-points',
      label: 'Update Reorder Points',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      action: async (items: InventoryItem[]) => {
        const newReorderPoint = prompt('Enter new minimum stock level:')
        if (!newReorderPoint || isNaN(parseInt(newReorderPoint))) return
        
        const promises = items.map(item => 
          updateInventoryItem(profile!.tenantId, item.id, {
            minStock: parseInt(newReorderPoint)
          })
        )
        
        await Promise.all(promises)
        
        if (profile?.tenantId) {
          notifyInventoryUpdate(
            profile.tenantId,
            `${items.length} items`,
            'updated',
            profile.displayName || 'User'
          )
        }
      },
      color: 'secondary' as const
    },
    {
      id: 'export-selected',
      label: 'Export Selected',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: async (items: InventoryItem[]) => {
        const csvContent = [
          ['Name', 'Category', 'Current Stock', 'Min Stock', 'Cost Per Unit', 'Last Updated'].join(','),
          ...items.map(item => [
            item.name,
            item.category,
            item.currentStock,
            item.minStock,
            item.costPerUnit || 0,
            item.updatedAt.toDate().toLocaleDateString()
          ].join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      },
      color: 'success' as const
    },
    {
      id: 'delete-selected',
      label: 'Delete Selected',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      action: async (items: InventoryItem[]) => {
        const promises = items.map(item => deleteInventoryItem(profile!.tenantId, item.id))
        await Promise.all(promises)
        
        if (profile?.tenantId) {
          notifyInventoryUpdate(
            profile.tenantId,
            `${items.length} items`,
            'deleted',
            profile.displayName || 'User'
          )
        }
      },
      confirmMessage: 'Are you sure you want to delete {count} selected items? This action cannot be undone.',
      color: 'danger' as const,
      disabled: (items: InventoryItem[]) => !hasPermission('inventory')
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'good': return 'bg-green-100 text-green-800 border-green-200'
      case 'out': return 'bg-red-200 text-red-900 border-red-300'
      default: return 'bg-surface-100 text-surface-800 border-surface-200'
    }
  }

  const formatLastUpdated = (timestamp: Timestamp) => {
    const now = new Date()
    const updated = timestamp.toDate()
    const diffMs = now.getTime() - updated.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!profile?.tenantId) return

    // DEVELOPMENT MODE: Skip limit checks during testing
    const isDevMode = process.env.NODE_ENV === 'development';
    
    if (!isDevMode) {
      // Check if user can add more products (only in production)
      const currentProductCount = inventoryItems.length
      if (!canAddProduct(currentProductCount)) {
        alert('You have reached your product limit. Please upgrade your subscription to add more products.')
        return
      }
    }

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const costPerUnitValue = formData.get('costPerUnit') as string
      await addInventoryItem({
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        currentStock: Number(formData.get('currentStock')),
        minStock: Number(formData.get('minStock')),
        unit: formData.get('unit') as string,
        costPerUnit: costPerUnitValue ? Number(costPerUnitValue) : undefined,
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch?.id || 'main')
      }, profile.uid, profile.displayName)
      
      setShowAddModal(false)
      form.reset()
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item. Please try again.')
    }
  }

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!profile?.tenantId || !editingItem) return

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const costPerUnitValue = formData.get('costPerUnit') as string
      await updateInventoryItem(profile.tenantId, editingItem.id, {
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        currentStock: Number(formData.get('currentStock')),
        minStock: Number(formData.get('minStock')),
        unit: formData.get('unit') as string,
        costPerUnit: costPerUnitValue ? Number(costPerUnitValue) : undefined,
      }, profile.uid, profile.displayName)
      
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Error updating item. Please try again.')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!profile?.tenantId) return
    
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteInventoryItem(profile.tenantId, itemId)
      } catch (error) {
        console.error('Error deleting item:', error)
        alert('Error deleting item. Please try again.')
      }
    }
  }

  const handleQuickStockUpdate = async (itemId: string, operation: 'add' | 'subtract', amount: number) => {
    if (!profile?.tenantId) return

    try {
      await updateStockQuantity(
        profile.tenantId, 
        itemId, 
        amount, 
        operation,
        `Quick ${operation === 'add' ? 'stock increase' : 'stock decrease'}`,
        profile.uid,
        profile.displayName
      )
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Error updating stock. Please try again.')
    }
  }

  const criticalItems = inventoryItems.filter(item => item.status === 'critical' || item.status === 'out').length
  const lowStockItems = inventoryItems.filter(item => item.status === 'low').length
  
  // Calculate total inventory value
  const totalInventoryValue = inventoryItems.reduce((total, item) => {
    if (item.costPerUnit) {
      return total + (item.currentStock * item.costPerUnit)
    }
    return total
  }, 0)

  // Analytics Helper Functions
  const getTopUsedItems = () => {
    // Sort by lowest stock percentage (most used)
    return inventoryItems
      .filter(item => item.minStock > 0)
      .map(item => ({
        ...item,
        stockPercentage: (item.currentStock / item.minStock) * 100,
        usageRate: item.minStock > 0 ? Math.max(0, item.minStock - item.currentStock) : 0
      }))
      .sort((a, b) => a.stockPercentage - b.stockPercentage)
      .slice(0, 5)
  }

  const getMostValuableItems = () => {
    return inventoryItems
      .filter(item => item.costPerUnit && item.currentStock > 0)
      .map(item => ({
        ...item,
        totalValue: item.costPerUnit! * item.currentStock
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  }

  const getStockHealthScore = () => {
    if (inventoryItems.length === 0) return 100
    
    const goodItems = inventoryItems.filter(item => item.status === 'good').length
    const totalItems = inventoryItems.length
    return Math.round((goodItems / totalItems) * 100)
  }

  const getLowStockPredictions = () => {
    return inventoryItems
      .filter(item => {
        if (!item.minStock || item.currentStock <= 0) return false
        
        // Simple prediction: if current stock is less than 2x min stock, it might run out soon
        const stockRatio = item.currentStock / item.minStock
        return stockRatio <= 2 && stockRatio > 1
      })
      .slice(0, 5)
  }

  // Bulk Operations Functions
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
    setSelectedItems(new Set(filteredItems.map(item => item.id)))
  }

  const handleDeselectAll = () => {
    setSelectedItems(new Set())
  }

  const handleBulkStockUpdate = async () => {
    if (!profile?.tenantId || selectedItems.size === 0) return
    
    try {
      const updatePromises = Array.from(selectedItems).map(itemId =>
        updateStockQuantity(
          profile.tenantId,
          itemId,
          bulkStockAdjustment.quantity,
          bulkStockAdjustment.type as 'add' | 'subtract',
          `Bulk ${bulkStockAdjustment.type === 'add' ? 'stock increase' : 'stock decrease'}`,
          profile.uid,
          profile.displayName
        )
      )
      
      await Promise.all(updatePromises)
      
      // Clear selection and close modal
      setSelectedItems(new Set())
      setBulkMode(false)
      setShowBulkStockModal(false)
      setBulkStockAdjustment({ type: 'add', quantity: 1 })
    } catch (error) {
      console.error('Error updating bulk stock:', error)
      alert('Error updating stock. Please try again.')
    }
  }

  const handleBulkDelete = async () => {
    if (!profile?.tenantId || selectedItems.size === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} item(s)?`
    if (!confirm(confirmMessage)) return
    
    try {
      const deletePromises = Array.from(selectedItems).map(itemId =>
        deleteInventoryItem(profile.tenantId, itemId)
      )
      
      await Promise.all(deletePromises)
      
      // Clear selection
      setSelectedItems(new Set())
      setBulkMode(false)
    } catch (error) {
      console.error('Error deleting items:', error)
      alert('Error deleting items. Please try again.')
    }
  }

  // Load affected menu items for an inventory item
  const loadAffectedMenuItems = async (inventoryItemId: string) => {
    if (!profile?.tenantId || affectedMenuItems[inventoryItemId] || loadingAffectedItems.has(inventoryItemId)) return
    
    try {
      setLoadingAffectedItems(prev => new Set(prev).add(inventoryItemId))
      const menuItems = await getAffectedMenuItems(profile.tenantId, inventoryItemId)
      setAffectedMenuItems(prev => ({
        ...prev,
        [inventoryItemId]: menuItems
      }))
    } catch (error) {
      console.error('Error loading affected menu items:', error)
    } finally {
      setLoadingAffectedItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(inventoryItemId)
        return newSet
      })
    }
  }

  // Toggle expanded state and load affected items
  const toggleExpandedItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
        // Load affected menu items when expanding
        loadAffectedMenuItems(itemId)
      }
      return newSet
    })
  }

  // Toggle item expansion
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Movement History Functions
  const handleShowMovementHistory = async (item: InventoryItem) => {
    if (!profile?.tenantId) return
    
    setSelectedItemForHistory(item)
    setShowMovementHistory(true)
    setLoadingMovements(true)
    
    try {
      const movements = await getInventoryMovements(profile.tenantId, item.id)
      setMovementHistory(movements)
    } catch (error) {
      console.error('Error fetching movement history:', error)
      alert('Error loading movement history. Please try again.')
    } finally {
      setLoadingMovements(false)
    }
  }

  const formatMovementDate = (timestamp: any) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'receiving':
        return '📦'
      case 'usage':
        return '💰'
      case 'adjustment':
        return '⚖️'
      case 'add':
        return '➕'
      case 'subtract':
        return '➖'
      case 'waste':
        return '🗑️'
      case 'transfer':
        return '🔄'
      default:
        return '📝'
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'receiving':
        return 'text-green-600 bg-green-100'
      case 'usage':
        return 'text-blue-600 bg-blue-100'
      case 'adjustment':
        return 'text-yellow-600 bg-yellow-100'
      case 'add':
        return 'text-green-600 bg-green-100'
      case 'subtract':
        return 'text-red-600 bg-red-100'
      case 'waste':
        return 'text-red-600 bg-red-100'
      case 'transfer':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <FeatureGate feature="inventory">
      <div className="space-y-6">
        {/* Page Header with Branch Indicator */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Inventory Center</h1>
            <div className="flex items-center mt-1 text-sm text-surface-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-medium">{selectedBranch?.name || 'Main Branch'}</span>
              <span className="mx-2">•</span>
              <span>Viewing branch inventory</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Total Items</p>
              <p className="text-3xl font-bold text-surface-900">{inventoryItems.length}</p>
              <p className="text-xs text-surface-500 mt-1">Active inventory</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Stock Health</p>
              <p className="text-3xl font-bold text-green-600">{getStockHealthScore()}%</p>
              <p className="text-xs text-surface-500 mt-1">Items in good stock</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Critical Stock</p>
              <p className="text-3xl font-bold text-red-600">{criticalItems}</p>
              <p className="text-xs text-surface-500 mt-1">Needs immediate attention</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Low Stock</p>
              <p className="text-3xl font-bold text-yellow-600">{lowStockItems}</p>
              <p className="text-xs text-surface-500 mt-1">Monitor closely</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Total Value</p>
              <p className="text-3xl font-bold text-green-600">₱{totalInventoryValue.toFixed(0)}</p>
              <p className="text-xs text-surface-500 mt-1">Inventory worth</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-surface-900">Categories</h3>
          {getCategories().length > 1 && (
            <span className="text-sm text-surface-500">
              {getCategories().length - 1} categories
            </span>
          )}
        </div>
        
        {getCategories().length === 1 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Create your own categories!</strong> When adding inventory items, you can type any category name you want. Categories will appear here automatically as you create them.
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          {getCategories().map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Filters and View Options */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Low Stock Filter */}
          <div className="flex items-center">
            <label className="flex items-center text-sm font-medium text-surface-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="mr-3 h-4 w-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              Show only low stock items
            </label>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-surface-100 p-1 rounded-xl border border-surface-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-primary-700 shadow-sm border border-surface-200'
                  : 'text-surface-600 hover:text-surface-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-700 shadow-sm border border-surface-200'
                  : 'text-surface-600 hover:text-surface-700'
              }`}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
        {/* Advanced Search and Filters */}
        <AdvancedSearch
          onSearch={(term, filters) => {
            setSearchTerm(term)
            setSearchFilters(filters)
          }}
          placeholder="Search inventory by name, category, or SKU..."
          filters={[
            {
              key: 'category',
              label: 'Category',
              type: 'select',
              options: getCategories().map(cat => ({ value: cat.toLowerCase(), label: cat }))
            },
            {
              key: 'stockStatus',
              label: 'Stock Status',
              type: 'select',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'good', label: 'Good Stock' },
                { value: 'low', label: 'Low Stock' },
                { value: 'out', label: 'Out of Stock' }
              ]
            },
            {
              key: 'priceRange',
              label: 'Cost Per Unit Range',
              type: 'range',
              min: 0,
              max: 1000
            },
            {
              key: 'stockRange',
              label: 'Stock Quantity Range',
              type: 'range',
              min: 0,
              max: 1000
            },
            {
              key: 'lowStockOnly',
              label: 'Show Low Stock Only',
              type: 'boolean'
            }
          ]}
        />

        {/* Bulk Operations */}
        <BulkOperations
          items={filteredItems}
          selectedItems={selectedInventoryItems}
          onSelectionChange={setSelectedInventoryItems}
          operations={bulkOperations}
          idField="id"
        />

        {/* Inventory Table */}
        <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700 w-16">
                  {/* Expand column */}
                </th>
                {bulkMode && (
                  <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                )}
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Item Name</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Category</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Current Stock</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Min Stock</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Unit Cost</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Total Cost</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-surface-700">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-surface-500">
                    {inventoryItems.length === 0 ? 'No inventory items found. Add your first item!' : 'No items match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredItems.flatMap((item) => {
                  const isSelected = selectedInventoryItems.some(selected => selected.id === item.id)
                  return [
                  // Main row
                  <tr 
                    key={item.id} 
                    className={`hover:bg-surface-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedInventoryItems(selectedInventoryItems.filter(selected => selected.id !== item.id))
                      } else {
                        setSelectedInventoryItems([...selectedInventoryItems, item])
                      }
                    }}
                  >
                    {/* Selection indicator */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleItemExpansion(item.id)
                          }}
                          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 transition-colors"
                        >
                          <svg 
                            className={`w-4 h-4 text-surface-600 transition-transform ${
                              expandedItems.has(item.id) ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="font-medium text-surface-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 text-surface-700">{item.category}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-surface-900">{item.currentStock} {item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-surface-700">{item.minStock} {item.unit}</td>
                    <td className="px-6 py-4 text-surface-700">
                      {item.costPerUnit ? `₱${item.costPerUnit.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-surface-700">
                      <span className="font-medium">
                        {item.costPerUnit ? `₱${(item.currentStock * item.costPerUnit).toFixed(2)}` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-surface-700 text-sm">
                      {formatLastUpdated(item.lastUpdated)}
                    </td>
                  </tr>,
                  
                  // Expanded details row (conditionally rendered)
                  ...(expandedItems.has(item.id) ? [
                    <tr key={`${item.id}-expanded`} className="bg-surface-25">
                      <td colSpan={9} className="px-6 py-0">
                        <div className="py-4">
                          <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-100">
                              <div>
                                <h3 className="text-lg font-semibold text-surface-900">{item.name}</h3>
                                <p className="text-sm text-surface-600 mt-1">Detailed inventory information</p>
                              </div>
                              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(item.status)}`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            </div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Stock Information */}
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                  <h4 className="text-base font-semibold text-surface-900">Stock Information</h4>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Current Stock</span>
                                    <span className="text-sm font-bold text-surface-900">{item.currentStock} {item.unit}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Minimum Stock</span>
                                    <span className="text-sm font-semibold text-surface-900">{item.minStock} {item.unit}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Maximum Stock</span>
                                    <span className="text-sm font-semibold text-surface-900">
                                      {item.maxStock ? `${item.maxStock} ${item.unit}` : 'Not set'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Stock Ratio</span>
                                    <span className={`text-sm font-semibold ${
                                      item.minStock > 0 
                                        ? (item.currentStock / item.minStock) >= 1 
                                          ? 'text-green-600' 
                                          : 'text-red-600'
                                        : 'text-surface-900'
                                    }`}>
                                      {item.minStock > 0 ? `${Math.round((item.currentStock / item.minStock) * 100)}%` : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Financial & Details */}
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                  </div>
                                  <h4 className="text-base font-semibold text-surface-900">Financial Details</h4>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Unit Cost</span>
                                    <span className="text-sm font-bold text-green-600">
                                      {item.costPerUnit ? `₱${item.costPerUnit.toFixed(2)}` : 'Not set'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Total Value</span>
                                    <span className="text-sm font-bold text-green-600">
                                      {item.costPerUnit ? `₱${(item.currentStock * item.costPerUnit).toFixed(2)}` : 'N/A'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Category</span>
                                    <span className="text-sm font-semibold text-surface-900">{item.category}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Supplier</span>
                                    <span className="text-sm font-semibold text-surface-900">{item.supplier || 'Not specified'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Timeline & Actions */}
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <h4 className="text-base font-semibold text-surface-900">Timeline</h4>
                                </div>
                                
                                <div className="space-y-3 mb-6">
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Created</span>
                                    <span className="text-sm font-semibold text-surface-900">
                                      {item.createdAt.toDate().toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                                    <span className="text-sm font-medium text-surface-700">Last Updated</span>
                                    <span className="text-sm font-semibold text-surface-900">
                                      {formatLastUpdated(item.lastUpdated)}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                  <h5 className="text-sm font-semibold text-surface-900 mb-2">Quick Actions</h5>
                                  
                                  <button
                                    onClick={() => handleShowMovementHistory(item)}
                                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                  >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Movement History
                                  </button>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <PermissionGate 
                                      permission="inventory"
                                      fallback={
                                        <div className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          Edit Item
                                        </div>
                                      }
                                    >
                                      <button
                                        onClick={() => setEditingItem(item)}
                                        className="flex items-center justify-center px-3 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors font-medium text-sm"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Item
                                      </button>
                                    </PermissionGate>
                                    
                                    <PermissionGate 
                                      permission="inventory"
                                      fallback={
                                        <div className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Delete
                                        </div>
                                      }
                                    >
                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                                      >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                      </button>
                                    </PermissionGate>
                                  </div>
                                </div>

                                {/* Stock Status Alert */}
                                <div className="mt-4">
                                  {item.status === 'low' || item.status === 'critical' || item.status === 'out' ? (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                      <div className="flex items-center">
                                        <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <div>
                                          <p className="text-sm font-medium text-red-800">
                                            {item.status === 'out' ? 'Out of Stock!' : 
                                             item.status === 'critical' ? 'Critical Stock Level!' : 'Low Stock Warning!'}
                                          </p>
                                          <p className="text-xs text-red-600 mt-1">
                                            {item.status === 'out' ? 'This item is completely out of stock.' :
                                             'Consider restocking this item soon.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-center">
                                        <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                          <p className="text-sm font-medium text-green-800">Stock Level Good</p>
                                          <p className="text-xs text-green-600 mt-1">This item has adequate stock levels.</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ] : [])
                ]
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Add New Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Item Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input-field"
                  placeholder="Enter item name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Category
                  <span className="text-xs text-surface-500 ml-1">(e.g., Proteins, Vegetables, Dairy, Beverages)</span>
                </label>
                <input
                  type="text"
                  name="category"
                  required
                  className="input-field"
                  placeholder="Type category name..."
                  list="categories-datalist"
                />
                <datalist id="categories-datalist">
                  {getCategories().slice(1).map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    name="currentStock"
                    required
                    min="0"
                    className="input-field"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    name="minStock"
                    required
                    min="0"
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Unit</label>
                <input
                  type="text"
                  name="unit"
                  required
                  className="input-field"
                  placeholder="e.g., lbs, pcs, boxes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Cost per Unit
                  <span className="text-xs text-surface-500 ml-1">(optional)</span>
                </label>
                <input
                  type="number"
                  name="costPerUnit"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Edit Item</h3>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Item Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input-field"
                  defaultValue={editingItem.name}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Category
                  <span className="text-xs text-surface-500 ml-1">(e.g., Proteins, Vegetables, Dairy, Beverages)</span>
                </label>
                <input
                  type="text"
                  name="category"
                  required
                  className="input-field"
                  defaultValue={editingItem.category}
                  placeholder="Type category name..."
                  list="categories-datalist-edit"
                />
                <datalist id="categories-datalist-edit">
                  {getCategories().slice(1).map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    name="currentStock"
                    required
                    min="0"
                    className="input-field"
                    defaultValue={editingItem.currentStock}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    name="minStock"
                    required
                    min="0"
                    className="input-field"
                    defaultValue={editingItem.minStock}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Unit</label>
                <input
                  type="text"
                  name="unit"
                  required
                  className="input-field"
                  defaultValue={editingItem.unit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Cost per Unit
                  <span className="text-xs text-surface-500 ml-1">(optional)</span>
                </label>
                <input
                  type="number"
                  name="costPerUnit"
                  min="0"
                  step="0.01"
                  className="input-field"
                  defaultValue={editingItem.costPerUnit || ''}
                  placeholder="0.00"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Stock Adjustment Modal */}
      {showBulkStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">
              Bulk Stock Adjustment
            </h3>
            <p className="text-sm text-surface-600 mb-6">
              This will {bulkStockAdjustment.type === 'add' ? 'add' : 'subtract'} {bulkStockAdjustment.quantity} units {bulkStockAdjustment.type === 'add' ? 'to' : 'from'} {selectedItems.size} selected item(s).
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Action
                </label>
                <select
                  value={bulkStockAdjustment.type}
                  onChange={(e) => setBulkStockAdjustment(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-surface-900 bg-white"
                >
                  <option value="add">Add Stock</option>
                  <option value="subtract">Subtract Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={bulkStockAdjustment.quantity}
                  onChange={(e) => setBulkStockAdjustment(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-surface-900 placeholder-surface-500"
                  placeholder="Enter quantity"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => setShowBulkStockModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkStockUpdate}
                className="btn-primary flex-1"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Used Items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-surface-900">Most Used Items</h3>
            <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="space-y-3">
            {getTopUsedItems().length > 0 ? (
              getTopUsedItems().map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900">{item.name}</p>
                      <p className="text-xs text-surface-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-surface-900">{item.currentStock} {item.unit}</p>
                    <p className="text-xs text-orange-600">
                      {item.stockPercentage.toFixed(0)}% of min stock
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-500 text-center py-4">No usage data available</p>
            )}
          </div>
        </div>

        {/* Most Valuable Items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-surface-900">Most Valuable Items</h3>
            <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="space-y-3">
            {getMostValuableItems().length > 0 ? (
              getMostValuableItems().map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900">{item.name}</p>
                      <p className="text-xs text-surface-500">{item.currentStock} {item.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">₱{item.totalValue.toFixed(0)}</p>
                    <p className="text-xs text-surface-500">
                      @ ₱{item.costPerUnit?.toFixed(2)}/{item.unit}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-500 text-center py-4">No cost data available</p>
            )}
          </div>
        </div>

        {/* Stock Predictions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-surface-900">Stock Predictions</h3>
            <svg className="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="space-y-3">
            {getLowStockPredictions().length > 0 ? (
              getLowStockPredictions().map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900">{item.name}</p>
                      <p className="text-xs text-surface-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-surface-900">{item.currentStock} {item.unit}</p>
                    <p className="text-xs text-orange-600">May run out soon</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-600 font-medium">All items well stocked!</p>
                <p className="text-xs text-surface-500">No items predicted to run out soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movement History Modal */}
      {showMovementHistory && selectedItemForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-surface-900">
                    Movement History
                  </h3>
                  <p className="text-sm text-surface-600 mt-1">
                    {selectedItemForHistory.name} - All stock movements
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMovementHistory(false)
                    setSelectedItemForHistory(null)
                    setMovementHistory([])
                  }}
                  className="text-surface-400 hover:text-surface-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMovements ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : movementHistory.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-surface-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-lg font-medium text-surface-900 mb-2">No movement history</h4>
                  <p className="text-surface-600">
                    This item doesn&apos;t have any recorded movements yet. Stock changes will appear here once they occur.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Timeline */}
                  <div className="relative">
                    {movementHistory.map((movement, index) => (
                      <div key={movement.id} className="relative flex items-start space-x-4 pb-6">
                        {/* Timeline line */}
                        {index !== movementHistory.length - 1 && (
                          <div className="absolute left-5 top-10 bottom-0 w-px bg-surface-200"></div>
                        )}
                        
                        {/* Movement icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-sm font-medium ${getMovementTypeColor(movement.movementType)}`}>
                          {getMovementTypeIcon(movement.movementType)}
                        </div>
                        
                        {/* Movement details */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-surface-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${getMovementTypeColor(movement.movementType)}`}>
                                  {movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1)}
                                </span>
                                <span className="text-sm text-surface-600">
                                  {formatMovementDate(movement.timestamp)}
                                </span>
                              </div>
                              <div className={`text-sm font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {movement.quantity > 0 ? '+' : ''}{movement.quantity} {selectedItemForHistory.unit}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-surface-500">Previous Stock:</span>
                                <span className="ml-2 font-medium text-surface-900">
                                  {movement.previousStock} {selectedItemForHistory.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-surface-500">New Stock:</span>
                                <span className="ml-2 font-medium text-surface-900">
                                  {movement.newStock} {selectedItemForHistory.unit}
                                </span>
                              </div>
                            </div>
                            
                            {movement.reason && (
                              <div className="mt-2 text-sm">
                                <span className="text-surface-500">Reason:</span>
                                <span className="ml-2 text-surface-700">{movement.reason}</span>
                              </div>
                            )}
                            
                            {movement.userId && (
                              <div className="mt-2 text-sm">
                                <span className="text-surface-500">By:</span>
                                <span className="ml-2 text-surface-700">{movement.userName || movement.userId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-surface-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-surface-600">
                  Showing {movementHistory.length} movement{movementHistory.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => {
                    setShowMovementHistory(false)
                    setSelectedItemForHistory(null)
                    setMovementHistory([])
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FeatureGate>
  )
}
