'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useBranch } from '@/lib/context/BranchContext'
import { useShift } from '@/lib/context/ShiftContext'
import { getPOSItems, createPOSOrder, getPOSOrders, type POSItem as FirebasePOSItem, type POSOrder } from '@/lib/firebase/pos'
import { getMenuItems, type MenuItem } from '@/lib/firebase/menuBuilder'
import { getAddons, type Addon as MenuBuilderAddon } from '@/lib/firebase/addons'
import { getBranchLocationId } from '@/lib/utils/branchUtils'
import { doc, updateDoc, getDoc, addDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { addInventoryItem, updateStockQuantity, findInventoryItemByName } from '@/lib/firebase/inventory'
import CoreTrackLogo from '@/components/CoreTrackLogo'
import EnhancedPaymentModal from './EnhancedPaymentModal'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import OfflineIndicator from '@/components/ui/OfflineIndicator'
import ShiftGate from '@/components/ShiftGate'

// 🚀 Enhanced Interfaces with Add-ons Support
interface AddOn {
  id: string
  name: string
  price: number
  category: 'size' | 'extra' | 'modification' | 'special' | 'ingredient'
  required?: boolean
  options?: string[]
  // For preserving Menu Builder addon data for inventory deduction
  _originalData?: any
  // For inventory-based add-ons
  inventoryItemId?: string
  inventoryItemName?: string
  quantityPerServing?: number
  unit?: string
  costPerServing?: number
}

interface POSItem extends FirebasePOSItem {
  available?: boolean
  addons?: AddOn[]
}

interface CartItemAddOn {
  id: string
  name: string
  price: number
  category: string
  // For inventory-based add-ons
  inventoryItemId?: string
  inventoryItemName?: string
  quantityPerServing?: number
  unit?: string
  costPerServing?: number
}

interface CartItem extends POSItem {
  quantity: number
  total: number
  selectedAddons: CartItemAddOn[]
  customizations?: string
  cartItemId: string // Unique ID for cart tracking
}

// 📱 Offline Storage Interface
interface OfflineOrder {
  id: string
  items: CartItem[]
  total: number
  originalTotal?: number
  paymentMethod: string
  cashReceived?: number
  change?: number
  tipAmount?: number
  serviceCharge?: number
  discountAmount?: number
  splitPayment?: any
  customerEmail?: string
  customerPhone?: string
  notes?: string
  timestamp: number
  synced: boolean
  customerInfo?: any
}

export default function POSEnhanced() {
  const { user, profile, signOut } = useAuth()
  const { selectedBranch } = useBranch()
  const { 
    currentShift,
    isShiftActive,
    startNewShift,
    endCurrentShift,
    loading: shiftLoading 
  } = useShift()
  
  // 🚀 Enhanced Offline Status Management
  const { 
    isOnline, 
    pendingSync, 
    addToSyncQueue,
    forceSyncAll 
  } = useOfflineStatus()
  
  // 🏢 Business and Branch IDs for Firebase operations
  const businessId = profile?.tenantId || ''
  const branchId = selectedBranch?.id || ''
  
  // 🔄 Legacy Offline Support (keeping for backward compatibility)
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([])
  const pendingSyncCount = pendingSync
  
  // 🛒 Cart and Menu State
  const [cart, setCart] = useState<CartItem[]>([])
  // Permanent fix: Only show menu items for current branch and tenant
  const [menuItems, setMenuItems] = useState<POSItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const branchLocationId = selectedBranch?.id ? getBranchLocationId(selectedBranch.id) : null
  
  // Declare customAddons state first
  const [customAddons, setCustomAddons] = useState<AddOn[]>([])
  
  const filteredMenuItems = useMemo(() => menuItems.filter(item => {
    const matchesLocation = branchLocationId ? item.locationId === branchLocationId : true
    const matchesTenant = item.tenantId === profile?.tenantId
    return matchesLocation && matchesTenant
  }), [menuItems, branchLocationId, profile?.tenantId])
  
  // Permanent fix: Only show add-ons for current branch and tenant
  const filteredAddons = useMemo(() => customAddons.filter(addon => {
    // Type guards for locationId and tenantId
    const matchesLocation = branchLocationId ? (addon as any).locationId === branchLocationId : true
    const matchesTenant = (addon as any).tenantId === profile?.tenantId
    return matchesLocation && matchesTenant
  }), [customAddons, branchLocationId, profile?.tenantId])
  
  // 🍕 Add-ons Modal State
  const [showAddonsModal, setShowAddonsModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<POSItem | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddOn[]>([])
  const [customizations, setCustomizations] = useState('')
  
  // 💳 Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'gcash' | 'maya'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  
  // 📋 Recent Orders State
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [recentOrders, setRecentOrders] = useState<POSOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  

  
  // 📋 Inventory Loading State
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)

  // 🚫 Void Order Modal State
  const [showVoidOrderModal, setShowVoidOrderModal] = useState(false)
  const [orderToVoid, setOrderToVoid] = useState<any>(null)
  const [voidReason, setVoidReason] = useState('')
  const [restoreInventory, setRestoreInventory] = useState(true)
  const [isVoiding, setIsVoiding] = useState(false)



  // 🔄 Enhanced Effects with Background Sync Integration
  useEffect(() => {
    // Auto-sync when online and there are pending items
    if (isOnline && pendingSync > 0) {
      forceSyncAll().catch(console.error)
    }
  }, [isOnline, pendingSync, forceSyncAll])

  // Load offline orders for legacy compatibility
  const loadOfflineOrders = () => {
    try {
      const stored = localStorage.getItem('coretrack_offline_orders')
      if (stored) {
        const orders = JSON.parse(stored)
        setOfflineOrders(orders)
      }
    } catch (error) {
      console.error('Failed to load offline orders:', error)
    }
  }

  // Enhanced sync using background sync service
  const syncOfflineOrders = async () => {
    if (isOnline && pendingSync > 0) {
      await forceSyncAll()
    }
  }

  // 📦 Enhanced Add-on Deduction for Order Sync
  const deductAddonsFromInventoryForOrder = async (orderItems: CartItem[]) => {
    if (!businessId || !profile?.tenantId || !selectedBranch) return

    for (const cartItem of orderItems) {
      if (cartItem.addons && cartItem.addons.length > 0) {
        for (const addon of cartItem.addons) {
          try {
            // 🎯 Check if this is a Menu Builder add-on with ingredients
            const menuBuilderAddon = menuBuilderAddons.find(mba => mba.id === addon.id)
            
            if (menuBuilderAddon) {
              // 🏗️ Menu Builder add-on: Deduct based on ingredients
              const locationId = getBranchLocationId(selectedBranch.id)
              const menuItems = await getMenuItems(profile.tenantId, locationId)
              const fullMenuItem = menuItems.find(item => item.id === menuBuilderAddon.id)
              
              if (fullMenuItem && fullMenuItem.ingredients && fullMenuItem.ingredients.length > 0) {
                // Deduct each ingredient
                for (const ingredient of fullMenuItem.ingredients) {
                  const quantityToDeduct = ingredient.quantity * cartItem.quantity
                  
                  await updateStockQuantity(
                    businessId,
                    ingredient.inventoryItemId,
                    quantityToDeduct,
                    'subtract',
                    `Used in synced POS order - ${cartItem.name} (Add-on: ${addon.name})`,
                    user?.uid,
                    user?.email || 'POS System'
                  )
                }
              } else {
                // Fallback for Menu Builder add-ons without ingredients
                const inventoryItem = await findInventoryItemByName(businessId, addon.name)
                if (inventoryItem) {
                  await updateStockQuantity(
                    businessId,
                    inventoryItem.id,
                    cartItem.quantity,
                    'subtract',
                    `Used in synced POS order - ${cartItem.name} (Menu Builder Add-on)`,
                    user?.uid,
                    user?.email || 'POS System'
                  )
                }
              }
            } else {
              // 🛠️ Custom add-on: Find by name (existing behavior)
              const inventoryItem = await findInventoryItemByName(businessId, addon.name)
              
              if (inventoryItem) {
                await updateStockQuantity(
                  businessId,
                  inventoryItem.id,
                  cartItem.quantity,
                  'subtract',
                  `Used in synced POS order - ${cartItem.name} (Custom Add-on)`,
                  user?.uid,
                  user?.email || 'POS System'
                )
              }
            }
          } catch (error) {
            console.error(`Error deducting addon ${addon.name} from inventory during sync:`, error)
          }
        }
      }
    }
  }

  // 📋 Load Recent Orders
  const loadRecentOrders = async () => {
    if (!profile?.tenantId || !selectedBranch) return
    
    try {
      setLoadingOrders(true)
      const locationId = getBranchLocationId(selectedBranch.id)
      
      const orders = await getPOSOrders(profile.tenantId, locationId)
      
      // Sort by creation date and get the most recent ones
      const sortedOrders = orders
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 20) // Get last 20 orders
      
      setRecentOrders(sortedOrders)
    } catch (error) {
      console.error('❌ Error loading recent orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const printEnhancedReceipt = (order: any, paymentData: any) => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        console.error('❌ Could not open print window')
        return
      }

      // Safe order ID extraction with fallbacks
      const getOrderId = () => {
        if (order?.orderNumber) return order.orderNumber
        if (order?.id && typeof order.id === 'string') return order.id.slice(-6)
        return `POS-${Date.now().toString().slice(-6)}`
      }

      const orderId = getOrderId()

      // Safe cart data extraction
      const orderItems = order?.items || cart || []

      const receiptHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Enhanced Receipt - Order #${orderId}</title>
            <style>
              body { font-family: monospace; max-width: 320px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
              .logo { font-size: 1.5em; font-weight: bold; margin-bottom: 5px; }
              .order-info { margin-bottom: 20px; }
              .items { border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px; }
              .item { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .addon { margin-left: 20px; font-size: 0.9em; color: #666; }
              .totals { margin-bottom: 15px; }
              .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .final-total { font-weight: bold; font-size: 1.2em; border-top: 1px solid #000; padding-top: 8px; }
              .payment-info { margin-bottom: 15px; padding: 10px; background-color: #f5f5f5; }
              .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
              .enhancement { color: #0066cc; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">🚀 CORETRACK POS</div>
              <p><strong>Enhanced Receipt</strong></p>
              <p>Order #${orderId}</p>
            </div>
          
          <div class="order-info">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>Branch:</strong> ${selectedBranch?.name || 'Main Branch'}</p>
            <p><strong>Status:</strong> COMPLETED</p>
            ${paymentData.notes ? `<p><strong>Notes:</strong> ${paymentData.notes}</p>` : ''}
          </div>
          
          <div class="items">
            <h3>Items Ordered</h3>
            ${cart.map((item) => `
              <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>₱${item.total.toFixed(2)}</span>
              </div>
              ${item.selectedAddons ? item.selectedAddons.map(addon => `
                <div class="addon">
                  <span>+ ${addon.name}</span>
                  <span>₱${addon.price.toFixed(2)}</span>
                </div>
              `).join('') : ''}
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>₱${(paymentData.originalTotal || paymentData.total).toFixed(2)}</span>
            </div>
            ${paymentData.serviceCharge > 0 ? `
              <div class="total-line">
                <span>Service Charge:</span>
                <span>₱${paymentData.serviceCharge.toFixed(2)}</span>
              </div>
            ` : ''}
            ${paymentData.tipAmount > 0 ? `
              <div class="total-line">
                <span>Tip:</span>
                <span>₱${paymentData.tipAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${paymentData.discountAmount > 0 ? `
              <div class="total-line">
                <span>Discount:</span>
                <span>-₱${paymentData.discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-line final-total">
              <span>TOTAL:</span>
              <span>₱${paymentData.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <h3>Payment Details</h3>
            <div class="total-line">
              <span>Method:</span>
              <span class="enhancement">${paymentData.method.toUpperCase()}</span>
            </div>
            ${paymentData.method === 'cash' && paymentData.cashReceived > 0 ? `
              <div class="total-line">
                <span>Cash Received:</span>
                <span>₱${paymentData.cashReceived.toFixed(2)}</span>
              </div>
              <div class="total-line">
                <span>Change:</span>
                <span>₱${paymentData.change.toFixed(2)}</span>
              </div>
            ` : ''}
            ${paymentData.splitPayment ? `
              <div class="total-line">
                <span>Split Payment:</span>
                <span>Multiple Methods</span>
              </div>
            ` : ''}
            ${paymentData.customerEmail ? `
              <div class="total-line">
                <span>Email:</span>
                <span>${paymentData.customerEmail}</span>
              </div>
            ` : ''}
            ${paymentData.customerPhone ? `
              <div class="total-line">
                <span>Phone:</span>
                <span>${paymentData.customerPhone}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business! 🙏</p>
            <p>Powered by CoreTrack Enhanced POS</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            ${isOnline ? '<p>🌐 Processed Online</p>' : '<p>📱 Processed Offline</p>'}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    printWindow.print()
    
    } catch (error) {
      console.error('❌ Error printing enhanced receipt:', error)
      // Use non-blocking notification instead of alert
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
        `
        notification.textContent = '❌ Error printing receipt. Please try again.'
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 4000)
      }
    }
  }

  // Non-intrusive print function that doesn't redirect focus
  const printReceiptToHiddenFrame = (order: any, paymentData: any) => {
    try {
      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      document.body.appendChild(iframe)
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) return
      
      const getOrderId = () => {
        if (order?.orderNumber) return order.orderNumber
        if (order?.id && typeof order.id === 'string') return order.id.slice(-6)
        return `POS-${Date.now().toString().slice(-6)}`
      }

      const orderId = getOrderId()
      const orderItems = order?.items || cart || []

      const receiptHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - Order #${orderId}</title>
            <style>
              body { font-family: monospace; max-width: 320px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
              .items { border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px; }
              .item { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .final-total { font-weight: bold; font-size: 1.2em; border-top: 1px solid #000; padding-top: 8px; }
              .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>🚀 CORETRACK POS</h2>
              <p>Order #${orderId}</p>
              <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <div class="items">
              ${cart.map((item) => `
                <div class="item">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>₱${item.total.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="total-line final-total">
              <span>TOTAL:</span>
              <span>₱${paymentData.total.toFixed(2)}</span>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `
      
      iframeDoc.write(receiptHTML)
      iframeDoc.close()
      
      // Print the iframe content
      iframe.contentWindow?.print()
      
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
      
    } catch (error) {
      console.error('❌ Error printing receipt (non-intrusive):', error)
    }
  }

  // 📋 Recent Orders Management Functions
  const printReceipt = (order: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Order #${order.orderNumber || order.id.slice(-6)}</title>
          <style>
            body { font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .order-info { margin-bottom: 15px; }
            .items { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; font-size: 1.2em; text-align: right; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>CORETRACK RECEIPT</h2>
            <p>Order #${order.orderNumber || order.id.slice(-6)}</p>
          </div>
          
          <div class="order-info">
            <p><strong>Date:</strong> ${order.createdAt.toDate().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${order.createdAt.toDate().toLocaleTimeString()}</p>
            <p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</p>
            <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
          </div>
          
          <div class="items">
            <h3>Items</h3>
            ${order.items.map((item: any) => `
              <div class="item">
                <span>${item.quantity}x ${item.name}</span>
                <span>₱${item.total.toFixed(2)}</span>
              </div>
              ${item.addons && item.addons.length > 0 ? item.addons.map((addon: any) => `
                <div class="item" style="margin-left: 20px; font-size: 0.9em; color: #666;">
                  <span>+ ${addon.name}</span>
                  <span>₱${addon.price.toFixed(2)}</span>
                </div>
              `).join('') : ''}
            `).join('')}
          </div>
          
          <div class="total">
            <p>TOTAL: ₱${order.total.toFixed(2)}</p>
            ${order.paymentMethod === 'cash' && order.cashReceived ? `
              <p>Cash Received: ₱${order.cashReceived.toFixed(2)}</p>
              <p>Change: ₱${(order.cashReceived - order.total).toFixed(2)}</p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Powered by CoreTrack</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    printWindow.print()
  }

  const exportToPDF = async (order: any) => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Order #${order.orderNumber || order.id.slice(-6)} - PDF Export</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #2563eb; font-size: 2em; font-weight: bold; margin-bottom: 10px; }
              .order-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .detail-group h3 { color: #2563eb; margin-bottom: 10px; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .items-table th { background-color: #f8fafc; font-weight: 600; }
              .addon { color: #666; font-size: 0.9em; padding-left: 20px; }
              .totals { text-align: right; margin-top: 20px; }
              .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .final-total { font-size: 1.3em; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 10px; }
              .footer { text-align: center; margin-top: 40px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack POS</div>
              <h1>Order Receipt</h1>
              <p>Order #${order.orderNumber || order.id.slice(-6)}</p>
            </div>
            
            <div class="order-details">
              <div class="detail-group">
                <h3>Order Information</h3>
                <p><strong>Date:</strong> ${order.createdAt.toDate().toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${order.createdAt.toDate().toLocaleTimeString()}</p>
                <p><strong>Status:</strong> <span style="text-transform: capitalize;">${order.status}</span></p>
              </div>
              <div class="detail-group">
                <h3>Payment Details</h3>
                <p><strong>Method:</strong> <span style="text-transform: capitalize;">${order.paymentMethod}</span></p>
                ${order.paymentMethod === 'cash' && order.cashReceived ? `
                  <p><strong>Cash Received:</strong> ₱${order.cashReceived.toFixed(2)}</p>
                  <p><strong>Change:</strong> ₱${(order.cashReceived - order.total).toFixed(2)}</p>
                ` : ''}
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>₱${(item.total / item.quantity).toFixed(2)}</td>
                    <td>₱${item.total.toFixed(2)}</td>
                  </tr>
                  ${item.addons && item.addons.length > 0 ? item.addons.map((addon: any) => `
                    <tr>
                      <td class="addon">+ ${addon.name}</td>
                      <td>1</td>
                      <td>₱${addon.price.toFixed(2)}</td>
                      <td>₱${addon.price.toFixed(2)}</td>
                    </tr>
                  `).join('') : ''}
                `).join('')}
              </tbody>
            </table>
            
            <div class="totals">
              <div class="total-line final-total">
                <span>TOTAL AMOUNT:</span>
                <span>₱${order.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Powered by CoreTrack - Business Management System</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(pdfHTML)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
      alert('📄 PDF export initiated! Use print dialog to save as PDF.')
    } catch (error) {
      console.error('PDF export error:', error)
      alert('❌ Error exporting PDF. Please try again.')
    }
  }

  const voidOrder = async (order: any) => {
    if (!confirm(`Are you sure you want to void Order #${order.orderNumber || order.id.slice(-6)}? This action cannot be undone.`)) {
      return
    }

    try {
      // First check if we have the necessary IDs
      if (!businessId) {
        console.error('Missing business ID. User might not be properly authenticated.');
        alert('Error: Missing business information. Please refresh the page and try again.');
        return;
      }
      
      // Check if we're using the new data structure (tenants/orders) or old (businesses/branches/orders)
      let orderRef;
      let documentExists = false;
      
      // First try the new path (correct collection name)
      try {
        orderRef = doc(db, `tenants/${businessId}/orders`, order.id);
        const orderDoc = await getDoc(orderRef);
        documentExists = orderDoc.exists();
      } catch (error) {
        console.error('Error checking new path:', error);
      }
      
      // If document doesn't exist at new path, try the old path (if we have a branch ID)
      if (!documentExists) {
        if (!branchId) {
          console.error('Missing branch ID. Cannot check legacy path.');
          alert('Error: Missing branch information. Please select a branch and try again.');
          return;
        }
        
        try {
          orderRef = doc(db, `businesses/${businessId}/branches/${branchId}/orders`, order.id);
          // Check if it exists in the old path too
          const oldPathDoc = await getDoc(orderRef);
          documentExists = oldPathDoc.exists();
          
          if (!documentExists) {
            console.error(`Order ${order.id} not found in any expected location`);
            alert('Error: Order not found. It may have been deleted or moved.');
            return;
          }
        } catch (error) {
          console.error('Error checking old path:', error);
          alert('Error accessing order data. Please try again.');
          return;
        }
      }
      
      // Ensure we have a valid orderRef before proceeding
      if (!orderRef) {
        console.error('Could not determine order reference path');
        alert('Error: Could not locate order. Please try again.');
        return;
      }
      
      await updateDoc(orderRef, {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: user?.email || 'Unknown'
      })

      // Restore inventory for voided items
      for (const item of order.items) {
        try {
          // Use the helper function from inventory.ts to find the item
          const inventoryItem = await findInventoryItemByName(businessId, item.name)
          
          if (inventoryItem) {
            await updateStockQuantity(
              businessId, 
              inventoryItem.id,
              item.quantity,
              'add',
              `Restored from voided order - ${order.orderNumber || order.id.slice(-6)}`,
              user?.uid,
              user?.email || 'Unknown'
            )
          }
        } catch (error) {
          console.error(`Error restoring item ${item.name} to inventory:`, error)
        }
      }

      loadRecentOrders()
      alert(`✅ Order #${order.orderNumber || order.id.slice(-6)} has been voided and inventory restored.`)
    } catch (error) {
      console.error('Error voiding order:', error)
      alert('❌ Error voiding order. Please try again.')
    }
  }

  // 🚫 Show Void Modal Function
  const showVoidModal = (order: any) => {
    setOrderToVoid(order)
    setVoidReason('')
    setRestoreInventory(true)
    setShowVoidOrderModal(true)
  }

  // 🚫 Process Void Order with Reason
  const processVoidOrder = async () => {
    if (!orderToVoid || !voidReason.trim()) {
      alert('❌ Please provide a reason for voiding this order.')
      return
    }

    setIsVoiding(true)

    try {
      // First check if we have the necessary IDs
      if (!businessId) {
        console.error('Missing business ID. User might not be properly authenticated.');
        alert('Error: Missing business information. Please refresh the page and try again.');
        setIsVoiding(false);
        return;
      }
      
      // Check if we're using the new data structure (tenants/orders) or old (businesses/branches/orders)
      let orderRef;
      let documentExists = false;
      
      // First try the new path (correct collection name)
      try {
        orderRef = doc(db, `tenants/${businessId}/orders`, orderToVoid.id);
        const orderDoc = await getDoc(orderRef);
        documentExists = orderDoc.exists();
      } catch (error) {
        console.error('Error checking new path:', error);
      }
      
      // If document doesn't exist at new path, try the old path (if we have a branch ID)
      if (!documentExists) {
        if (!branchId) {
          console.error('Missing branch ID. Cannot check legacy path.');
          alert('Error: Missing branch information. Please select a branch and try again.');
          setIsVoiding(false);
          return;
        }
        
        try {
          orderRef = doc(db, `businesses/${businessId}/branches/${branchId}/orders`, orderToVoid.id);
          // Check if it exists in the old path too
          const oldPathDoc = await getDoc(orderRef);
          documentExists = oldPathDoc.exists();
          
          if (!documentExists) {
            console.error(`Order ${orderToVoid.id} not found in any expected location`);
            alert('Error: Order not found. It may have been deleted or moved.');
            setIsVoiding(false);
            return;
          }
        } catch (error) {
          console.error('Error checking old path:', error);
          alert('Error accessing order data. Please try again.');
          setIsVoiding(false);
          return;
        }
      }
      
      // Ensure we have a valid orderRef before proceeding
      if (!orderRef) {
        console.error('Could not determine order reference path');
        alert('Error: Could not locate order. Please try again.');
        setIsVoiding(false);
        return;
      }
      
      await updateDoc(orderRef, {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: user?.email || 'Unknown',
        voidReason: voidReason.trim(),
        inventoryRestored: restoreInventory
      })

      // Restore inventory if requested
      if (restoreInventory) {
        // Restore main items
        for (const item of orderToVoid.items) {
          try {
            // Use the helper function from inventory.ts to find the item
            const inventoryItem = await findInventoryItemByName(businessId, item.name)
            
            if (inventoryItem) {
              await updateStockQuantity(
                businessId, 
                inventoryItem.id,
                item.quantity,
                'add',
                `Restored from voided order - ${orderToVoid.orderNumber || orderToVoid.id.slice(-6)} (Reason: ${voidReason.trim()})`,
                user?.uid,
                user?.email || 'Unknown'
              )
            }
          } catch (error) {
            console.error(`Error restoring item ${item.name} to inventory:`, error)
          }
        }

        // Restore add-ons
        for (const item of orderToVoid.items) {
          if (item.addons && item.addons.length > 0) {
            for (const addon of item.addons) {
              try {
                const inventoryItem = await findInventoryItemByName(businessId, addon.name)
                
                if (inventoryItem) {
                  await updateStockQuantity(
                    businessId,
                    inventoryItem.id,
                    item.quantity, // Restore the quantity that was deducted
                    'add',
                    `Restored from voided POS order - ${item.name} (Reason: ${voidReason.trim()})`,
                    user?.uid,
                    user?.email || 'POS System'
                  )
                }
              } catch (error) {
                console.error(`Error restoring addon ${addon.name} to inventory:`, error)
              }
            }
          }
        }
      }

      // Close modal and refresh orders
      setShowVoidOrderModal(false)
      setOrderToVoid(null)
      setVoidReason('')
      setRestoreInventory(true)
      loadRecentOrders()
      
      const inventoryMessage = restoreInventory ? ' and inventory has been restored' : ' (inventory not restored)'
      alert(`✅ Order #${orderToVoid.orderNumber || orderToVoid.id.slice(-6)} has been voided${inventoryMessage}.`)
    } catch (error) {
      console.error('Error voiding order:', error)
      alert('❌ Error voiding order. Please try again.')
    } finally {
      setIsVoiding(false)
    }
  }

  // 🎯 State for Menu Builder add-ons
  const [menuBuilderAddons, setMenuBuilderAddons] = useState<AddOn[]>([])

  useEffect(() => {
    const loadMenuItems = async () => {
      if (!profile?.tenantId || !selectedBranch) return

      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        
        // 🎯 Load POS items, Menu Builder items, and Menu Builder standalone add-ons
        const [posItems, menuBuilderItems, standAloneAddons] = await Promise.all([
          getPOSItems(profile.tenantId, locationId),
          getMenuItems(profile.tenantId, locationId),
          getAddons(profile.tenantId, locationId)
        ])

        // Convert Menu Builder add-ons to POS add-ons format (from menuItems collection)
        const menuAddons: AddOn[] = menuBuilderItems
          .filter(item => item.isAddonOnly)
          .map((item, index) => ({
            id: item.id || `menu-addon-${index}-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: item.name,
            price: item.price,
            category: item.addonType || 'extra' as any,
            required: item.isRequired || false,
            options: undefined // Can be extended later
          }))

        // Convert standalone add-ons from Menu Builder (from addons collection)
        const standAloneAddonsPOS: AddOn[] = standAloneAddons
          .filter(addon => addon.status === 'active')
          .map((addon, index) => ({
            id: addon.id || `standalone-addon-${index}-${addon.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: addon.name,
            price: addon.price,
            category: 'extra' as any, // Default category
            required: false,
            options: undefined,
            // 🎯 CRITICAL: Preserve original addon data for inventory deduction
            _originalData: addon
          }))

        // Combine all Menu Builder add-ons and ensure unique IDs
        const allMenuBuilderAddons = [...menuAddons, ...standAloneAddonsPOS]
        
        // 🔧 FIX: Ensure all addon IDs are unique to prevent React key collisions
        const uniqueAddons = new Map()
        allMenuBuilderAddons.forEach((addon, index) => {
          const baseId = addon.id
          let uniqueId = baseId
          let counter = 1
          
          // If ID already exists, append a counter
          while (uniqueAddons.has(uniqueId)) {
            uniqueId = `${baseId}-${counter}`
            counter++
          }
          
          uniqueAddons.set(uniqueId, { ...addon, id: uniqueId })
        })
        
        const finalAllMenuBuilderAddons = Array.from(uniqueAddons.values())
        setMenuBuilderAddons(finalAllMenuBuilderAddons)

        // 🍕 Prioritize Menu Builder items over POS items (they have better descriptions)
        const menuBuilderPOSItems: POSItem[] = menuBuilderItems
          .filter(item => !item.isAddonOnly) // Exclude addon-only items
          .map(item => {
            // Check for empty strings, null, or undefined descriptions
            const hasValidDescription = item.description && item.description.trim().length > 0
            const fallbackDescription = `Fresh ${item.name} - made with quality ingredients`
            
            // 🎯 CRITICAL FIX: Find corresponding POS item by menuItemId or name match
            const correspondingPOSItem = posItems.find(posItem => 
              posItem.menuItemId === item.id || 
              posItem.name.toLowerCase() === item.name.toLowerCase()
            );
            
            // Use POS item ID if found, otherwise use menu item ID
            const actualPOSItemId = correspondingPOSItem?.id || item.id || `menu-${item.name}`;
            
            return {
              id: actualPOSItemId, // 🎯 Use actual POS item ID
              name: item.name,
              category: item.category || 'General',
              price: item.price,
              cost: item.cost || 0,
              description: hasValidDescription ? item.description : fallbackDescription, // Enhanced fallback logic
              emoji: '🍽️', // Default emoji for menu items
              isAvailable: true,
              preparationTime: 5, // Default prep time
              tenantId: profile.tenantId,
              locationId: locationId,
              ingredients: item.ingredients || [],
              createdAt: item.createdAt || new Date() as any,
              updatedAt: item.updatedAt || new Date() as any,
              available: true,
              addons: [...getItemAddons(item as any), ...finalAllMenuBuilderAddons, ...customAddons]
            }
          })

        // Add any POS items that don't exist in Menu Builder
        const posItemsNotInMenuBuilder = posItems
          .filter(posItem => 
            !menuBuilderItems.some(menuItem => 
              menuItem.name.toLowerCase() === posItem.name.toLowerCase()
            )
          )
          .filter(item => item.isAvailable)
          .map(item => {
            // Check for empty strings, null, or undefined descriptions
            const hasValidDescription = item.description && item.description.trim().length > 0
            const fallbackDescription = `Delicious ${item.name} - a customer favorite`
            
            return {
              ...item,
              description: hasValidDescription ? item.description : fallbackDescription, // Enhanced fallback for POS items
              available: item.isAvailable,
              addons: [...getItemAddons(item), ...allMenuBuilderAddons, ...customAddons]
            }
          })

        // Combine Menu Builder items (priority) with unique POS items
        const enhancedItems: POSItem[] = [...menuBuilderPOSItems, ...posItemsNotInMenuBuilder]

        setMenuItems(enhancedItems)
        
      } catch (error) {
        console.error('❌ Error loading menu items:', error)
        setMenuItems([])
      } finally {
        setLoading(false)
      }
    }

    loadMenuItems()
  }, [profile?.tenantId, selectedBranch?.id])

  // 📦 Load Inventory Items for Add-on Creation
  useEffect(() => {
    const loadInventoryItems = async () => {
      if (!profile?.tenantId || !selectedBranch) return

      try {
        setLoadingInventory(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        
        // Load inventory items from Firestore
        const inventoryRef = collection(db, 'tenants', profile.tenantId, 'branches', locationId, 'inventory')
        const inventorySnapshot = await getDocs(query(inventoryRef, orderBy('name')))
        
        const items = inventorySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setInventoryItems(items)
      } catch (error) {
        console.error('❌ Error loading inventory items:', error)
        setInventoryItems([])
      } finally {
        setLoadingInventory(false)
      }
    }

    loadInventoryItems()
  }, [profile?.tenantId, selectedBranch?.id])

  // Update menu items when custom addons change
  useEffect(() => {
    if (menuItems.length > 0) {
      const updatedItems = menuItems.map(item => ({
        ...item,
        addons: [...getItemAddons(item), ...menuBuilderAddons, ...customAddons]
      }))
      setMenuItems(updatedItems)
    }
  }, [customAddons, menuBuilderAddons])

  // 🍕 Generate Add-ons based on Item Category (DISABLED - Only Menu Builder add-ons)
  const getItemAddons = (item: FirebasePOSItem): AddOn[] => {
    // 🚫 Removed all hardcoded add-ons - only Menu Builder add-ons will show
    return []
  }

  // 🛒 Add Item to Cart with Add-ons Support
  const addToCartWithAddons = (item: POSItem) => {
    if (item.addons && item.addons.length > 0) {
      // Show add-ons modal
      setSelectedItem(item)
      setSelectedAddons([])
      setCustomizations('')
      setShowAddonsModal(true)
    } else {
      // Add directly to cart
      addToCart(item, [], '')
    }
  }

  // 🛒 Add to Cart Function
  const addToCart = (item: POSItem, addons: CartItemAddOn[] = [], customizationText = '') => {
    // 🛡️ Shift Protection - Can't add items without active shift
    if (!isShiftActive) {
      alert('Please start a shift before adding items to cart')
      return
    }

    const cartItemId = `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0)
    const totalPrice = item.price + addonsTotal

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      total: totalPrice,
      selectedAddons: addons,
      customizations: customizationText,
      cartItemId
    }

    setCart(prev => [...prev, cartItem])
  }

  // 🗑️ Remove from Cart
  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter(item => item.cartItemId !== cartItemId))
  }

  // 📊 Update Quantity
  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId)
      return
    }
    
    setCart(cart.map(item => 
      item.cartItemId === cartItemId 
        ? { ...item, quantity, total: (item.price + item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0)) * quantity }
        : item
    ))
  }

  // 🧮 Cart Calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }, [cart])

  // 💳 Process Payment (Online/Offline) - Enhanced
  const processPayment = async (paymentData: any) => {
    if (cart.length === 0) return

    setIsProcessingPayment(true)

    try {
      if (isOnline && profile?.tenantId && selectedBranch) {
        // 🌐 Online: Save to Firebase
        const firestoreOrder = {
          items: cart.map(item => ({
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            addons: item.selectedAddons ? item.selectedAddons.map(addon => ({
              id: addon.id || `addon-${addon.name}`,
              name: addon.name,
              price: addon.price,
              category: addon.category
            })) : []
          })),
          subtotal: cartTotal,
          total: paymentData.total,
          originalTotal: paymentData.originalTotal,
          paymentMethod: paymentData.method,
          cashReceived: paymentData.cashReceived,
          change: paymentData.change,
          tipAmount: paymentData.tipAmount,
          serviceCharge: paymentData.serviceCharge,
          discountAmount: paymentData.discountAmount,
          splitPayment: paymentData.splitPayment,
          customerEmail: paymentData.customerEmail,
          customerPhone: paymentData.customerPhone,
          notes: paymentData.notes,
          tenantId: profile.tenantId,
          locationId: getBranchLocationId(selectedBranch.id),
          orderType: 'dine-in' as const,
          status: 'completed' as const,
          paymentTimestamp: paymentData.timestamp
        }

        // Create the order
        const createdOrder = await createPOSOrder(firestoreOrder)

        // 📦 Deduct add-ons from inventory (only if there are add-ons)
        const hasAddons = cart.some(item => item.selectedAddons && item.selectedAddons.length > 0)
        if (hasAddons) {
          await deductAddonsFromInventory()
        }

        // Handle receipt options
        if (paymentData.receiptOptions.print) {
          // Auto-print receipt without opening new tab/window
          setTimeout(() => {
            // Instead of opening a new window, create a hidden iframe for printing
            printReceiptToHiddenFrame(createdOrder, paymentData)
          }, 1000)
        }

        // Show success feedback without blocking navigation
        // Use a non-blocking notification instead of alert
        if (typeof window !== 'undefined') {
          // Create a temporary success notification
          const notification = document.createElement('div')
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
          `
          notification.textContent = '✅ Payment successful! Order completed.'
          document.body.appendChild(notification)
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification)
            }
          }, 3000)
        }
      } else {
        // 📱 Store offline order using background sync service
        const orderData = {
          items: cart.map(item => ({
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            addons: item.selectedAddons ? item.selectedAddons.map(addon => ({
              id: addon.id || `addon-${addon.name}`,
              name: addon.name,
              price: addon.price,
              category: addon.category
            })) : []
          })),
          subtotal: paymentData.originalTotal || paymentData.total,
          total: paymentData.total,
          paymentMethod: paymentData.method,
          tenantId: profile!.tenantId,
          locationId: getBranchLocationId(selectedBranch!.id),
          orderType: 'dine-in' as const,
          status: 'completed' as const,
          // Enhanced payment details
          cashReceived: paymentData.cashReceived,
          change: paymentData.change,
          tipAmount: paymentData.tipAmount,
          serviceCharge: paymentData.serviceCharge,
          discountAmount: paymentData.discountAmount,
          splitPayment: paymentData.splitPayment,
          customerEmail: paymentData.customerEmail,
          customerPhone: paymentData.customerPhone,
          notes: paymentData.notes
        }

        // Add to background sync queue
        addToSyncQueue('pos-order', orderData, 5)
        
        // Show offline success feedback without blocking navigation
        // Use a non-blocking notification instead of alert
        if (typeof window !== 'undefined') {
          const notification = document.createElement('div')
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
          `
          notification.textContent = '📱 Payment successful! Order queued for sync.'
          document.body.appendChild(notification)
          
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification)
            }
          }, 3000)
        }
      }

      // Reset cart and modal
      setCart([])
      setShowPaymentModal(false)
      setCashReceived('')
      setSelectedPaymentMethod('cash')

    } catch (error) {
      console.error('Payment error:', error)
      
      // Show error feedback without blocking navigation
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
        `
        notification.textContent = '❌ Payment failed. Please try again.'
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 4000)
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // 📦 Deduct Add-ons from Inventory
  // 📦 Enhanced Add-on Inventory Deduction
  const deductAddonsFromInventory = async () => {
    if (!businessId || !branchId || !profile?.tenantId || !selectedBranch) return

    for (const cartItem of cart) {
      if (cartItem.selectedAddons && cartItem.selectedAddons.length > 0) {
        for (const addon of cartItem.selectedAddons) {
          try {
            // 🎯 Check if this is a Menu Builder add-on with original data
            const menuBuilderAddon = menuBuilderAddons.find(mba => mba.id === addon.id)
            
            if (menuBuilderAddon && menuBuilderAddon._originalData) {
              const originalAddon = menuBuilderAddon._originalData
              
              // 🏗️ Menu Builder add-on: Check ingredients first, then fallback to single inventory
              if (originalAddon.ingredients && originalAddon.ingredients.length > 0) {
                // Deduct each ingredient
                for (const ingredient of originalAddon.ingredients) {
                  const quantityToDeduct = ingredient.quantity * cartItem.quantity
                  
                  await updateStockQuantity(
                    profile.tenantId,
                    ingredient.inventoryItemId,
                    quantityToDeduct,
                    'subtract',
                    `Used in POS order - ${cartItem.name} (Add-on: ${addon.name})`,
                    user?.uid,
                    user?.email || 'POS System'
                  )
                }
              } else if (originalAddon.inventoryItemId) {
                // Single inventory item deduction
                const quantityToDeduct = (originalAddon.inventoryQuantity || 1) * cartItem.quantity
                
                await updateStockQuantity(
                  profile.tenantId,
                  originalAddon.inventoryItemId,
                  quantityToDeduct,
                  'subtract',
                  `Used in POS order - ${cartItem.name} (Add-on: ${addon.name})`,
                  user?.uid,
                  user?.email || 'POS System'
                )
              } else {
                console.warn(`⚠️ Menu Builder add-on "${addon.name}" has no inventory linkage`)
              }
            } else {
              // 🛠️ Custom add-on: Check if it's inventory-based first
              if (addon.inventoryItemId && addon.quantityPerServing) {
                // Custom inventory-based add-on
                const quantityToDeduct = addon.quantityPerServing * cartItem.quantity
                
                await updateStockQuantity(
                  profile.tenantId,
                  addon.inventoryItemId,
                  quantityToDeduct,
                  'subtract',
                  `Used in POS order - ${cartItem.name} (Custom Add-on: ${addon.name})`,
                  user?.uid,
                  user?.email || 'POS System'
                )
              } else {
                // Legacy custom add-on: Find by name (existing behavior)
                const inventoryItem = await findInventoryItemByName(profile.tenantId, addon.name)
                
                if (inventoryItem) {
                  const quantityToDeduct = cartItem.quantity
                  
                  await updateStockQuantity(
                    profile.tenantId,
                    inventoryItem.id,
                    quantityToDeduct,
                    'subtract',
                    `Used in POS order - ${cartItem.name} (Custom Add-on)`,
                    user?.uid,
                    user?.email || 'POS System'
                  )
                } else {
                  console.warn(`⚠️ Inventory item not found for add-on: ${addon.name}`)
                }
              }
            }
          } catch (error) {
            console.error(`Error deducting addon ${addon.name} from inventory:`, error)
            // Continue processing other add-ons even if one fails
          }
        }
      }
    }
  }

  // 🎨 Get Item Emoji
  const getItemEmoji = (item: POSItem) => {
    const category = item.category?.toLowerCase() || ''
    const name = item.name?.toLowerCase() || ''

    if (name.includes('burger') || name.includes('sandwich')) return '🍔'
    if (name.includes('pizza')) return '🍕'
    if (name.includes('fries') || name.includes('chips')) return '🍟'
    if (name.includes('chicken')) return '🍗'
    if (name.includes('salad')) return '🥗'
    if (name.includes('taco')) return '🌮'
    if (name.includes('pasta') || name.includes('spaghetti')) return '🍝'
    if (name.includes('rice')) return '🍚'
    if (name.includes('soup')) return '🍲'
    if (name.includes('coffee')) return '☕'
    if (name.includes('tea')) return '🍵'
    if (name.includes('juice') || name.includes('smoothie')) return '🥤'
    if (name.includes('beer')) return '🍺'
    if (name.includes('wine')) return '🍷'
    if (name.includes('cake') || name.includes('dessert')) return '🍰'
    if (name.includes('ice cream')) return '🍦'

    // Category-based fallbacks
    if (category.includes('beverage') || category.includes('drink')) return '🥤'
    if (category.includes('dessert')) return '🍰'
    if (category.includes('appetizer')) return '🥗'
    if (category.includes('main') || category.includes('food')) return '🍽️'

    return '🍽️'
  }

  return (
    <>
      {/* 🏛️ Shift Gate - Professional Access Control */}
      {!isShiftActive ? (
        <ShiftGate 
          moduleName="the Point of Sale system"
          customMessage="Start your shift to begin processing orders and accepting payments"
          showStartShiftButton={false}
        />
      ) : (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* 🎯 Minimalist Enterprise Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Compact Brand & Context */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <CoreTrackLogo size="sm" />
                <div className="flex items-center gap-4">
                  <h1 className="text-lg font-bold text-gray-900">Point of Sale</h1>
                  <div className="hidden sm:flex items-center gap-3">
                    <span className="text-sm text-gray-600 font-medium">{selectedBranch?.name || 'Main Branch'}</span>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                      isOnline 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      {isOnline ? 'Online' : 'Offline'}
                    </div>
                    {pendingSyncCount > 0 && (
                      <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        {pendingSyncCount} pending
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Compact Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowRecentOrders(true)
                  loadRecentOrders()
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:inline">Recent Orders</span>
              </button>
              
              {!isOnline && (
                <button
                  onClick={syncOfflineOrders}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden md:inline">Sync</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 📋 Left Panel - Menu */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {/* Ultra-Compact Category Filter */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900">Menu Categories</h2>
              <div className="text-xs text-gray-500">
                {(() => {
                  const filteredItems = selectedCategory === 'All' 
                    ? menuItems 
                    : menuItems.filter(item => (item.category || 'General') === selectedCategory);
                  return `${filteredItems.length} items`;
                })()}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(() => {
                // Get unique categories from menu items dynamically
                const categories = ['All'];
                const categorySet = new Set<string>();
                
                menuItems.forEach(item => {
                  const category = item.category || 'General';
                  categorySet.add(category);
                });
                
                // Add all unique categories that actually exist in the menu
                const uniqueCategories = Array.from(categorySet).sort();
                categories.push(...uniqueCategories);
                
                return categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all whitespace-nowrap text-sm ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{category}</span>
                    {category !== 'All' && (
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        selectedCategory === category
                          ? 'bg-blue-500 text-blue-100'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {menuItems.filter(item => 
                          (item.category || 'General') === category
                        ).length}
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="aspect-square bg-slate-100 rounded-t-2xl animate-pulse"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-slate-100 rounded animate-pulse"></div>
                      <div className="h-6 bg-slate-200 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🍽️</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Menu Items Available</h3>
                  <p className="text-slate-600 mb-6 max-w-md">Get started by adding items in Menu Builder to begin selling.</p>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Go to Menu Builder
                  </button>
                </div>
              </div>
            ) : selectedCategory === 'All' ? (
              // Group by categories when "All" is selected
              <div className="space-y-8">
                {Array.from(new Set(menuItems.map(item => item.category || 'General')))
                  .sort()
                  .map(category => {
                    const categoryItems = menuItems.filter(item => 
                      (item.category || 'General') === category
                    );
                    
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category} className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className="text-2xl font-bold text-slate-900">{category}</h3>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <button 
                            onClick={() => setSelectedCategory(category)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                          >
                            View all →
                          </button>
                        </div>
                      
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                          {categoryItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => addToCartWithAddons(item)}
                              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                            >
                              <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="text-6xl flex items-center justify-center h-full transform group-hover:scale-110 transition-all duration-300">
                                    <span role="img" aria-label={`${item.name} emoji`}>
                                      {getItemEmoji(item)}
                                    </span>
                                  </div>
                                )}
                                {item.addons && item.addons.length > 0 && (
                                  <div className="absolute top-3 right-3">
                                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                      +Add-ons
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="p-4">
                                <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                                  {item.name}
                                </h3>
                                
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-xl font-bold text-blue-600">
                                    ₱{item.price?.toFixed(2) || '0.00'}
                                  </span>
                                  <button className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full group-hover:bg-blue-700 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              // Single category view
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedCategory('All')}
                      className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to All
                    </button>
                    <div className="w-px h-6 bg-slate-300"></div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedCategory}</h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {menuItems.filter(item => (item.category || 'General') === selectedCategory).length} items
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {menuItems
                    .filter(item => (item.category || 'General') === selectedCategory)
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addToCartWithAddons(item)}
                        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                      >
                        <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-6xl flex items-center justify-center h-full transform group-hover:scale-110 transition-all duration-300">
                              <span role="img" aria-label={`${item.name} emoji`}>
                                {getItemEmoji(item)}
                              </span>
                            </div>
                          )}
                          {item.addons && item.addons.length > 0 && (
                            <div className="absolute top-3 right-3">
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                +Add-ons
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {item.name}
                          </h3>
                          
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-blue-600">
                              ₱{item.price?.toFixed(2) || '0.00'}
                            </span>
                            <button className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full group-hover:bg-blue-700 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🛒 Right Panel - Compact Cart */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col min-h-0 relative z-10" style={{minWidth: '320px'}}>
          {/* Minimalist Cart Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0H17M17 18a2 2 0 11-4 0 2 2 0 014 0zM9 18a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
                    <span>•</span>
                    <span className={`${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                    {pendingSyncCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-yellow-600">{pendingSyncCount} pending</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                  title="Clear cart"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Cart is Empty</h3>
                  <p className="text-sm text-gray-600 mb-4">Add items from the menu to get started</p>
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                    💡 Tap any menu item to add it to your order
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {cart.map((item, index) => (
                  <div key={item.cartItemId} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <h4 className="font-medium text-gray-900 truncate text-sm">{item.name}</h4>
                          {item.selectedAddons.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                              +{item.selectedAddons.length}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                          <span className="font-medium text-gray-900">₱{item.price.toFixed(2)}</span>
                          <span className="text-gray-400">•</span>
                          <span className="capitalize">{item.category}</span>
                        </div>
                        
                        {/* Compact Add-ons Display */}
                        {item.selectedAddons.length > 0 && (
                          <div className="mt-2 p-2 bg-purple-50 rounded-md">
                            <p className="text-xs font-medium text-purple-700 mb-1">Add-ons</p>
                            <div className="space-y-1">
                              {item.selectedAddons.map((addon, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="text-purple-700">{addon.name}</span>
                                  <span className="text-purple-900 font-medium">+₱{addon.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Customizations */}
                        {item.customizations && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-md">
                            <p className="text-xs font-medium text-blue-700 mb-1">Special Instructions</p>
                            <p className="text-xs text-blue-800 italic">"{item.customizations}"</p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Compact Quantity Controls & Item Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">Qty:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs flex items-center justify-center transition-colors font-medium"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-gray-900 bg-gray-100 rounded px-2 py-1">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center justify-center transition-colors font-medium"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <span className="text-sm font-bold text-blue-600">₱{item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Quick Actions */}
                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          // Duplicate last item functionality
                          const lastItem = cart[cart.length - 1]
                          if (lastItem) {
                            addToCart(lastItem, lastItem.selectedAddons, lastItem.customizations)
                          }
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Duplicate Last
                      </button>
                      <button
                        onClick={() => {
                          // Apply quick discount
                          // This would integrate with a discount system
                        }}
                        className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Discount
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compact Cart Footer - Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 bg-white">
              <div className="p-4">
                {/* Detailed Order Summary */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                    </span>
                    <span className="font-medium text-slate-900">₱{cartTotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Add-ons Summary */}
                  {cart.some(item => item.selectedAddons.length > 0) && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add-ons ({cart.reduce((sum, item) => sum + item.selectedAddons.length, 0)})
                      </span>
                      <span className="font-medium text-purple-700">
                        +₱{cart.reduce((sum, item) => 
                          sum + item.selectedAddons.reduce((addonSum, addon) => addonSum + (addon.price * item.quantity), 0), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* Tax/Service Charge (if applicable) */}
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tax Included
                    </span>
                    <span className="font-medium">₱0.00</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                    <span className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Quick Payment Options */}
                <div className="space-y-3">
                  {/* Primary Checkout Button */}
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>{isOnline ? 'Process Payment' : 'Process Offline Order'}</span>
                      <div className="px-2 py-1 bg-white/20 rounded-lg text-sm">
                        ₱{cartTotal.toFixed(2)}
                      </div>
                    </div>
                  </button>
                  
                  {/* Quick Actions Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        // Save draft functionality
                        const draftOrder = {
                          id: `draft_${Date.now()}`,
                          items: cart,
                          total: cartTotal,
                          timestamp: Date.now(),
                          status: 'draft'
                        }
                        localStorage.setItem(`draft_order_${draftOrder.id}`, JSON.stringify(draftOrder))
                        setCart([])
                      }}
                      className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Draft
                    </button>
                    <button
                      onClick={() => {
                        // Hold order functionality
                        const holdOrder = {
                          id: `hold_${Date.now()}`,
                          items: cart,
                          total: cartTotal,
                          timestamp: Date.now(),
                          status: 'hold'
                        }
                        localStorage.setItem(`hold_order_${holdOrder.id}`, JSON.stringify(holdOrder))
                        setCart([])
                      }}
                      className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Hold Order
                    </button>
                  </div>
                  
                  {/* Order Notes */}
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 py-2">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Add Order Notes
                      </span>
                      <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-2">
                      <textarea
                        placeholder="Special instructions for kitchen or customer..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🍕 Enhanced Add-ons & Customization Modal */}
      {showAddonsModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedItem.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">Customize your order</p>
                </div>
                <button
                  onClick={() => setShowAddonsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Base Item */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-900">{selectedItem.name}</h4>
                    <p className="text-sm text-slate-600">{selectedItem.description}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">₱{selectedItem.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Add-ons Sections */}
              {selectedItem.addons && (
                <div className="space-y-6">
                  {/* Group add-ons by category */}
                  {['size', 'extra', 'modification', 'special'].map(category => {
                    const categoryAddons = selectedItem.addons!.filter(addon => addon.category === category)
                    
                    if (categoryAddons.length === 0) return null

                    // 🔧 FIX: Ensure unique addon IDs within each category to prevent React key collisions
                    const uniqueCategoryAddons = categoryAddons.reduce((acc, addon, index) => {
                      const existingIds = acc.map(a => a.id)
                      let uniqueId = addon.id
                      let counter = 1
                      
                      // If ID already exists in this category, append a counter
                      while (existingIds.includes(uniqueId)) {
                        uniqueId = `${addon.id}-${counter}`
                        counter++
                      }
                      
                      acc.push({ ...addon, id: uniqueId })
                      return acc
                    }, [] as typeof categoryAddons)

                    return (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3 capitalize flex items-center gap-2">
                          {category === 'size' && '📏'}
                          {category === 'extra' && '➕'}
                          {category === 'modification' && '🔧'}
                          {category === 'special' && '⭐'}
                          {category} Options
                          {uniqueCategoryAddons.some(addon => addon.required) && (
                            <span className="text-red-500 text-xs">(Required)</span>
                          )}
                        </h5>
                        
                        <div className="space-y-2">
                          {uniqueCategoryAddons.map(addon => (
                            <div key={addon.id}>
                              {addon.options ? (
                                // Radio buttons for options like size
                                <div className="space-y-2">
                                  {addon.options.map((option, idx) => {
                                    const price = option.includes('+₱') ? 
                                      parseFloat(option.match(/₱(\d+)/)?.[1] || '0') : 0
                                    const optionName = option.split('(')[0].trim()
                                    const isSelected = selectedAddons.some(selected => 
                                      selected.id === `${addon.id}_${idx}`
                                    )
                                    
                                    return (
                                      <label key={idx} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="radio"
                                            name={addon.id}
                                            checked={isSelected}
                                            onChange={() => {
                                              // Remove other size selections
                                              const filteredAddons = selectedAddons.filter(selected => 
                                                !selected.id.startsWith(addon.id)
                                              )
                                              
                                              setSelectedAddons([
                                                ...filteredAddons,
                                                {
                                                  id: `${addon.id}_${idx}`,
                                                  name: optionName,
                                                  price: price,
                                                  category: addon.category,
                                                  // Include inventory properties if they exist
                                                  inventoryItemId: addon.inventoryItemId,
                                                  inventoryItemName: addon.inventoryItemName,
                                                  quantityPerServing: addon.quantityPerServing,
                                                  unit: addon.unit,
                                                  costPerServing: addon.costPerServing
                                                }
                                              ])
                                            }}
                                            className="text-blue-600"
                                          />
                                          <span className="font-medium">{optionName}</span>
                                        </div>
                                        <span className="text-blue-600 font-medium">
                                          {price > 0 ? `+₱${price.toFixed(2)}` : 'Free'}
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              ) : (
                                // Checkbox for regular add-ons
                                <label className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedAddons.some(selected => selected.id === addon.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedAddons([...selectedAddons, {
                                            id: addon.id,
                                            name: addon.name,
                                            price: addon.price,
                                            category: addon.category,
                                            // Include inventory properties if they exist
                                            inventoryItemId: addon.inventoryItemId,
                                            inventoryItemName: addon.inventoryItemName,
                                            quantityPerServing: addon.quantityPerServing,
                                            unit: addon.unit,
                                            costPerServing: addon.costPerServing
                                          }])
                                        } else {
                                          setSelectedAddons(selectedAddons.filter(selected => selected.id !== addon.id))
                                        }
                                      }}
                                      className="text-blue-600"
                                    />
                                    <span className="font-medium">{addon.name}</span>
                                  </div>
                                  <span className="text-blue-600 font-medium">
                                    {addon.price > 0 ? `+₱${addon.price.toFixed(2)}` : 'Free'}
                                  </span>
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Custom Instructions */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={customizations}
                  onChange={(e) => setCustomizations(e.target.value)}
                  placeholder="e.g., Extra spicy, no pickles, well done..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">
                Total: ₱{(selectedItem.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0)).toFixed(2)}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddonsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addToCart(selectedItem, selectedAddons, customizations)
                    setShowAddonsModal(false)
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💳 Enhanced Payment Modal */}
      <EnhancedPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cartTotal={cartTotal}
        onPaymentComplete={processPayment}
        isOnline={isOnline}
        isProcessing={isProcessingPayment}
      />

      {/* 📋 Recent Orders Modal */}
      {showRecentOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Recent Orders</h3>
                  <p className="text-blue-100">Order history and management</p>
                </div>
                <button
                  onClick={() => setShowRecentOrders(false)}
                  className="text-white hover:text-gray-200 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
                  <p className="text-gray-500">Orders will appear here after you process them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">#{order.orderNumber?.slice(-3) || order.id.slice(-3)}</span>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">Order #{order.orderNumber || order.id.slice(-6)}</h4>
                            <p className="text-sm text-gray-500">
                              {order.createdAt.toDate().toLocaleDateString()} • {order.createdAt.toDate().toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">₱{order.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-500 capitalize">{order.paymentMethod}</p>
                        </div>
                      </div>
                      
                      {/* Order Content */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                        {/* Items Section */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Items ({order.items.length})</h5>
                          <div className="space-y-2">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                                <span className="font-medium">{item.quantity}x {item.name}</span>
                                <span className="text-gray-900 font-semibold">₱{item.total.toFixed(2)}</span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-xs text-gray-500 text-center py-1">+{order.items.length - 3} more items</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Status and Actions Section */}
                        <div className="flex flex-col justify-between">
                          {/* Status Badge */}
                          <div className="mb-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'voided' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => printReceipt(order)}
                              className="flex items-center justify-center gap-2 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-200 w-full"
                              title="Print Receipt"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              <span className="font-medium">Print Receipt</span>
                            </button>
                            
                            <button
                              onClick={() => exportToPDF(order)}
                              className="flex items-center justify-center gap-2 px-4 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-gray-200 hover:border-green-200 w-full"
                              title="Export PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-medium">Export PDF</span>
                            </button>
                            
                            {order.status !== 'voided' && (
                              <button
                                onClick={() => showVoidModal(order)}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 hover:border-red-200 w-full"
                                title="Void Order"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="font-medium">Void Order</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* 🚫 Void Order Modal */}
      {showVoidOrderModal && orderToVoid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Void Order</h3>
                  <p className="text-red-100">Order #{orderToVoid.orderNumber || orderToVoid.id.slice(-6)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowVoidOrderModal(false)
                    setOrderToVoid(null)
                    setVoidReason('')
                    setRestoreInventory(true)
                  }}
                  className="text-white hover:text-gray-200 p-1"
                  disabled={isVoiding}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Order Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Date:</strong> {orderToVoid.createdAt.toDate().toLocaleDateString()}</p>
                  <p><strong>Total:</strong> ₱{orderToVoid.total.toFixed(2)}</p>
                  <p><strong>Items:</strong> {orderToVoid.items.length} items</p>
                  <p><strong>Payment:</strong> {orderToVoid.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              {/* Void Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Voiding <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Please provide a reason for voiding this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none h-24"
                  disabled={isVoiding}
                />
                <p className="text-xs text-gray-500 mt-1">Required for audit purposes</p>
              </div>

              {/* Inventory Restoration Option */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="restoreInventory"
                    checked={restoreInventory}
                    onChange={(e) => setRestoreInventory(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    disabled={isVoiding}
                  />
                  <div>
                    <label htmlFor="restoreInventory" className="text-sm font-medium text-gray-900">
                      Restore inventory quantities
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Check this to add the voided items back to your inventory. 
                      Uncheck if items were consumed or damaged.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Warning: This action cannot be undone</p>
                    <p className="text-xs text-red-600 mt-1">
                      Once voided, this order will be permanently marked as cancelled and cannot be restored.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVoidOrderModal(false)
                  setOrderToVoid(null)
                  setVoidReason('')
                  setRestoreInventory(true)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isVoiding}
              >
                Cancel
              </button>
              <button
                onClick={processVoidOrder}
                disabled={!voidReason.trim() || isVoiding}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  voidReason.trim() && !isVoiding
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isVoiding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Voiding...
                  </>
                ) : (
                  'Void Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      )}
    </>
  )
}
