'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useUserPermissions } from '../../lib/context/UserPermissionsContext'
import { FeatureGate } from '../subscription/FeatureGate'
import { PermissionGate, NoPermissionMessage } from '../permissions/PermissionGate'
import { useFeatureAccess } from '../../lib/hooks/useFeatureAccess'
import CoreTrackLogo from '../CoreTrackLogo'
import { 
  getPOSItems, 
  createPOSOrder, 
  getPOSCategories,
  getPOSOrders,
  subscribeToPOSOrders,
  type POSItem,
  type POSOrder,
  type CreatePOSOrder
} from '../../lib/firebase/pos'
import {
  processInventoryDeduction
} from '../../lib/firebase/integration'
import { getPaymentMethods, initializeDefaultPaymentMethods, getCashDrawers, updateCashDrawer, addPaymentTransaction, initializeDefaultCashDrawer, type PaymentMethod as PaymentMethodType } from '../../lib/firebase/cashManagement'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  category?: string
  notes?: string
  modifiers?: Array<{
    name: string
    price: number
  }>
  isFavorite?: boolean
}

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  loyaltyPoints: number
  totalOrders: number
  lastOrderDate?: Date
  preferences?: string[]
}

interface QuickAction {
  id: string
  name: string
  type: 'favorite' | 'combo' | 'modifier'
  items?: string[] // item IDs for combos
  price?: number // for combos or modifiers
  icon: string
}

type OrderType = 'dine-in' | 'takeout' | 'delivery'

