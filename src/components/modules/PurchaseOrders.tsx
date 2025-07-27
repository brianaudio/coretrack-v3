'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
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
  type InventoryItem
} from '../../lib/firebase/inventory'

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

  const [newOrder, setNewOrder] = useState({
    supplierId: '',
    requestor: '',
    items: [{ itemName: '', description: '', quantity: 1, unit: 'piece', unitPrice: 0, total: 0 }] as PurchaseOrderItem[],
    expectedDelivery: new Date(),
    notes: ''
  })

  const [deliveryItems, setDeliveryItems] = useState<Array<{
    itemName: string;
    quantityOrdered: number;
    quantityReceived: number;
    unit: string;
    unitPrice: number;
  }>>([])

  const [deliveryResult, setDeliveryResult] = useState<{
    updatedItems: string[];
    notFoundItems: string[];
    unitMismatches: Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>;
  } | null>(null)

  const [isDelivering, setIsDelivering] = useState(false)
  const [loadingDelivery, setLoadingDelivery] = useState<string | null>(null)

  // Load purchase orders and suppliers
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) return

    const loadData = async () => {
      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        
        console.log('🔄 PO - Loading data for branch:', selectedBranch.name, 'locationId:', locationId)
        
        const [ordersData, suppliersData, inventoryData] = await Promise.all([
          getPurchaseOrders(profile.tenantId, locationId),
          getSuppliers(profile.tenantId),
          getInventoryItems(profile.tenantId, locationId)
        ])
        setOrders(ordersData)
        setSuppliers(suppliersData)
        setInventoryItems(inventoryData)
      } catch (error) {
        console.error('Error loading purchase orders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.tenantId, selectedBranch?.id])

  const calculateTotals = (items: PurchaseOrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    return {
      subtotal,
      tax: 0,
      total: subtotal
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

      const { subtotal, tax, total } = calculateTotals(updatedItems)

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
        items: [{ itemName: '', description: '', quantity: 1, unit: 'piece', unitPrice: 0, total: 0 }],
        expectedDelivery: new Date(),
        notes: ''
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating purchase order:', error)
    }
  }

  const handleUpdateStatus = async (orderId: string, status: PurchaseOrder['status']) => {
    if (!profile?.tenantId) return

    try {
      const approvedBy = status === 'approved' ? profile.tenantId : undefined
      await updatePurchaseOrderStatus(profile.tenantId, orderId, status, approvedBy)
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status,
              ...(status === 'approved' && { approvedBy: profile.tenantId })
            } 
          : order
      ))
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
      
      if (latestOrder.status !== 'ordered') {
        alert(`Cannot deliver order. Current status: ${latestOrder.status}`)
        // Update local state
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: latestOrder.status } : o
        ))
        return
      }
      
      setDeliveringOrder(latestOrder)
      setDeliveryItems(latestOrder.items.map(item => ({
        itemName: item.itemName,
        quantityOrdered: item.quantity,
        quantityReceived: item.quantity, // Always default to full quantity for new delivery
        unit: item.unit,
        unitPrice: item.unitPrice
      })))
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

  const handleDeliveryQuantityChange = (index: number, quantityReceived: number) => {
    setDeliveryItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantityReceived: Math.max(0, quantityReceived) } : item
    ))
  }

  const handleConfirmDelivery = async () => {
    if (!profile?.tenantId || !deliveringOrder || isDelivering) return

    try {
      setIsDelivering(true)
      
      // Check if order is still in 'ordered' status before proceeding
      if (deliveringOrder.status !== 'ordered') {
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

      const result = await deliverPurchaseOrder(
        profile.tenantId,
        deliveringOrder.id!,
        itemsToDeliver.map(item => ({
          itemName: item.itemName,
          quantityReceived: item.quantityReceived,
          unit: item.unit,
          unitPrice: item.unitPrice
        })),
        profile.tenantId
      )

      if (result.success) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === deliveringOrder.id 
            ? { 
                ...order, 
                status: 'delivered' as const,
                deliveredBy: profile.tenantId,
                deliveredAt: new Date() as any,
                items: order.items.map(item => {
                  const deliveredItem = itemsToDeliver.find(di => 
                    di.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
                  )
                  return {
                    ...item,
                    quantityReceived: deliveredItem ? deliveredItem.quantityReceived : (item.quantityReceived || 0)
                  }
                })
              } 
            : order
        ))

        setDeliveryResult(result.inventoryUpdateResult || null)
        
        // Don't close modal immediately if there are issues to show
        if (result.inventoryUpdateResult && 
            (result.inventoryUpdateResult.notFoundItems.length > 0 || 
             result.inventoryUpdateResult.unitMismatches.length > 0)) {
          // Keep modal open to show results
        } else {
          setShowDeliveryModal(false)
          setDeliveringOrder(null)
        }
      }
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

  const addOrderItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { itemName: '', description: '', quantity: 1, unit: 'piece', unitPrice: 0, total: 0 }]
    }))
  }

  const updateOrderItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item
        
        const updatedItem = { ...item, [field]: value }
        
        // Recalculate total when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
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
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Order
        </button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {filteredOrders.map((order) => (
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
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.createdAt?.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
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

                {/* Items Table Header - Hidden on Mobile */}
                <div className="hidden md:grid grid-cols-12 gap-4 mb-3 px-4 py-2 bg-surface-50 rounded-lg text-sm font-medium text-surface-700">
                  <div className="col-span-3">Item Name</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="border border-surface-200 rounded-lg p-4 bg-surface-50">
                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-surface-600 mb-1">Item Name</label>
                          <input
                            type="text"
                            placeholder="Enter item name"
                            value={item.itemName}
                            onChange={(e) => updateOrderItem(index, 'itemName', e.target.value)}
                            className="input-field"
                            list={`inventory-items-${index}`}
                          />
                          <datalist id={`inventory-items-${index}`}>
                            {inventoryItems.map((invItem) => (
                              <option key={invItem.id} value={invItem.name} />
                            ))}
                          </datalist>
                          {inventoryItems.length > 0 && (
                            <p className="text-xs text-surface-500 mt-1">
                              Available inventory items: {inventoryItems.slice(0, 3).map(item => item.name).join(', ')}
                              {inventoryItems.length > 3 && ` +${inventoryItems.length - 3} more`}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-600 mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => updateOrderItem(index, 'description', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-surface-600 mb-2">Quantity</label>
                            <input
                              type="number"
                              placeholder="Enter quantity"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="input-field text-xl font-semibold text-center h-14"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-surface-600 mb-2">Unit</label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateOrderItem(index, 'unit', e.target.value)}
                              className="input-field text-lg font-semibold h-14"
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
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-600 mb-1">Unit Price</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateOrderItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="input-field text-lg font-semibold h-12"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-surface-200">
                          <div className="text-sm font-medium text-surface-900">
                            Total: ₱{(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                            disabled={newOrder.items.length === 1}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                        <input
                          type="text"
                          placeholder="Enter item name"
                          value={item.itemName}
                          onChange={(e) => updateOrderItem(index, 'itemName', e.target.value)}
                          className="col-span-3 input-field"
                          list={`inventory-items-desktop-${index}`}
                        />
                        <datalist id={`inventory-items-desktop-${index}`}>
                          {inventoryItems.map((invItem) => (
                            <option key={invItem.id} value={invItem.name} />
                          ))}
                        </datalist>
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateOrderItem(index, 'description', e.target.value)}
                          className="col-span-2 input-field"
                        />
                        <input
                          type="number"
                          placeholder="Enter quantity"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="col-span-2 input-field text-xl font-semibold text-center h-12"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateOrderItem(index, 'unit', e.target.value)}
                          className="col-span-2 input-field text-lg font-semibold h-12"
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
                        <input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="col-span-2 input-field text-lg font-semibold h-12"
                        />
                        <div className="col-span-1 flex justify-center">
                          <button
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            disabled={newOrder.items.length === 1}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

              {/* Order Summary */}
              <div className="bg-surface-50 rounded-lg p-6 border border-surface-200">
                <h4 className="text-lg font-medium text-surface-900 mb-4">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Subtotal:</span>
                    <span className="font-medium">₱{calculateTotals(newOrder.items).subtotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-surface-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span className="text-primary-600">₱{calculateTotals(newOrder.items).total.toFixed(2)}</span>
                    </div>
                  </div>
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
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(viewingOrder.status)}`}>
                    {viewingOrder.status}
                  </span>
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
                  {viewingOrder.status === 'ordered' && (
                    <button
                      onClick={() => {
                        handleShowDeliveryModal(viewingOrder)
                        setViewingOrder(null)
                      }}
                      className="btn-primary bg-green-600 hover:bg-green-700"
                      disabled={loadingDelivery === viewingOrder.id}
                    >
                      {loadingDelivery === viewingOrder.id ? 'Loading...' : 'Mark as Delivered'}
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

      {/* Delivery Modal */}
      {showDeliveryModal && deliveringOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900">Deliver Purchase Order</h3>
              <p className="text-sm text-surface-600 mt-1">Order #{deliveringOrder.orderNumber}</p>
            </div>
            
            {/* Modal Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={deliveringOrder.supplierName}
                    readOnly
                    className="input-field bg-surface-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Requested By
                  </label>
                  <input
                    type="text"
                    value={deliveringOrder.requestor || ''}
                    readOnly
                    className="input-field bg-surface-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Order Status
                  </label>
                  <input
                    type="text"
                    value={deliveringOrder.status}
                    readOnly
                    className="input-field bg-surface-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Created Date
                  </label>
                  <input
                    type="text"
                    value={deliveringOrder.createdAt?.toDate().toLocaleDateString()}
                    readOnly
                    className="input-field bg-surface-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Expected Delivery
                  </label>
                  <input
                    type="text"
                    value={deliveringOrder.expectedDelivery?.toDate().toLocaleDateString()}
                    readOnly
                    className="input-field bg-surface-100 cursor-not-allowed"
                  />
                </div>
                {deliveringOrder.actualDelivery && (
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Actual Delivery
                    </label>
                    <input
                      type="text"
                      value={deliveringOrder.actualDelivery.toDate().toLocaleDateString()}
                      readOnly
                      className="input-field bg-surface-100 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Delivery Items */}
              <div>
                <h4 className="text-md font-medium text-surface-900 mb-2">Delivery Items</h4>
                <p className="text-sm text-surface-600 mb-4">
                  Enter the actual quantity received for each item. Items with zero quantity received will not update inventory.
                </p>
                <div className="space-y-4">
                  {deliveryItems.map((item, index) => (
                    <div key={index} className="border border-surface-200 rounded-lg p-4 bg-surface-50">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">Item Name</label>
                          <input
                            type="text"
                            value={item.itemName}
                            readOnly
                            className="input-field bg-surface-100 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">Quantity Ordered</label>
                          <input
                            type="number"
                            value={item.quantityOrdered}
                            readOnly
                            className="input-field bg-surface-100 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            readOnly
                            className="input-field bg-surface-100 cursor-not-allowed text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">Quantity Received</label>
                          <input
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) => handleDeliveryQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="input-field text-xl font-semibold text-center h-12"
                            min="0"
                            max={item.quantityOrdered}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">Unit Price</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            readOnly
                            className="input-field bg-surface-100 cursor-not-allowed"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Result - Success/Failure Summary */}
              {deliveryResult && (
                <div>
                  <h4 className="text-md font-medium text-surface-900 mb-3">Delivery Result</h4>
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg text-sm text-surface-900">
                    <p className="font-semibold">Successfully Delivered Items:</p>
                    <ul className="list-disc list-inside">
                      {deliveryResult.updatedItems.map(itemName => (
                        <li key={itemName}>{itemName}</li>
                      ))}
                    </ul>
                  </div>
                  {deliveryResult.notFoundItems.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-red-600">Items Not Found in Inventory:</p>
                      <ul className="list-disc list-inside">
                        {deliveryResult.notFoundItems.map(itemName => (
                          <li key={itemName}>{itemName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {deliveryResult.unitMismatches.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold text-red-600">Unit Mismatches:</p>
                      <ul className="list-disc list-inside">
                        {deliveryResult.unitMismatches.map(({ itemName, expectedUnit, receivedUnit }) => (
                          <li key={itemName}>
                            {itemName}: Expected unit - {expectedUnit}, Received unit - {receivedUnit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-surface-200 bg-surface-50 rounded-b-xl">
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="btn-secondary"
                  disabled={isDelivering}
                >
                  {deliveryResult ? 'Close' : 'Cancel'}
                </button>
                {!deliveryResult && (
                  <button
                    onClick={handleConfirmDelivery}
                    className="btn-primary"
                    disabled={isDelivering}
                  >
                    {isDelivering ? 'Processing...' : 'Confirm Delivery'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
