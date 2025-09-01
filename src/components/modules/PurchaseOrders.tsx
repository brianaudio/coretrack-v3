'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FaStickyNote, FaTruck } from 'react-icons/fa'
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
  deliverPurchaseOrderAtomic,
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

    // QUOTA OPTIMIZATION: Retry mechanism for quota exceeded errors
    const deliveryWithRetry = async (retryCount = 0): Promise<any> => {
      try {
        setIsDelivering(true)
        
        // Validate required fields
        if (!receivedBy.trim()) {
          alert('Please enter the name of the person who received the delivery.')
          return { success: false, error: 'No receiver name provided' }
        }
        
        // Filter out items with zero quantity received
        const itemsToDeliver = deliveryItems.filter(item => item.quantityReceived > 0)
        
        if (itemsToDeliver.length === 0) {
          alert('Please specify quantities received for at least one item.')
          return { success: false, error: 'No items to deliver' }
        }

        console.log(`🚀 Starting quota-optimized delivery transaction... (attempt ${retryCount + 1})`)
        
        // **QUOTA OPTIMIZED: Use quota-efficient atomic transaction**
        const result = await deliverPurchaseOrderAtomic(
          profile.tenantId,
          deliveringOrder.id!,
          itemsToDeliver.map(item => ({
            itemName: item.itemName,
            quantityReceived: item.quantityReceived,
            unit: item.unit,
            unitPrice: item.unitPrice
          })),
          receivedBy.trim()
        )

        return result
      } catch (error: any) {
        // QUOTA HANDLING: Check if it's a quota exceeded error
        const errorMessage = error?.message || String(error)
        
        if (errorMessage.includes('Quota exceeded') || errorMessage.includes('resource-exhausted')) {
          if (retryCount < 2) { // Max 3 attempts
            const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
            console.log(`⏳ Quota exceeded, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`)
            
            // Show user feedback
            alert(`Firebase quota exceeded. Retrying in ${delay/1000} seconds... (${retryCount + 1}/3)`)
            
            await new Promise(resolve => setTimeout(resolve, delay))
            return deliveryWithRetry(retryCount + 1)
          } else {
            throw new Error('Firebase quota exceeded after 3 attempts. Please try again in a few minutes.')
          }
        }
        
        throw error
      }
    }

    try {
      const result = await deliveryWithRetry()

      if (result.success) {
        console.log('✅ Quota-optimized delivery transaction successful')
        
        // Get items to deliver for validation processing
        const itemsToDeliver = deliveryItems.filter(item => item.quantityReceived > 0)
        
        // **SURGICAL PRECISION: Only update UI after confirmed success**
        setDeliveryResult(result.inventoryUpdateResult || null)
        
        // Handle validation results
        if (result.inventoryUpdateResult) {
          const { notFoundItems, unitMismatches, updatedItems } = result.inventoryUpdateResult
          
          if (notFoundItems.length > 0) {
            alert(`⚠️ Some items were not found in inventory: ${notFoundItems.join(', ')}\n\nThe delivery was processed successfully for ${updatedItems.length} items.`)
          }
          
          if (unitMismatches.length > 0) {
            const mismatchesWithQuantity = unitMismatches.map((mismatch: any) => {
              const deliveredItem = itemsToDeliver.find((item: any) => 
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

          if (updatedItems.length > 0) {
            console.log(`📦 Successfully updated inventory for: ${updatedItems.join(', ')}`)
          }
        }
        
        // **SURGICAL PRECISION: Close modal only after confirmed success**
        setShowDeliveryModal(false)
        setDeliveringOrder(null)
        
        // **SURGICAL PRECISION: Refresh data to ensure UI consistency**
        setDataCache({ timestamp: 0, data: null }) // Force cache refresh
        window.location.reload() // Comprehensive refresh
        
        // **PERFORMANCE: Send notification asynchronously (don't wait)**
        notifyDeliveryReceived(
          profile.tenantId,
          deliveringOrder.orderNumber,
          receivedBy.trim(),
          'complete' // We'll let the atomic function determine the actual status
        ).catch(error => console.error('Notification error:', error))

      } else {
        // **SURGICAL PRECISION: Show exact error message from transaction**
        console.error('❌ Atomic delivery transaction failed:', result.error)
        
        if (result.error?.includes('already been delivered')) {
          alert('This purchase order has already been delivered. The data will be refreshed to show the current status.')
          setDataCache({ timestamp: 0, data: null }) // Force cache refresh
          window.location.reload()
        } else if (result.error?.includes('not found')) {
          alert('Purchase order not found. It may have been deleted. The data will be refreshed.')
          setDataCache({ timestamp: 0, data: null }) // Force cache refresh
          window.location.reload()
        } else if (result.error?.includes('Validation failed')) {
          // Show validation results
          if (result.inventoryUpdateResult) {
            const { notFoundItems, unitMismatches } = result.inventoryUpdateResult
            let errorMessage = 'Validation failed:\n'
            
            if (notFoundItems.length > 0) {
              errorMessage += `\n• Items not found in inventory: ${notFoundItems.join(', ')}`
            }
            
            if (unitMismatches.length > 0) {
              errorMessage += `\n• Unit mismatches: ${unitMismatches.map((m: any) => 
                `${m.itemName} (expected: ${m.expectedUnit}, received: ${m.receivedUnit})`
              ).join(', ')}`
            }
            
            alert(errorMessage)
          } else {
            alert(`Delivery validation failed: ${result.error}`)
          }
        } else {
          alert(`Failed to process delivery: ${result.error || 'Unknown error'}`)
        }
      }
      
    } catch (error) {
      console.error('❌ Critical error during atomic delivery:', error)
      alert(`Critical error during delivery processing: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Refresh data to ensure UI consistency
      setDataCache({ timestamp: 0, data: null }) // Force cache refresh
      window.location.reload()
      
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
      <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100">
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="h-10 bg-gradient-to-r from-surface-200 to-surface-300 rounded-2xl w-80"></div>
                <div className="h-4 bg-surface-200 rounded-lg w-96"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-12 bg-surface-200 rounded-xl w-32"></div>
                <div className="h-12 bg-surface-200 rounded-xl w-32"></div>
              </div>
            </div>
            
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-surface-100 rounded-xl"></div>
                  </div>
                  <div className="h-8 bg-surface-200 rounded-lg w-12 mb-2"></div>
                  <div className="h-4 bg-surface-200 rounded w-20"></div>
                </div>
              ))}
            </div>
            
            {/* Filters Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="h-12 bg-surface-200 rounded-xl"></div>
                </div>
                <div className="flex gap-3">
                  <div className="h-12 bg-surface-200 rounded-xl w-32"></div>
                  <div className="h-12 bg-surface-200 rounded-xl w-32"></div>
                </div>
              </div>
            </div>
            
            {/* Table Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-surface-200/50 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-surface-50 to-surface-100/50 p-4">
                <div className="grid grid-cols-7 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="h-4 bg-surface-200 rounded"></div>
                  ))}
                </div>
              </div>
              
              {/* Table Rows */}
              <div className="divide-y divide-surface-100">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="p-4">
                    <div className="grid grid-cols-7 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7].map(j => (
                        <div key={j} className="h-4 bg-surface-100 rounded"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white space-y-8">
      {/* Modern Ultra-Clean Header - Capital Intelligence Style */}
      <div className="bg-gradient-to-br from-gray-50 to-white backdrop-blur-lg border border-white/20 rounded-3xl p-12 shadow-2xl shadow-gray-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Purchase Orders</h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
                Streamlined supplier ordering with automated inventory integration and delivery tracking.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right space-y-2">
              <div className="text-sm text-gray-500 font-light">Branch Location</div>
              <div className="text-2xl font-light tracking-tight text-blue-900">
                📍 {selectedBranch?.name || 'Main Branch'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Modern Action Cards */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-gray-900 tracking-wide">Quick Actions</h2>
              <p className="text-sm text-gray-500 leading-relaxed">Manage purchase orders and supplier relationships efficiently</p>
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const filteredOrders = statusFilter === 'all' 
                    ? orders 
                    : orders.filter(order => order.status === statusFilter)
                  generatePurchaseOrderSummaryPDF(filteredOrders)
                }}
                className="px-6 py-3 backdrop-blur-sm border rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium bg-white/80 text-gray-700 border-gray-200 hover:bg-white hover:shadow-gray-500/20 disabled:opacity-50"
                disabled={orders.length === 0}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium shadow-blue-500/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Order
              </button>
            </div>
          </div>
        </div>

        {/* Modern Stats Cards - Capital Intelligence Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Total Orders */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">{orders.length}</p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Total Orders</p>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Pending Approval</p>
              </div>
            </div>
          </div>

          {/* Ordered */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">
                  {orders.filter(o => o.status === 'ordered').length}
                </p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Currently Ordered</p>
              </div>
            </div>
          </div>

          {/* Partial Delivery */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">
                  {orders.filter(o => o.status === 'partially_delivered').length}
                </p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Partial Delivery</p>
              </div>
            </div>
          </div>

          {/* Delivered */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section - Capital Intelligence Style */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search orders, suppliers, items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/90 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 text-gray-900 placeholder-gray-500 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white/90 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 text-gray-900 min-w-[120px] backdrop-blur-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered</option>
                <option value="partially_delivered">Partial</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <label className="flex items-center gap-3 px-4 py-3 bg-white/90 border border-gray-200 rounded-2xl hover:bg-white transition-all duration-300 cursor-pointer backdrop-blur-sm">
                <input
                  type="checkbox"
                  checked={showRecentOrders}
                  onChange={(e) => setShowRecentOrders(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Last 7 days</span>
              </label>
            </div>
          </div>
        </div>

        {/* Orders List - Capital Intelligence Style */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl overflow-hidden">
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-light text-gray-700 tracking-wide">Order</th>
                    <th className="px-6 py-4 text-left text-sm font-light text-gray-700 tracking-wide">Supplier</th>
                    <th className="px-6 py-4 text-center text-sm font-light text-gray-700 tracking-wide">Items</th>
                    <th className="px-6 py-4 text-right text-sm font-light text-gray-700 tracking-wide">Amount</th>
                    <th className="px-6 py-4 text-center text-sm font-light text-gray-700 tracking-wide">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-light text-gray-700 tracking-wide">Date</th>
                    <th className="px-6 py-4 text-center text-sm font-light text-gray-700 tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id} className={`hover:bg-surface-50/50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-surface-50/30'}`}>
                      {/* Order Number */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-surface-900">{order.orderNumber}</div>
                          <div className="text-xs text-surface-500 mt-0.5">
                            by {order.requestor || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      
                      {/* Supplier */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-surface-900">{order.supplierName}</div>
                      </td>
                      
                      {/* Items */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          {order.items.length}
                        </div>
                      </td>
                      
                      {/* Total Amount */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-lg text-surface-900">₱{order.total.toFixed(2)}</div>
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status === 'partially_delivered' ? 'Partial' : order.status}
                          </span>
                          {order.status === 'partially_delivered' && (
                            <div className="text-xs text-amber-600">
                              {(() => {
                                const receivedItems = order.items.filter(item => (item.quantityReceived || 0) > 0).length
                                const totalItems = order.items.length
                                return `${receivedItems}/${totalItems} items`
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Date */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-surface-600">
                          {order.createdAt?.toDate().toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          
                          {/* Express Mode for Small Orders */}
                          {(order.status === 'draft' || order.status === 'pending') && order.total <= 5000 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Express process ${order.supplierName} order for ₱${order.total.toFixed(2)}?`)) {
                                  handleUpdateStatus(order.id!, 'approved')
                                  setTimeout(() => handleUpdateStatus(order.id!, 'ordered'), 500)
                                  setTimeout(() => {
                                    setReceivedBy('Manager')
                                    setDeliveryItems(order.items.map(item => ({
                                      itemName: item.itemName,
                                      quantityOrdered: item.quantity,
                                      quantityReceived: item.quantity,
                                      unit: item.unit,
                                      unitPrice: item.unitPrice
                                    })))
                                    setDeliveringOrder(order)
                                    setShowDeliveryModal(true)
                                  }, 1000)
                                }
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-blue-700 hover:shadow-md transition-all duration-200 transform hover:scale-105"
                              title="Express: Approve → Order → Deliver"
                            >
                              ⚡ Express
                            </button>
                          )}
                          
                          {/* Status Action Buttons */}
                          {order.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateStatus(order.id!, 'pending')
                              }}
                              className="px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 hover:shadow-md transition-all duration-200"
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
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 hover:shadow-md transition-all duration-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateStatus(order.id!, 'cancelled')
                                }}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 hover:shadow-md transition-all duration-200"
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
                              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 hover:shadow-md transition-all duration-200"
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
                              className={`px-3 py-1.5 text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all duration-200 ${
                                order.status === 'partially_delivered' 
                                  ? 'bg-amber-600 hover:bg-amber-700' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                              disabled={loadingDelivery === order.id}
                            >
                              {loadingDelivery === order.id 
                                ? '...' 
                                : order.status === 'partially_delivered'
                                ? 'Continue'
                                : 'Deliver'
                              }
                            </button>
                          )}
                          
                          {/* Secondary Actions */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => setViewingOrder(order)}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={() => generatePurchaseOrderDetailedPDF(order)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                              title="Download PDF"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            
                            {(order.status === 'draft' || order.status === 'pending') && (
                              <button
                                onClick={() => handleDeleteOrder(order.id!)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Order"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Empty State */
            <div className="px-6 py-16 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-surface-100 to-surface-200 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-surface-900 mb-3">No Purchase Orders Found</h3>
              <p className="text-surface-600 max-w-md mx-auto mb-6">
                {searchTerm || statusFilter !== 'all' || showRecentOrders
                  ? 'No orders match your current filters. Try adjusting your search criteria to find what you\'re looking for.'
                  : 'Create your first purchase order to start managing supplier relationships and inventory restocking efficiently.'
                }
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-medium"
              >
                Create Your First Order
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {/* Create Order Modal - Sleek & Minimalist Design */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-surface-200/50 w-full max-w-6xl max-h-[95vh] overflow-hidden animate-slide-up">
            
            {/* Enhanced Modal Header */}
            <div className="relative bg-gradient-to-r from-primary-50/80 via-white/90 to-primary-50/80 backdrop-blur-sm border-b border-surface-200/50">
              <div className="px-8 py-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-surface-900 via-primary-600 to-surface-800 bg-clip-text text-transparent">
                      Create Purchase Order
                    </h3>
                    <p className="text-surface-600 text-base">Build your supplier order with smart inventory integration</p>
                  </div>
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-12 h-12 bg-surface-100/80 hover:bg-surface-200/80 rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 hover:rotate-90 group"
                  >
                    <svg className="w-5 h-5 text-surface-600 group-hover:text-surface-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Content with Enhanced Design */}
            <div className="overflow-y-auto flex-1 max-h-[calc(95vh-200px)]">
              <div className="px-8 py-8 space-y-10">
                
                {/* Supplier & Delivery Section - Modern Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Supplier Card */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-primary-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50 hover:border-primary-300/50 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-surface-800">Supplier Name</label>
                          <span className="text-xs text-red-500 font-medium">Required</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={newOrder.supplierId}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, supplierId: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/90 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all duration-200 text-surface-900 placeholder-surface-500 font-medium"
                        placeholder="Enter supplier name..."
                        list="suppliers-datalist"
                      />
                      <datalist id="suppliers-datalist">
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.name} />
                        ))}
                      </datalist>
                      {suppliers.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50/80 rounded-lg border border-blue-200/50">
                          <p className="text-xs font-medium text-blue-700 mb-1">Existing Suppliers:</p>
                          <div className="flex flex-wrap gap-1">
                            {suppliers.slice(0, 3).map((supplier, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
                                {supplier.name}
                              </span>
                            ))}
                            {suppliers.length > 3 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-medium">
                                +{suppliers.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requestor Card */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50 hover:border-green-300/50 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-surface-800">Requested By</label>
                          <span className="text-xs text-red-500 font-medium">Required</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={newOrder.requestor || ''}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, requestor: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/90 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all duration-200 text-surface-900 placeholder-surface-500 font-medium"
                        placeholder="Enter your name..."
                      />
                    </div>
                  </div>

                  {/* Delivery Date Card */}
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50 hover:border-purple-300/50 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-surface-800">Expected Delivery</label>
                          <span className="text-xs text-red-500 font-medium">Required</span>
                        </div>
                      </div>
                      <input
                        type="date"
                        value={newOrder.expectedDelivery.toISOString().split('T')[0]}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, expectedDelivery: new Date(e.target.value) }))}
                        className="w-full px-4 py-3 bg-white/90 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all duration-200 text-surface-900 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section - Enhanced Design */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-surface-900">Order Items</h4>
                      <p className="text-surface-600">Add products with intelligent inventory suggestions</p>
                    </div>
                    <button
                      onClick={addOrderItem}
                      className="group px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 hover:shadow-lg transition-all duration-200 flex items-center gap-3 font-medium hover:scale-105 active:scale-95"
                    >
                      <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform duration-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      Add New Item
                    </button>
                  </div>

                  {/* Modern Items List */}
                  <div className="space-y-6">
                    {newOrder.items.map((item, index) => (
                      <div key={index} className="group relative overflow-hidden bg-white/90 backdrop-blur-sm rounded-2xl border border-surface-200/50 hover:border-primary-300/50 transition-all duration-300 hover:shadow-xl">
                        
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/20 via-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Item Content */}
                        <div className="relative p-8 space-y-6">
                          
                          {/* Item Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center">
                                <span className="text-sm font-bold text-primary-600">#{index + 1}</span>
                              </div>
                              <h5 className="text-lg font-semibold text-surface-900">Item Details</h5>
                            </div>
                            <button
                              onClick={() => removeOrderItem(index)}
                              disabled={newOrder.items.length === 1}
                              className="group/btn w-10 h-10 bg-red-50 hover:bg-red-100 disabled:bg-surface-100 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4 text-red-500 group-hover/btn:text-red-600 disabled:text-surface-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          {/* Item Fields Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                            
                            {/* Item Name - Enhanced */}
                            <div className="lg:col-span-2 xl:col-span-2">
                              <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-3">
                                <div className="w-4 h-4 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                                Item Name
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Enter item name..."
                                  value={item.itemName}
                                  onChange={(e) => updateOrderItem(index, 'itemName', e.target.value)}
                                  className={`w-full px-4 py-3 bg-white/90 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 font-medium ${
                                    item.itemName.trim() && !checkItemInInventory(item.itemName)
                                      ? 'border-amber-300 bg-amber-50 focus:ring-amber-500/30 focus:border-amber-400'
                                      : 'border-surface-200 focus:ring-primary-500/30 focus:border-primary-400'
                                  }`}
                                  list={`inventory-items-${index}`}
                                />
                                <datalist id={`inventory-items-${index}`}>
                                  {inventoryItems.map((invItem) => (
                                    <option key={invItem.id} value={invItem.name} />
                                  ))}
                                </datalist>
                                
                                {/* Inventory Status */}
                                {item.itemName.trim() && !checkItemInInventory(item.itemName) && (
                                  <div className="mt-2 p-2 bg-amber-50/80 border border-amber-200/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <div className="w-4 h-4 bg-amber-100 rounded flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-medium text-amber-700">New item - will be added to inventory</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Description - Enhanced */}
                            <div className="lg:col-span-1 xl:col-span-2">
                              <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-3">
                                <div className="w-4 h-4 bg-green-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                  </svg>
                                </div>
                                Description
                              </label>
                              <input
                                type="text"
                                placeholder="Item details..."
                                value={item.description}
                                onChange={(e) => updateOrderItem(index, 'description', e.target.value)}
                                className="w-full px-4 py-3 bg-white/90 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all duration-200"
                              />
                            </div>

                            {/* Quantity - Enhanced */}
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-3">
                                <div className="w-4 h-4 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                </div>
                                Qty
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  placeholder="0"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-4 py-3 bg-white/90 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all duration-200 text-xl font-bold text-center"
                                />
                              </div>
                            </div>

                            {/* Unit - Enhanced */}
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-3">
                                <div className="w-4 h-4 bg-indigo-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-9M9 3l3-1m0 0l3 1M9 3l3 1M9 3v4m6 0V3" />
                                  </svg>
                                </div>
                                Unit
                              </label>
                              <select
                                value={item.unit}
                                onChange={(e) => updateOrderItem(index, 'unit', e.target.value)}
                                className="w-full px-4 py-3 bg-white/90 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200 font-semibold"
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
                                  <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200/50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-4 h-4 bg-amber-100 rounded flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-semibold text-amber-800">Unit Mismatch</span>
                                    </div>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                      Inventory: <strong>{inventoryUnit}</strong> • PO: <strong>{item.unit}</strong><br/>
                                      May require resolution during delivery.
                                    </p>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Unit Price - Enhanced */}
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-3">
                                <div className="w-4 h-4 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                </div>
                                Unit Price
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <span className="text-emerald-500 font-bold text-lg">₱</span>
                                </div>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateOrderItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className={`w-full pl-10 pr-4 py-3 bg-white/90 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-lg font-bold ${
                                    item.lastModified === 'unitPrice'
                                      ? 'border-green-300 bg-green-50/50 focus:ring-green-500/30 focus:border-green-400'
                                      : item.lastModified === 'total'
                                      ? 'border-blue-300 bg-blue-50/50 focus:ring-blue-500/30 focus:border-blue-400'
                                      : 'border-surface-200 focus:ring-emerald-500/30 focus:border-emerald-400'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Total Price - Enhanced */}
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 mb-3">
                                <div className="w-4 h-4 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                Total
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <span className="text-orange-500 font-bold text-lg">₱</span>
                                </div>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  value={item.total}
                                  onChange={(e) => updateOrderItem(index, 'total', parseFloat(e.target.value) || 0)}
                                  className={`w-full pl-10 pr-4 py-3 bg-white/90 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-lg font-bold ${
                                    item.lastModified === 'total'
                                      ? 'border-green-300 bg-green-50/50 focus:ring-green-500/30 focus:border-green-400'
                                      : item.lastModified === 'unitPrice'
                                      ? 'border-blue-300 bg-blue-50/50 focus:ring-blue-500/30 focus:border-blue-400'
                                      : 'border-surface-200 focus:ring-orange-500/30 focus:border-orange-400'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Calculation Display - Enhanced */}
                          <div className="bg-gradient-to-r from-surface-50/80 to-primary-50/50 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <div className="text-xs font-semibold text-surface-600 mb-2 flex items-center gap-2">
                                  <div className="w-3 h-3 bg-primary-100 rounded flex items-center justify-center">
                                    <svg className="w-1.5 h-1.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  Smart Calculation
                                </div>
                                <div className="font-mono text-sm text-surface-700 bg-white/60 rounded-lg px-3 py-2">
                                  {item.lastModified === 'total' 
                                    ? `₱${item.total.toFixed(2)} ÷ ${item.quantity} = ₱${item.unitPrice.toFixed(2)}/unit`
                                    : `${item.quantity} × ₱${item.unitPrice.toFixed(2)} = ₱${item.total.toFixed(2)}`
                                  }
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-semibold text-surface-600 mb-2">Final Total</div>
                                <div className="text-2xl font-bold text-primary-600">₱{(item.quantity * item.unitPrice).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {newOrder.items.length === 0 && (
                      <div className="text-center py-16">
                        <div className="bg-surface-100/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <svg className="w-8 h-8 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <p className="text-surface-500 text-lg font-medium">No items added yet</p>
                        <p className="text-surface-400 text-sm mt-2">Click "Add New Item" to get started</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                        <FaStickyNote className="text-purple-600" size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Notes & Instructions</h3>
                    </div>
                    <textarea
                      placeholder="Add any special instructions or notes for this purchase order..."
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="input-field text-lg resize-none"
                    />
                  </div>
                </div>

                {/* Shipping Fee Section */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                        <FaTruck className="text-green-600" size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Shipping & Fees</h3>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg font-semibold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Enter shipping fee"
                        value={newOrder.shippingFee || ''}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, shippingFee: parseFloat(e.target.value) || 0 }))}
                        className="input-field pl-8 text-lg font-semibold h-14"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gradient-to-br from-blue-50/80 via-white/95 to-indigo-50/80 backdrop-blur-md rounded-3xl border border-blue-100 shadow-xl">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                      Order Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-gray-600">Subtotal:</span>
                        <span className="font-bold text-xl text-gray-800">${calculateTotals(newOrder.items, newOrder.shippingFee || 0).subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-gray-600">Shipping Fee:</span>
                        <span className="font-bold text-xl text-gray-800">${(newOrder.shippingFee || 0).toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      <div className="flex justify-between items-center text-xl">
                        <span className="font-bold text-gray-800">Total:</span>
                        <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          ${calculateTotals(newOrder.items, newOrder.shippingFee || 0).total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-8 py-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 btn-secondary py-4 text-lg font-medium transition-all duration-200 hover:scale-[1.02]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    disabled={!newOrder.supplierId || newOrder.items.length === 0}
                    className="flex-1 btn-primary py-4 text-lg font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Purchase Order
                  </button>
                </div>
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
    </div>
  )
}