export default function POS() {
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('dine-in')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([])
  const [cashReceived, setCashReceived] = useState<string>('')
  const [changeAmount, setChangeAmount] = useState<number>(0)
  const [showCashPayment, setShowCashPayment] = useState(false)
  const [menuItems, setMenuItems] = useState<POSItem[]>([])
  const [categories, setCategories] = useState<string[]>(['All'])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showModifierModal, setShowModifierModal] = useState(false)
  const [editingModifier, setEditingModifier] = useState<QuickAction | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<string | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [recentOrders, setRecentOrders] = useState<POSOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [voidingOrder, setVoidingOrder] = useState<string | null>(null)

  // Sales Dashboard Data
  const [salesData, setSalesData] = useState({
    todaysSales: 0,
    todaysOrders: 0,
    averageOrderValue: 0,
    popularItems: [] as Array<{name: string, quantity: number, revenue: number}>,
    hourlyData: [] as Array<{hour: string, orders: number, revenue: number}>,
    lowStockItems: [] as Array<{name: string, stock: number, category: string}>
  })

  // Load favorites from localStorage on component mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('pos-favorites')
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error)
    }
  }, [])

  // Debug favorites and menu items
  useEffect(() => {
    console.log('🌟 Favorites Debug:', {
      favoritesCount: favorites.length,
      favorites: favorites,
      menuItemsCount: menuItems.length,
      favoriteItems: menuItems.filter(item => favorites.includes(item.id)).map(item => ({ id: item.id, name: item.name }))
    })
  }, [favorites, menuItems])

  // Quick Actions & Shortcuts - now editable
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { id: 'mod1', name: 'Extra Cheese', type: 'modifier', price: 25, icon: '🧀' },
    { id: 'mod2', name: 'No Onions', type: 'modifier', price: 0, icon: '🚫' },
  ])

  // Load quick modifiers from localStorage on component mount
  useEffect(() => {
    try {
      const savedModifiers = localStorage.getItem('pos-quick-modifiers')
      if (savedModifiers) {
        setQuickActions(JSON.parse(savedModifiers))
      }
    } catch (error) {
      console.error('Error loading quick modifiers from localStorage:', error)
    }
  }, [])

  // Load sales dashboard data
  useEffect(() => {
    // Mock data - in real app, this would fetch from Firebase
    const generateMockSalesData = () => {
      // No mock popular items - will show empty state
      const mockPopularItems: Array<{name: string, quantity: number, revenue: number}> = []

      const mockHourlyData = [
        { hour: '6AM', orders: 2, revenue: 150 },
        { hour: '7AM', orders: 8, revenue: 420 },
        { hour: '8AM', orders: 15, revenue: 780 },
        { hour: '9AM', orders: 12, revenue: 650 },
        { hour: '10AM', orders: 18, revenue: 920 },
        { hour: '11AM', orders: 25, revenue: 1340 },
        { hour: '12PM', orders: 42, revenue: 2180 },
        { hour: '1PM', orders: 38, revenue: 1950 },
        { hour: '2PM', orders: 28, revenue: 1420 },
        { hour: '3PM', orders: 22, revenue: 1100 },
        { hour: '4PM', orders: 15, revenue: 780 },
        { hour: '5PM', orders: 32, revenue: 1680 }
      ]

      const mockLowStockItems = [
        { name: 'Beef Patties', stock: 5, category: 'Meat' },
        { name: 'Tomatoes', stock: 8, category: 'Vegetables' },
        { name: 'Cheese Slices', stock: 12, category: 'Dairy' }
      ]

      const todaysOrders = mockHourlyData.reduce((sum, hour) => sum + hour.orders, 0)
      const todaysSales = mockHourlyData.reduce((sum, hour) => sum + hour.revenue, 0)

      setSalesData({
        todaysSales,
        todaysOrders,
        averageOrderValue: todaysSales / todaysOrders,
        popularItems: mockPopularItems,
        hourlyData: mockHourlyData,
        lowStockItems: mockLowStockItems
      })
    }

    generateMockSalesData()
  }, [])

  // Load menu items and categories with real-time updates
  useEffect(() => {
    if (!user?.uid) return

    const loadData = async () => {
      try {
        setLoading(true)
        console.log('🔄 POS - Loading data for tenant:', user.uid)
        
        const [items, cats, methods] = await Promise.all([
          getPOSItems(user.uid),
          getPOSCategories(user.uid),
          getPaymentMethods(user.uid)
        ])
        
        console.log('📦 POS Items loaded:', items.length)
        console.log('📂 POS Categories loaded:', cats.length)
        console.log('💳 Payment Methods loaded:', methods.length)
        console.log('🔍 First few items:', items.slice(0, 3))
        
        setMenuItems(items)
        setCategories(['All', ...cats])
        setPaymentMethods(methods)
        
        // Initialize default payment methods if none exist
        if (methods.length === 0) {
          console.log('No payment methods found, initializing defaults...')
          await initializeDefaultPaymentMethods(user.uid)
          // Refresh payment methods after initialization
          const updatedMethods = await getPaymentMethods(user.uid)
          setPaymentMethods(updatedMethods)
          
          // Set default payment method to the first active method or 'cash'
          if (updatedMethods.length > 0) {
            const defaultMethod = updatedMethods.find(m => m.isActive && m.type === 'cash') || updatedMethods.find(m => m.isActive) || updatedMethods[0]
            setPaymentMethod(defaultMethod.id)
          }
        } else {
          // Set default payment method to the first active method or 'cash'
          const defaultMethod = methods.find(m => m.isActive && m.type === 'cash') || methods.find(m => m.isActive) || methods[0]
          setPaymentMethod(defaultMethod.id)
        }
      } catch (error) {
        console.error('❌ Error loading POS data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Set up real-time subscription for POS items
    const { subscribeToPOSItems } = require('../../lib/firebase/pos')
    const unsubscribe = subscribeToPOSItems(user.uid, (items: POSItem[]) => {
      console.log('🔄 POS - Real-time update:', items.length, 'items')
      setMenuItems(items)
      setLoading(false)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user?.uid])

  // Load recent orders
  useEffect(() => {
    if (!user?.uid) return

    const loadRecentOrders = async () => {
      try {
        setLoadingOrders(true)
        const orders = await getPOSOrders(user.uid)
        // Get today's orders only
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const todaysOrders = orders.filter(order => {
          const orderDate = order.createdAt?.toDate() || new Date()
          return orderDate >= today
        }).slice(0, 20) // Latest 20 orders
        
        setRecentOrders(todaysOrders)
      } catch (error) {
        console.error('❌ Error loading recent orders:', error)
      } finally {
        setLoadingOrders(false)
      }
    }

    loadRecentOrders()

    // Set up real-time subscription for orders
    const unsubscribeOrders = subscribeToPOSOrders(user.uid, (orders: POSOrder[]) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todaysOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate() || new Date()
        return orderDate >= today
      }).slice(0, 20)
      
      setRecentOrders(todaysOrders)
      setLoadingOrders(false)
    })

    return () => {
      if (unsubscribeOrders) unsubscribeOrders()
    }
  }, [user?.uid])

  // Calculate change when cash received amount changes
  useEffect(() => {
    const receivedAmount = parseFloat(cashReceived) || 0
    const subtotalCalc = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const orderTotal = subtotalCalc // No tax applied
    const change = receivedAmount - orderTotal
    setChangeAmount(change > 0 ? change : 0)
  }, [cashReceived, cart])

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch && item.isAvailable
  })

  const addToCart = (item: POSItem, options?: { notes?: string, modifiers?: Array<{name: string, price: number}> }) => {
    setCart(prevCart => {
      const modifierPrice = options?.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0
      const totalPrice = item.price + modifierPrice

      const existingItemIndex = prevCart.findIndex(cartItem => 
        cartItem.id === item.id && 
        JSON.stringify(cartItem.modifiers) === JSON.stringify(options?.modifiers) &&
        cartItem.notes === options?.notes
      )

      if (existingItemIndex >= 0) {
        return prevCart.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      } else {
        return [...prevCart, { 
          ...item, 
          price: totalPrice,
          quantity: 1,
          category: item.category,
          notes: options?.notes,
          modifiers: options?.modifiers,
          isFavorite: favorites.includes(item.id)
        }]
      }
    })
  }

  const addToFavorites = (itemId: string) => {
    const newFavorites = [...favorites, itemId]
    setFavorites(newFavorites)
    try {
      localStorage.setItem('pos-favorites', JSON.stringify(newFavorites))
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error)
    }
  }

  const removeFromFavorites = (itemId: string) => {
    const newFavorites = favorites.filter(id => id !== itemId)
    setFavorites(newFavorites)
    try {
      localStorage.setItem('pos-favorites', JSON.stringify(newFavorites))
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error)
    }
  }

  // Quick Modifier Management Functions
  const addQuickModifier = (modifier: Omit<QuickAction, 'id'>) => {
    const newModifier = {
      ...modifier,
      id: `mod_${Date.now()}`,
      type: 'modifier' as const
    }
    const newModifiers = [...quickActions, newModifier]
    setQuickActions(newModifiers)
    try {
      localStorage.setItem('pos-quick-modifiers', JSON.stringify(newModifiers))
    } catch (error) {
      console.error('Error saving quick modifiers to localStorage:', error)
    }
  }

  const updateQuickModifier = (id: string, updates: Partial<QuickAction>) => {
    const newModifiers = quickActions.map(action => 
      action.id === id ? { ...action, ...updates } : action
    )
    setQuickActions(newModifiers)
    try {
      localStorage.setItem('pos-quick-modifiers', JSON.stringify(newModifiers))
    } catch (error) {
      console.error('Error saving quick modifiers to localStorage:', error)
    }
  }

  const deleteQuickModifier = (id: string) => {
    const newModifiers = quickActions.filter(action => action.id !== id)
    setQuickActions(newModifiers)
    try {
      localStorage.setItem('pos-quick-modifiers', JSON.stringify(newModifiers))
    } catch (error) {
      console.error('Error saving quick modifiers to localStorage:', error)
    }
  }

  const openModifierModal = (modifier?: QuickAction) => {
    setEditingModifier(modifier || null)
    setShowModifierModal(true)
  }

  const addQuickCombo = (combo: QuickAction) => {
    if (combo.type === 'combo' && combo.items) {
      combo.items.forEach(itemId => {
        const item = menuItems.find(mi => mi.id === itemId)
        if (item) {
          addToCart(item)
        }
      })
    }
  }

  const updateCartItemNotes = (cartItemIndex: number, notes: string) => {
    setCart(prevCart =>
      prevCart.map((item, index) =>
        index === cartItemIndex ? { ...item, notes } : item
      )
    )
  }

  const addModifierToCartItem = (cartItemIndex: number, modifier: {name: string, price: number}) => {
    setCart(prevCart =>
      prevCart.map((item, index) =>
        index === cartItemIndex 
          ? { 
              ...item, 
              modifiers: [...(item.modifiers || []), modifier],
              price: item.price + modifier.price
            } 
          : item
      )
    )
  }

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id))
  }

  const removeFromCartByIndex = (index: number) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index))
  }

  const updateCartItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCartByIndex(index)
    } else {
      setCart(prevCart =>
        prevCart.map((item, i) =>
          i === index ? { ...item, quantity } : item
        )
      )
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalAmount = subtotal // No tax applied

  // Cash handling functions
  const handleQuickAmount = (amount: number) => {
    setCashReceived(amount.toString())
  }

  const handleCashInput = (value: string) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '')
    // Prevent multiple decimal points
    const parts = cleanValue.split('.')
    if (parts.length > 2) {
      return
    }
    setCashReceived(cleanValue)
  }

  const isCashPayment = () => {
    const selectedMethod = paymentMethods.find(method => method.id === paymentMethod)
    return selectedMethod?.type === 'cash'
  }

  const canProcessCashPayment = () => {
    if (!isCashPayment()) return true // Non-cash payments don't need cash validation
    const receivedAmount = parseFloat(cashReceived) || 0
    return receivedAmount >= totalAmount
  }

  const processOrder = async () => {
    if (!user?.uid || cart.length === 0) {
      alert('Cart is empty! Please add items before processing.')
      return
    }

    // Validate cash payment
    if (isCashPayment() && !canProcessCashPayment()) {
      alert(`Insufficient cash! Need ₱${totalAmount.toFixed(2)}, received ₱${(parseFloat(cashReceived) || 0).toFixed(2)}`)
      return
    }

    try {
      setProcessing(true)
      
      const orderItems = cart.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }))

      const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethod)
      
      const orderData = {
        items: orderItems,
        subtotal,
        total: totalAmount,
        status: 'completed' as const,
        customerName: customerName || 'Walk-in Customer',
        orderType,
        paymentMethod: selectedPaymentMethod?.name || paymentMethod,
        tenantId: user.uid
      }

      // Create the order
      const orderId = await createPOSOrder(orderData)
      console.log('✅ Order created:', orderId)
      
      // Process inventory deductions
      await processInventoryDeduction(user.uid, orderItems)
      console.log('✅ Inventory updated for sold items')
      
      // Handle cash payment and drawer updates
      if (isCashPayment() && selectedPaymentMethod) {
        try {
          const receivedAmount = parseFloat(cashReceived) || 0
          const changeGiven = changeAmount
          
          // Ensure cash drawer exists first
          await initializeDefaultCashDrawer(user.uid)
          
          // Get the cash drawer (assuming first active drawer, could be enhanced)
          const cashDrawers = await getCashDrawers(user.uid)
          const activeCashDrawer = cashDrawers.find(drawer => drawer.status !== 'uncounted')
          
          if (activeCashDrawer) {
            // Update cash drawer balance (add net cash)
            const netCashAdded = totalAmount // The order total goes into the drawer
            await updateCashDrawer(user.uid, activeCashDrawer.id, {
              cashOnHand: activeCashDrawer.cashOnHand + netCashAdded,
              expectedCash: activeCashDrawer.expectedCash + netCashAdded,
            })
            console.log(`💰 Cash drawer updated: +₱${netCashAdded}`)
          } else {
            console.warn('⚠️ No active cash drawer found, cash not tracked')
          }
          
          // Record the payment transaction
          await addPaymentTransaction({
            orderId,
            paymentMethodId: selectedPaymentMethod.id,
            paymentMethod: selectedPaymentMethod.type,
            paymentMethodName: selectedPaymentMethod.name,
            amount: totalAmount,
            cashReceived: receivedAmount,
            changeGiven: changeGiven,
            tenantId: user.uid,
          })
          console.log('📝 Payment transaction recorded')
          
        } catch (cashError) {
          console.error('⚠️ Error updating cash management:', cashError)
          // Don't fail the order if cash management fails
        }
      } else if (selectedPaymentMethod) {
        // Record non-cash payment transaction
        try {
          await addPaymentTransaction({
            orderId,
            paymentMethodId: selectedPaymentMethod.id,
            paymentMethod: selectedPaymentMethod.type,
            paymentMethodName: selectedPaymentMethod.name,
            amount: totalAmount,
            tenantId: user.uid,
          })
          console.log('📝 Payment transaction recorded')
        } catch (paymentError) {
          console.error('⚠️ Error recording payment transaction:', paymentError)
        }
      }
      
      // Reset form
      setCart([])
      setCustomerName('')
      setCashReceived('')
      setChangeAmount(0)
      setShowCashPayment(false)
      
      if (isCashPayment() && changeAmount > 0) {
        alert(`Order placed successfully! Change: ₱${changeAmount.toFixed(2)}`)
      } else {
        alert('Order placed successfully! Inventory has been updated.')
      }
    } catch (error) {
      console.error('Error processing order:', error)
      alert('Error processing order. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const voidOrder = async (order: POSOrder, reason: string) => {
    if (!user?.uid) return

    try {
      setVoidingOrder(order.id)
      
      console.log('🚨 Voiding order:', order.id, order.orderNumber)
      console.log('📋 Order items to restore:', order.items)
      
      // Restore inventory quantities
      const { restoreInventoryFromVoid } = require('../../lib/firebase/integration')
      console.log('🔄 Starting inventory restoration...')
      await restoreInventoryFromVoid(user.uid, order.items)
      console.log('✅ Inventory restoration completed')
      
      // Update order status to voided
      const { updatePOSOrder } = require('../../lib/firebase/pos')
      console.log('📝 Updating order status to voided...')
      await updatePOSOrder(user.uid, order.id, {
        status: 'voided',
        voidReason: reason,
        voidedAt: new Date(),
        voidedBy: user.email || 'Unknown'
      })
      console.log('✅ Order status updated to voided')
      
      // Refresh the recent orders list to show the updated status
      if (user?.uid) {
        const { getPOSOrders } = require('../../lib/firebase/pos')
        const orders = await getPOSOrders(user.uid)
        const sortedOrders = orders.sort((a: POSOrder, b: POSOrder) => {
          const aTime = a.createdAt?.toDate() || new Date(0)
          const bTime = b.createdAt?.toDate() || new Date(0)
          return bTime.getTime() - aTime.getTime()
        })
        setRecentOrders(sortedOrders.slice(0, 10))
      }
      
      console.log('✅ Order voided and inventory restored:', order.id)
      alert('Order voided successfully! Inventory has been restored.')
    } catch (error) {
      console.error('Error voiding order:', error)
      alert('Error voiding order. Please try again.')
    } finally {
      setVoidingOrder(null)
    }
  }

  return (
    <FeatureGate feature="pos">
      <PermissionGate 
        permission="pos.read"
        fallback={<NoPermissionMessage permission="pos.read" action="access the Point of Sale system" />}
      >
        <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <CoreTrackLogo size="lg" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-gray-500 text-sm">Professional POS System</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Action Center */}
            <div className="flex items-center gap-2">
              {/* Cart Summary */}
              <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                  </svg>
                  <span className="text-gray-600 font-medium">
                    {cart.length === 0 ? 'Empty' : `${cart.reduce((sum, item) => sum + item.quantity, 0)} items • ₱${totalAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>
              
              {/* Cart Toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-9 h-9 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors"
                title={sidebarCollapsed ? 'Show Cart' : 'Hide Cart'}
              >
                <svg 
                  className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* View Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  showQuickActions 
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </button>

              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  showDashboard 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>

              <button
                onClick={() => setShowRecentOrders(!showRecentOrders)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  showRecentOrders 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Orders
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Dashboard */}
      {showDashboard && (
        <div className="bg-white border-b border-surface-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-surface-900">📈 Business Intelligence Dashboard</h2>
            <div className="text-xs text-surface-500">Live Data • Updated in real-time</div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-green-600 font-medium text-sm">Today&apos;s Revenue</div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-700">₱{salesData.todaysSales.toLocaleString()}</div>
              <div className="text-xs text-green-600 mt-1">+12% vs yesterday</div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-blue-600 font-medium text-sm">Orders Today</div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-700">{salesData.todaysOrders}</div>
              <div className="text-xs text-blue-600 mt-1">+8% vs yesterday</div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-purple-600 font-medium text-sm">Avg Order Value</div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-700">₱{salesData.averageOrderValue.toFixed(0)}</div>
              <div className="text-xs text-purple-600 mt-1">+3% vs yesterday</div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-orange-600 font-medium text-sm">Stock Alerts</div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-700">-</div>
              <div className="text-xs text-orange-600 mt-1">No inventory tracking</div>
            </div>
          </div>

          {/* Charts and Data Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Popular Items */}
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                Top Selling Items
              </h3>
              <div className="space-y-3">
                {salesData.popularItems.length > 0 ? (
                  salesData.popularItems.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-surface-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-surface-900">{item.name}</div>
                          <div className="text-xs text-surface-500">{item.quantity} sold</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-surface-900">₱{item.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-medium text-surface-900 mb-1">No Sales Yet</h4>
                    <p className="text-xs text-surface-500">Start taking orders to see your top selling items here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Sales Chart */}
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <span className="text-lg">📊</span>
                Hourly Performance
              </h3>
              <div className="space-y-2">
                {salesData.hourlyData.slice(-8).map((hour, index) => {
                  const maxRevenue = Math.max(...salesData.hourlyData.map(h => h.revenue))
                  const widthPercent = (hour.revenue / maxRevenue) * 100
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-10 text-xs font-medium text-surface-600">{hour.hour}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-surface-500">{hour.orders} orders</div>
                          <div className="text-xs font-medium text-surface-700">₱{hour.revenue}</div>
                        </div>
                        <div className="w-full bg-surface-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                Stock Alerts
              </h3>
              <div className="space-y-3">
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-surface-900 mb-1">No Inventory Tracking</h4>
                  <p className="text-xs text-surface-500">Stock alerts will appear here when inventory tracking is enabled</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Panel - Recent Orders Modal */}
      {showRecentOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">Recent Orders</h2>
                  <p className="text-sm text-surface-500">View, repeat, or void recent orders</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecentOrders(false)}
                className="w-10 h-10 bg-surface-100 hover:bg-surface-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingOrders ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-surface-600">Loading recent orders...</p>
                  </div>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">No Recent Orders</h3>
                    <p className="text-surface-500">Complete your first order to see it here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="bg-surface-50 rounded-xl p-6 border border-surface-200 hover:border-surface-300 transition-colors">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            order.status === 'completed' ? 'bg-green-500' :
                            order.status === 'voided' ? 'bg-red-500' :
                            order.status === 'cancelled' ? 'bg-gray-500' :
                            'bg-yellow-500'
                          }`}></div>
                          <div>
                            <h3 className="text-lg font-bold text-surface-900">Order #{order.orderNumber}</h3>
                            <p className="text-sm text-surface-500">
                              {order.customerName || 'Walk-in Customer'} • {order.orderType} • {order.paymentMethod}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'voided' ? 'bg-red-100 text-red-800' :
                            order.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status === 'completed' ? '✅ Completed' :
                             order.status === 'voided' ? '❌ Voided' :
                             order.status === 'cancelled' ? '⭕ Cancelled' :
                             '🔄 Processing'}
                          </div>
                          <div className="text-sm text-surface-500 mt-1">
                            {order.createdAt && new Date(order.createdAt.toDate()).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-surface-700 mb-2">Items:</h4>
                        <div className="bg-white rounded-lg p-3 border border-surface-200">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-1">
                              <span className="text-sm text-surface-900">
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-sm font-medium text-surface-900">
                                ₱{item.total.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-surface-200 mt-2 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-surface-900">Total:</span>
                              <span className="text-lg font-bold text-primary-600">₱{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            // Repeat order - add all items to cart
                            let addedItems = 0;
                            order.items.forEach(item => {
                              const fullItem = menuItems.find((menuItem: POSItem) => menuItem.id === item.itemId);
                              if (fullItem) {
                                for (let i = 0; i < item.quantity; i++) {
                                  addToCart(fullItem);
                                  addedItems++;
                                }
                              }
                            });
                            setShowRecentOrders(false);
                            alert(`✅ Added ${addedItems} items from Order #${order.orderNumber} to your cart!`);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Repeat Order
                        </button>

                        {/* Show void button for orders that can be voided (not already voided or cancelled) */}
                        {order.status !== 'voided' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              const reason = prompt('🚨 Void Order\n\nPlease enter the reason for voiding this order:');
                              if (reason && reason.trim()) {
                                if (confirm(`Are you sure you want to void Order #${order.orderNumber}?\n\nReason: ${reason}\n\nThis action cannot be undone and will restore inventory.`)) {
                                  voidOrder(order, reason.trim());
                                  alert(`✅ Order #${order.orderNumber} has been voided successfully.\nInventory has been restored.`);
                                }
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Void Order
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const orderDetails = `📋 Order #${order.orderNumber}\n\n` +
                              `👤 Customer: ${order.customerName || 'Walk-in Customer'}\n` +
                              `📍 Type: ${order.orderType}\n` +
                              `💳 Payment: ${order.paymentMethod}\n` +
                              `📅 Date: ${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString() : 'Unknown'}\n` +
                              `🏷️ Status: ${order.status}\n\n` +
                              `📦 Items:\n${order.items.map(item => `• ${item.quantity}x ${item.name} - ₱${item.total.toFixed(2)}`).join('\n')}\n\n` +
                              `💰 Total: ₱${order.total.toFixed(2)}`;
                            alert(orderDetails);
                          }}
                          className="bg-surface-600 hover:bg-surface-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                      </div>

                      {/* Void Info for voided orders */}
                      {order.status === 'voided' && order.voidReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-red-800">Void Reason:</p>
                              <p className="text-sm text-red-700">{order.voidReason}</p>
                              {order.voidedAt && (
                                <p className="text-xs text-red-600 mt-1">
                                  Voided on {new Date(order.voidedAt.toDate()).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-surface-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-surface-500">
                  Showing {recentOrders.length} recent orders
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      // Refresh orders
                      if (user?.uid) {
                        setLoadingOrders(true);
                        try {
                          const orders = await getPOSOrders(user.uid);
                          const sortedOrders = orders.sort((a: POSOrder, b: POSOrder) => {
                            const aTime = a.createdAt?.toDate() || new Date(0);
                            const bTime = b.createdAt?.toDate() || new Date(0);
                            return bTime.getTime() - aTime.getTime();
                          });
                          setRecentOrders(sortedOrders.slice(0, 10));
                        } catch (error) {
                          console.error('Error fetching orders:', error);
                          alert('Failed to refresh orders. Please try again.');
                        } finally {
                          setLoadingOrders(false);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowRecentOrders(false)}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Left Side - Menu */}
        <div className="flex-1 flex flex-col">
      {/* Quick Actions Panel - Streamlined */}
      {showQuickActions && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModifierModal()}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                Manage Modifiers
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Favorites Section */}
            {menuItems.filter(item => favorites.includes(item.id)).length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">Favorite Items</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                    {menuItems.filter(item => favorites.includes(item.id)).length}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {menuItems.filter(item => favorites.includes(item.id)).slice(0, 8).map((item) => (
                    <button
                      key={`fav-${item.id}`}
                      onClick={() => addToCart(item)}
                      className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all border border-yellow-200 hover:border-yellow-300 aspect-square"
                      title={`${item.name} - ₱${item.price.toFixed(2)}`}
                    >
                      <div className="flex flex-col h-full justify-center text-center">
                        <div className="text-lg mb-1">{item.image || '🍽️'}</div>
                        <div className="text-xs font-medium text-gray-900 leading-tight overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {item.name}
                        </div>
                        <div className="text-xs text-yellow-700 font-bold mt-1">₱{item.price.toFixed(0)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Modifiers Section */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-800">Quick Modifiers</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {quickActions.filter(action => action.type === 'modifier').length}
                </span>
              </div>
              
              {quickActions.filter(action => action.type === 'modifier').length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {quickActions.filter(action => action.type === 'modifier').map((modifier) => (
                    <div key={modifier.id} className="relative group">
                      <button
                        onClick={() => alert(`${modifier.name} modifier ready to add`)}
                        className="w-full bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all border border-blue-200 hover:border-blue-300 aspect-square"
                        title={`${modifier.name} - ${modifier.price ? `+₱${modifier.price}` : 'Free'}`}
                      >
                        <div className="flex flex-col h-full justify-center text-center">
                          <div className="text-lg mb-1">{modifier.icon}</div>
                          <div className="text-xs font-medium text-gray-900 leading-tight line-clamp-2">
                            {modifier.name}
                          </div>
                          <div className="text-xs text-blue-700 font-bold mt-1">
                            {modifier.price ? `+₱${modifier.price}` : 'Free'}
                          </div>
                        </div>
                      </button>
                      
                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openModifierModal(modifier)
                          }}
                          className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete "${modifier.name}" modifier?`)) {
                              deleteQuickModifier(modifier.id)
                            }
                          }}
                          className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-blue-600 text-sm">No modifiers created yet</div>
                  <button
                    onClick={() => openModifierModal()}
                    className="text-xs text-blue-700 hover:text-blue-800 underline mt-1"
                  >
                    Create your first modifier
                  </button>
                </div>
              )}
            </div>

            {/* Empty State for Favorites */}
            {menuItems.filter(item => favorites.includes(item.id)).length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-center py-4">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <div className="text-gray-600 text-sm">No favorite items yet</div>
                  <div className="text-xs text-gray-500 mt-1">Star items to see them here</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

          {/* Category Selection Panel */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Categories
              </h3>
              <div className="text-xs text-gray-500">
                {categories.length} categories • {filteredItems.length} items shown
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const categoryItemCount = menuItems.filter(item => 
                  category === 'All' ? true : item.category === category
                ).length;
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    <span>{category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-blue-100'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {categoryItemCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 animate-pulse shadow-sm border border-gray-200" style={{ aspectRatio: '1' }}>
                      <div className="w-8 h-8 bg-gray-200 rounded-lg mx-auto mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-2/3 mx-auto mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No menu items found</h3>
                    <p className="text-gray-500 mb-4">
                      {menuItems.length === 0 
                        ? "No items in database. Create menu items in Product Builder first." 
                        : "Try adjusting your search or selecting a different category"
                      }
                    </p>
                    <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
                      <div>Debug Info:</div>
                      <div>Total items: {menuItems.length}</div>
                      <div>Filtered items: {filteredItems.length}</div>
                      <div>Selected category: {selectedCategory}</div>
                      <div>Search term: "{searchTerm}"</div>
                    </div>
                    {menuItems.length === 0 && (
                      <button
                        onClick={() => window.open('/menu', '_blank')}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Go to Product Builder
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-100 hover:border-gray-200 transition-colors duration-200 group rounded-lg"
                    >
                      {/* Content */}
                      <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 leading-5 mb-1">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">
                              {item.category}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (favorites.includes(item.id)) {
                                removeFromFavorites(item.id)
                              } else {
                                addToFavorites(item.id)
                              }
                            }}
                            className={`ml-3 transition-colors flex-shrink-0 ${
                              favorites.includes(item.id)
                                ? 'text-gray-400'
                                : 'text-gray-300 hover:text-gray-400'
                            }`}
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                        </div>

                        {/* Price */}
                        <div className="mb-6">
                          <span className="text-lg font-semibold text-gray-900">
                            ₱{item.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(item)
                              console.log('🛒 Added to cart:', item.name)
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 transition-colors rounded-lg font-medium"
                          >
                            Add to Cart
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedItemForNotes(item.id)
                            }}
                            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm py-2.5 transition-colors rounded-lg"
                          >
                            Add Note
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Cart Sidebar */}
        <div className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 shadow-lg ${
          sidebarCollapsed ? 'w-14' : 'w-80'
        }`}>
          {sidebarCollapsed ? (
            <div className="p-3 flex flex-col items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                title="Expand cart"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="text-center">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119.993zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-gray-600">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
              </div>
              
              {cart.length > 0 && (
                <div className="text-center">
                  <div className="text-xs font-bold text-blue-600 mb-1">₱{totalAmount.toFixed(0)}</div>
                  <button
                    onClick={processOrder}
                    disabled={processing}
                    className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-all duration-200 text-xs font-bold disabled:opacity-50 hover:scale-105"
                  >
                    {processing ? (
                      <svg className="animate-spin w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Professional Cart Header */}
              <div className="border-b border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Current Order</h2>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">
                      {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </div>
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                      title="Collapse cart"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Customer & Order Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                    <input
                      type="text"
                      placeholder="Walk-in Customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Order Type</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as 'dine-in' | 'takeout' | 'delivery')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="dine-in">🏪 Dine In</option>
                        <option value="takeout">🥡 Takeout</option>
                        <option value="delivery">🚚 Delivery</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Payment</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        {paymentMethods.filter(method => method.isActive).map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.type === 'cash' && '💵'} 
                            {method.type === 'card' && '💳'} 
                            {method.type === 'digital' && '📱'} 
                            {' '}{method.name}
                          </option>
                        ))}
                        {paymentMethods.filter(method => method.isActive).length === 0 && (
                          <option value="cash">� Cash (Default)</option>
                        )}
                      </select>
                    </div>

                    {/* Cash Payment Details */}
                    {isCashPayment() && (
                      <div className="col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Enhanced Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-lg font-bold text-white truncate">Cash Payment</h3>
                                <p className="text-blue-100 text-sm truncate">Complete transaction</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-blue-100 font-medium">Total</div>
                              <div className="text-xl font-bold text-white">₱{totalAmount.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          {/* Transaction Summary */}
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide truncate">Received</span>
                                <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="text-2xl font-bold text-slate-900 truncate">
                                ₱{cashReceived ? parseFloat(cashReceived).toFixed(2) : '0.00'}
                              </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide truncate">Change</span>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                                  changeAmount > 0 ? 'bg-green-100' : 'bg-slate-100'
                                }`}>
                                  <svg className={`w-3 h-3 ${changeAmount > 0 ? 'text-green-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              <div className={`text-2xl font-bold truncate ${
                                changeAmount > 0 ? 'text-green-600' : 
                                !canProcessCashPayment() && parseFloat(cashReceived) > 0 ? 'text-red-500' : 'text-slate-400'
                              }`}>
                                ₱{changeAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Cash Input Section */}
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                              Enter Amount Received
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                <span className="text-slate-400 text-lg font-semibold">₱</span>
                              </div>
                              <input
                                type="text"
                                value={cashReceived}
                                onChange={(e) => handleCashInput(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-10 pr-12 py-4 text-xl font-bold text-center bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 shadow-sm"
                              />
                              {cashReceived && (
                                <button
                                  onClick={() => setCashReceived('')}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Amount Selection */}
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-slate-700">Quick Select</span>
                              <span className="text-xs text-slate-500 hidden sm:block">Tap amount</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[100, 200, 500, 1000, 1500, 2000].map((amount) => (
                                <button
                                  key={amount}
                                  onClick={() => handleQuickAmount(amount)}
                                  className={`px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 truncate ${
                                    cashReceived === amount.toString()
                                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm border border-slate-200'
                                  }`}
                                >
                                  ₱{amount.toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Status Indicator */}
                          <div className={`rounded-lg p-4 border-2 transition-all duration-200 ${
                            changeAmount > 0 
                              ? 'bg-green-50 border-green-200' 
                              : !canProcessCashPayment() && parseFloat(cashReceived) > 0
                                ? 'bg-red-50 border-red-200'
                                : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {changeAmount > 0 && (
                                  <>
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-green-700 truncate">Ready to Process</div>
                                      <div className="text-xs text-green-600 truncate">Amount is sufficient</div>
                                    </div>
                                  </>
                                )}
                                {!canProcessCashPayment() && parseFloat(cashReceived) > 0 && (
                                  <>
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-red-700 truncate">Insufficient Amount</div>
                                      <div className="text-xs text-red-600 truncate">
                                        Need ₱{(totalAmount - (parseFloat(cashReceived) || 0)).toFixed(2)} more
                                      </div>
                                    </div>
                                  </>
                                )}
                                {!cashReceived && (
                                  <>
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-slate-600 truncate">Awaiting Input</div>
                                      <div className="text-xs text-slate-500 truncate">Enter amount to calculate</div>
                                    </div>
                                  </>
                                )}
                              </div>
                              {changeAmount > 0 && (
                                <div className="text-right bg-white rounded-md p-2.5 border border-green-200 flex-shrink-0">
                                  <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Change</div>
                                  <div className="text-lg font-bold text-green-700">₱{changeAmount.toFixed(2)}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cart Items Section */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {cart.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Cart is empty</h3>
                      <p className="text-gray-500 text-xs">Add items from the menu</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 font-semibold text-sm">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)} items in cart
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Clear all items from cart?')) {
                              setCart([])
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {cart.map((item, cartItemIndex) => (
                        <div key={`${item.id}-${cartItemIndex}`} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="text-xl">{item.image || '🍽️'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                                <button
                                  onClick={() => removeFromCartByIndex(cartItemIndex)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateCartItemQuantity(cartItemIndex, item.quantity - 1)}
                                    className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateCartItemQuantity(cartItemIndex, item.quantity + 1)}
                                    className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                  </button>
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                  ₱{(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                              
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="mt-2">
                                  {item.modifiers.map((modifier, modIndex) => (
                                    <div key={modIndex} className="text-xs text-blue-600 flex items-center gap-1">
                                      <span>+ {modifier.name}</span>
                                      {modifier.price > 0 && <span>(₱{modifier.price})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {item.notes && (
                                <div className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                                  <span className="font-medium">Note:</span> {item.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Order Summary & Checkout */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 bg-white p-4 space-y-3">
                  {/* Order Total */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-gray-600 text-xs">
                      <span>Subtotal:</span>
                      <span>₱{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-blue-600">₱{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <PermissionGate 
                    permission="pos.create"
                    fallback={
                      <div className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-bold text-sm text-center">
                        No permission to process orders
                      </div>
                    }
                  >
                    <button
                      onClick={processOrder}
                      disabled={cart.length === 0 || processing}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Complete Order
                        </>
                      )}
                    </button>
                  </PermissionGate>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => alert('Order saved! You can continue it later.')}
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Hold
                    </button>
                    <button 
                      onClick={() => alert('Split bill: Divide payment between customers')}
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Split
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notes & Modifiers Modal */}
      {selectedItemForNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-surface-900">Add Notes & Modifiers</h3>
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="text-surface-400 hover:text-surface-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Notes Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 mb-2">Special Notes</label>
              <textarea
                placeholder="e.g., No onions, extra spicy, well done..."
                className="w-full p-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                onBlur={(e) => {
                  if (selectedItemForNotes && selectedItemForNotes.startsWith('cart-')) {
                    const cartIndex = parseInt(selectedItemForNotes.split('-')[1])
                    updateCartItemNotes(cartIndex, e.target.value)
                  }
                }}
              />
            </div>

            {/* Quick Modifiers */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-700 mb-2">Quick Modifiers</label>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.filter(action => action.type === 'modifier').map((modifier) => (
                  <button
                    key={modifier.id}
                    onClick={() => {
                      if (selectedItemForNotes && selectedItemForNotes.startsWith('cart-')) {
                        const cartIndex = parseInt(selectedItemForNotes.split('-')[1])
                        addModifierToCartItem(cartIndex, { name: modifier.name, price: modifier.price || 0 })
                      }
                    }}
                    className="p-3 bg-surface-50 hover:bg-primary-50 border border-surface-200 hover:border-primary-300 rounded-lg text-left transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{modifier.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{modifier.name}</div>
                        <div className="text-xs text-surface-600">
                          {modifier.price ? `+₱${modifier.price}` : 'Free'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="flex-1 py-2 px-4 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Modifier Management Modal */}
      {showModifierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-surface-900">
                {editingModifier ? 'Edit Modifier' : 'Add New Modifier'}
              </h3>
              <button
                onClick={() => {
                  setShowModifierModal(false)
                  setEditingModifier(null)
                }}
                className="text-surface-400 hover:text-surface-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const modifierData = {
                name: formData.get('name') as string,
                price: parseFloat(formData.get('price') as string) || 0,
                icon: formData.get('icon') as string || '🔧',
                type: 'modifier' as const
              }

              if (editingModifier) {
                updateQuickModifier(editingModifier.id, modifierData)
              } else {
                addQuickModifier(modifierData)
              }

              setShowModifierModal(false)
              setEditingModifier(null)
            }}>
              <div className="space-y-4">
                {/* Modifier Name */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Modifier Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingModifier?.name || ''}
                    placeholder="e.g., Extra Cheese, No Onions"
                    className="w-full p-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Additional Price (₱)
                  </label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    defaultValue={editingModifier?.price || 0}
                    placeholder="0.00"
                    className="w-full p-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-surface-500 mt-1">Leave 0 for free modifiers</p>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    name="icon"
                    defaultValue={editingModifier?.icon || ''}
                    placeholder="🔧"
                    className="w-full p-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center"
                    maxLength={2}
                  />
                  <p className="text-xs text-surface-500 mt-1">Choose an emoji to represent this modifier</p>
                </div>

                {/* Common Icons */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Quick Icons
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['🧀', '🚫', '🌶️', '🧂', '🥑', '🍋', '🥓', '🍄', '🧄', '🌿', '🔥', '❄️'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const iconInput = document.querySelector('input[name="icon"]') as HTMLInputElement
                          if (iconInput) iconInput.value = emoji
                        }}
                        className="w-10 h-10 bg-surface-100 hover:bg-surface-200 rounded-lg flex items-center justify-center text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModifierModal(false)
                    setEditingModifier(null)
                  }}
                  className="flex-1 py-2 px-4 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  {editingModifier ? 'Update' : 'Add'} Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Management Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-surface-900">Customer Management</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-surface-400 hover:text-surface-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search/Add Customer */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search customer or add new..."
                className="w-full p-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Recent Customers */}
            <div className="space-y-2">
              <h4 className="font-medium text-surface-700 mb-2">Recent Customers</h4>
              {[
                { id: '1', name: 'John Doe', phone: '+63 912 345 6789', loyaltyPoints: 150, totalOrders: 12 },
                { id: '2', name: 'Jane Smith', phone: '+63 917 123 4567', loyaltyPoints: 89, totalOrders: 8 },
                { id: '3', name: 'Mike Johnson', phone: '+63 905 987 6543', loyaltyPoints: 234, totalOrders: 18 },
              ].map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer)
                    setCustomerName(customer.name)
                    setShowCustomerModal(false)
                  }}
                  className="w-full p-3 bg-surface-50 hover:bg-primary-50 border border-surface-200 hover:border-primary-300 rounded-lg text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-surface-900">{customer.name}</div>
                      <div className="text-sm text-surface-600">{customer.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary-600">{customer.loyaltyPoints} pts</div>
                      <div className="text-xs text-surface-500">{customer.totalOrders} orders</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-2 px-4 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Add new customer logic
                  setShowCustomerModal(false)
                }}
                className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                Add New
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </PermissionGate>
    </FeatureGate>
  )
}
