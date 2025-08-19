'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import TutorialOverlay from '@/components/tutorial/TutorialOverlay'
import { useTutorial } from '@/hooks/useTutorial'
import { useBranch } from '@/lib/context/BranchContext'
import { useShift } from '@/lib/context/ShiftContext'
import { getMenuItems, type MenuItem } from '@/lib/firebase/menuBuilder'
import { getPOSItems, createPOSOrder, getPOSOrders, updatePOSOrder, type POSItem as FirebasePOSItem, type POSOrder } from '@/lib/firebase/pos'
import { getBranchLocationId } from '@/lib/utils/branchUtils'
import { Timestamp } from 'firebase/firestore'
import CoreTrackLogo from '@/components/CoreTrackLogo'

interface POSItem extends FirebasePOSItem {
  available?: boolean
}

interface CartItem extends POSItem {
  quantity: number
  total: number
}

export default function POS() {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift, startNewShift, endCurrentShift, isShiftActive, loading: shiftLoading } = useShift()
  const { showTutorial, currentStep, nextStep, prevStep, completeTutorial, startTutorial } = useTutorial()
  
  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [menuItems, setMenuItems] = useState<POSItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [recentOrders, setRecentOrders] = useState<POSOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidingOrder, setVoidingOrder] = useState<POSOrder | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [returnInventory, setReturnInventory] = useState(true)
  const [isProcessingVoid, setIsProcessingVoid] = useState(false)
  const [printingOrder, setPrintingOrder] = useState<string | null>(null)
  const [downloadingOrder, setDownloadingOrder] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showCombos, setShowCombos] = useState(false)
  const [showCustomers, setShowCustomers] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'gcash' | 'maya'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false) // Add refresh state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Custom setter for menuItems that ensures deduplication
  const setDeduplicatedMenuItems = (items: POSItem[]) => {
    const uniqueItemsMap = new Map();
    items.forEach(item => {
      if (!uniqueItemsMap.has(item.id)) {
        uniqueItemsMap.set(item.id, item);
      } else {
        console.warn(`⚠️ Duplicate item ID detected in setState and skipped: ${item.id} (${item.name})`);
      }
    });
    
    const deduplicatedItems = Array.from(uniqueItemsMap.values());
    setMenuItems(deduplicatedItems);
    console.log(`📋 Set ${deduplicatedItems.length} deduplicated menu items (filtered from ${items.length} total)`);
  }
  
  // Enhanced Additional Actions State
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<{type: 'percentage' | 'fixed', value: number, name: string} | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [showMobilePayModal, setShowMobilePayModal] = useState(false)
  const [qrCodeData, setQrCodeData] = useState('')
  
  // Combo Management States
  const [combos, setCombos] = useState<any[]>([])
  const [editingCombo, setEditingCombo] = useState<any>(null)
  const [showAddCombo, setShowAddCombo] = useState(false)

  // Cart total with discount calculation
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }, [cart])

  const cartTotal = useMemo(() => {
    let total = cartSubtotal
    if (selectedDiscount) {
      if (selectedDiscount.type === 'percentage') {
        total = total * (1 - selectedDiscount.value / 100)
      } else {
        total = Math.max(0, total - selectedDiscount.value)
      }
    }
    return total
  }, [cartSubtotal, selectedDiscount])

  // Filtered items based on category and search
  const filteredItems = useMemo(() => {
    let items = selectedCategory === 'All' ? menuItems : menuItems.filter(item => item.category === selectedCategory)
    
    if (searchQuery.trim()) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Additional deduplication safeguard at render time
    const uniqueRenderItems = new Map();
    items.forEach(item => {
      if (!uniqueRenderItems.has(item.id)) {
        uniqueRenderItems.set(item.id, item);
      } else {
        console.warn(`⚠️ Duplicate item ID detected at render time and skipped: ${item.id} (${item.name})`);
      }
    });
    
    return Array.from(uniqueRenderItems.values())
  }, [menuItems, selectedCategory, searchQuery])

  // Enhanced emoji mapping function
  const getItemEmoji = (item: POSItem) => {
    // First check if the item has a custom emoji set in Menu Builder
    if (item.emoji) {
      return item.emoji
    }
    
    // Fallback to name-based mapping if no custom emoji is set
    const itemName = item.name.toLowerCase()
    
    // Specific item mappings
    if (itemName.includes('coffee') || itemName.includes('espresso') || itemName.includes('latte') || itemName.includes('cappuccino')) return '☕'
    if (itemName.includes('tea') || itemName.includes('chai')) return '🍵'
    if (itemName.includes('juice') || itemName.includes('smoothie')) return '🧃'
    if (itemName.includes('soda') || itemName.includes('cola') || itemName.includes('pepsi')) return '🥤'
    if (itemName.includes('water') || itemName.includes('mineral')) return '💧'
    if (itemName.includes('beer') || itemName.includes('alcohol')) return '🍺'
    if (itemName.includes('wine')) return '🍷'
    
    // Pizza and Italian
    if (itemName.includes('pizza')) return '🍕'
    if (itemName.includes('pasta') || itemName.includes('spaghetti') || itemName.includes('linguine')) return '🍝'
    
    // Burgers and Fast Food
    if (itemName.includes('burger') || itemName.includes('hamburger')) return '🍔'
    if (itemName.includes('hotdog') || itemName.includes('hot dog')) return '🌭'
    if (itemName.includes('sandwich') || itemName.includes('sub')) return '🥪'
    if (itemName.includes('taco')) return '🌮'
    if (itemName.includes('burrito')) return '🌯'
    
    // Fried and Sides
    if (itemName.includes('fries') || itemName.includes('french fries')) return '🍟'
    if (itemName.includes('chicken') && (itemName.includes('fried') || itemName.includes('crispy'))) return '🍗'
    if (itemName.includes('wings')) return '🍗'
    if (itemName.includes('nuggets')) return '🍗'
    
    // Rice and Asian
    if (itemName.includes('rice') || itemName.includes('fried rice')) return '🍚'
    if (itemName.includes('ramen') || itemName.includes('noodles')) return '🍜'
    if (itemName.includes('sushi')) return '🍣'
    if (itemName.includes('dumpling')) return '🥟'
    
    // Meat and Proteins
    if (itemName.includes('steak') || itemName.includes('beef')) return '🥩'
    if (itemName.includes('fish') || itemName.includes('salmon') || itemName.includes('tuna')) return '🐟'
    if (itemName.includes('shrimp') || itemName.includes('prawns')) return '🍤'
    if (itemName.includes('pork') || itemName.includes('bacon')) return '🥓'
    
    // Breakfast
    if (itemName.includes('pancake')) return '🥞'
    if (itemName.includes('waffle')) return '🧇'
    if (itemName.includes('egg') || itemName.includes('omelet')) return '🥚'
    if (itemName.includes('toast') || itemName.includes('bread')) return '🍞'
    if (itemName.includes('bagel')) return '🥯'
    if (itemName.includes('croissant')) return '🥐'
    
    // Salads and Healthy
    if (itemName.includes('salad')) return '🥗'
    if (itemName.includes('soup')) return '🍲'
    if (itemName.includes('avocado')) return '🥑'
    
    // Desserts and Sweets
    if (itemName.includes('ice cream') || itemName.includes('gelato')) return '🍦'
    if (itemName.includes('cake')) return '🍰'
    if (itemName.includes('cupcake')) return '🧁'
    if (itemName.includes('cookie')) return '🍪'
    if (itemName.includes('donut') || itemName.includes('doughnut')) return '🍩'
    if (itemName.includes('pie')) return '🥧'
    if (itemName.includes('chocolate')) return '🍫'
    if (itemName.includes('candy')) return '🍬'
    
    // Fruits
    if (itemName.includes('apple')) return '🍎'
    if (itemName.includes('banana')) return '🍌'
    if (itemName.includes('orange')) return '🍊'
    if (itemName.includes('strawberry')) return '🍓'
    if (itemName.includes('grape')) return '🍇'
    if (itemName.includes('pineapple')) return '🍍'
    
    // Category-based fallbacks (more comprehensive)
    switch (item.category) {
      case 'Food':
      case 'Main Course':
      case 'Entrees':
        return '🍽️'
      case 'Beverages':
      case 'Drinks':
        return '🥤'
      case 'Desserts':
      case 'Sweets':
        return '🍰'
      case 'Appetizers':
      case 'Starters':
        return '🥗'
      case 'Breakfast':
        return '🥞'
      case 'Lunch':
        return '🍽️'
      case 'Dinner':
        return '🍽️'
      case 'Snacks':
        return '🍿'
      case 'Coffee':
        return '☕'
      case 'Tea':
        return '🍵'
      case 'Alcohol':
        return '🍺'
      case 'Fruits':
        return '🍎'
      case 'Vegetables':
        return '🥬'
      case 'Bread':
      case 'Bakery':
        return '🍞'
      case 'Pasta':
        return '🍝'
      case 'Pizza':
        return '🍕'
      case 'Asian':
        return '🍜'
      case 'Mexican':
        return '🌮'
      case 'Seafood':
        return '🦐'
      case 'Meat':
        return '🥩'
      case 'Healthy':
        return '🥗'
      case 'Fast Food':
        return '🍔'
      default:
        return '🍽️'
    }
  }

  // Data loading with real-time updates
  useEffect(() => {
    console.log('🔄 POS useEffect triggered with:', {
      tenantId: profile?.tenantId,
      selectedBranch: selectedBranch?.id,
      selectedBranchName: selectedBranch?.name,
      isDevelopment
    })
    
    if (!profile?.tenantId || !selectedBranch) {
      console.log('🔧 Development Mode: No tenant ID or branch, clearing menu items')
      console.log('Missing:', {
        profileTenantId: profile?.tenantId,
        selectedBranch: selectedBranch?.id
      })
      setMenuItems([])
      setLoading(false)
      return
    }

    const loadMenuItems = async () => {
      try {
        setLoading(true)
        
        // 🔧 CACHE INVALIDATION: Clear any potential stale data
        console.log('🧹 Clearing potential cache before loading...')
        
        // Clear localStorage cache that might contain stale POS data
        const cacheKeys = [
          'coretrack_pos_items',
          'coretrack_menu_items', 
          'menuItems',
          'posItems'
        ];
        
        cacheKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`  ✅ Cleared localStorage cache: ${key}`);
          }
        });
        
        const locationId = getBranchLocationId(selectedBranch.id)
        console.log('� Loading POS menu items FRESH from Firebase:', {
          tenantId: profile.tenantId,
          locationId,
          branchName: selectedBranch.name,
          timestamp: new Date().toISOString()
        })
        
        // Load fresh data from Firebase (no cache)
        const items = await getPOSItems(profile.tenantId, locationId)
        
        console.log('📋 FRESH POS Menu items loaded:', items.length)
        console.log('🔍 Fresh items with current IDs:', items.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          isAvailable: item.isAvailable
        })))
        
        // Convert POSItem and filter only available items
        // Also deduplicate items by ID to prevent React key errors
        const uniqueItemsMap = new Map();
        items
          .filter(item => item.isAvailable)
          .forEach(item => {
            // Only keep the first instance of each ID
            if (!uniqueItemsMap.has(item.id)) {
              uniqueItemsMap.set(item.id, {
                ...item,
                available: item.isAvailable
              });
            } else {
              console.warn(`⚠️ Duplicate item ID detected and skipped: ${item.id} (${item.name})`);
            }
          });
        
        const posItems: POSItem[] = Array.from(uniqueItemsMap.values());
        
        setMenuItems(posItems)
        console.log('✅ Loaded FRESH menu items for POS with correct IDs:', posItems.length)
      } catch (error) {
        console.error('❌ Error loading menu items:', error)
        setMenuItems([])
      } finally {
        setLoading(false)
      }
    }

    loadMenuItems()

    // Note: Removed auto-refresh interval to prevent disrupting user workflow
    // Menu items will be refreshed when branch/tenant changes or component remounts
  }, [profile?.tenantId, selectedBranch?.id, isDevelopment])

  const addToCart = (item: POSItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id)
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1, total: (cartItem.quantity + 1) * cartItem.price }
          : cartItem
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1, total: item.price }])
    }
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity, total: quantity * item.price }
        : item
    ))
  }

  const clearCart = () => {
    setCart([])
  }

  const handlePayment = async () => {
    if (!cart.length || !profile?.tenantId || !selectedBranch) return

    setIsProcessingPayment(true)
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create the order data
      const orderData = {
        items: cart.map(item => ({
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total
        })),
        subtotal: cartTotal,
        total: cartTotal,
        orderType: 'dine-in' as const,
        paymentMethod: selectedPaymentMethod,
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch.id),
        status: 'completed' as const
      }

      console.log('💳 Creating POS order:', orderData)
      
      // Save order to Firebase
      const orderId = await createPOSOrder(orderData)
      console.log('✅ Order created successfully with ID:', orderId)
      
      // Refresh recent orders to show the new order
      await loadRecentOrders()
      
      // Reset everything
      clearCart()
      setShowPaymentModal(false)
      setCashReceived('')
      setSelectedPaymentMethod('cash')
      
      // Show success message (you can integrate with your notification system)
      alert('Payment successful! Order completed.')
      
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const calculateChange = () => {
    const received = parseFloat(cashReceived) || 0
    return Math.max(0, received - cartTotal)
  }

  const isPaymentValid = () => {
    if (selectedPaymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0
      return received >= cartTotal
    }
    return true // For card/digital payments, assume they're always valid when selected
  }

  const refreshMenuItems = async () => {
    if (!profile?.tenantId || !selectedBranch) return
    
    try {
      setLoading(true)
      const locationId = getBranchLocationId(selectedBranch.id)
      console.log('🔄 Manual refresh of POS menu items...')
      
      const items = await getPOSItems(profile.tenantId, locationId)
      
      // Add deduplication here as well
      const uniqueItemsMap = new Map();
      items
        .filter(item => item.isAvailable)
        .forEach(item => {
          if (!uniqueItemsMap.has(item.id)) {
            uniqueItemsMap.set(item.id, {
              ...item,
              available: item.isAvailable
            });
          } else {
            console.warn(`⚠️ Duplicate item ID detected during refresh and skipped: ${item.id} (${item.name})`);
          }
        });
      
      const posItems: POSItem[] = Array.from(uniqueItemsMap.values());
      
      setMenuItems(posItems)
      console.log('✅ Menu items refreshed manually:', posItems.length)
    } catch (error) {
      console.error('❌ Error refreshing menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentOrders = async () => {
    if (!profile?.tenantId || !selectedBranch) return
    
    try {
      setLoadingOrders(true)
      const locationId = getBranchLocationId(selectedBranch.id)
      console.log('📋 Loading recent orders...')
      
      const orders = await getPOSOrders(profile.tenantId, locationId)
      
      // Deduplicate orders by ID to prevent React key errors
      const uniqueOrdersMap = new Map();
      orders.forEach(order => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order);
        } else {
          console.warn(`⚠️ Duplicate order ID detected and skipped: ${order.id} (Order #${order.orderNumber})`);
        }
      });
      
      // Sort by creation date and get the most recent ones
      const sortedOrders = Array.from(uniqueOrdersMap.values())
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

  const handleVoidOrder = async () => {
    if (!voidingOrder || !profile?.tenantId || !voidReason.trim()) return
    
    try {
      setIsProcessingVoid(true)
      
      console.log('🗑️ Voiding order:', {
        orderId: voidingOrder.id,
        reason: voidReason,
        returnInventory
      })
      
      // Update order status to voided
      await updatePOSOrder(profile.tenantId, voidingOrder.id, {
        status: 'voided',
        voidReason: voidReason.trim(),
        voidedAt: new Date(),
        voidedBy: user?.displayName || user?.email || 'Unknown'
      } as any)
      
      // TODO: If returnInventory is true, we would need to implement inventory restoration
      // This would involve calling a function to add back the ingredients used in the order
      if (returnInventory) {
        console.log('📦 Inventory return requested - implementation needed')
        // await restoreInventoryFromVoidedOrder(voidingOrder)
      }
      
      // Refresh recent orders to show updated status
      await loadRecentOrders()
      
      // Reset void modal state
      setShowVoidModal(false)
      setVoidingOrder(null)
      setVoidReason('')
      setReturnInventory(true)
      
      alert('Order voided successfully!')
      
    } catch (error) {
      console.error('❌ Error voiding order:', error)
      alert('Failed to void order. Please try again.')
    } finally {
      setIsProcessingVoid(false)
    }
  }

  const openVoidModal = (order: POSOrder) => {
    setVoidingOrder(order)
    setVoidReason('')
    setReturnInventory(true)
    setShowVoidModal(true)
  }

  const generateReceiptContent = (order: POSOrder) => {
    const currentDate = new Date().toLocaleDateString()
    const currentTime = new Date().toLocaleTimeString()
    
    return `
===========================================
              CORETRACK POS
           Receipt #${order.orderNumber}
===========================================

Date: ${order.createdAt.toDate().toLocaleDateString()}
Time: ${order.createdAt.toDate().toLocaleTimeString()}
Cashier: ${user?.displayName || 'Staff'}
Branch: ${selectedBranch?.name || 'Main Branch'}

-------------------------------------------
ITEMS:
-------------------------------------------
${order.items.map(item => 
  `${item.quantity}x ${item.name.padEnd(20)} ₱${item.total.toFixed(2)}`
).join('\n')}

-------------------------------------------
TOTAL: ₱${order.total.toFixed(2)}
Payment: ${order.paymentMethod.toUpperCase()}
Status: ${order.status.toUpperCase()}
${order.status === 'voided' ? `\nVOID REASON: ${order.voidReason || 'N/A'}` : ''}

-------------------------------------------
        Thank you for your business!
       Generated: ${currentDate} ${currentTime}
===========================================
    `.trim()
  }

  const handlePrintReceipt = async (order: POSOrder) => {
    try {
      setPrintingOrder(order.id)
      console.log('🖨️ Printing receipt for order:', order.orderNumber)
      
      const receiptContent = generateReceiptContent(order)
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=400,height=600')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - Order #${order.orderNumber}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.4;
                  margin: 20px;
                  white-space: pre-wrap;
                }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>${receiptContent}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
        printWindow.close()
      }
      
    } catch (error) {
      console.error('❌ Error printing receipt:', error)
      alert('Failed to print receipt. Please try again.')
    } finally {
      setPrintingOrder(null)
    }
  }

  const handleDownloadPDF = async (order: POSOrder) => {
    try {
      setDownloadingOrder(order.id)
      console.log('📄 Downloading receipt for order:', order.orderNumber)
      
      // Create HTML content for better formatting
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - Order #${order.orderNumber}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
                max-width: 400px;
                margin: 0 auto;
                padding: 20px;
                background: white;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 15px;
              }
              .company-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .order-info {
                margin-bottom: 15px;
              }
              .items-section {
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
                padding: 10px 0;
                margin: 15px 0;
              }
              .item-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .total-section {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 2px solid #000;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 16px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px dashed #000;
              }
              .void-notice {
                background: #ffebee;
                border: 1px solid #f44336;
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                color: #c62828;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">CORETRACK POS</div>
              <div>Receipt #${order.orderNumber}</div>
            </div>
            
            <div class="order-info">
              <div>Date: ${order.createdAt.toDate().toLocaleDateString()}</div>
              <div>Time: ${order.createdAt.toDate().toLocaleTimeString()}</div>
              <div>Cashier: ${user?.displayName || 'Staff'}</div>
              <div>Branch: ${selectedBranch?.name || 'Main Branch'}</div>
            </div>
            
            ${order.status === 'voided' ? `
              <div class="void-notice">
                *** VOIDED ORDER ***<br>
                Reason: ${order.voidReason || 'N/A'}<br>
                Voided by: ${order.voidedBy || 'Unknown'}
              </div>
            ` : ''}
            
            <div class="items-section">
              <div style="font-weight: bold; margin-bottom: 10px;">ITEMS:</div>
              ${order.items.map(item => `
                <div class="item-row">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>₱${item.total.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="total-section">
              <div class="total-row">
                <span>TOTAL:</span>
                <span>₱${order.total.toFixed(2)}</span>
              </div>
              <div style="margin-top: 10px;">
                <div>Payment: ${order.paymentMethod.toUpperCase()}</div>
                <div>Status: ${order.status.toUpperCase()}</div>
              </div>
            </div>
            
            <div class="footer">
              <div>Thank you for your business!</div>
              <div style="font-size: 12px; margin-top: 10px;">
                Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
              </div>
            </div>
          </body>
        </html>
      `
      
      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${order.orderNumber}-${order.createdAt.toDate().toLocaleDateString().replace(/\//g, '-')}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL object
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('❌ Error downloading receipt:', error)
      alert('Failed to download receipt. Please try again.')
    } finally {
      setDownloadingOrder(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Modern Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm tutorial-header">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left - Logo & Branch Info */}
                <div className="flex items-center gap-4">
                  <CoreTrackLogo size="sm" />
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
                    <p className="text-sm text-gray-500">Main Branch • Order #1234</p>
                  </div>
                  
                  {/* First Timer Badge */}
                  {showTutorial && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                      👋 Welcome! Taking tour...
                    </div>
                  )}
                </div>

                {/* Center - Quick Actions */}
                <div className="flex items-center gap-3 tutorial-quick-actions">
                  <button
                    onClick={() => {
                      setShowRecentOrders(true)
                      loadRecentOrders()
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm flex items-center gap-2"
                  >
                    <span className="text-lg">🕒</span>
                    <span>Recent Orders</span>
                  </button>
                  
                  <button
                    onClick={() => setShowQuickActions(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm flex items-center gap-2"
                  >
                    <span className="text-lg">⚡</span>
                    <span>Quick Actions</span>
                  </button>

                  <button
                    onClick={refreshMenuItems}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm flex items-center gap-2"
                  >
                    <span className={`text-lg ${isRefreshing ? 'animate-spin' : ''}`}>
                      {isRefreshing ? '⏳' : '🔄'}
                    </span>
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh Menu'}</span>
                  </button>
                </div>

                {/* Right - User & Settings */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.displayName || 'Cashier'}</div>
                    <div className="text-xs text-gray-500">Shift: 9:00 AM - 5:00 PM</div>
                  </div>
                  
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>



          {/* Main Content Layout */}
          <div className="flex-1 flex min-h-0">
            
            {/* Left Panel - Menu Items */}
            <div className="flex-1 flex flex-col bg-white">
              


              {/* Category Filter */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Menu Categories</h3>
                  <div className="text-sm text-gray-500">
                    {loading ? 'Loading...' : `${filteredItems.length || 0} items`}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-4 tutorial-search">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search menu items..."
                      className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 tutorial-categories">
                  {[
                    { name: 'All', emoji: '🍽️' },
                    { name: 'Food', emoji: '🍕' },
                    { name: 'Beverages', emoji: '🥤' },
                    { name: 'Desserts', emoji: '🍰' },
                    { name: 'Appetizers', emoji: '🥗' }
                  ].map((category) => (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        selectedCategory === category.name
                          ? 'bg-blue-600 text-white shadow-md transform scale-105'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:scale-105 hover:shadow-sm'
                      }`}
                    >
                      <span className="text-lg" role="img" aria-label={`${category.name} icon`}>
                        {category.emoji}
                      </span>
                      {category.name}
                    </button>
                  ))}
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
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-5xl animate-pulse">
                      <span role="img" aria-label="restaurant icon">🍽️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Menu Items</h3>
                    <p className="text-gray-500">Add items in Menu Builder to start selling</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addToCart(item)}
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
                        
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                          {item.description || 'No description available'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-blue-600">
                            ₱{item.price?.toFixed(2) || '0.00'}
                          </span>
                          
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Cart & Checkout */}
            <div className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 shadow-lg ${
              sidebarCollapsed ? 'w-14' : 'w-80'
            }`}>
              
              {/* Cart Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  {!sidebarCollapsed && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                      <p className="text-sm text-gray-500">{cart.length} items</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="text-4xl animate-bounce">🛒</div>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Cart is Empty</h3>
                        <p className="text-xs text-gray-500">Add items from the menu</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                <p className="text-xs text-gray-500">₱{item.price.toFixed(2)} each</p>
                              </div>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded-md flex items-center justify-center transition-colors"
                              >
                                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center transition-colors"
                                >
                                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                </button>
                                
                                <span className="text-sm font-medium text-gray-900 w-8 text-center">
                                  {item.quantity}
                                </span>
                                
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center transition-colors"
                                >
                                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="text-sm font-bold text-blue-600">
                                ₱{item.total.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cart Footer - Total & Checkout */}
                  {cart.length > 0 && (
                    <div className="border-t border-gray-200 p-4 space-y-4">
                      {/* Subtotal and Discount */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium text-gray-900">₱{cartSubtotal.toFixed(2)}</span>
                        </div>
                        
                        {selectedDiscount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600 flex items-center gap-1">
                              🎫 {selectedDiscount.name}
                              <button
                                onClick={() => setSelectedDiscount(null)}
                                className="text-red-500 hover:text-red-700 ml-1"
                              >
                                ✕
                              </button>
                            </span>
                            <span className="font-medium text-green-600">
                              -₱{(cartSubtotal - cartTotal).toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between border-t pt-2">
                          <span className="text-lg font-semibold text-gray-900">Total:</span>
                          <span className="text-2xl font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Checkout & Pay
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDiscountModal(true)}
                            className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            🎫 Discount
                          </button>
                          
                          <button
                            onClick={clearCart}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            Clear Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Payment Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
                      <p className="text-gray-500">Choose payment method and complete order</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Summary</h3>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-medium">₱{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total:</span>
                          <span className="text-blue-600">₱{cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedPaymentMethod('cash')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg group ${
                          selectedPaymentMethod === 'cash'
                            ? 'border-green-500 bg-green-50 text-green-900 scale-105 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform duration-300">💵</div>
                        <div className="font-medium">Cash</div>
                      </button>

                      <button
                        onClick={() => setSelectedPaymentMethod('card')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg group ${
                          selectedPaymentMethod === 'card'
                            ? 'border-blue-500 bg-blue-50 text-blue-900 scale-105 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform duration-300">💳</div>
                        <div className="font-medium">Card</div>
                      </button>

                      <button
                        onClick={() => setSelectedPaymentMethod('gcash')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg group ${
                          selectedPaymentMethod === 'gcash'
                            ? 'border-blue-500 bg-blue-50 text-blue-900 scale-105 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform duration-300">📱</div>
                        <div className="font-medium">GCash</div>
                      </button>

                      <button
                        onClick={() => setSelectedPaymentMethod('maya')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg group ${
                          selectedPaymentMethod === 'maya'
                            ? 'border-green-500 bg-green-50 text-green-900 scale-105 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2 transform group-hover:scale-125 transition-transform duration-300">💚</div>
                        <div className="font-medium">Maya</div>
                      </button>
                    </div>
                  </div>

                  {/* Cash Payment Details */}
                  {selectedPaymentMethod === 'cash' && (
                    <div className="bg-yellow-50 rounded-xl p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Cash Payment</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount Received
                          </label>
                          <input
                            type="number"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        {cashReceived && (
                          <div className="bg-white rounded-lg p-3 border border-yellow-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Change:</span>
                              <span className="text-lg font-bold text-green-600">
                                ₱{calculateChange().toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Digital Payment Info */}
                  {(selectedPaymentMethod === 'card' || selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya') && (
                    <div className="bg-blue-50 rounded-xl p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {selectedPaymentMethod === 'card' ? 'Card Payment' : 
                         selectedPaymentMethod === 'gcash' ? 'GCash Payment' : 'Maya Payment'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {selectedPaymentMethod === 'card' 
                          ? 'Insert, tap, or swipe card on terminal'
                          : 'Customer will scan QR code or provide phone number'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Footer */}
                <div className="border-t border-gray-200 p-6">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={!isPaymentValid() || isProcessingPayment}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        isPaymentValid() && !isProcessingPayment
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Complete Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Orders Modal */}
          {showRecentOrders && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Premium Header */}
                <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{recentOrders.length}</span>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-1">Order Management</h2>
                        <p className="text-gray-600 text-lg">Comprehensive transaction oversight and control</p>
                      </div>
                    </div>
                    
                    {/* Header Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Total Orders</span>
                            <span className="text-lg font-bold text-gray-900">{recentOrders.length}</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Active</span>
                            <span className="text-lg font-bold text-gray-900">{recentOrders.filter(o => o.status === 'completed').length}</span>
                          </div>
                        </div>
                        {/* Held Orders Header Button */}
                        <button 
                          onClick={() => {
                            // Scroll to held orders section
                            const heldOrdersSection = document.querySelector('[data-held-orders-section]')
                            if (heldOrdersSection) {
                              heldOrdersSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                          }}
                          className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl px-4 py-3 border border-amber-200 shadow-sm transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span className="text-sm font-medium text-amber-700">Held Orders</span>
                            <span className="text-lg font-bold text-amber-900">
                              {(() => {
                                const heldOrders = JSON.parse(localStorage.getItem('heldOrders') || '[]')
                                return heldOrders.length
                              })()}
                            </span>
                          </div>
                        </button>
                      </div>
                      
                      <div className="h-8 w-px bg-gray-300"></div>
                      
                      <button
                        onClick={() => loadRecentOrders()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Data
                      </button>
                      
                      <button
                        onClick={() => setShowRecentOrders(false)}
                        className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden bg-gray-50">
                  {loadingOrders ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 mx-auto mb-6"></div>
                          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                        </div>
                        <p className="text-gray-600 text-xl font-medium">Loading orders...</p>
                        <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your data</p>
                      </div>
                    </div>
                  ) : recentOrders.length > 0 ? (
                    <div className="h-full flex flex-col">
                      {/* Table Header */}
                      <div className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm">
                        <div className="grid grid-cols-12 gap-6 text-sm font-bold text-gray-700 uppercase tracking-wider">
                          <div className="col-span-2">
                            Order Details
                          </div>
                          <div className="col-span-3">
                            Items & Quantities
                          </div>
                          <div className="col-span-2">
                            Payment Method
                          </div>
                          <div className="col-span-2">
                            Status
                          </div>
                          <div className="col-span-1">
                            Total
                          </div>
                          <div className="col-span-2">
                            Actions
                          </div>
                        </div>
                      </div>

                      {/* Table Body */}
                      <div className="flex-1 overflow-y-auto bg-gray-50">
                        {recentOrders.map((order, index) => (
                          <div key={order.id} className={`bg-white border-b border-gray-100 hover:bg-blue-50/30 transition-all duration-200 ${
                            order.status === 'voided' ? 'bg-red-50/50 border-red-100' : ''
                          } ${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}`}>
                            <div className="px-8 py-6">
                              <div className="grid grid-cols-12 gap-6 items-center">
                                
                                {/* Order Details */}
                                <div className="col-span-2">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md ${
                                      order.status === 'voided' ? 'bg-red-100 text-red-700 border-2 border-red-200' :
                                      order.status === 'completed' ? 'bg-green-100 text-green-700 border-2 border-green-200' :
                                      'bg-blue-100 text-blue-700 border-2 border-blue-200'
                                    }`}>
                                      #{order.orderNumber}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 text-lg">#{order.orderNumber}</p>
                                      <div className="space-y-1">
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {order.createdAt.toDate().toLocaleDateString()}
                                        </p>
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          {order.createdAt.toDate().toLocaleTimeString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Items */}
                                <div className="col-span-3">
                                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <div className="space-y-2">
                                      {order.items.slice(0, 2).map((item, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                                              {item.quantity}x
                                            </span>
                                            <span className="text-gray-800 font-medium truncate">
                                              {item.name}
                                            </span>
                                          </div>
                                          <span className="text-gray-900 font-bold text-sm">
                                            ₱{item.total.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                      {order.items.length > 2 && (
                                        <div className="pt-2 border-t border-gray-300">
                                          <p className="text-xs text-gray-600 font-medium">
                                            +{order.items.length - 2} more items
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Method */}
                                <div className="col-span-2">
                                  <div className="text-center">
                                    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                                      order.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 border border-green-300' :
                                      order.paymentMethod === 'card' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                      order.paymentMethod === 'gcash' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' :
                                      'bg-purple-100 text-purple-800 border border-purple-300'
                                    }`}>
                                      {order.paymentMethod === 'cash' ? '💵' :
                                       order.paymentMethod === 'card' ? '💳' :
                                       order.paymentMethod === 'gcash' ? '📱' : '💚'}
                                      <span className="ml-2">{order.paymentMethod.toUpperCase()}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2 font-medium">
                                      {order.paymentMethod === 'cash' ? 'Cash Payment' :
                                       order.paymentMethod === 'card' ? 'Card Payment' :
                                       order.paymentMethod === 'gcash' ? 'GCash Transfer' : 'Maya Payment'}
                                    </p>
                                  </div>
                                </div>

                                {/* Status */}
                                <div className="col-span-2">
                                  <div className="text-center">
                                    <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                                      order.status === 'voided' ? 'bg-red-100 text-red-800 border border-red-300' :
                                      order.status === 'cancelled' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                      order.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-300' :
                                      'bg-gray-100 text-gray-800 border border-gray-300'
                                    }`}>
                                      {order.status === 'voided' ? '🚫' :
                                       order.status === 'cancelled' ? '❌' :
                                       order.status === 'completed' ? '✅' : '⏳'}
                                      <span className="ml-2">{order.status.toUpperCase()}</span>
                                    </div>
                                    
                                    {order.status === 'voided' && (
                                      <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                                        {order.voidReason && (
                                          <p className="text-xs text-red-700 font-medium">
                                            Reason: {order.voidReason}
                                          </p>
                                        )}
                                        {order.voidedBy && (
                                          <p className="text-xs text-red-600">
                                            Voided by: {order.voidedBy}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Total */}
                                <div className="col-span-1">
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-900">
                                      ₱{order.total.toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2">
                                  <div className="flex items-center justify-center gap-3">
                                    {/* Print Receipt Button */}
                                    <button
                                      onClick={() => handlePrintReceipt(order)}
                                      disabled={printingOrder === order.id}
                                      className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 disabled:bg-gray-400 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                      title="Print Receipt"
                                    >
                                      {printingOrder === order.id ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                      ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                      )}
                                    </button>
                                    
                                    {/* Download Receipt Button */}
                                    <button
                                      onClick={() => handleDownloadPDF(order)}
                                      disabled={downloadingOrder === order.id}
                                      className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 disabled:bg-gray-400 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                      title="Download Receipt"
                                    >
                                      {downloadingOrder === order.id ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                      ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      )}
                                    </button>
                                    
                                    {/* Void Button - only for non-voided orders */}
                                    {order.status !== 'voided' && order.status !== 'cancelled' && (
                                      <button
                                        onClick={() => openVoidModal(order)}
                                        className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                        title="Void Order"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-12">
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">No Recent Orders</h3>
                        <p className="text-gray-600 mb-8 text-lg">Start taking orders to see them appear here</p>
                        <button
                          onClick={() => setShowRecentOrders(false)}
                          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                        >
                          Close and Start Selling
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Actions Modal */}
          {showQuickActions && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Premium Header */}
                <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-600 via-orange-700 to-red-700 rounded-2xl flex items-center justify-center shadow-xl">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">⚡</span>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-1">Quick Actions</h2>
                        <p className="text-gray-600 text-lg">Fast access to essential POS functions</p>
                      </div>
                    </div>
                    
                    {/* Header Controls */}
                    <div className="flex items-center gap-4">
                      <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Quick Access</span>
                          <span className="text-lg font-bold text-gray-900">🚀</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowQuickActions(false)}
                        className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                      >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-8">
                  {/* Header Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent mb-2">
                          Quick Actions Dashboard
                        </h3>
                        <p className="text-gray-600 text-lg">Streamlined access to essential POS operations and analytics</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-700 font-medium text-sm">System Online</span>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="text-blue-700 font-medium text-sm">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Actions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <button 
                      onClick={() => {
                        setShowFavorites(true)
                        setShowQuickActions(false)
                      }}
                      className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-3xl text-white transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 shadow-lg">
                            ⭐
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">—</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Favorites</div>
                          </div>
                        </div>
                        <div className="font-bold text-xl text-gray-900 mb-3">Popular Items</div>
                        <div className="text-gray-600 text-sm leading-relaxed mb-4">Quick access to your most ordered menu items and customer favorites</div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Fast Access</div>
                          <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Top Sellers</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        setShowCombos(true)
                        setShowQuickActions(false)
                      }}
                      className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-3xl text-white transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 shadow-lg">
                            <span role="img" aria-label="combo meals">🍽️</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">—</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Combos</div>
                          </div>
                        </div>
                        <div className="font-bold text-xl text-gray-900 mb-3">Meal Combos</div>
                        <div className="text-gray-600 text-sm leading-relaxed mb-4">Pre-configured meal combinations and promotional bundles with special pricing</div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Bundle Deals</div>
                          <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">Promotions</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        setShowCustomers(true)
                        setShowQuickActions(false)
                      }}
                      className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl text-white transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 shadow-lg">
                            👥
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">—</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Customers</div>
                          </div>
                        </div>
                        <div className="font-bold text-xl text-gray-900 mb-3">Customer Hub</div>
                        <div className="text-gray-600 text-sm leading-relaxed mb-4">Manage customer profiles, loyalty programs, and relationship management</div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">CRM System</div>
                          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Loyalty</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Secondary Actions Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">₱0.00</div>
                          <div className="text-sm text-gray-600">Today&apos;s Sales</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">0</div>
                          <div className="text-sm text-gray-600">Orders Today</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">₱0.00</div>
                          <div className="text-sm text-gray-600">Avg. Order</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">— min</div>
                          <div className="text-sm text-gray-600">Avg. Prep Time</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Quick Add Popular Items */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">Popular Items</h4>
                            <p className="text-sm text-gray-600 mt-1">Quick add your best-selling menu items</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <span className="text-xs text-blue-600 font-medium">Fast Add</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          {filteredItems.slice(0, 4).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                addToCart(item)
                                const notification = document.createElement('div')
                                notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                                notification.textContent = `${item.name} added to cart!`
                                document.body.appendChild(notification)
                                setTimeout(() => {
                                  notification.style.opacity = '0'
                                  setTimeout(() => notification.remove(), 300)
                                }, 1500)
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 text-left group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                    {getItemEmoji(item)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {item.name}
                                    </div>
                                    <div className="text-sm text-gray-500">Ready to serve</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">₱{item.price}</div>
                                  <div className="text-xs text-gray-500">Add to cart</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Category Navigation */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">Quick Categories</h4>
                            <p className="text-sm text-gray-600 mt-1">Navigate menu sections instantly</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <span className="text-xs text-green-600 font-medium">Filter</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 gap-3">
                          {['All Items', 'Food & Mains', 'Beverages', 'Desserts', 'Appetizers', 'Specials'].map((category, index) => {
                            const categoryColors = [
                              'bg-gray-100 text-gray-700 hover:bg-gray-200',
                              'bg-orange-100 text-orange-700 hover:bg-orange-200',
                              'bg-blue-100 text-blue-700 hover:bg-blue-200',
                              'bg-pink-100 text-pink-700 hover:bg-pink-200',
                              'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
                              'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            ]
                            const isActive = selectedCategory === (category === 'All Items' ? 'All' : category.replace(' & Mains', ''))
                            return (
                              <button
                                key={category}
                                onClick={() => {
                                  const categoryValue = category === 'All Items' ? 'All' : category.replace(' & Mains', '')
                                  setSelectedCategory(categoryValue)
                                  setShowQuickActions(false)
                                  const notification = document.createElement('div')
                                  notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all'
                                  notification.textContent = `Switched to ${categoryValue} category`
                                  document.body.appendChild(notification)
                                  setTimeout(() => {
                                    notification.style.opacity = '0'
                                    setTimeout(() => notification.remove(), 300)
                                  }, 2000)
                                }}
                                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 text-left flex items-center justify-between ${
                                  isActive
                                    ? 'bg-green-600 text-white shadow-lg transform scale-[1.02]'
                                    : categoryColors[index]
                                }`}
                              >
                                <span>{category}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Held Orders & System Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Held Orders Section */}
                    <div data-held-orders-section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">Held Orders</h4>
                            <p className="text-sm text-gray-600 mt-1">Resume suspended transactions quickly</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="text-xs text-amber-600 font-medium">
                              {(() => {
                                const heldOrders = JSON.parse(localStorage.getItem('heldOrders') || '[]')
                                return `${heldOrders.length} Held`
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        {(() => {
                          const heldOrders = JSON.parse(localStorage.getItem('heldOrders') || '[]')
                          if (heldOrders.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No held orders</h3>
                                <p className="text-gray-500 text-sm">Suspended orders will appear here for quick access</p>
                              </div>
                            )
                          }
                          return (
                            <div className="space-y-3">
                              {heldOrders.slice(-4).map((order: any, index: number) => (
                                <div key={order.id} className="group bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-amber-300 transition-all duration-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <span className="text-amber-600 font-bold">#{order.id.toString().slice(-2)}</span>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-gray-900">
                                          Order #{order.id.toString().slice(-4)}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                          <span>{order.items.length} items</span>
                                          <span>•</span>
                                          <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                                          <span>•</span>
                                          <span className="font-semibold text-green-600">₱{order.total.toFixed(0)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setCart(order.items)
                                          const updatedHeldOrders = heldOrders.filter((o: any) => o.id !== order.id)
                                          localStorage.setItem('heldOrders', JSON.stringify(updatedHeldOrders))
                                          setShowQuickActions(false)
                                          
                                          const notification = document.createElement('div')
                                          notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                                          notification.textContent = 'Order restored to cart!'
                                          document.body.appendChild(notification)
                                          setTimeout(() => {
                                            notification.style.opacity = '0'
                                            setTimeout(() => notification.remove(), 300)
                                          }, 2000)
                                        }}
                                        className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors font-medium"
                                      >
                                        Resume
                                      </button>
                                      <button
                                        onClick={() => {
                                          const updatedHeldOrders = heldOrders.filter((o: any) => o.id !== order.id)
                                          localStorage.setItem('heldOrders', JSON.stringify(updatedHeldOrders))
                                          setShowQuickActions(false)
                                          setTimeout(() => setShowQuickActions(true), 100)
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
                          )
                        })()}
                      </div>
                    </div>

                    {/* System Status & Quick Actions */}
                    <div className="space-y-6">
                      {/* System Health */}
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                          <h4 className="text-lg font-bold text-gray-900">System Health</h4>
                          <p className="text-sm text-gray-600 mt-1">Current operational status</p>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-900">POS Terminal</span>
                              </div>
                              <span className="text-sm text-green-600 font-medium">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-900">Payment Gateway</span>
                              </div>
                              <span className="text-sm text-green-600 font-medium">Connected</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-900">Kitchen Display</span>
                              </div>
                              <span className="text-sm text-green-600 font-medium">Active</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Tools */}
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                          <h4 className="text-lg font-bold text-gray-900">Quick Tools</h4>
                          <p className="text-sm text-gray-600 mt-1">Essential utilities</p>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 gap-3">
                            <button className="w-full p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">Cash Drawer</div>
                                  <div className="text-xs text-gray-500">Open manually</div>
                                </div>
                              </div>
                            </button>
                            <button className="w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">End of Day</div>
                                  <div className="text-xs text-gray-500">Generate report</div>
                                </div>
                              </div>
                            </button>
                            <button className="w-full p-3 bg-gray-50 hover:bg-green-50 rounded-lg transition-colors text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">Sync Data</div>
                                  <div className="text-xs text-gray-500">Refresh inventory</div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Footer */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                        <div className="text-sm text-gray-600">Items in Cart</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ₱{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-600">Current Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm text-gray-600">Current Time</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowQuickActions(false)}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      >
                        Return to POS
                      </button>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowQuickActions(false)}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      >
                        Return to POS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Favorites Modal */}
          {showFavorites && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">⭐ Favorites</h2>
                    <p className="text-gray-500">Quick access to your most popular items</p>
                  </div>
                  <button
                    onClick={() => setShowFavorites(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  {menuItems.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Favorite Items</h3>
                      <p className="text-gray-500">Add menu items to start marking favorites</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {menuItems.slice(0, 8).map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            addToCart(item)
                            setShowFavorites(false)
                          }}
                          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors text-left"
                        >
                          <div className="text-2xl mb-2">⭐</div>
                          <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                          <div className="text-orange-600 font-semibold">₱{item.price}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Combos Modal */}
          {showCombos && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      <span role="img" aria-label="combo meals">🍽️</span> Combo Meals
                    </h2>
                    <p className="text-gray-500">Manage pre-configured meal combinations and bundles</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddCombo(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Combo
                    </button>
                    <button
                      onClick={() => setShowCombos(false)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                  {combos.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Combo Meals Yet</h3>
                      <p className="text-gray-500 mb-6">Create your first combo to offer bundled deals</p>
                      <button
                        onClick={() => setShowAddCombo(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create First Combo
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {combos.map((combo) => (
                        <div key={combo.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{combo.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{combo.description}</p>
                              <div className="text-2xl font-bold text-blue-600 mt-2">₱{combo.price}</div>
                              {combo.originalPrice && (
                                <div className="text-sm text-gray-500">
                                  <span className="line-through">₱{combo.originalPrice}</span>
                                  <span className="ml-2 text-green-600 font-medium">
                                    Save ₱{combo.originalPrice - combo.price}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingCombo(combo)}
                                className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setCombos(combos.filter(c => c.id !== combo.id))
                                }}
                                className="w-8 h-8 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Includes:</span>
                              <div className="mt-2 space-y-1">
                                {combo.items?.map((item: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <span className="text-xs text-gray-500">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                // Add combo to cart logic here
                                alert(`Added ${combo.name} to cart!`)
                              }}
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Add to Cart - ₱{combo.price}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customers Modal */}
          {showCustomers && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">👥 Customer Management</h2>
                    <p className="text-gray-500">Manage customer profiles and loyalty</p>
                  </div>
                  <button
                    onClick={() => setShowCustomers(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search customers by name or phone..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Yet</h3>
                      <p className="text-gray-500">Customer profiles will appear here as you add them</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Void Order Modal */}
          {showVoidModal && voidingOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Void Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Void Order</h2>
                      <p className="text-sm text-gray-500">Order #{voidingOrder.orderNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowVoidModal(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6">
                  {/* Order Details Summary */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-red-900 mb-2">Order Details</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-red-700">Total Amount:</span>
                        <span className="font-medium text-red-900">₱{voidingOrder.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Payment Method:</span>
                        <span className="font-medium text-red-900">{voidingOrder.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Items:</span>
                        <span className="font-medium text-red-900">{voidingOrder.items.length} item(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Void Reason */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Voiding *
                    </label>
                    <textarea
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      placeholder="Enter the reason for voiding this order..."
                    />
                    <p className="text-xs text-gray-500 mt-1">This reason will be logged for audit purposes</p>
                  </div>

                  {/* Return Inventory Option */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="returnInventory"
                        checked={returnInventory}
                        onChange={(e) => setReturnInventory(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="returnInventory" className="text-sm font-medium text-gray-700">
                        Return inventory to stock
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-7">
                      {returnInventory 
                        ? "Ingredients used in this order will be returned to inventory" 
                        : "Inventory will not be affected (items remain consumed)"
                      }
                    </p>
                  </div>

                  {/* Warning Message */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Warning</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          This action cannot be undone. The order will be marked as voided and removed from sales reports.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Void Modal Footer */}
                <div className="border-t border-gray-200 p-6">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowVoidModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVoidOrder}
                      disabled={!voidReason.trim() || isProcessingVoid}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        voidReason.trim() && !isProcessingVoid
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isProcessingVoid ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Voiding...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Void Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Modifier Modal */}
          {/* Add/Edit Combo Modal */}
          {(showAddCombo || editingCombo) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingCombo ? '✏️ Edit Combo Meal' : '➕ Create New Combo'}
                    </h2>
                    <p className="text-gray-500">
                      {editingCombo ? 'Update combo details and items' : 'Bundle items together for special pricing'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddCombo(false)
                      setEditingCombo(null)
                    }}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.target as HTMLFormElement)
                      const comboData = {
                        id: editingCombo?.id || Date.now(),
                        name: formData.get('name') as string,
                        description: formData.get('description') as string,
                        price: parseFloat(formData.get('price') as string) || 0,
                        originalPrice: parseFloat(formData.get('originalPrice') as string) || 0,
                        items: editingCombo?.items || []
                      }

                      if (editingCombo) {
                        setCombos(combos.map(c => c.id === editingCombo.id ? comboData : c))
                      } else {
                        setCombos([...combos, comboData])
                      }

                      setShowAddCombo(false)
                      setEditingCombo(null)
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Combo Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={editingCombo?.name || ''}
                          required
                          placeholder="e.g., Big Burger Combo, Family Meal Deal"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          defaultValue={editingCombo?.description || ''}
                          rows={3}
                          placeholder="Describe what's included in this combo..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Combo Price *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">₱</span>
                          <input
                            type="number"
                            name="price"
                            defaultValue={editingCombo?.price || ''}
                            required
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Original Price (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">₱</span>
                          <input
                            type="number"
                            name="originalPrice"
                            defaultValue={editingCombo?.originalPrice || ''}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Show savings by including the individual item total
                        </p>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Included Items</h3>
                      <div className="text-center py-8 text-gray-500">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <p className="mb-2">No items added yet</p>
                        <button
                          type="button"
                          onClick={() => alert('Item selection functionality coming soon!')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Add Items to Combo
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {editingCombo ? 'Update combo meal details' : 'Create a new combo meal bundle'}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddCombo(false)
                              setEditingCombo(null)
                            }}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {editingCombo ? 'Update Combo' : 'Create Combo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Search Items Modal */}
          {showSearchModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Search Header */}
                <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <div className="text-2xl">🔍</div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Search Menu Items</h2>
                        <p className="text-gray-600">Find items by name, category, or description</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSearchModal(false)
                        setSearchQuery('')
                      }}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Search Input */}
                  <div className="mt-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for menu items..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                  {searchQuery.trim() === '' ? (
                    <div className="text-center py-20">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Searching</h3>
                      <p className="text-gray-600">Type in the search box to find menu items</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="text-6xl mb-4">😕</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                      <p className="text-gray-600">Try searching with different keywords</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          Found <span className="font-semibold text-blue-600">{filteredItems.length}</span> items matching &ldquo;{searchQuery}&rdquo;
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              addToCart(item)
                              const notification = document.createElement('div')
                              notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                              notification.textContent = `${item.name} added to cart!`
                              document.body.appendChild(notification)
                              setTimeout(() => {
                                notification.style.opacity = '0'
                                setTimeout(() => notification.remove(), 300)
                              }, 1500)
                            }}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-3xl group-hover:scale-110 transition-transform">
                                {getItemEmoji(item)}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {item.name}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-1">
                                  {item.description || 'No description'}
                                </p>
                                <p className="text-lg font-bold text-blue-600">₱{item.price.toFixed(2)}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Pay QR Code Modal */}
          {showMobilePayModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
                {/* Mobile Pay Header */}
                <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b border-gray-200 p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <div className="text-3xl">📱</div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Mobile Payment</h2>
                  <p className="text-gray-600">Scan QR code to pay with GCash or Maya</p>
                </div>

                <div className="p-6">
                  {/* QR Code Display */}
                  <div className="bg-gray-50 rounded-2xl p-6 text-center mb-6">
                    <div className="w-48 h-48 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📱</div>
                        <p className="text-sm text-gray-600">QR Code</p>
                        <p className="text-xs text-gray-500">₱{cartTotal.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Order Total: <span className="font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span></p>
                  </div>

                  {/* Payment Instructions */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="text-xl">1️⃣</div>
                      <p className="text-sm text-blue-800">Open your GCash or Maya app</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="text-xl">2️⃣</div>
                      <p className="text-sm text-blue-800">Scan the QR code above</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="text-xl">3️⃣</div>
                      <p className="text-sm text-blue-800">Confirm payment amount</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowMobilePayModal(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowMobilePayModal(false)
                        setSelectedPaymentMethod('gcash')
                        setShowPaymentModal(true)
                      }}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Discount Modal */}
          {showDiscountModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
                {/* Discount Header */}
                <div className="bg-gradient-to-r from-yellow-50 via-white to-yellow-50 border-b border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <div className="text-2xl">🎫</div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Apply Discount</h2>
                        <p className="text-gray-600">Choose a promotion or special offer</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDiscountModal(false)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Current Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Order Total:</span>
                      <span className="text-lg font-bold text-blue-600">₱{cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Discount Options */}
                  <div className="space-y-3 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Discounts</h3>
                    
                    {[
                      { type: 'percentage', value: 10, name: 'Student Discount (10%)' },
                      { type: 'percentage', value: 20, name: 'Senior Citizen (20%)' },
                      { type: 'percentage', value: 15, name: 'PWD Discount (15%)' },
                      { type: 'fixed', value: 50, name: 'Happy Hour (₱50 off)' },
                      { type: 'percentage', value: 5, name: 'Loyalty Member (5%)' },
                    ].map((discount) => (
                      <button
                        key={discount.name}
                        onClick={() => {
                          setSelectedDiscount(discount as any)
                          setShowDiscountModal(false)
                          const notification = document.createElement('div')
                          notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                          notification.textContent = `${discount.name} applied!`
                          document.body.appendChild(notification)
                          setTimeout(() => {
                            notification.style.opacity = '0'
                            setTimeout(() => notification.remove(), 300)
                          }, 2000)
                        }}
                        className={`w-full p-4 border-2 rounded-xl text-left transition-all hover:shadow-lg ${
                          selectedDiscount?.name === discount.name
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-900">{discount.name}</div>
                            <div className="text-sm text-gray-600">
                              Save {discount.type === 'percentage' ? `${discount.value}%` : `₱${discount.value}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              -{discount.type === 'percentage' 
                                ? `₱${(cartSubtotal * discount.value / 100).toFixed(2)}` 
                                : `₱${discount.value.toFixed(2)}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              Final: ₱{discount.type === 'percentage' 
                                ? (cartSubtotal * (1 - discount.value / 100)).toFixed(2)
                                : Math.max(0, cartSubtotal - discount.value).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDiscountModal(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    {selectedDiscount && (
                      <button
                        onClick={() => {
                          setSelectedDiscount(null)
                          setShowDiscountModal(false)
                        }}
                        className="flex-1 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-colors"
                      >
                        Remove Discount
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tutorial Overlay */}
          <TutorialOverlay
            show={showTutorial}
            currentStep={currentStep}
            onNext={nextStep}
            onPrev={prevStep}
            onComplete={completeTutorial}
          />
        </div>
  )
}
