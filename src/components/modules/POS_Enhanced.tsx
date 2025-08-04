'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useBranch } from '@/lib/context/BranchContext'
import { getPOSItems, createPOSOrder, getPOSOrders, type POSItem as FirebasePOSItem, type POSOrder } from '@/lib/firebase/pos'
import { getMenuItems, type MenuItem } from '@/lib/firebase/menuBuilder'
import { getAddons, type Addon as MenuBuilderAddon } from '@/lib/firebase/addons'
import { getBranchLocationId } from '@/lib/utils/branchUtils'
import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { addInventoryItem, updateStockQuantity, findInventoryItemByName } from '@/lib/firebase/inventory'
import CoreTrackLogo from '@/components/CoreTrackLogo'

// 🚀 Enhanced Interfaces with Add-ons Support
interface AddOn {
  id: string
  name: string
  price: number
  category: 'size' | 'extra' | 'modification' | 'special' | 'ingredient'
  required?: boolean
  options?: string[]
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
  paymentMethod: string
  timestamp: number
  synced: boolean
  customerInfo?: any
}

export default function POSEnhanced() {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  // 🏢 Business and Branch IDs for Firebase operations
  const businessId = profile?.tenantId || ''
  const branchId = selectedBranch?.id || ''
  
  // 🔄 Online/Offline State Management
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([])
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  
  // 🛒 Cart and Menu State
  const [cart, setCart] = useState<CartItem[]>([])
  const [menuItems, setMenuItems] = useState<POSItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  
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
  
  // 🛠️ Add-ons Management State
  const [showAddonsManager, setShowAddonsManager] = useState(false)
  const [editingAddon, setEditingAddon] = useState<AddOn | null>(null)
  const [customAddons, setCustomAddons] = useState<AddOn[]>([])
  const [newAddon, setNewAddon] = useState<Partial<AddOn>>({
    name: '',
    price: 0,
    category: 'extra'
  })
  
  // 🎯 Enhanced Add-from-Inventory Modal State
  const [showInventoryAddonModal, setShowInventoryAddonModal] = useState(false)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null)
  const [inventoryAddonQuantity, setInventoryAddonQuantity] = useState(1)
  const [inventoryAddonPrice, setInventoryAddonPrice] = useState(0)
  const [availableInventory, setAvailableInventory] = useState<any[]>([])
  
  // 📦 Inventory Integration State
  const [addonQuantity, setAddonQuantity] = useState(0)
  const [addonUnit, setAddonUnit] = useState('pcs')
  const [addonCost, setAddonCost] = useState(0)
  const [createInventoryItem, setCreateInventoryItem] = useState(true)

  // 🚫 Void Order Modal State
  const [showVoidOrderModal, setShowVoidOrderModal] = useState(false)
  const [orderToVoid, setOrderToVoid] = useState<any>(null)
  const [voidReason, setVoidReason] = useState('')
  const [restoreInventory, setRestoreInventory] = useState(true)
  const [isVoiding, setIsVoiding] = useState(false)

  // 🔄 Network Status Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineOrders()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load offline orders from localStorage
    loadOfflineOrders()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 💾 Load Offline Orders from LocalStorage
  const loadOfflineOrders = () => {
    try {
      const stored = localStorage.getItem('coretrack_offline_orders')
      if (stored) {
        const orders = JSON.parse(stored)
        setOfflineOrders(orders)
        setPendingSyncCount(orders.filter((o: OfflineOrder) => !o.synced).length)
      }
    } catch (error) {
      console.error('Failed to load offline orders:', error)
    }
  }

  // 🔄 Sync Offline Orders when Online
  const syncOfflineOrders = async () => {
    if (!isOnline || !profile?.tenantId || !selectedBranch) return

    try {
      const unsyncedOrders = offlineOrders.filter(order => !order.synced)
      
      for (const order of unsyncedOrders) {
        const orderData = {
          items: order.items.map(item => ({
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
          subtotal: order.total,
          total: order.total,
          paymentMethod: order.paymentMethod,
          tenantId: profile.tenantId,
          locationId: getBranchLocationId(selectedBranch.id),
          orderType: 'dine-in' as const,
          status: 'completed' as const
        }

        await createPOSOrder(orderData)
        
        // Deduct add-ons from inventory for this synced order
        await deductAddonsFromInventoryForOrder(order.items)
        
        // Mark as synced
        order.synced = true
      }

      // Update localStorage
      localStorage.setItem('coretrack_offline_orders', JSON.stringify(offlineOrders))
      setPendingSyncCount(0)
      
      console.log(`✅ Synced ${unsyncedOrders.length} offline orders with inventory updates`)
    } catch (error) {
      console.error('Failed to sync offline orders:', error)
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
      console.log('📋 Loading recent orders...')
      
      const orders = await getPOSOrders(profile.tenantId, locationId)
      
      // Sort by creation date and get the most recent ones
      const sortedOrders = orders
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 20) // Get last 20 orders
      
      setRecentOrders(sortedOrders)
      console.log('✅ Loaded recent orders:', sortedOrders.length)
    } catch (error) {
      console.error('❌ Error loading recent orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  // 🛠️ Add-ons Management Functions
  const saveCustomAddon = async () => {
    if (!newAddon.name || newAddon.price === undefined) return

    try {
      const addon: AddOn = {
        id: `custom_${Date.now()}`,
        name: newAddon.name,
        price: newAddon.price,
        category: newAddon.category as AddOn['category'],
        required: newAddon.required || false
      }

      // Create inventory item if requested
      if (createInventoryItem && businessId && branchId) {
        const locationId = getBranchLocationId(branchId)
        
        try {
          await addInventoryItem({
            name: addon.name,
            category: 'Add-ons',
            currentStock: addonQuantity,
            minStock: 5, // Default minimum stock
            unit: addonUnit,
            costPerUnit: addonCost,
            supplier: 'Internal',
            tenantId: businessId,
            locationId: locationId,
            isPerishable: false
          })
          
          alert(`✅ "${addon.name}" added to both add-ons and inventory!`)
        } catch (inventoryError) {
          console.error('Error creating inventory item:', inventoryError)
          alert(`⚠️ Add-on created but failed to add to inventory. You can manually add it later.`)
        }
      } else {
        alert(`✅ "${addon.name}" added successfully!`)
      }

      // Update local state
      const updatedAddons = [...customAddons, addon]
      setCustomAddons(updatedAddons)
      localStorage.setItem('coretrack_custom_addons', JSON.stringify(updatedAddons))
      
      // Reset form
      setNewAddon({ name: '', price: 0, category: 'extra' })
      setAddonQuantity(0)
      setAddonUnit('pcs')
      setAddonCost(0)
      setCreateInventoryItem(true)
      
    } catch (error) {
      console.error('Error saving add-on:', error)
      alert('❌ Error saving add-on. Please try again.')
    }
  }

  const deleteCustomAddon = (addonId: string) => {
    const updated = customAddons.filter(addon => addon.id !== addonId)
    setCustomAddons(updated)
    localStorage.setItem('coretrack_custom_addons', JSON.stringify(updated))
  }

  const editCustomAddon = (addon: AddOn) => {
    setEditingAddon(addon)
    setNewAddon(addon)
  }

  const updateCustomAddon = () => {
    if (!editingAddon || !newAddon.name) return

    const updated = customAddons.map(addon => 
      addon.id === editingAddon.id 
        ? { ...addon, ...newAddon }
        : addon
    )
    
    setCustomAddons(updated)
    localStorage.setItem('coretrack_custom_addons', JSON.stringify(updated))
    setEditingAddon(null)
    setNewAddon({ name: '', price: 0, category: 'extra' })
  }

  // Load custom add-ons from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('coretrack_custom_addons')
    if (stored) {
      try {
        setCustomAddons(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load custom add-ons:', error)
      }
    }
  }, [])

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
      const orderRef = doc(db, `businesses/${businessId}/branches/${branchId}/orders`, order.id)
      await updateDoc(orderRef, {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: user?.email || 'Unknown'
      })

      // Restore inventory for voided items
      for (const item of order.items) {
        const inventoryRef = doc(db, `businesses/${businessId}/branches/${branchId}/inventory`, item.id)
        const inventoryDoc = await getDoc(inventoryRef)
        
        if (inventoryDoc.exists()) {
          const currentQuantity = inventoryDoc.data().quantity || 0
          await updateDoc(inventoryRef, {
            quantity: currentQuantity + item.quantity
          })
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
      const orderRef = doc(db, `businesses/${businessId}/branches/${branchId}/orders`, orderToVoid.id)
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
          const inventoryRef = doc(db, `businesses/${businessId}/branches/${branchId}/inventory`, item.id)
          const inventoryDoc = await getDoc(inventoryRef)
          
          if (inventoryDoc.exists()) {
            const currentQuantity = inventoryDoc.data().quantity || 0
            await updateDoc(inventoryRef, {
              quantity: currentQuantity + item.quantity
            })
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

        console.log('📊 Data loaded:', {
          posItems: posItems.length,
          menuBuilderItems: menuBuilderItems.length,
          standAloneAddons: standAloneAddons.length
        })

        // Debug: Log the first few menu builder items to see their structure
        console.log('🔍 Menu Builder items sample:', menuBuilderItems.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          hasDescription: !!item.description,
          descriptionLength: item.description?.length || 0
        })))

        // Convert Menu Builder add-ons to POS add-ons format (from menuItems collection)
        const menuAddons: AddOn[] = menuBuilderItems
          .filter(item => item.isAddonOnly)
          .map(item => ({
            id: item.id || `addon-${item.name}`,
            name: item.name,
            price: item.price,
            category: item.addonType || 'extra' as any,
            required: item.isRequired || false,
            options: undefined // Can be extended later
          }))

        // Convert standalone add-ons from Menu Builder (from addons collection)
        const standAloneAddonsPOS: AddOn[] = standAloneAddons
          .filter(addon => addon.status === 'active')
          .map(addon => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            category: 'extra' as any, // Default category
            required: false,
            options: undefined
          }))

        // Combine all Menu Builder add-ons
        const allMenuBuilderAddons = [...menuAddons, ...standAloneAddonsPOS]
        setMenuBuilderAddons(allMenuBuilderAddons)

        console.log('🔗 Loaded Menu Builder add-ons:', {
          fromMenuItems: menuAddons.length,
          fromAddonsCollection: standAloneAddonsPOS.length,
          total: allMenuBuilderAddons.length,
          addons: allMenuBuilderAddons
        })

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
            
            console.log(`🔄 Converting Menu Builder item: ${item.name}, description: "${item.description || 'NONE'}", hasValidDescription: ${hasValidDescription}, POS ID: ${actualPOSItemId}`)
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
              addons: [...getItemAddons(item as any), ...allMenuBuilderAddons, ...customAddons]
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
            
            console.log(`🔄 Including POS item: ${item.name}, description: "${item.description || 'NONE'}", hasValidDescription: ${hasValidDescription}`)
            return {
              ...item,
              description: hasValidDescription ? item.description : fallbackDescription, // Enhanced fallback for POS items
              available: item.isAvailable,
              addons: [...getItemAddons(item), ...allMenuBuilderAddons, ...customAddons]
            }
          })

        // Combine Menu Builder items (priority) with unique POS items
        const enhancedItems: POSItem[] = [...menuBuilderPOSItems, ...posItemsNotInMenuBuilder]

        console.log('🍽️ Final menu items:', {
          menuBuilderItems: menuBuilderPOSItems.length,
          uniquePOSItems: posItemsNotInMenuBuilder.length,
          total: enhancedItems.length,
          itemsWithDescriptions: enhancedItems.filter(item => item.description && item.description.trim()).length,
          itemsWithoutDescriptions: enhancedItems.filter(item => !item.description || !item.description.trim()).length
        })

        // Debug: Log sample final items with enhanced description info
        console.log('🔍 Final items sample with descriptions:', enhancedItems.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          descriptionLength: item.description?.length || 0,
          hasDescription: !!(item.description && item.description.trim()),
          source: menuBuilderPOSItems.some(mb => mb.id === item.id) ? 'MenuBuilder' : 'POS'
        })))

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

  // 💳 Process Payment (Online/Offline)
  const processPayment = async () => {
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
          total: cartTotal,
          paymentMethod: selectedPaymentMethod,
          tenantId: profile.tenantId,
          locationId: getBranchLocationId(selectedBranch.id),
          orderType: 'dine-in' as const,
          status: 'completed' as const
        }

        // Create the order
        await createPOSOrder(firestoreOrder)

        // 📦 Deduct add-ons from inventory (only if there are add-ons)
        const hasAddons = cart.some(item => item.addons && item.addons.length > 0)
        if (hasAddons) {
          console.log('🔗 Cart has add-ons, deducting from inventory...')
          await deductAddonsFromInventory()
        } else {
          console.log('📝 No add-ons in cart, skipping add-on inventory deduction')
        }
        
        alert('✅ Payment successful! Order completed and inventory updated.')
      } else {
        // 📱 Offline: Save to localStorage
        const offlineOrder: OfflineOrder = {
          id: `offline_${Date.now()}`,
          items: cart, // Store full cart items for offline
          total: cartTotal,
          paymentMethod: selectedPaymentMethod,
          timestamp: Date.now(),
          synced: false
        }

        const updatedOfflineOrders = [...offlineOrders, offlineOrder]
        setOfflineOrders(updatedOfflineOrders)
        setPendingSyncCount(prev => prev + 1)
        
        localStorage.setItem('coretrack_offline_orders', JSON.stringify(updatedOfflineOrders))
        
        alert('📱 Payment successful! Order saved offline. Inventory will update when synced.')
      }

      // Reset cart and modal
      setCart([])
      setShowPaymentModal(false)
      setCashReceived('')
      setSelectedPaymentMethod('cash')

    } catch (error) {
      console.error('Payment error:', error)
      alert('❌ Payment failed. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // 📦 Deduct Add-ons from Inventory
  // 📦 Enhanced Add-on Inventory Deduction
  const deductAddonsFromInventory = async () => {
    if (!businessId || !branchId || !profile?.tenantId || !selectedBranch) return

    for (const cartItem of cart) {
      if (cartItem.addons && cartItem.addons.length > 0) {
        for (const addon of cartItem.addons) {
          try {
            // 🎯 Check if this is a Menu Builder add-on with ingredients
            const menuBuilderAddon = menuBuilderAddons.find(mba => mba.id === addon.id)
            
            if (menuBuilderAddon) {
              // 🏗️ Menu Builder add-on: Deduct based on ingredients
              // Get the full menu item details to access ingredients
              const locationId = getBranchLocationId(selectedBranch.id)
              const menuItems = await getMenuItems(profile.tenantId, locationId)
              const fullMenuItem = menuItems.find(item => item.id === menuBuilderAddon.id)
              
              if (fullMenuItem && fullMenuItem.ingredients && fullMenuItem.ingredients.length > 0) {
                // Deduct each ingredient
                for (const ingredient of fullMenuItem.ingredients) {
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
                console.log(`✅ Deducted Menu Builder add-on "${addon.name}" ingredients for ${cartItem.quantity} servings`)
              } else {
                // Fallback: Try to find by name for Menu Builder add-ons without ingredients
                const inventoryItem = await findInventoryItemByName(profile.tenantId, addon.name)
                if (inventoryItem) {
                  await updateStockQuantity(
                    profile.tenantId,
                    inventoryItem.id,
                    cartItem.quantity,
                    'subtract',
                    `Used in POS order - ${cartItem.name} (Menu Builder Add-on)`,
                    user?.uid,
                    user?.email || 'POS System'
                  )
                } else {
                  console.warn(`⚠️ Inventory item not found for Menu Builder add-on: ${addon.name}`)
                }
              }
            } else {
              // 🛠️ Custom add-on: Find by name (existing behavior)
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
                console.log(`✅ Deducted custom add-on "${addon.name}" for ${cartItem.quantity} servings`)
              } else {
                console.warn(`⚠️ Inventory item not found for add-on: ${addon.name}`)
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

  // 💰 Calculate Change
  const calculateChange = () => {
    const received = parseFloat(cashReceived) || 0
    return Math.max(0, received - cartTotal)
  }

  // ✅ Payment Validation
  const isPaymentValid = () => {
    if (selectedPaymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0
      return received >= cartTotal
    }
    return true
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 🔝 Enhanced Header with Offline Indicator */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo & Branch Info */}
            <div className="flex items-center gap-4">
              <CoreTrackLogo size="sm" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">POS Enhanced</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">{selectedBranch?.name || 'Main Branch'}</p>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isOnline ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                  {pendingSyncCount > 0 && (
                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {pendingSyncCount} pending sync
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowRecentOrders(true)
                  loadRecentOrders()
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm flex items-center gap-2"
              >
                <span className="text-lg">🕒</span>
                <span className="hidden sm:inline">Recent Orders</span>
              </button>
              
              {!isOnline && (
                <button
                  onClick={syncOfflineOrders}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  🔄 Sync Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 📋 Left Panel - Menu */}
        <div className="flex-1 flex flex-col">
          {/* Category Filter */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex gap-2 overflow-x-auto">
              {(() => {
                // Get unique categories from menu items
                const categories = ['All'];
                const categorySet = new Set<string>();
                
                menuItems.forEach(item => {
                  const category = item.category || 'General';
                  categorySet.add(category);
                });
                
                const uniqueCategories = Array.from(categorySet);
                
                // Map generic categories to display names
                const categoryMap: { [key: string]: string } = {
                  'General': 'Food',
                  'Beverages': 'Beverages',
                  'Desserts': 'Desserts',
                  'Appetizers': 'Appetizers',
                  'Food': 'Food'
                };
                
                // Add unique categories that exist in the menu
                uniqueCategories.forEach(cat => {
                  const displayName = categoryMap[cat] || cat;
                  if (!categories.includes(displayName)) {
                    categories.push(displayName);
                  }
                });
                
                return categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                    {category !== 'All' && (
                      <span className="ml-2 text-xs opacity-75">
                        ({menuItems.filter(item => 
                          (item.category || 'General') === category || 
                          (category === 'Food' && (!item.category || item.category === 'General'))
                        ).length})
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse"></div>
                ))}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Menu Items</h3>
                <p className="text-gray-500">Add items in Menu Builder to start selling</p>
              </div>
            ) : selectedCategory === 'All' ? (
              // Group by categories when "All" is selected
              <div className="space-y-8">
                {['Food', 'Beverages', 'Desserts', 'Appetizers'].map(category => {
                  const categoryItems = menuItems.filter(item => 
                    item.category === category || 
                    (category === 'Food' && (!item.category || item.category === 'General'))
                  );
                  
                  if (categoryItems.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{category}</h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {categoryItems.length} items
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {categoryItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => addToCartWithAddons(item)}
                            className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                          >
                            <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="text-5xl flex items-center justify-center h-full transform group-hover:scale-110 transition-all duration-200 group-hover:rotate-6">
                                  <span role="img" aria-label={`${item.name} emoji`}>
                                    {getItemEmoji(item)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {item.name}
                            </h3>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-blue-600">
                                ₱{item.price?.toFixed(2) || '0.00'}
                              </span>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {menuItems
                  .filter(item => 
                    item.category === selectedCategory || 
                    (selectedCategory === 'Food' && (!item.category || item.category === 'General'))
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToCartWithAddons(item)}
                      className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="text-5xl flex items-center justify-center h-full transform group-hover:scale-110 transition-all duration-200 group-hover:rotate-6">
                            <span role="img" aria-label={`${item.name} emoji`}>
                              {getItemEmoji(item)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          ₱{item.price?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 🛒 Right Panel - Cart */}
        <div className="w-64 lg:w-72 bg-white border-l border-gray-200 flex flex-col shadow-lg">
          {/* Cart Header */}
          <div className="bg-gray-50 border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Order Summary</h3>
                <p className="text-xs text-gray-500">{cart.length} items</p>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">🛒</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Cart is Empty</h3>
                <p className="text-xs text-gray-500">Add items from menu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.cartItemId} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500">₱{item.price.toFixed(2)} base</p>
                        
                        {/* Add-ons Display */}
                        {item.selectedAddons.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.selectedAddons.map((addon, idx) => (
                              <div key={idx} className="text-xs text-blue-600 flex justify-between">
                                <span className="truncate">+ {addon.name}</span>
                                <span className="ml-2 flex-shrink-0">₱{addon.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Customizations */}
                        {item.customizations && (
                          <p className="text-xs text-gray-400 mt-1 italic truncate">&quot;{item.customizations}&quot;</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-red-500 hover:text-red-700 p-1 ml-2 flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-medium text-xs min-w-[16px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-blue-600 text-sm">₱{item.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer - Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-3 bg-white">
              <div className="mb-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors text-sm"
              >
                {isOnline ? 'Process Order' : 'Process Offline Order'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🍕 Add-ons Modal */}
      {showAddonsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{selectedItem.name}</h3>
                  <p className="text-blue-100">Customize your order</p>
                </div>
                <button
                  onClick={() => setShowAddonsModal(false)}
                  className="text-white hover:text-gray-200 p-1"
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
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedItem.name}</h4>
                    <p className="text-sm text-gray-500">{selectedItem.description}</p>
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

                    return (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3 capitalize flex items-center gap-2">
                          {category === 'size' && '📏'}
                          {category === 'extra' && '➕'}
                          {category === 'modification' && '🔧'}
                          {category === 'special' && '⭐'}
                          {category} Options
                          {categoryAddons.some(addon => addon.required) && (
                            <span className="text-red-500 text-xs">(Required)</span>
                          )}
                        </h5>
                        
                        <div className="space-y-2">
                          {categoryAddons.map(addon => (
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
                                                  category: addon.category
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
                                            category: addon.category
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

      {/* 💳 Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 text-white rounded-t-xl">
              <h3 className="text-xl font-bold">Process Payment</h3>
              <p className="text-green-100">{isOnline ? 'Online Order' : 'Offline Order - Will sync later'}</p>
            </div>

            <div className="p-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Payment Method</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'cash', name: 'Cash', icon: '💵' },
                    { id: 'card', name: 'Card', icon: '💳' },
                    { id: 'gcash', name: 'GCash', icon: '📱' },
                    { id: 'maya', name: 'Maya', icon: '💙' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id as any)}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        selectedPaymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{method.icon}</div>
                      <div className="text-sm font-medium">{method.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Payment Input */}
              {selectedPaymentMethod === 'cash' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter amount received"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                  {parseFloat(cashReceived) >= cartTotal && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
                      Change: ₱{calculateChange().toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={!isPaymentValid() || isProcessingPayment}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isPaymentValid() && !isProcessingPayment
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Complete Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 🛠️ Add-ons Manager Modal */}
      {showAddonsManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Manage Add-ons</h3>
                  <p className="text-purple-100">Create, edit, and delete custom add-ons</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddonsManager(false)
                    setEditingAddon(null)
                    setNewAddon({ name: '', price: 0, category: 'extra' })
                  }}
                  className="text-white hover:text-gray-200 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* 🎯 Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setShowInventoryAddonModal(true)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  📦 Add from Inventory
                </button>
                <button
                  onClick={() => {
                    setEditingAddon(null)
                    setNewAddon({ name: '', price: 0, category: 'extra' })
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  🛠️ Create Custom
                </button>
              </div>

              {/* Add/Edit Form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  {editingAddon ? 'Edit Add-on' : 'Create New Add-on'}
                </h4>
                
                {/* Basic Add-on Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newAddon.name || ''}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Extra Bacon"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                    <input
                      type="number"
                      value={newAddon.price || 0}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newAddon.category || 'extra'}
                      onChange={(e) => setNewAddon(prev => ({ ...prev, category: e.target.value as AddOn['category'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="ingredient">🥬 Ingredient</option>
                      <option value="size">📏 Size</option>
                      <option value="extra">➕ Extra</option>
                      <option value="modification">🔧 Modification</option>
                      <option value="special">⭐ Special</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={addonUnit}
                      onChange={(e) => setAddonUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="pcs">Pieces</option>
                      <option value="grams">Grams</option>
                      <option value="ml">Milliliters</option>
                      <option value="cups">Cups</option>
                      <option value="tbsp">Tablespoons</option>
                      <option value="tsp">Teaspoons</option>
                    </select>
                  </div>
                </div>

                {/* Inventory Integration */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="createInventory"
                      checked={createInventoryItem}
                      onChange={(e) => setCreateInventoryItem(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="createInventory" className="text-sm font-medium text-gray-900">
                      📦 Add to Inventory Center
                    </label>
                    <span className="text-xs text-gray-500">(Track stock levels and deduct when used)</span>
                  </div>

                  {createInventoryItem && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                        <input
                          type="number"
                          value={addonQuantity}
                          onChange={(e) => setAddonQuantity(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current stock quantity</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit</label>
                        <input
                          type="number"
                          value={addonCost}
                          onChange={(e) => setAddonCost(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Purchase/preparation cost</p>
                      </div>
                      
                      <div className="flex items-end">
                        <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-lg w-full">
                          <p className="font-medium">💡 Profit Margin</p>
                          <p className="text-lg font-bold">
                            ₱{((newAddon.price || 0) - addonCost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex items-end">
                  <button
                    onClick={editingAddon ? updateCustomAddon : saveCustomAddon}
                    disabled={!newAddon.name?.trim()}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    {editingAddon ? 'Update Add-on' : 'Create Add-on & Add to Inventory'}
                  </button>
                </div>
              </div>

              {/* 🎯 Menu Builder Add-ons List */}
              {menuBuilderAddons.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-green-600">🏗️</span>
                    Menu Builder Add-ons ({menuBuilderAddons.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuBuilderAddons.map((addon) => (
                      <div key={addon.id} className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{addon.name}</h5>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              {addon.category === 'ingredient' && '🥬'}
                              {addon.category === 'size' && '📏'}
                              {addon.category === 'modification' && '🔧'}
                              {addon.category === 'special' && '⭐'}
                              <span className="capitalize">{addon.category}</span>
                              {addon.required && <span className="text-red-500 text-xs">• Required</span>}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {addon.price === 0 ? 'Free' : `₱${addon.price.toFixed(2)}`}
                          </span>
                        </div>
                        
                        <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          Managed in Menu Builder
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Add-ons List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-purple-600">🛠️</span>
                  Custom Add-ons ({customAddons.length})
                </h4>
                
                {customAddons.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🛠️</div>
                    <p className="text-gray-500">No custom add-ons yet. Create your first one above!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customAddons.map((addon) => (
                      <div key={addon.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{addon.name}</h5>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              {addon.category === 'size' && '📏'}
                              {addon.category === 'extra' && '➕'}
                              {addon.category === 'modification' && '🔧'}
                              {addon.category === 'special' && '⭐'}
                              <span className="capitalize">{addon.category}</span>
                            </p>
                          </div>
                          <span className="text-lg font-bold text-purple-600">
                            {addon.price === 0 ? 'Free' : `₱${addon.price.toFixed(2)}`}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => editCustomAddon(addon)}
                            className="flex-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCustomAddon(addon.id)}
                            className="flex-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

      {/* 🎯 Add from Inventory Modal */}
      {showInventoryAddonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Add Add-on from Inventory</h3>
                  <p className="text-blue-100">Select inventory item and set pricing with profit analysis</p>
                </div>
                <button
                  onClick={() => {
                    setShowInventoryAddonModal(false)
                    setSelectedInventoryItem(null)
                    setInventoryAddonQuantity(1)
                    setInventoryAddonPrice(0)
                  }}
                  className="text-white hover:text-gray-200 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {!selectedInventoryItem ? (
                // Step 1: Select Inventory Item
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">📦 Select Inventory Item</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {/* Placeholder - we'll load actual inventory */}
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📦</div>
                      <p>Loading inventory items...</p>
                      <p className="text-sm">Feature will load your actual inventory here</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Step 2: Set Pricing and Profit Analysis
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Pricing & Profit Analysis</h4>
                  
                  {/* Selected Item Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xl">📦</span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">{selectedInventoryItem.name}</h5>
                        <p className="text-sm text-gray-600">
                          Cost: ₱{selectedInventoryItem.cost?.toFixed(2) || '0.00'} per {selectedInventoryItem.unit}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stock: {selectedInventoryItem.quantity} {selectedInventoryItem.unit}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity per Add-on
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={inventoryAddonQuantity}
                          onChange={(e) => setInventoryAddonQuantity(parseFloat(e.target.value) || 1)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0.01"
                          step="0.01"
                        />
                        <span className="text-sm text-gray-500">{selectedInventoryItem.unit}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Selling Price
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">₱</span>
                        <input
                          type="number"
                          value={inventoryAddonPrice}
                          onChange={(e) => setInventoryAddonPrice(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profit Analysis */}
                  {inventoryAddonPrice > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
                      <h6 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-green-600">📊</span>
                        Profit Analysis
                      </h6>
                      
                      {(() => {
                        const totalCost = (selectedInventoryItem.cost || 0) * inventoryAddonQuantity
                        const profit = inventoryAddonPrice - totalCost
                        const margin = inventoryAddonPrice > 0 ? (profit / inventoryAddonPrice) * 100 : 0
                        const marginColor = margin >= 60 ? 'text-green-600' : margin >= 40 ? 'text-yellow-600' : 'text-red-600'
                        
                        return (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Cost per Add-on</p>
                              <p className="text-lg font-bold text-gray-900">₱{totalCost.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Profit</p>
                              <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₱{profit.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Margin</p>
                              <p className={`text-lg font-bold ${marginColor}`}>
                                {margin.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Margin Recommendations */}
                      {(() => {
                        const totalCost = (selectedInventoryItem.cost || 0) * inventoryAddonQuantity
                        const margin = inventoryAddonPrice > 0 ? ((inventoryAddonPrice - totalCost) / inventoryAddonPrice) * 100 : 0
                        
                        if (margin < 40) {
                          return (
                            <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                              ⚠️ Low margin. Consider pricing at ₱{(totalCost * 2.5).toFixed(2)} for 60% margin.
                            </div>
                          )
                        } else if (margin < 60) {
                          return (
                            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-sm text-yellow-800">
                              💡 Good margin. For premium pricing, try ₱{(totalCost * 3).toFixed(2)} for 67% margin.
                            </div>
                          )
                        } else {
                          return (
                            <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded text-sm text-green-800">
                              ✅ Excellent margin! This pricing will be very profitable.
                            </div>
                          )
                        }
                      })()}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedInventoryItem(null)}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      ← Back to Selection
                    </button>
                    <button
                      onClick={() => {
                        // Create add-on logic here
                        console.log('Creating add-on from inventory:', {
                          item: selectedInventoryItem,
                          quantity: inventoryAddonQuantity,
                          price: inventoryAddonPrice
                        })
                        setShowInventoryAddonModal(false)
                      }}
                      disabled={!inventoryAddonPrice || inventoryAddonPrice <= 0}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                        inventoryAddonPrice > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Create Add-on ₱{inventoryAddonPrice.toFixed(2)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
