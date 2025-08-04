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
  const [showMovementHistory, setShowMovementHistory] = useState(false)
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null)
  const [movementHistory, setMovementHistory] = useState<InventoryMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  
  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [showBulkStockModal, setShowBulkStockModal] = useState(false)
  const [bulkStockAdjustment, setBulkStockAdjustment] = useState({ type: 'add', quantity: 1 })
  
  // UI State
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [affectedMenuItems, setAffectedMenuItems] = useState<{ [key: string]: MenuItem[] }>({})
  const [loadingAffectedItems, setLoadingAffectedItems] = useState<Set<string>>(new Set())

  // Get unique categories from existing inventory items
  const getCategories = () => {
    const uniqueCategories = Array.from(new Set(inventoryItems.map(item => item.category).filter(Boolean)))
    return ['All', ...uniqueCategories.sort()]
  }

  // Firebase real-time subscription
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) {
      setLoading(false)
      return
    }

    const locationId = getBranchLocationId(selectedBranch.id)
    
    const unsubscribe = subscribeToInventoryItems(
      profile.tenantId,
      locationId,
      (items: InventoryItem[]) => {
        setInventoryItems(items || [])
        setLoading(false)
      }
    )

    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 3000)

    return () => {
      if (unsubscribe) unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [profile?.tenantId, selectedBranch])

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
      case 'receiving': return '📦'
      case 'usage': return '💰'
      case 'adjustment': return '⚖️'
      case 'add': return '➕'
      case 'subtract': return '➖'
      case 'waste': return '🗑️'
      case 'transfer': return '🔄'
      default: return '📝'
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'receiving': return 'text-green-600 bg-green-100'
      case 'usage': return 'text-blue-600 bg-blue-100'
      case 'adjustment': return 'text-yellow-600 bg-yellow-100'
      case 'add': return 'text-green-600 bg-green-100'
      case 'subtract': return 'text-red-600 bg-red-100'
      case 'waste': return 'text-red-600 bg-red-100'
      case 'transfer': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
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
                  onClick={() => setBulkMode(!bulkMode)}
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
                                      <button
                                        onClick={() => handleShowMovementHistory(item)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                      >
                                        History
                                      </button>
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
                              <button
                                onClick={() => handleShowMovementHistory(item)}
                                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                              >
                                History
                              </button>
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
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Inventory Movements</h3>
                    <p className="text-gray-600">Movement tracking feature will be implemented here.</p>
                  </div>
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
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Movement History
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedItemForHistory.name} - All stock movements
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMovementHistory(false)
                      setSelectedItemForHistory(null)
                      setMovementHistory([])
                    }}
                    className="text-gray-400 hover:text-gray-600"
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : movementHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No movement history</h4>
                    <p className="text-gray-600">
                      This item doesn&apos;t have any recorded movements yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {movementHistory.map((movement, index) => (
                      <div key={movement.id} className="relative flex items-start space-x-4 pb-6">
                        {/* Timeline line */}
                        {index !== movementHistory.length - 1 && (
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
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${getMovementTypeColor(movement.movementType)}`}>
                                  {movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1)}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {formatMovementDate(movement.timestamp)}
                                </span>
                              </div>
                              <div className={`text-sm font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {movement.quantity > 0 ? '+' : ''}{movement.quantity} {selectedItemForHistory.unit}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Previous Stock:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {movement.previousStock} {selectedItemForHistory.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">New Stock:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {movement.newStock} {selectedItemForHistory.unit}
                                </span>
                              </div>
                            </div>
                            
                            {movement.reason && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500">Reason:</span>
                                <span className="ml-2 text-gray-700">{movement.reason}</span>
                              </div>
                            )}
                            
                            {movement.userId && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500">By:</span>
                                <span className="ml-2 text-gray-700">{movement.userName || movement.userId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {movementHistory.length} movement{movementHistory.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => {
                      setShowMovementHistory(false)
                      setSelectedItemForHistory(null)
                      setMovementHistory([])
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
