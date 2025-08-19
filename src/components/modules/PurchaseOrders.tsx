'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { 
  notifyOrderStatusChange, 
  notifyApprovalRequired, 
  notifyDeliveryReceived 
} from '../../lib/firebase/notifications'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { debugTrace, debugStep, debugError, debugSuccess, debugInspect } from '../../lib/utils/debugHelper'
import { 
  getPurchaseOrders, 
  createPurchaseOrder, 
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  getSuppliers,
  deliverPurchaseOrder,
  type PurchaseOrder,
  type Supplier,
  type CreatePurchaseOrder,
  type PurchaseOrderItem
} from '../../lib/firebase/purchaseOrders'
import { 
  getInventoryItems,
  addInventoryItem,
  resolveUnitMismatch,
  type InventoryItem,
  type CreateInventoryItem
} from '../../lib/firebase/inventory'
import { generatePurchaseOrderSummaryPDF, generatePurchaseOrderDetailedPDF } from '../../lib/utils/pdfGenerator'
import { Timestamp } from 'firebase/firestore'

export default function PurchaseOrders() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveringOrder, setDeliveringOrder] = useState<PurchaseOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [showUnitMismatchModal, setShowUnitMismatchModal] = useState(false)
  const [unitMismatches, setUnitMismatches] = useState<Array<{
    itemName: string;
    expectedUnit: string;
    receivedUnit: string;
    quantity: number;
  }>>([])
  const [resolvingMismatch, setResolvingMismatch] = useState(false)

  const [newOrder, setNewOrder] = useState({
    supplierId: '',
    requestor: '',
    items: [{ itemName: '', description: '', quantity: 1, unit: 'piece', unitPrice: 0, total: 0, lastModified: 'unitPrice' }] as (PurchaseOrderItem & { lastModified?: 'unitPrice' | 'total' | 'quantity' })[],
    expectedDelivery: new Date(),
    notes: '',
    shippingFee: 0
  })

  const [deliveryItems, setDeliveryItems] = useState<Array<{
    itemName: string;
    quantityOrdered: number;
    quantityReceived: number;
    unit: string;
    unitPrice: number;
  }>>([])

  const [receivedBy, setReceivedBy] = useState('')

  const [deliveryResult, setDeliveryResult] = useState<{
    updatedItems: string[];
    notFoundItems: string[];
    unitMismatches: Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>;
  } | null>(null)

  const [isDelivering, setIsDelivering] = useState(false)
  const [loadingDelivery, setLoadingDelivery] = useState<string | null>(null)

  // New inventory item notification state
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [missingItem, setMissingItem] = useState<{
    itemName: string;
    itemIndex: number;
    unit: string;
    unitPrice: number;
  } | null>(null)

  // Debounce timer for inventory checking
  const inventoryCheckTimers = useRef<{ [key: number]: NodeJS.Timeout }>({})

  // **PERFORMANCE: Add caching to prevent unnecessary reloads**
  const [dataCache, setDataCache] = useState<{
    timestamp: number;
    data: {
      orders: PurchaseOrder[];
      suppliers: Supplier[];
      inventory: any[];
    } | null;
  }>({ timestamp: 0, data: null })

  // Load purchase orders and suppliers with caching
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const loadData = async () => {
      debugStep('Starting data load', {
        hasProfile: !!profile?.tenantId,
        hasBranch: !!selectedBranch,
        branchName: selectedBranch?.name
      }, { component: 'PurchaseOrders' })

      if (!profile?.tenantId || !selectedBranch) {
        debugStep('Missing profile or branch - keeping empty state', undefined, { component: 'PurchaseOrders' })
        setLoading(false)
        return
      }

      try {
        // **PERFORMANCE: Check cache first (cache for 2 minutes)**
        const now = Date.now()
        const cacheAge = now - dataCache.timestamp
        if (dataCache.data && cacheAge < 120000) {
          debugStep('Using cached data', { cacheAge: Math.round(cacheAge / 1000) + 's' }, { component: 'PurchaseOrders' })
          setOrders(dataCache.data.orders)
          setSuppliers(dataCache.data.suppliers)
          setInventoryItems(dataCache.data.inventory)
          setLoading(false)
          return
        }

        setLoading(true)
        
        // **PERFORMANCE: Set shorter timeout to prevent infinite loading**
        timeoutId = setTimeout(() => {
          debugStep('Loading timeout reached - stopping loading state', undefined, { component: 'PurchaseOrders' })
          setLoading(false)
        }, 2000)
        
        const locationId = getBranchLocationId(selectedBranch.id)
        
        debugStep('Loading fresh data for branch', { 
          branchName: selectedBranch.name, 
          locationId 
        }, { component: 'PurchaseOrders' })
        
        // **PERFORMANCE: Load data in parallel with error handling**
        const results = await Promise.allSettled([
          getPurchaseOrders(profile.tenantId, locationId),
          getSuppliers(profile.tenantId),
          getInventoryItems(profile.tenantId, locationId)
        ])
        
        // Clear timeout since data loaded successfully
        if (timeoutId) clearTimeout(timeoutId)
        
        // **PERFORMANCE: Process results even if some fail**
        const ordersData = results[0].status === 'fulfilled' ? results[0].value : []
        const suppliersData = results[1].status === 'fulfilled' ? results[1].value : []
        const inventoryData = results[2].status === 'fulfilled' ? results[2].value : []
        
        // Log any failed requests
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const operation = ['orders', 'suppliers', 'inventory'][index]
            console.warn(`Failed to load ${operation}:`, result.reason)
          }
        })

        debugSuccess('Data loaded successfully', {
          ordersCount: ordersData.length,
          suppliersCount: suppliersData.length,
          inventoryCount: inventoryData.length
        }, { component: 'PurchaseOrders' })
        
        // **PERFORMANCE: Update cache**
        setDataCache({
          timestamp: now,
          data: {
            orders: ordersData,
            suppliers: suppliersData,
            inventory: inventoryData
          }
        })
        
        setOrders(ordersData)
        setSuppliers(suppliersData)
        setInventoryItems(inventoryData)
      } catch (error) {
        // Clear timeout on error
        if (timeoutId) clearTimeout(timeoutId)
        debugError('Failed to load data', undefined, { component: 'PurchaseOrders' })
        console.error('Purchase Orders load error:', error)
        // **PERFORMANCE: Don't clear existing data on error, just stop loading**
      } finally {
        setLoading(false)
      }
    }

    loadData()
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [profile?.tenantId, selectedBranch?.id, dataCache.timestamp])

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      // Clear all active timers
      Object.values(inventoryCheckTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [])

  // Keyboard shortcuts for faster workflow
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            setShowCreateModal(true)
            break
          case 'a':
            e.preventDefault()
            const pendingOrders = orders.filter(o => o.status === 'pending')
            if (pendingOrders.length > 0 && confirm(`Approve all ${pendingOrders.length} pending orders?`)) {
              pendingOrders.forEach(order => handleUpdateStatus(order.id!, 'approved'))
            }
            break
          case 'o':
            e.preventDefault()
            const approvedOrders = orders.filter(o => o.status === 'approved')
            if (approvedOrders.length > 0 && confirm(`Mark all ${approvedOrders.length} approved orders as ordered?`)) {
              approvedOrders.forEach(order => handleUpdateStatus(order.id!, 'ordered'))
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [orders])

  const calculateTotals = (items: PurchaseOrderItem[], shippingFee: number = 0) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    return {
      subtotal,
      shippingFee,
      tax: 0,
      total: subtotal + shippingFee
    }
  }

  const handleCreateOrder = async () => {
    if (!profile?.tenantId || !newOrder.supplierId || !newOrder.requestor || !selectedBranch) return

    try {
      // Calculate totals for each item
      const updatedItems = newOrder.items
        .filter(item => item.itemName.trim() !== '')
        .map(item => ({
          ...item,
          total: item.quantity * item.unitPrice
        }))

      const { subtotal, tax, total } = calculateTotals(updatedItems, newOrder.shippingFee)

      // Generate locationId for the current branch
      const locationId = getBranchLocationId(selectedBranch.id)

      const orderData: CreatePurchaseOrder = {
        supplierId: newOrder.supplierId, // This is now the supplier name
        supplierName: newOrder.supplierId, // Using the same value since it's now a text input
        items: updatedItems,
        subtotal,
        tax,
        total,
        expectedDelivery: newOrder.expectedDelivery,
        notes: newOrder.notes,
        requestor: newOrder.requestor,
        createdBy: profile.tenantId,
        tenantId: profile.tenantId,
        locationId // Add branch-specific locationId
      }

      await createPurchaseOrder(orderData)
      
      // Refresh orders
      const updatedOrders = await getPurchaseOrders(profile.tenantId)
      setOrders(updatedOrders)
      
      // Reset form
      setNewOrder({
        supplierId: '',
        requestor: '',
        items: [{ itemName: '', description: '', quantity: 1, unit: 'piece', unitPrice: 0, total: 0, lastModified: 'unitPrice' }],
        expectedDelivery: new Date(),
        notes: '',
        shippingFee: 0
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating purchase order:', error)
    }
  }

  const handleUpdateStatus = async (orderId: string, status: PurchaseOrder['status']) => {
    if (!profile?.tenantId) return

    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      const oldStatus = order.status
      const approvedBy = status === 'approved' ? profile.tenantId : undefined

      // **PERFORMANCE: Optimistic UI update first**
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status,
              ...(status === 'approved' && { approvedBy: profile.tenantId })
            } 
          : order
      ))

      // **PERFORMANCE: Process Firebase update in background**
      Promise.all([
        updatePurchaseOrderStatus(profile.tenantId, orderId, status, approvedBy),
        notifyOrderStatusChange(profile.tenantId, order.orderNumber, oldStatus, status).catch(console.error),
        status === 'pending' ? notifyApprovalRequired(
          profile.tenantId,
          order.orderNumber,
          order.requestor || 'Unknown',
          order.total
        ).catch(console.error) : Promise.resolve()
      ]).catch(error => {
        console.error('Background status update error:', error)
        // Revert optimistic update on error
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: oldStatus }
            : order
        ))
      })

    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!profile?.tenantId || !confirm('Are you sure you want to delete this order?')) return

    try {
      await deletePurchaseOrder(profile.tenantId, orderId)
      setOrders(prev => prev.filter(order => order.id !== orderId))
    } catch (error) {
      console.error('Error deleting order:', error)
    }
  }

  const handleShowDeliveryModal = async (order: PurchaseOrder) => {
    if (!profile?.tenantId || loadingDelivery === order.id) return
    
    try {
      setLoadingDelivery(order.id!)
      
      // **PERFORMANCE: Use local data if order is already current**
      const localOrder = orders.find(o => o.id === order.id)
      let orderToProcess = order
      
      // Only fetch from Firebase if we suspect the order might be stale
      if (localOrder && (Date.now() - dataCache.timestamp) > 30000) { // Only if cache is older than 30 seconds
        // Import the function to get latest order status
        const { getPurchaseOrderById } = await import('../../lib/firebase/purchaseOrders')
        
        // Fetch the latest order status from database
        const latestOrder = await getPurchaseOrderById(profile.tenantId, order.id!)
        
        if (!latestOrder) {
          alert('Purchase order not found. It may have been deleted.')
          return
        }
        
        if (latestOrder.status === 'delivered') {
          alert('This order has already been delivered.')
          // Update local state to reflect the current status
          setOrders(prev => prev.map(o => 
            o.id === order.id ? { ...o, status: 'delivered' as const } : o
          ))
          return
        }
        
        if (latestOrder.status !== 'ordered' && latestOrder.status !== 'partially_delivered') {
          alert(`Cannot deliver order. Current status: ${latestOrder.status}`)
          // Update local state
          setOrders(prev => prev.map(o => 
            o.id === order.id ? { ...o, status: latestOrder.status } : o
          ))
          return
        }
        
        orderToProcess = latestOrder
      }
      
      setDeliveringOrder(orderToProcess)
      setDeliveryItems(orderToProcess.items.map(item => {
        const quantityReceived = item.quantityReceived || 0
        const remainingQuantity = item.quantity - quantityReceived
        
        return {
          itemName: item.itemName,
          quantityOrdered: item.quantity,
          quantityReceived: orderToProcess.status === 'partially_delivered' 
            ? Math.max(0, remainingQuantity) // Default to remaining quantity for partial deliveries
            : item.quantity, // Default to full quantity for new delivery
          unit: item.unit,
          unitPrice: item.unitPrice
        }
      }))
      setReceivedBy('') // Reset received by field
      setDeliveryResult(null)
      setIsDelivering(false)
      setShowDeliveryModal(true)
    } catch (error) {
      console.error('Error loading order details:', error)
      alert('Failed to load order details. Please try again.')
    } finally {
      setLoadingDelivery(null)
    }
  }

  // **PERFORMANCE: Simple debounce helper**
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }

  // **PERFORMANCE: Debounced delivery quantity change**
  const debouncedQuantityUpdate = useCallback(
    debounce((updates: {index: number, quantityReceived: number}[]) => {
      // Batch multiple updates together
      setDeliveryItems(prev => prev.map((item, i) => {
        const update = updates.find(u => u.index === i)
        return update ? { ...item, quantityReceived: Math.max(0, update.quantityReceived) } : item
      }))
    }, 100), // 100ms debounce
    []
  )

  const handleDeliveryQuantityChange = (index: number, quantityReceived: number) => {
    // **PERFORMANCE: Immediate UI update for responsiveness**
    setDeliveryItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantityReceived: Math.max(0, quantityReceived) } : item
    ))
  }

  const handleConfirmDelivery = async () => {
    if (!profile?.tenantId || !deliveringOrder || isDelivering) return

    try {
      setIsDelivering(true)
      
      // Validate required fields
      if (!receivedBy.trim()) {
        alert('Please enter the name of the person who received the delivery.')
        return
      }
      
      // Check if order is still in 'ordered' or 'partially_delivered' status before proceeding
      if (deliveringOrder.status !== 'ordered' && deliveringOrder.status !== 'partially_delivered') {
        alert(`Cannot deliver order. Current status: ${deliveringOrder.status}`)
        setShowDeliveryModal(false)
        setDeliveringOrder(null)
        return
      }
      
      // Filter out items with zero quantity received
      const itemsToDeliver = deliveryItems.filter(item => item.quantityReceived > 0)
      
      if (itemsToDeliver.length === 0) {
        alert('Please specify quantities received for at least one item.')
        return
      }

      // **PERFORMANCE OPTIMIZATION: Calculate everything client-side first**
      const updatedItems = deliveringOrder.items.map(item => {
        const deliveredItem = itemsToDeliver.find(di => 
          di.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
        )
        
        if (deliveredItem) {
          const previouslyReceived = item.quantityReceived || 0
          const newlyReceived = deliveredItem.quantityReceived
          const totalReceived = previouslyReceived + newlyReceived
          
          return {
            ...item,
            quantityReceived: Math.min(totalReceived, item.quantity)
          }
        } else {
          return {
            ...item,
            quantityReceived: item.quantityReceived || 0
          }
        }
      })

      const isPartialDelivery = updatedItems.some(item => {
        const quantityReceived = item.quantityReceived || 0
        return quantityReceived > 0 && quantityReceived < item.quantity
      })

      const isFullyDelivered = updatedItems.every(item => {
        const quantityReceived = item.quantityReceived || 0
        return quantityReceived >= item.quantity
      })

      let newStatus: PurchaseOrder['status']
      if (isFullyDelivered) {
        newStatus = 'delivered'
      } else if (isPartialDelivery || updatedItems.some(item => (item.quantityReceived || 0) > 0)) {
        newStatus = 'partially_delivered'
      } else {
        newStatus = 'ordered'
      }

      // **PERFORMANCE: Optimistic UI update - Update immediately for responsive feel**
      setOrders(prev => prev.map(order => 
        order.id === deliveringOrder.id 
          ? { 
              ...order, 
              status: newStatus,
              deliveredBy: receivedBy.trim(),
              deliveredAt: new Date() as any,
              items: updatedItems
            } 
          : order
      ))

      // **PERFORMANCE: Close modal immediately**
      setShowDeliveryModal(false)
      setDeliveringOrder(null)

      // **PERFORMANCE: Process Firebase operations in background**
      deliverPurchaseOrder(
        profile.tenantId,
        deliveringOrder.id!,
        itemsToDeliver.map(item => ({
          itemName: item.itemName,
          quantityReceived: item.quantityReceived,
          unit: item.unit,
          unitPrice: item.unitPrice
        })),
        receivedBy.trim()
      ).then(result => {
        if (result.success) {
          setDeliveryResult(result.inventoryUpdateResult || null)
          
          // Handle unit mismatches
          if (result.inventoryUpdateResult && result.inventoryUpdateResult.unitMismatches.length > 0) {
            const mismatchesWithQuantity = result.inventoryUpdateResult.unitMismatches.map(mismatch => {
              const deliveredItem = itemsToDeliver.find(item => 
                item.itemName.toLowerCase().trim() === mismatch.itemName.toLowerCase().trim()
              )
              return {
                ...mismatch,
                quantity: deliveredItem?.quantityReceived || 0
              }
            })
            
            setUnitMismatches(mismatchesWithQuantity)
            setShowUnitMismatchModal(true)
          }
        } else {
          // Revert optimistic update on error
          console.error('Delivery failed, reverting UI state')
          window.location.reload()
        }
      }).catch(error => {
        console.error('Background delivery processing error:', error)
        // Don't show error to user since they already got feedback
        // Just log for debugging and revert on next page load if needed
      })

      // **PERFORMANCE: Send notification asynchronously (don't wait)**
      notifyDeliveryReceived(
        profile.tenantId,
        deliveringOrder.orderNumber,
        receivedBy.trim(),
        newStatus === 'partially_delivered' ? 'partial' : 'complete'
      ).catch(error => console.error('Notification error:', error))
    } catch (error) {
      console.error('Error confirming delivery:', error)
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('already been delivered')) {
          alert('This purchase order has already been delivered. The page will refresh to show the current status.')
          // Refresh the orders list to get current status
          window.location.reload()
          return
        } else if (error.message.includes('Purchase order not found')) {
          alert('Purchase order not found. It may have been deleted.')
          setShowDeliveryModal(false)
          setDeliveringOrder(null)
          return
        }
      }
      
      alert('Failed to confirm delivery. Please try again.')
    } finally {
      setIsDelivering(false)
    }
  }

  const handleResolveUnitMismatch = async (itemName: string, newUnit: string, quantity: number) => {
    if (!profile?.tenantId || resolvingMismatch) return

    try {
      setResolvingMismatch(true)
      
      const result = await resolveUnitMismatch(
        profile.tenantId,
        itemName,
        newUnit,
        quantity,
        profile.tenantId, // userId
        profile.tenantId  // userName - using tenantId as placeholder
      )

      if (result.success) {
        // Remove this mismatch from the list
        setUnitMismatches(prev => prev.filter(m => m.itemName !== itemName))
        
        // Update delivery result to remove this mismatch
        setDeliveryResult(prev => prev ? {
          ...prev,
          updatedItems: [...prev.updatedItems, itemName],
          unitMismatches: prev.unitMismatches.filter(m => m.itemName !== itemName)
        } : null)
        
        alert(`✅ ${result.message}`)
        
        // If no more mismatches, we can close the mismatch modal
        if (unitMismatches.length === 1) {
          setShowUnitMismatchModal(false)
          // Also check if we can close the delivery modal
          if (deliveryResult && deliveryResult.notFoundItems.length === 0) {
            setShowDeliveryModal(false)
            setDeliveringOrder(null)
          }
        }
      } else {
        alert(`❌ Failed to resolve unit mismatch: ${result.message}`)
      }
    } catch (error) {
      console.error('Error resolving unit mismatch:', error)
      alert('❌ Failed to resolve unit mismatch. Please try again.')
    } finally {
      setResolvingMismatch(false)
    }
  }

  const addOrderItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { itemName: '', description: '', quantity: 1, unit: 'piece', unitPrice: 0, total: 0, lastModified: 'unitPrice' }]
    }))
  }

  const updateOrderItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item
        
        const updatedItem = { ...item, [field]: value }
        
        // Smart calculation based on which field was changed
        if (field === 'quantity' || field === 'unitPrice') {
          // User modified unit price or quantity -> calculate total
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
          updatedItem.lastModified = field === 'unitPrice' ? 'unitPrice' : 'quantity'
        } else if (field === 'total') {
          // User modified total -> calculate unit price
          if (updatedItem.quantity > 0) {
            updatedItem.unitPrice = updatedItem.total / updatedItem.quantity
            updatedItem.lastModified = 'total'
          }
        }
        
        // Check if item exists in inventory when item name changes
        if (field === 'itemName') {
          // Use debounced inventory check instead of immediate check
          debouncedInventoryCheck(value, index, updatedItem.unit, updatedItem.unitPrice)
        }
        
        return updatedItem
      })
    }))
  }

  const removeOrderItem = (index: number) => {
    if (newOrder.items.length > 1) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  // Check if item exists in inventory
  const checkItemInInventory = (itemName: string): boolean => {
    if (!itemName.trim()) return true // Don't check empty names
    return inventoryItems.some(item => 
      item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    )
  }

  // Get inventory item unit for comparison
  const getInventoryItemUnit = (itemName: string): string | null => {
    if (!itemName.trim()) return null
    const inventoryItem = inventoryItems.find(item => 
      item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    )
    return inventoryItem?.unit || null
  }

  // Debounced inventory check - waits 1 second after user stops typing
  const debouncedInventoryCheck = (itemName: string, index: number, unit: string, unitPrice: number) => {
    // Clear existing timer for this item index
    if (inventoryCheckTimers.current[index]) {
      clearTimeout(inventoryCheckTimers.current[index])
    }

    // Only check if item name has content and doesn't exist in inventory
    if (itemName.trim() && !checkItemInInventory(itemName)) {
      // Set new timer
      inventoryCheckTimers.current[index] = setTimeout(() => {
        // Double-check the item still doesn't exist (user might have continued typing)
        if (!checkItemInInventory(itemName)) {
          setMissingItem({
            itemName: itemName,
            itemIndex: index,
            unit: unit,
            unitPrice: unitPrice
          })
          setShowInventoryModal(true)
        }
      }, 1000) // Wait 1 second after user stops typing
    }
  }

  // Handle adding missing item to inventory
  const handleAddToInventory = async () => {
    if (!missingItem || !profile?.tenantId || !selectedBranch) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      
      const newInventoryItem: CreateInventoryItem = {
        name: missingItem.itemName,
        category: 'General', // Default category
        currentStock: 0, // Will be updated when purchase order is delivered
        minStock: 5, // Default minimum stock
        maxStock: 100, // Default maximum stock
        unit: missingItem.unit,
        costPerUnit: missingItem.unitPrice,
        tenantId: profile.tenantId,
        locationId: locationId
      }

      await addInventoryItem(newInventoryItem)
      
      // Refresh inventory items
      const updatedInventoryItems = await getInventoryItems(profile.tenantId, locationId)
      setInventoryItems(updatedInventoryItems)
      
      // Close modal
      setShowInventoryModal(false)
      setMissingItem(null)
      
      // Show success message
      alert(`"${missingItem.itemName}" has been added to inventory!`)
      
    } catch (error) {
      console.error('Error adding item to inventory:', error)
      alert('Failed to add item to inventory. Please try again.')
    }
  }

  const filteredOrders = orders.filter(order => {
    // Status filter
    const statusMatch = statusFilter === 'all' || order.status === statusFilter
    
    // Date filter - show only orders from last 7 days if toggle is enabled
    let dateMatch = true
    if (showRecentOrders) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date()
      dateMatch = orderDate >= sevenDaysAgo
    }
    
    // Search filter
    let searchMatch = true
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      const orderNumberMatch = order.orderNumber?.toLowerCase().includes(searchLower) || false
      const supplierMatch = order.supplierName?.toLowerCase().includes(searchLower) || false
      const itemsMatch = order.items?.some(item => 
        (item.itemName?.toLowerCase().includes(searchLower) || false) ||
        (item.description?.toLowerCase().includes(searchLower) || false)
      ) || false
      const requestorMatch = order.requestor?.toLowerCase().includes(searchLower) || false
      const notesMatch = order.notes?.toLowerCase().includes(searchLower) || false
      
      searchMatch = orderNumberMatch || supplierMatch || itemsMatch || requestorMatch || notesMatch
    }
    
    return statusMatch && dateMatch && searchMatch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'ordered': return 'bg-purple-100 text-purple-800'
      case 'partially_delivered': return 'bg-amber-100 text-amber-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        {/* **PERFORMANCE: Loading skeleton for better UX** */}
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          
          {/* Filters skeleton */}
          <div className="flex gap-3 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded w-20"></div>
            ))}
          </div>
          
          {/* Table skeleton */}
          <div className="bg-white rounded-lg shadow">
            {/* Table header */}
            <div className="grid grid-cols-7 gap-4 p-4 border-b">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
            {/* Table rows */}
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="grid grid-cols-7 gap-4 p-4 border-b">
                {[1, 2, 3, 4, 5, 6, 7].map(j => (
                  <div key={j} className="h-4 bg-gray-100 rounded"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const filteredOrders = statusFilter === 'all' 
                ? orders 
                : orders.filter(order => order.status === statusFilter)
              generatePurchaseOrderSummaryPDF(filteredOrders)
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            disabled={orders.length === 0}
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Order
          </button>
        </div>
      </div>

      {/* Branch Indicator */}
      <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
        <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="font-medium">{selectedBranch?.name || 'Main Branch'}</span>
        <span className="mx-2">•</span>
        <span>Viewing branch purchase orders</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {orders.filter(o => o.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Ordered</div>
          <div className="text-2xl font-bold text-blue-600">
            {orders.filter(o => o.status === 'ordered').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Partial</div>
          <div className="text-2xl font-bold text-amber-600">
            {orders.filter(o => o.status === 'partially_delivered').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Delivered</div>
          <div className="text-2xl font-bold text-green-600">
            {orders.filter(o => o.status === 'delivered').length}
          </div>
        </div>
      </div>



      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders (order number, supplier, items)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="partially_delivered">Partially Delivered</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Recent Orders Toggle */}
            <label className="flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showRecentOrders}
                onChange={(e) => setShowRecentOrders(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show orders from last 7 days</span>
            </label>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.supplierName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.items.length} item(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₱{order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status === 'partially_delivered' ? 'Partial' : order.status}
                    </span>
                    {order.status === 'partially_delivered' && (
                      <div className="text-xs text-amber-600 mt-1">
                        {(() => {
                          const receivedItems = order.items.filter(item => (item.quantityReceived || 0) > 0).length
                          const totalItems = order.items.length
                          return `${receivedItems}/${totalItems} items received`
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.createdAt?.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {/* Express Mode for Small Orders */}
                      {(order.status === 'draft' || order.status === 'pending') && order.total <= 5000 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Express approve, order, and mark as delivered for ${order.supplierName} (₱${order.total.toFixed(2)})?`)) {
                              // Sequential status updates
                              handleUpdateStatus(order.id!, 'approved')
                              setTimeout(() => handleUpdateStatus(order.id!, 'ordered'), 500)
                              setTimeout(() => {
                                // Auto-fill delivery data and show modal
                                setReceivedBy('Manager')
                                setDeliveryItems(order.items.map(item => ({
                                  itemName: item.itemName,
                                  quantityOrdered: item.quantity,
                                  quantityReceived: item.quantity, // Auto-set to full quantity
                                  unit: item.unit,
                                  unitPrice: item.unitPrice
                                })))
                                setDeliveringOrder(order)
                                setShowDeliveryModal(true)
                              }, 1000)
                            }
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs rounded-md hover:from-green-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-sm"
                          title="Express: Approve → Order → Deliver (for orders ≤ ₱5,000)"
                        >
                          ⚡ Express
                        </button>
                      )}
                      
                      {/* Quick Action Buttons */}
                      {order.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(order.id!, 'pending')
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                          title="Submit for Approval"
                        >
                          Submit
                        </button>
                      )}
                      
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(order.id!, 'approved')
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                            title="Approve Order"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(order.id!, 'cancelled')
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      
                      {order.status === 'approved' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(order.id!, 'ordered')
                          }}
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 transition-colors"
                          title="Mark as Ordered"
                        >
                          Order
                        </button>
                      )}
                      
                      {(order.status === 'ordered' || order.status === 'partially_delivered') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShowDeliveryModal(order)
                          }}
                          className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${
                            order.status === 'partially_delivered' 
                              ? 'bg-amber-600 hover:bg-amber-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                          disabled={loadingDelivery === order.id}
                          title={order.status === 'partially_delivered' ? 'Continue Delivery' : 'Mark as Delivered'}
                        >
                          {loadingDelivery === order.id 
                            ? '...' 
                            : order.status === 'partially_delivered'
                            ? 'Continue'
                            : 'Deliver'
                          }
                        </button>
                      )}
                      
                      {/* View Button */}
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="text-blue-600 hover:text-blue-900 text-xs"
                        title="View Details"
                      >
                        View
                      </button>
                      
                      {/* PDF Download Button */}
                      <button
                        onClick={() => generatePurchaseOrderDetailedPDF(order)}
                        className="text-green-600 hover:text-green-900 text-xs"
                        title="Download PDF Report"
                      >
                        PDF
                      </button>
                      
                      {/* Delete Button - Only for draft/pending */}
                      {(order.status === 'draft' || order.status === 'pending') && (
                        <button
                          onClick={() => handleDeleteOrder(order.id!)}
                          className="text-red-600 hover:text-red-900 text-xs"
                          title="Delete Order"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders Found</h3>
                      <p className="text-gray-500 text-center max-w-sm mb-4">
                        {searchTerm || statusFilter !== 'all' || showRecentOrders
                          ? 'No orders match your current filters. Try adjusting your search criteria.'
                          : 'Get started by creating your first purchase order to manage supplier orders and inventory restocking.'
                        }
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Purchase Order
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-surface-200">
              <h3 className="text-xl font-semibold text-surface-900">Create Purchase Order</h3>
              <p className="text-sm text-surface-600 mt-1">Add items and supplier information for your new purchase order</p>
            </div>
            
            {/* Modal Content */}
            <div className="px-8 py-6 space-y-8">
              {/* Supplier & Delivery Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Supplier Name */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={newOrder.supplierId}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="input-field"
                    placeholder="Enter supplier name"
                    list="suppliers-datalist"
                  />
                  <datalist id="suppliers-datalist">
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.name} />
                    ))}
                  </datalist>
                  {suppliers.length > 0 && (
                    <p className="text-xs text-surface-500 mt-1">
                      Existing suppliers: {suppliers.map(s => s.name).join(', ')}
                    </p>
                  )}
                </div>

                {/* PO Requestor */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Requested By *
                  </label>
                  <input
                    type="text"
                    value={newOrder.requestor || ''}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, requestor: e.target.value }))}
                    className="input-field"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Expected Delivery */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={newOrder.expectedDelivery.toISOString().split('T')[0]}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, expectedDelivery: new Date(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-surface-900">Order Items</h4>
                    <p className="text-sm text-surface-600">Add items to include in this purchase order</p>
                  </div>
                  <button
                    onClick={addOrderItem}
                    className="btn-secondary text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </div>


                {/* Items List */}
                <div className="space-y-6">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="border border-primary-100 rounded-xl bg-white shadow-sm p-6 flex flex-col gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="col-span-2 flex flex-col gap-2">
                          <label className="block text-xs font-semibold text-primary-700 mb-1">Item Name</label>
                          <input
                            type="text"
                            placeholder="Enter item name"
                            value={item.itemName}
                            onChange={(e) => updateOrderItem(index, 'itemName', e.target.value)}
                            className={`input-field font-semibold text-lg ${item.itemName.trim() && !checkItemInInventory(item.itemName) ? 'border-amber-300 bg-amber-50' : ''}`}
                            list={`inventory-items-${index}`}
                          />
                          <datalist id={`inventory-items-${index}`}> 
                            {inventoryItems.map((invItem) => (
                              <option key={invItem.id} value={invItem.name} />
                            ))}
                          </datalist>
                          {item.itemName.trim() && !checkItemInInventory(item.itemName) && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Not found in inventory - will be added automatically
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 flex flex-col gap-2">
                          <label className="block text-xs font-semibold text-primary-700 mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => updateOrderItem(index, 'description', e.target.value)}
                            className="input-field text-base"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-semibold text-primary-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            placeholder="Enter quantity"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="input-field text-xl font-bold text-center h-12"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-semibold text-primary-700 mb-1">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateOrderItem(index, 'unit', e.target.value)}
                            className="input-field text-lg font-semibold h-12"
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
                          {/* Unit Mismatch Warning */}
                          {(() => {
                            const inventoryUnit = getInventoryItemUnit(item.itemName)
                            const hasUnitMismatch = inventoryUnit && inventoryUnit.toLowerCase() !== item.unit.toLowerCase()
                            return hasUnitMismatch && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                                <div className="flex items-center gap-2 text-amber-800">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="font-medium">Unit Mismatch Warning</span>
                                </div>
                                <p className="text-amber-700 mt-1">
                                  Inventory unit: <strong>{inventoryUnit}</strong> • PO unit: <strong>{item.unit}</strong>
                                </p>
                                <p className="text-amber-600 text-xs mt-1">
                                  This may require unit resolution during delivery.
                                </p>
                              </div>
                            )
                          })()}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-semibold text-primary-700 mb-1">Unit Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-500">₱</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateOrderItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className={`input-field pl-8 text-lg font-semibold h-12 ${item.lastModified === 'unitPrice' ? 'border-green-500 bg-green-50' : item.lastModified === 'total' ? 'border-blue-300 bg-blue-50' : ''}`}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-semibold text-primary-700 mb-1">Total Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-500">₱</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={item.total}
                              onChange={(e) => updateOrderItem(index, 'total', parseFloat(e.target.value) || 0)}
                              className={`input-field pl-8 text-lg font-semibold h-12 ${item.lastModified === 'total' ? 'border-green-500 bg-green-50' : item.lastModified === 'unitPrice' ? 'border-blue-300 bg-blue-50' : ''}`}
                            />
                          </div>
                        </div>
                      </div>
                      {/* Calculation and Remove Button */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-primary-100 mt-4">
                        <div className="flex-1">
                          <div className="text-xs text-primary-600 mb-2">Calculation:</div>
                          <div className="font-mono text-sm mb-1">
                            {item.lastModified === 'total' 
                              ? `₱${item.total.toFixed(2)} ÷ ${item.quantity} = ₱${item.unitPrice.toFixed(2)}/unit`
                              : `${item.quantity} × ₱${item.unitPrice.toFixed(2)} = ₱${item.total.toFixed(2)}`
                            }
                          </div>
                          <div className="font-medium text-base text-primary-700">Final Total: ₱{(item.quantity * item.unitPrice).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors text-sm font-semibold"
                            disabled={newOrder.items.length === 1}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Order Notes
                </label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Add any special instructions or notes for this order..."
                />
              </div>

              {/* Shipping Fee Section */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Shipping Fee
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-surface-600">₱</span>
                  <input
                    type="number"
                    value={newOrder.shippingFee}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, shippingFee: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="input-field flex-1"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  Shipping costs will be distributed across all items to calculate adjusted unit prices
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-surface-50 rounded-lg p-6 border border-surface-200">
                <h4 className="text-lg font-medium text-surface-900 mb-4">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Subtotal:</span>
                    <span className="font-medium">₱{calculateTotals(newOrder.items, newOrder.shippingFee).subtotal.toFixed(2)}</span>
                  </div>
                  {newOrder.shippingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-600">Shipping Fee:</span>
                      <span className="font-medium">₱{newOrder.shippingFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-surface-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span className="text-primary-600">₱{calculateTotals(newOrder.items, newOrder.shippingFee).total.toFixed(2)}</span>
                    </div>
                  </div>
                  {newOrder.shippingFee > 0 && newOrder.items.some(item => item.quantity > 0) && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">Adjusted Unit Prices (including shipping):</h5>
                      <div className="space-y-1 text-xs text-blue-700">
                        {newOrder.items.filter(item => item.quantity > 0).map((item, index) => {
                          const totalItemsQuantity = newOrder.items.reduce((sum, i) => sum + i.quantity, 0)
                          const shippingPerItem = totalItemsQuantity > 0 ? newOrder.shippingFee / totalItemsQuantity : 0
                          const adjustedUnitPrice = item.unitPrice + shippingPerItem
                          return (
                            <div key={index} className="flex justify-between">
                              <span>{item.itemName || `Item ${index + 1}`}:</span>
                              <span>₱{item.unitPrice.toFixed(2)} + ₱{shippingPerItem.toFixed(2)} = ₱{adjustedUnitPrice.toFixed(2)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-surface-200 bg-surface-50 rounded-b-xl">
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={!newOrder.supplierId || !newOrder.requestor || newOrder.items.some(item => !item.itemName.trim())}
                  className="btn-primary disabled:bg-surface-300 disabled:text-surface-500 disabled:cursor-not-allowed"
                >
                  Create Purchase Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-surface-900">Purchase Order Details</h3>
                  <p className="text-sm text-surface-600 mt-1">Order #{viewingOrder.orderNumber}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(viewingOrder.status)}`}>
                      {viewingOrder.status === 'partially_delivered' ? 'Partially Delivered' : viewingOrder.status}
                    </span>
                    {viewingOrder.status === 'partially_delivered' && (
                      <div className="text-sm text-amber-600 mt-1">
                        {(() => {
                          const receivedItems = viewingOrder.items.filter(item => (item.quantityReceived || 0) > 0).length
                          const totalItems = viewingOrder.items.length
                          return `${receivedItems}/${totalItems} items received`
                        })()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setViewingOrder(null)}
                    className="text-surface-400 hover:text-surface-600 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="px-8 py-6 space-y-8">
              {/* Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Supplier</label>
                  <p className="text-base text-surface-900">{viewingOrder.supplierName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Requested By</label>
                  <p className="text-base text-surface-900">{viewingOrder.requestor || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Created Date</label>
                  <p className="text-base text-surface-900">{viewingOrder.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Expected Delivery</label>
                  <p className="text-base text-surface-900">{viewingOrder.expectedDelivery?.toDate().toLocaleDateString()}</p>
                </div>
                {viewingOrder.actualDelivery && (
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Actual Delivery</label>
                    <p className="text-base text-surface-900">{viewingOrder.actualDelivery.toDate().toLocaleDateString()}</p>
                  </div>
                )}
                {viewingOrder.approvedBy && (
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Approved By</label>
                    <p className="text-base text-surface-900">{viewingOrder.approvedBy}</p>
                  </div>
                )}
                {viewingOrder.deliveredBy && (viewingOrder.status === 'delivered' || viewingOrder.status === 'partially_delivered') && (
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Received By</label>
                    <p className="text-base text-surface-900">{viewingOrder.deliveredBy}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-lg font-medium text-surface-900 mb-4">Order Items</h4>
                <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-surface-200">
                      <thead className="bg-surface-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Item Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-surface-200">
                        {viewingOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900">
                              {item.itemName}
                            </td>
                            <td className="px-6 py-4 text-sm text-surface-900">
                              {item.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">
                              ₱{item.unitPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900">
                              ₱{item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-surface-50 rounded-lg p-6 border border-surface-200">
                <h4 className="text-lg font-medium text-surface-900 mb-4">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Subtotal:</span>
                    <span className="font-medium">₱{viewingOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-surface-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span className="text-primary-600">₱{viewingOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingOrder.notes && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Order Notes</label>
                  <div className="bg-surface-50 rounded-lg p-4 border border-surface-200">
                    <p className="text-surface-900 whitespace-pre-wrap">{viewingOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="px-8 py-6 border-t border-surface-200 bg-surface-50 rounded-b-xl">
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="flex flex-wrap gap-3">
                  {viewingOrder.status === 'draft' && (
                    <button
                      onClick={() => {
                        handleUpdateStatus(viewingOrder.id!, 'pending')
                        setViewingOrder(null)
                      }}
                      className="btn-primary"
                    >
                      Submit for Approval
                    </button>
                  )}
                  {viewingOrder.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleUpdateStatus(viewingOrder.id!, 'approved')
                          setViewingOrder(null)
                        }}
                        className="btn-primary bg-green-600 hover:bg-green-700"
                      >
                        Approve Order
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateStatus(viewingOrder.id!, 'cancelled')
                          setViewingOrder(null)
                        }}
                        className="btn-secondary text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                      >
                        Cancel Order
                      </button>
                    </>
                  )}
                  {viewingOrder.status === 'approved' && (
                    <button
                      onClick={() => {
                        handleUpdateStatus(viewingOrder.id!, 'ordered')
                        setViewingOrder(null)
                      }}
                      className="btn-primary bg-purple-600 hover:bg-purple-700"
                    >
                      Mark as Ordered
                    </button>
                  )}
                  {(viewingOrder.status === 'ordered' || viewingOrder.status === 'partially_delivered') && (
                    <button
                      onClick={() => {
                        handleShowDeliveryModal(viewingOrder)
                        setViewingOrder(null)
                      }}
                      className={`btn-primary ${
                        viewingOrder.status === 'partially_delivered' 
                          ? 'bg-amber-600 hover:bg-amber-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      disabled={loadingDelivery === viewingOrder.id}
                    >
                      {loadingDelivery === viewingOrder.id 
                        ? 'Loading...' 
                        : viewingOrder.status === 'partially_delivered'
                        ? 'Continue Delivery'
                        : 'Mark as Delivered'
                      }
                    </button>
                  )}
                  {(viewingOrder.status === 'draft' || viewingOrder.status === 'pending') && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this purchase order?')) {
                          handleDeleteOrder(viewingOrder.id!)
                          setViewingOrder(null)
                        }
                      }}
                      className="btn-secondary text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Delete Order
                    </button>
                  )}
                  {/* PDF Download Button - Available for all orders */}
                  <button
                    onClick={() => generatePurchaseOrderDetailedPDF(viewingOrder)}
                    className="btn-secondary bg-blue-600 hover:bg-blue-700 text-white border-blue-600 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Detailed PDF
                  </button>
                </div>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Delivery Receipt Modal */}
      {showDeliveryModal && deliveringOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            
            {/* Clean Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Receipt</h2>
                  <div className="flex items-center gap-3 mt-1 text-gray-600">
                    <span className="font-medium">Order #{deliveringOrder.orderNumber}</span>
                    <span>•</span>
                    <span>{deliveringOrder.supplierName}</span>
                    <span>•</span>
                    <span className="text-sm">{deliveringOrder.expectedDelivery?.toDate().toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Side - Items Table */}
              <div className="flex-1 flex flex-col">
                
                {/* Toolbar */}
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Items to Receive</h3>
                    <span className="text-sm text-gray-500">{deliveryItems.length} items</span>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeliveryItems(prev => prev.map(item => ({
                          ...item,
                          quantityReceived: item.quantityOrdered
                        })))
                      }}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Receive All
                    </button>
                    
                    <button
                      onClick={() => {
                        setDeliveryItems(prev => prev.map(item => ({
                          ...item,
                          quantityReceived: 0
                        })))
                      }}
                      className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-4 font-semibold text-gray-900">Item</th>
                        <th className="text-center p-4 font-semibold text-gray-900 w-24">Ordered</th>
                        <th className="text-center p-4 font-semibold text-gray-900 w-32">Received</th>
                        <th className="text-center p-4 font-semibold text-gray-900 w-20">Unit</th>
                        <th className="text-right p-4 font-semibold text-gray-900 w-24">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryItems.map((item, index) => {
                        const originalItem = deliveringOrder.items.find(original => 
                          original.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
                        )
                        const previouslyReceived = originalItem?.quantityReceived || 0
                        const isFullyReceived = item.quantityReceived === item.quantityOrdered && item.quantityReceived > 0
                        const isPartialReceived = item.quantityReceived > 0 && item.quantityReceived < item.quantityOrdered
                        
                        return (
                          <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${
                            isFullyReceived ? 'bg-green-50' : isPartialReceived ? 'bg-amber-50' : ''
                          }`}>
                            {/* Item Name */}
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  isFullyReceived ? 'bg-green-500' : isPartialReceived ? 'bg-amber-500' : 'bg-gray-300'
                                }`}></div>
                                <div>
                                  <div className="font-medium text-gray-900">{item.itemName}</div>
                                  {deliveringOrder.status === 'partially_delivered' && previouslyReceived > 0 && (
                                    <div className="text-xs text-blue-600">
                                      Previously received: {previouslyReceived} {item.unit}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {/* Ordered Quantity */}
                            <td className="p-4 text-center">
                              <span className="font-semibold text-gray-900">{item.quantityOrdered}</span>
                            </td>
                            
                            {/* Received Quantity Input */}
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                {/* Minus Button */}
                                <button
                                  onClick={() => handleDeliveryQuantityChange(index, Math.max(0, item.quantityReceived - 1))}
                                  className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-50"
                                  disabled={item.quantityReceived <= 0}
                                >
                                  −
                                </button>
                                
                                {/* Quantity Input */}
                                <input
                                  type="number"
                                  value={item.quantityReceived}
                                  onChange={(e) => handleDeliveryQuantityChange(index, parseInt(e.target.value) || 0)}
                                  className={`w-16 h-10 text-center font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                                    isFullyReceived 
                                      ? 'border-green-300 bg-green-50 text-green-800'
                                      : isPartialReceived
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-gray-300 bg-white text-gray-900'
                                  }`}
                                  min="0"
                                  max={item.quantityOrdered}
                                />
                                
                                {/* Plus Button */}
                                <button
                                  onClick={() => handleDeliveryQuantityChange(index, Math.min(item.quantityOrdered, item.quantityReceived + 1))}
                                  className="w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-50"
                                  disabled={item.quantityReceived >= item.quantityOrdered}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            
                            {/* Unit */}
                            <td className="p-4 text-center text-gray-600">
                              {item.unit}
                            </td>
                            
                            {/* Price */}
                            <td className="p-4 text-right text-gray-900 font-medium">
                              ₱{item.unitPrice.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side - Summary & Actions */}
              <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
                
                {/* Receiver Info */}
                <div className="p-6 border-b border-gray-200 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-4">Receiver Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Received By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter receiver's name"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      {['Manager', 'Staff', 'Owner'].map(role => (
                        <button
                          key={role}
                          onClick={() => setReceivedBy(role)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-1 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
                  
                  {(() => {
                    const partialItems = deliveryItems.filter(item => item.quantityReceived > 0 && item.quantityReceived < item.quantityOrdered)
                    const fullItems = deliveryItems.filter(item => item.quantityReceived === item.quantityOrdered && item.quantityReceived > 0)
                    const noReceived = deliveryItems.filter(item => item.quantityReceived === 0)
                    
                    return (
                      <div className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-green-100 rounded-lg p-3">
                            <div className="text-xl font-bold text-green-600">{fullItems.length}</div>
                            <div className="text-xs text-green-600">Complete</div>
                          </div>
                          <div className="bg-amber-100 rounded-lg p-3">
                            <div className="text-xl font-bold text-amber-600">{partialItems.length}</div>
                            <div className="text-xs text-amber-600">Partial</div>
                          </div>
                          <div className="bg-gray-100 rounded-lg p-3">
                            <div className="text-xl font-bold text-gray-600">{noReceived.length}</div>
                            <div className="text-xs text-gray-600">Pending</div>
                          </div>
                        </div>

                        {/* Status Messages */}
                        {partialItems.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <span className="text-sm font-medium text-amber-800">Partial Delivery</span>
                            </div>
                            <p className="text-xs text-amber-700">
                              Order will remain open for future deliveries
                            </p>
                          </div>
                        )}

                        {fullItems.length === deliveryItems.length && deliveryItems.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-800">Complete Delivery</span>
                            </div>
                            <p className="text-xs text-green-700">
                              All items received, order will be marked as delivered
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t border-gray-200 bg-white">
                  <div className="space-y-3">
                    <button
                      onClick={handleConfirmDelivery}
                      disabled={isDelivering || !receivedBy.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDelivering ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Confirm Delivery
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowDeliveryModal(false)}
                      disabled={isDelivering}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Inventory Modal */}
      {showInventoryModal && missingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900">Item Not Found in Inventory</h3>
              <p className="text-sm text-surface-600 mt-1">Would you like to add this item to your inventory?</p>
            </div>
            
            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-blue-800">
                      The item <strong>&ldquo;{missingItem.itemName}&rdquo;</strong> is not currently in your inventory. 
                      Adding it will help you track stock levels and manage orders more effectively.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={missingItem.itemName}
                    readOnly
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg bg-surface-50 text-surface-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={missingItem.unit}
                      readOnly
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg bg-surface-50 text-surface-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Unit Price</label>
                    <input
                      type="text"
                      value={`₱${missingItem.unitPrice.toFixed(2)}`}
                      readOnly
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg bg-surface-50 text-surface-900"
                    />
                  </div>
                </div>
                <div className="text-xs text-surface-500">
                  Default settings: Category: General, Min Stock: 5, Max Stock: 100, Initial Stock: 0
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowInventoryModal(false)
                  setMissingItem(null)
                }}
                className="px-4 py-2 text-surface-700 border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleAddToInventory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Mismatch Resolution Modal */}
      {showUnitMismatchModal && unitMismatches.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-200 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">Unit Mismatch Detected</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    The following items have different units between the purchase order and inventory. 
                    Choose how to resolve each mismatch.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {unitMismatches.map((mismatch, index) => (
                <div key={mismatch.itemName} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                  <div className="mb-4">
                    <h4 className="font-medium text-amber-900 mb-2">
                      📦 {mismatch.itemName}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Inventory Unit</div>
                        <div className="font-semibold text-blue-700">{mismatch.expectedUnit}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Purchase Order Unit</div>
                        <div className="font-semibold text-amber-700">{mismatch.receivedUnit}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Quantity Received</div>
                        <div className="font-semibold text-green-700">{mismatch.quantity}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleResolveUnitMismatch(mismatch.itemName, mismatch.receivedUnit, mismatch.quantity)}
                      disabled={resolvingMismatch}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolvingMismatch ? 'Updating...' : `Update Inventory to "${mismatch.receivedUnit}"`}
                    </button>
                    <button
                      onClick={() => {
                        // Remove this mismatch from the list (skip resolution)
                        setUnitMismatches(prev => prev.filter(m => m.itemName !== mismatch.itemName))
                        if (unitMismatches.length === 1) {
                          setShowUnitMismatchModal(false)
                        }
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Skip This Item
                    </button>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Recommended:</strong> Update the inventory unit to match your purchase order (&ldquo;{mismatch.receivedUnit}&rdquo;) 
                      to maintain consistency and avoid future mismatches.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-surface-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {unitMismatches.length} unit mismatch{unitMismatches.length !== 1 ? 'es' : ''} remaining
                </div>
                <button
                  onClick={() => {
                    setShowUnitMismatchModal(false)
                    setUnitMismatches([])
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
