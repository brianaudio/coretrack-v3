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
  getRecentInventoryMovements
} from '../../lib/firebase/inventory'
import { Timestamp } from 'firebase/firestore'
import { getAffectedMenuItems } from '../../lib/firebase/integration'
import { MenuItem } from '../../lib/firebase/menuBuilder'
import AdvancedSearch from '../AdvancedSearch'
import BulkOperations, { SelectableItem } from '../BulkOperations'
import { notifyLowStock, notifyInventoryUpdate, createNotification } from '../../lib/firebase/notifications'
import { useToast } from '../ui/Toast'

export default function InventoryCenter() {
  const { profile } = useAuth()
  const { hasPermission, isOwner, isManager } = useUserPermissions()
  const { canAddProduct, blockActionWithLimit } = useFeatureAccess()
  const { selectedBranch } = useBranch()
  const { addToast } = useToast()
  
  // Core State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inventory' | 'analytics' | 'movements'>('inventory')
  
  // Search & Filter State
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFilters, setSearchFilters] = useState<any>({})
  const [showLowStock, setShowLowStock] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  
  // Add Item Form State
  const [totalPrice, setTotalPrice] = useState('')
  const [currentStock, setCurrentStock] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  
  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  const [bulkStockAdjustment, setBulkStockAdjustment] = useState({ type: 'add', quantity: 1 })
  const [bulkOperation, setBulkOperation] = useState<'stock' | 'category' | 'minstock' | null>(null)
  
  // UI State
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [affectedMenuItems, setAffectedMenuItems] = useState<{ [key: string]: MenuItem[] }>({})
  const [loadingAffectedItems, setLoadingAffectedItems] = useState<Set<string>>(new Set())
  
  // Recent Movements State
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [movementsFilter, setMovementsFilter] = useState<'all' | 'today' | 'week'>('all')

  // Load recent movements when movements tab is active
  useEffect(() => {
    if (activeTab === 'movements' && profile?.tenantId && selectedBranch) {
      loadRecentMovements()
    }
  }, [activeTab, profile?.tenantId, selectedBranch, movementsFilter])

  const loadRecentMovements = async () => {
    if (!profile?.tenantId || !selectedBranch) return
    
    setLoadingMovements(true)
    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      let limit = 50
      
      // Adjust limit based on filter
      if (movementsFilter === 'today') limit = 25
      if (movementsFilter === 'week') limit = 100
      
      const movements = await getRecentInventoryMovements(
        profile.tenantId, 
        limit
      )
      
      // Filter movements based on time period
      const filteredMovements = filterMovementsByTime(movements, movementsFilter)
      setRecentMovements(filteredMovements)
      
      // Show success toast with movement count
      addToast(`Loaded ${filteredMovements.length} inventory movements`, 'success')
    } catch (error) {
      console.error('Error loading recent movements:', error)
      addToast('Failed to load inventory movements. Please try again.', 'error')
    } finally {
      setLoadingMovements(false)
    }
  }

  const filterMovementsByTime = (movements: InventoryMovement[], filter: string) => {
    if (filter === 'all') return movements
    
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - (7 * 24 * 60 * 60 * 1000))
    
    return movements.filter(movement => {
      const movementDate = movement.timestamp.toDate()
      
      if (filter === 'today') {
        return movementDate >= todayStart
      }
      if (filter === 'week') {
        return movementDate >= weekStart
      }
      return true
    })
  }

  // Get unique categories from existing inventory items
  const getCategories = () => {
    const uniqueCategories = Array.from(new Set(inventoryItems.map(item => item.category).filter(Boolean)))
    return ['All', ...uniqueCategories.sort()]
  }

  // Firebase real-time subscription with security validation
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) {
      setLoading(false)
      return
    }

    const locationId = getBranchLocationId(selectedBranch.id)
    
    // Pass userId for security validation
    const unsubscribe = subscribeToInventoryItems(
      profile.tenantId,
      locationId,
      (items: InventoryItem[]) => {
        setInventoryItems(items || [])
        setLoading(false)
        
        // Check for critical items and show notification if any exist
        const criticalItems = (items || []).filter(item => item.status === 'critical' || item.status === 'out')
        const lowStockItems = (items || []).filter(item => item.status === 'low')
        
        if (criticalItems.length > 0 && items && items.length > 0) {
          // Only show if this is not the initial load (prevent spam on page load)
          const isInitialLoad = inventoryItems.length === 0
          if (!isInitialLoad) {
            addToast(`Alert: ${criticalItems.length} items are critically low or out of stock!`, 'error', 6000)
          }
        } else if (lowStockItems.length > 0 && items && items.length > 0) {
          const isInitialLoad = inventoryItems.length === 0
          if (!isInitialLoad) {
            addToast(`Warning: ${lowStockItems.length} items are running low on stock`, 'warning', 5000)
          }
        }
      },
      profile.uid // Pass user ID for access validation
    )

    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 3000)

    return () => {
      if (unsubscribe) unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [profile?.tenantId, profile?.uid, selectedBranch])

  // Enhanced filtering
  const filteredItems = inventoryItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLowStock = !showLowStock || item.currentStock <= item.minStock
    
    // Advanced search filters
    let matchesAdvancedFilters = true
    
    if (Object.keys(searchFilters).length > 0) {
      if (searchFilters.category && searchFilters.category !== 'all') {
        matchesAdvancedFilters = matchesAdvancedFilters && item.category === searchFilters.category
      }
      
      if (searchFilters.stockStatus && searchFilters.stockStatus !== 'all') {
        const stockStatus = item.currentStock <= 0 ? 'out' : 
                           item.currentStock <= item.minStock ? 'low' : 'good'
        matchesAdvancedFilters = matchesAdvancedFilters && stockStatus === searchFilters.stockStatus
      }
    }
    
    return matchesCategory && matchesSearch && matchesLowStock && matchesAdvancedFilters
  })

  // Calculate metrics
  const criticalItems = inventoryItems.filter(item => item.status === 'critical' || item.status === 'out').length
  const lowStockItems = inventoryItems.filter(item => item.status === 'low').length
  const totalInventoryValue = inventoryItems.reduce((total, item) => {
    if (item.costPerUnit) {
      return total + (item.currentStock * item.costPerUnit)
    }
    return total
  }, 0)

  // Analytics Helper Functions
  const getStockHealthScore = () => {
    if (inventoryItems.length === 0) return 100
    const goodItems = inventoryItems.filter(item => item.status === 'good').length
    const totalItems = inventoryItems.length
    return Math.round((goodItems / totalItems) * 100)
  }

  const getTopUsedItems = () => {
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

  const getLowStockPredictions = () => {
    return inventoryItems
      .filter(item => {
        if (!item.minStock || item.currentStock <= 0) return false
        const stockRatio = item.currentStock / item.minStock
        return stockRatio <= 2 && stockRatio > 1
      })
      .slice(0, 5)
  }

  // Helper Functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'good': return 'bg-green-100 text-green-800 border-green-200'
      case 'out': return 'bg-red-200 text-red-900 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  // Event Handlers
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
      const itemName = formData.get('name') as string
      
      await addInventoryItem({
        name: itemName,
        category: formData.get('category') as string,
        currentStock: Number(formData.get('currentStock')),
        minStock: Number(formData.get('minStock')),
        unit: formData.get('unit') as string,
        costPerUnit: costPerUnitValue ? Number(costPerUnitValue) : undefined,
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch?.id || 'main')
      }, profile.uid, profile.displayName)
      
      // Show success toast
      addToast(`${itemName} has been added to inventory successfully!`, 'success')
      
      // Create system notification
      await notifyInventoryUpdate(
        profile.tenantId,
        itemName,
        'added',
        profile.displayName || 'User'
      )
      
      setShowAddModal(false)
      form.reset()
      // Reset calculation states
      setTotalPrice('')
      setCurrentStock('')
      setUnitPrice('')
    } catch (error) {
      console.error('Error adding item:', error)
      addToast('Failed to add inventory item. Please try again.', 'error')
      alert('Error adding item. Please try again.')
    }
  }

  // Price calculation helpers
  const handleTotalPriceChange = (value: string) => {
    setTotalPrice(value)
    if (value && currentStock) {
      const total = parseFloat(value)
      const stock = parseFloat(currentStock)
      if (!isNaN(total) && !isNaN(stock) && stock > 0) {
        const calculatedUnitPrice = (total / stock).toFixed(2)
        setUnitPrice(calculatedUnitPrice)
      } else {
        setUnitPrice('')
      }
    } else {
      setUnitPrice('')
    }
  }

  const handleCurrentStockChange = (value: string) => {
    setCurrentStock(value)
    if (value && totalPrice) {
      const stock = parseFloat(value)
      const total = parseFloat(totalPrice)
      if (!isNaN(stock) && !isNaN(total) && stock > 0) {
        const calculatedUnitPrice = (total / stock).toFixed(2)
        setUnitPrice(calculatedUnitPrice)
      } else {
        setUnitPrice('')
      }
    } else {
      setUnitPrice('')
    }
  }

  const handleUnitPriceChange = (value: string) => {
    setUnitPrice(value)
    if (value && currentStock) {
      const unit = parseFloat(value)
      const stock = parseFloat(currentStock)
      if (!isNaN(unit) && !isNaN(stock)) {
        const calculatedTotalPrice = (unit * stock).toFixed(2)
        setTotalPrice(calculatedTotalPrice)
      } else {
        setTotalPrice('')
      }
    } else {
      setTotalPrice('')
    }
  }

  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!profile?.tenantId || !editingItem) return

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const costPerUnitValue = formData.get('costPerUnit') as string
      const itemName = formData.get('name') as string
      
      await updateInventoryItem(profile.tenantId, editingItem.id, {
        name: itemName,
        category: formData.get('category') as string,
        currentStock: Number(formData.get('currentStock')),
        minStock: Number(formData.get('minStock')),
        unit: formData.get('unit') as string,
        costPerUnit: costPerUnitValue ? Number(costPerUnitValue) : undefined,
      }, profile.uid, profile.displayName)
      
      // Show success toast
      addToast(`${itemName} has been updated successfully!`, 'success')
      
      // Create system notification
      await notifyInventoryUpdate(
        profile.tenantId,
        itemName,
        'updated',
        profile.displayName || 'User'
      )
      
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating item:', error)
      addToast('Failed to update inventory item. Please try again.', 'error')
      alert('Error updating item. Please try again.')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!profile?.tenantId) return
    
    const item = inventoryItems.find(item => item.id === itemId)
    const itemName = item ? item.name : 'this item'
    
    if (confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      try {
        await deleteInventoryItem(profile.tenantId, itemId)
        
        // Show success toast
        addToast(`${itemName} has been deleted successfully!`, 'success')
        
        // Create system notification
        await notifyInventoryUpdate(
          profile.tenantId,
          itemName,
          'deleted',
          profile.displayName || 'User'
        )
      } catch (error) {
        console.error('Error deleting item:', error)
        addToast('Failed to delete inventory item. Please try again.', 'error')
        alert('Error deleting item. Please try again.')
      }
    }
  }

  const handleQuickStockUpdate = async (itemId: string, operation: 'add' | 'subtract', amount: number) => {
    if (!profile?.tenantId) return

    const item = inventoryItems.find(item => item.id === itemId)
    const itemName = item ? item.name : 'Unknown item'

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
      
      // Show success toast
      const actionText = operation === 'add' ? 'increased' : 'decreased'
      addToast(`${itemName} stock ${actionText} by ${amount} successfully!`, 'success')
      
      // Create detailed notification for stock changes
      await createNotification({
        tenantId: profile.tenantId,
        type: 'general',
        title: 'Stock Updated',
        message: `${itemName} stock ${actionText} by ${amount} units by ${profile.displayName || 'User'}`,
        priority: 'low',
        category: 'inventory',
        relatedItemId: itemId,
        relatedItemName: itemName,
        data: { 
          action: operation, 
          amount, 
          itemName,
          previousStock: item?.currentStock,
          newStock: operation === 'add' ? (item?.currentStock || 0) + amount : (item?.currentStock || 0) - amount
        },
        actionUrl: '/inventory'
      })
      
      // Check for low stock after decrease
      if (operation === 'subtract' && item) {
        const newStock = item.currentStock - amount
        if (newStock <= item.minStock && newStock > 0) {
          await notifyLowStock(
            profile.tenantId,
            itemName,
            newStock,
            item.minStock,
            getBranchLocationId(selectedBranch?.id || 'main')
          )
          addToast(`Warning: ${itemName} is now running low on stock!`, 'warning')
        }
      }
    } catch (error) {
      console.error('Error updating stock:', error)
      addToast('Failed to update stock quantity. Please try again.', 'error')
      alert('Error updating stock. Please try again.')
    }
  }

  // Bulk Operations
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
      id: 'export-selected',
      label: 'Export Selected',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: async (items: InventoryItem[]) => {
        try {
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
          
          // Show success toast
          addToast(`Successfully exported ${items.length} inventory items to CSV!`, 'success')
          
          // Create system notification
          if (profile?.tenantId) {
            await createNotification({
              tenantId: profile.tenantId,
              type: 'general',
              title: 'Data Export Completed',
              message: `${items.length} inventory items exported to CSV by ${profile.displayName || 'User'}`,
              priority: 'low',
              category: 'system',
              data: { 
                exportType: 'csv',
                itemCount: items.length,
                exportedBy: profile.displayName || 'User'
              }
            })
          }
        } catch (error) {
          console.error('Export error:', error)
          addToast('Failed to export inventory items. Please try again.', 'error')
        }
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
        try {
          const promises = items.map(item => deleteInventoryItem(profile!.tenantId, item.id))
          await Promise.all(promises)
          
          // Show success toast
          addToast(`Successfully deleted ${items.length} inventory items!`, 'success')
          
          // Create system notification
          if (profile?.tenantId) {
            await notifyInventoryUpdate(
              profile.tenantId,
              `${items.length} items`,
              'deleted',
              profile.displayName || 'User'
            )
            
            // Create detailed notification for bulk delete
            await createNotification({
              tenantId: profile.tenantId,
              type: 'general',
              title: 'Bulk Delete Completed',
              message: `${items.length} inventory items were deleted by ${profile.displayName || 'User'}`,
              priority: 'medium',
              category: 'inventory',
              data: { 
                action: 'bulk_delete',
                itemCount: items.length,
                deletedItems: items.map(item => ({ id: item.id, name: item.name })),
                deletedBy: profile.displayName || 'User'
              },
              actionUrl: '/inventory'
            })
          }
          
          // Reset selection after successful delete
          setSelectedItems(new Set())
          setBulkMode(false)
        } catch (error) {
          console.error('Bulk delete error:', error)
          addToast('Failed to delete some inventory items. Please try again.', 'error')
        }
      },
      confirmMessage: 'Are you sure you want to delete {count} selected items? This action cannot be undone.',
      color: 'danger' as const,
      disabled: (items: InventoryItem[]) => !hasPermission('inventory')
    }
  ]

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

  const handleBulkStockAdjustment = async (type: 'add' | 'subtract', quantity: number) => {
    if (!profile?.tenantId || selectedItems.size === 0) return

    try {
      const selectedItemsArray = Array.from(selectedItems).map(id => 
        inventoryItems.find(item => item.id === id)
      ).filter(Boolean) as InventoryItem[]

      const promises = selectedItemsArray.map(item => 
        updateStockQuantity(
          profile.tenantId,
          item.id,
          quantity,
          type,
          `Bulk ${type === 'add' ? 'stock increase' : 'stock decrease'}`,
          profile.uid,
          profile.displayName
        )
      )

      await Promise.all(promises)

      // Show success toast
      const actionText = type === 'add' ? 'increased' : 'decreased'
      addToast(`Successfully ${actionText} stock for ${selectedItems.size} items by ${quantity} units!`, 'success')

      // Create system notification
      await createNotification({
        tenantId: profile.tenantId,
        type: 'general',
        title: 'Bulk Stock Adjustment',
        message: `${selectedItems.size} items had their stock ${actionText} by ${quantity} units by ${profile.displayName || 'User'}`,
        priority: 'medium',
        category: 'inventory',
        data: { 
          action: `bulk_${type}`,
          itemCount: selectedItems.size,
          quantity,
          adjustedItems: selectedItemsArray.map(item => ({ id: item.id, name: item.name })),
          adjustedBy: profile.displayName || 'User'
        },
        actionUrl: '/inventory'
      })

      // Check for low stock items after decrease
      if (type === 'subtract') {
        const lowStockWarnings = selectedItemsArray.filter(item => {
          const newStock = item.currentStock - quantity
          return newStock <= item.minStock && newStock > 0
        })

        if (lowStockWarnings.length > 0) {
          addToast(`Warning: ${lowStockWarnings.length} items are now running low on stock!`, 'warning')
          
          // Send low stock notifications for affected items
          const lowStockPromises = lowStockWarnings.map(item => 
            notifyLowStock(
              profile.tenantId,
              item.name,
              item.currentStock - quantity,
              item.minStock,
              getBranchLocationId(selectedBranch?.id || 'main')
            )
          )
          await Promise.all(lowStockPromises)
        }
      }

      // Reset selection and close modal
      setSelectedItems(new Set())
      setShowBulkStockModal(false)
      setBulkMode(false)
    } catch (error) {
      console.error('Bulk stock adjustment error:', error)
      addToast('Failed to adjust stock for some items. Please try again.', 'error')
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
      case 'receiving': return '📦'
      case 'usage': return '�'
      case 'adjustment': return '⚖️'
      case 'add': return '➕'
      case 'subtract': return '➖'
      case 'waste': return '🗑️'
      case 'transfer': return '🔄'
      case 'stock_in': return '📥'
      case 'stock_out': return '📤'
      case 'manual_adjustment': return '✏️'
      default: return '📝'
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'receiving':
      case 'stock_in': 
      case 'add': 
        return 'text-green-700 bg-green-100 border-green-200'
      case 'usage':
      case 'stock_out': 
        return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'adjustment':
      case 'manual_adjustment': 
        return 'text-yellow-700 bg-yellow-100 border-yellow-200'
      case 'subtract': 
      case 'waste': 
        return 'text-red-700 bg-red-100 border-red-200'
      case 'transfer': 
        return 'text-purple-700 bg-purple-100 border-purple-200'
      default: 
        return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <FeatureGate feature="inventory">
      <div className="min-h-screen bg-gray-50">
        {/* Modern Enterprise Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Center</h1>
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">{selectedBranch?.name || 'Main Branch'}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span>Real-time inventory management</span>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex items-center space-x-3">
                <PermissionGate permission="inventory">
                  <FeatureGate feature="inventory">
                    <UsageLimit limit="maxProducts" currentUsage={inventoryItems.length}>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Item
                      </button>
                    </UsageLimit>
                  </FeatureGate>
                </PermissionGate>
                
                <button
                  onClick={() => {
                    setBulkMode(!bulkMode)
                    if (!bulkMode) {
                      addToast('Bulk operations mode enabled. Select items to perform actions.', 'info')
                    } else {
                      addToast('Bulk operations mode disabled.', 'info')
                      setSelectedItems(new Set())
                    }
                  }}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    bulkMode
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {bulkMode ? 'Exit Bulk' : 'Bulk Actions'}
                </button>
              </div>
            </div>

            {/* Key Metrics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-blue-600 font-medium">Total Items</div>
                    <div className="text-2xl font-bold text-blue-900">{inventoryItems.length}</div>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg px-4 py-3 border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-green-600 font-medium">Total Value</div>
                    <div className="text-2xl font-bold text-green-900">₱{totalInventoryValue.toFixed(0)}</div>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg px-4 py-3 border border-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-yellow-600 font-medium">Low Stock</div>
                    <div className="text-2xl font-bold text-yellow-900">{lowStockItems}</div>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg px-4 py-3 border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-red-600 font-medium">Critical</div>
                    <div className="text-2xl font-bold text-red-900">{criticalItems}</div>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Banner */}
            {(criticalItems > 0 || lowStockItems > 0) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      {criticalItems > 0 ? 'Critical Stock Alert' : 'Low Stock Warning'}
                    </h3>
                    <p className="text-sm text-red-700">
                      {criticalItems > 0 && `${criticalItems} item(s) are critically low or out of stock`}
                      {criticalItems > 0 && lowStockItems > 0 && ' • '}
                      {lowStockItems > 0 && `${lowStockItems} item(s) have low stock levels`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === 'inventory'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Inventory Items ({filteredItems.length})
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics & Insights
                </button>
                <button
                  onClick={() => setActiveTab('movements')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === 'movements'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Recent Movements
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 max-w-md">
                      <AdvancedSearch
                        onSearch={(term, filters) => {
                          setSearchTerm(term)
                          setSearchFilters(filters)
                        }}
                        placeholder="Search inventory by name, category..."
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
                          }
                        ]}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Category Filter Pills */}
                      <div className="flex items-center space-x-2">
                        {getCategories().slice(0, 5).map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              selectedCategory === category
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      
                      {/* View Toggle */}
                      <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                          onClick={() => setViewMode('table')}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            viewMode === 'table'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-700'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            viewMode === 'grid'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-700'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Additional Filters */}
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLowStock}
                        onChange={(e) => setShowLowStock(e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      Show only low stock items
                    </label>
                    
                    <span className="text-sm text-gray-500">
                      Showing {filteredItems.length} of {inventoryItems.length} items
                    </span>
                  </div>

                  {/* Inventory Display */}
                  {viewMode === 'table' ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              {bulkMode && (
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700 w-16">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                    onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                  />
                                </th>
                              )}
                              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Item Name</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Category</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Current Stock</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Min Stock</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Status</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredItems.length === 0 ? (
                              <tr>
                                <td colSpan={bulkMode ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                  <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <p className="text-lg font-medium text-gray-900 mb-2">
                                      {inventoryItems.length === 0 ? 'No inventory items' : 'No items match your filters'}
                                    </p>
                                    <p className="text-gray-600">
                                      {inventoryItems.length === 0 ? 'Add your first inventory item to get started' : 'Try adjusting your search or filters'}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filteredItems.map((item) => (
                                <tr 
                                  key={item.id} 
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  {bulkMode && (
                                    <td className="px-6 py-4">
                                      <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => handleSelectItem(item.id)}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                      />
                                    </td>
                                  )}
                                  <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.unit}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-700">{item.category}</td>
                                  <td className="px-6 py-4">
                                    <span className="font-medium text-gray-900">{item.currentStock}</span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-700">{item.minStock}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                      <PermissionGate permission="inventory">
                                        <button
                                          onClick={() => handleDeleteItem(item.id)}
                                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                          Delete
                                        </button>
                                      </PermissionGate>
                                      <PermissionGate permission="inventory">
                                        <button
                                          onClick={() => setEditingItem(item)}
                                          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                        >
                                          Edit
                                        </button>
                                      </PermissionGate>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    // Grid View
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredItems.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12">
                          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            {inventoryItems.length === 0 ? 'No inventory items' : 'No items match your filters'}
                          </p>
                          <p className="text-gray-600">
                            {inventoryItems.length === 0 ? 'Add your first inventory item to get started' : 'Try adjusting your search or filters'}
                          </p>
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                                <p className="text-sm text-gray-600">{item.category}</p>
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="space-y-3 mb-4">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Current Stock</span>
                                <span className="font-medium text-gray-900">{item.currentStock} {item.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Min Stock</span>
                                <span className="text-gray-700">{item.minStock} {item.unit}</span>
                              </div>
                              {item.costPerUnit && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Unit Cost</span>
                                  <span className="text-green-600 font-medium">₱{item.costPerUnit.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-3">
                              <PermissionGate permission="inventory">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                                >
                                  Delete
                                </button>
                              </PermissionGate>
                              <PermissionGate permission="inventory">
                                <button
                                  onClick={() => setEditingItem(item)}
                                  className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                                >
                                  Edit
                                </button>
                              </PermissionGate>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Analytics content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock Health */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Health Overview</h3>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-600 mb-2">{getStockHealthScore()}%</div>
                        <p className="text-gray-600">Items in good stock condition</p>
                      </div>
                    </div>

                    {/* Top Used Items */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Used Items</h3>
                      <div className="space-y-3">
                        {getTopUsedItems().slice(0, 5).map((item, index) => (
                          <div key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-800 mr-3">
                                {index + 1}
                              </div>
                              <span className="font-medium text-gray-900">{item.name}</span>
                            </div>
                            <span className="text-sm text-gray-600">{item.stockPercentage.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Low Stock Predictions */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Predictions</h3>
                    <div className="space-y-3">
                      {getLowStockPredictions().length > 0 ? (
                        getLowStockPredictions().map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-600">{item.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{item.currentStock} {item.unit}</div>
                              <div className="text-xs text-orange-600">May run out soon</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-green-600 font-medium">All items well stocked!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'movements' && (
                <div className="space-y-6">
                  {/* Movements Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Recent Inventory Movements</h3>
                      <p className="text-sm text-gray-600 mt-1">Track all inventory changes across your items</p>
                    </div>
                    
                    {/* Time Filter */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Filter:</label>
                      <select
                        value={movementsFilter}
                        onChange={(e) => setMovementsFilter(e.target.value as 'all' | 'today' | 'week')}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                      </select>
                      
                      <button
                        onClick={loadRecentMovements}
                        disabled={loadingMovements}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                      >
                        {loadingMovements ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                  </div>

                  {/* Movements Content */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    {loadingMovements ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading movements...</span>
                      </div>
                    ) : recentMovements.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No movements found</h4>
                        <p className="text-gray-600">
                          {movementsFilter === 'today' ? 'No inventory movements today' :
                           movementsFilter === 'week' ? 'No inventory movements this week' :
                           'No inventory movements recorded yet'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {/* Movements Header */}
                        <div className="px-6 py-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {recentMovements.length} Movement{recentMovements.length !== 1 ? 's' : ''} Found
                            </h4>
                            <div className="text-xs text-gray-500">
                              {movementsFilter === 'today' ? 'Today' :
                               movementsFilter === 'week' ? 'This Week' : 'All Time'}
                            </div>
                          </div>
                        </div>

                        {/* Movements Timeline */}
                        <div className="p-6">
                          <div className="space-y-6">
                            {recentMovements.map((movement, index) => {
                              const item = inventoryItems.find(item => item.id === movement.itemId)
                              
                              return (
                                <div key={movement.id || index} className="relative flex items-start space-x-4">
                                  {/* Timeline line */}
                                  {index !== recentMovements.length - 1 && (
                                    <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200"></div>
                                  )}
                                  
                                  {/* Movement icon */}
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-sm font-medium ${getMovementTypeColor(movement.movementType)}`}>
                                    {getMovementTypeIcon(movement.movementType)}
                                  </div>
                                  
                                  {/* Movement details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${getMovementTypeColor(movement.movementType)}`}>
                                            {movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1)}
                                          </span>
                                          <span className="text-sm font-medium text-gray-900">
                                            {item ? item.name : movement.itemName || 'Unknown Item'}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {formatMovementDate(movement.timestamp)}
                                          </span>
                                        </div>
                                        <div className={`text-sm font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {movement.quantity > 0 ? '+' : ''}{movement.quantity} {item?.unit || 'units'}
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                        <div>
                                          <span className="text-gray-500">Previous Stock:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            {movement.previousStock} {item?.unit || 'units'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">New Stock:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            {movement.newStock} {item?.unit || 'units'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {movement.reason && (
                                        <div className="text-sm mb-2">
                                          <span className="text-gray-500">Reason:</span>
                                          <span className="ml-2 text-gray-700">{movement.reason}</span>
                                        </div>
                                      )}
                                      
                                      {movement.userId && (
                                        <div className="text-sm">
                                          <span className="text-gray-500">By:</span>
                                          <span className="ml-2 text-gray-700">{movement.userName || movement.userId}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Load More Button */}
                        {recentMovements.length >= 25 && (
                          <div className="px-6 py-4 bg-gray-50 text-center border-t border-gray-200">
                            <button
                              onClick={() => {
                                // Load more movements logic can be implemented here
                                console.log('Load more movements')
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Load More Movements
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Movement Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {recentMovements.filter(m => m.quantity > 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Stock Additions</div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 mb-1">
                          {recentMovements.filter(m => m.quantity < 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Stock Deductions</div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {new Set(recentMovements.map(m => m.itemId)).size}
                        </div>
                        <div className="text-sm text-gray-600">Items Affected</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Add Inventory Item</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAddItem} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter item name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                    <input
                      type="number"
                      name="currentStock"
                      required
                      min="0"
                      value={currentStock}
                      onChange={(e) => handleCurrentStockChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                    <input
                      type="number"
                      name="minStock"
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      name="unit"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="piece"
                    >
                      <optgroup label="Count">
                        <option value="piece">Piece</option>
                        <option value="dozen">Dozen</option>
                        <option value="case">Case</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                        <option value="bag">Bag</option>
                        <option value="container">Container</option>
                        <option value="bottle">Bottle</option>
                        <option value="can">Can</option>
                        <option value="jar">Jar</option>
                      </optgroup>
                      <optgroup label="Weight">
                        <option value="oz">Ounce (oz)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="g">Gram (g)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="ton">Ton</option>
                      </optgroup>
                      <optgroup label="Volume - Liquid">
                        <option value="fl oz">Fluid Ounce (fl oz)</option>
                        <option value="cup">Cup</option>
                        <option value="pint">Pint</option>
                        <option value="quart">Quart</option>
                        <option value="gallon">Gallon</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="liter">Liter</option>
                      </optgroup>
                      <optgroup label="Volume - Dry">
                        <option value="tsp">Teaspoon (tsp)</option>
                        <option value="tbsp">Tablespoon (tbsp)</option>
                        <option value="cubic ft">Cubic Foot</option>
                        <option value="cubic in">Cubic Inch</option>
                      </optgroup>
                      <optgroup label="Length">
                        <option value="inch">Inch</option>
                        <option value="ft">Foot</option>
                        <option value="yard">Yard</option>
                        <option value="cm">Centimeter (cm)</option>
                        <option value="m">Meter (m)</option>
                      </optgroup>
                      <optgroup label="Area">
                        <option value="sq ft">Square Foot</option>
                        <option value="sq in">Square Inch</option>
                        <option value="sq m">Square Meter</option>
                      </optgroup>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalPrice}
                      onChange={(e) => handleTotalPriceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter total cost to auto-calculate unit price</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Per Unit 
                    {totalPrice && currentStock && (
                      <span className="text-green-600 font-medium ml-2">(Auto-calculated)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    name="costPerUnit"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  {totalPrice && currentStock && unitPrice && (
                    <p className="text-xs text-green-600 mt-1">
                      ₱{totalPrice} ÷ {currentStock} units = ₱{unitPrice} per unit
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setTotalPrice('')
                      setCurrentStock('')
                      setUnitPrice('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Inventory Item</h3>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingItem.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter item name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    required
                    defaultValue={editingItem.category}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                    <input
                      type="number"
                      name="currentStock"
                      required
                      min="0"
                      defaultValue={editingItem.currentStock}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                    <input
                      type="number"
                      name="minStock"
                      required
                      min="0"
                      defaultValue={editingItem.minStock}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      name="unit"
                      required
                      defaultValue={editingItem.unit}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="pcs, kg, lbs"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
                    <input
                      type="number"
                      name="costPerUnit"
                      step="0.01"
                      min="0"
                      defaultValue={editingItem.costPerUnit || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Operations Modal */}
        {showBulkStockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Bulk Operations ({selectedItems.size} items selected)
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkStockModal(false)
                      setBulkOperation(null)
                      setBulkStockAdjustment({ type: 'add', quantity: 1 })
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Selected Items Summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Selected Items:</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Array.from(selectedItems).map((id: string) => {
                        const item = filteredItems.find(i => i.id === id)
                        return item ? (
                          <div key={id} className="flex items-center space-x-2">
                            <span className="text-gray-600">{item.name}</span>
                            <span className="text-xs text-gray-500">({item.currentStock} {item.unit})</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>

                {/* Bulk Action Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setBulkOperation('stock')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      bulkOperation === 'stock' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0l1 16a1 1 0 001 1h8a1 1 0 001-1L19 4" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Stock Adjustment</h5>
                        <p className="text-sm text-gray-600">Adjust stock levels</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setBulkOperation('category')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      bulkOperation === 'category' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Update Category</h5>
                        <p className="text-sm text-gray-600">Change item categories</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setBulkOperation('minstock')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      bulkOperation === 'minstock' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Update Min Stock</h5>
                        <p className="text-sm text-gray-600">Set minimum stock levels</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Operation Form */}
                {bulkOperation === 'stock' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-3">Stock Adjustment</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">Operation</label>
                        <select
                          value={bulkStockAdjustment.type}
                          onChange={(e) => setBulkStockAdjustment(prev => ({ ...prev, type: e.target.value as 'add' | 'subtract' }))}
                          className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="add">Increase Stock</option>
                          <option value="subtract">Decrease Stock</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={bulkStockAdjustment.quantity}
                          onChange={(e) => setBulkStockAdjustment(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                          className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleBulkStockAdjustment(bulkStockAdjustment.type as 'add' | 'subtract', bulkStockAdjustment.quantity)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Apply Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {bulkOperation === 'category' && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="font-medium text-green-900 mb-3">Category Update</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">New Category</label>
                        <input
                          type="text"
                          placeholder="Enter new category name"
                          className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => addToast('Category update feature coming soon!', 'info')}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Update Category
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {bulkOperation === 'minstock' && (
                  <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h5 className="font-medium text-orange-900 mb-3">Minimum Stock Update</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-orange-700 mb-1">New Minimum Stock</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Enter minimum stock level"
                          className="w-full p-2 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => addToast('Min stock update feature coming soon!', 'info')}
                          className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                        >
                          Update Min Stock
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Button */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBulkStockModal(false)
                      setBulkOperation(null)
                      setBulkStockAdjustment({ type: 'add', quantity: 1 })
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
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
