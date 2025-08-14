'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import CoreTrackLogo from '@/components/CoreTrackLogo'

interface POSItem {
  id: string
  name: string
  price: number
  description?: string
  category?: string
  image?: string
  available?: boolean
}

interface CartItem extends POSItem {
  quantity: number
  total: number
}

interface SalesData {
  todaysSales: number
  todaysOrders: number
  averageOrderValue: number
  popularItems: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  hourlyData: Array<{
    hour: string
    revenue: number
    orders: number
  }>
}

export function POS() {
  const { user } = useAuth()
  
  // State
  const [cart, setCart] = useState<CartItem[]>([])
  const [menuItems, setMenuItems] = useState<POSItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [favoriteItems, setFavoriteItems] = useState<string[]>([]) // Item IDs that are favorites
  const [showFavorites, setShowFavorites] = useState(false)
  const [showCombos, setShowCombos] = useState(false)
  const [showEndShift, setShowEndShift] = useState(false)
  
  // Mock sales data
  const [salesData] = useState<SalesData>({
    todaysSales: 15420,
    todaysOrders: 42,
    averageOrderValue: 367,
    popularItems: [
      { name: 'Classic Burger', quantity: 12, revenue: 3600 },
      { name: 'Iced Coffee', quantity: 18, revenue: 1800 },
      { name: 'French Fries', quantity: 15, revenue: 1125 }
    ],
    hourlyData: [
      { hour: '09:00', revenue: 1200, orders: 4 },
      { hour: '10:00', revenue: 2100, orders: 7 },
      { hour: '11:00', revenue: 3200, orders: 9 },
      { hour: '12:00', revenue: 4500, orders: 12 }
    ]
  })

  // Filtered items based on category and favorites
  const filteredItems = useMemo(() => {
    let items = menuItems
    
    // Filter by favorites if favorites mode is active
    if (showFavorites) {
      items = items.filter(item => favoriteItems.includes(item.id))
    }
    
    // Then filter by category
    if (selectedCategory === 'All') return items
    return items.filter(item => item.category === selectedCategory)
  }, [menuItems, selectedCategory, showFavorites, favoriteItems])

  // Cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }, [cart])

  // Predefined combos - these could be configured in admin
  const availableCombos = useMemo(() => [
    {
      id: 'combo-1',
      name: 'Coffee & Pastry Combo',
      description: 'Any coffee drink + any pastry',
      originalPrice: 180,
      comboPrice: 150,
      savings: 30,
      items: ['Coffee', 'Pastry']
    },
    {
      id: 'combo-2', 
      name: 'Breakfast Set',
      description: 'Coffee + Sandwich + Hash browns',
      originalPrice: 280,
      comboPrice: 220,
      savings: 60,
      items: ['Coffee', 'Sandwich', 'Hash Browns']
    },
    {
      id: 'combo-3',
      name: 'Family Meal',
      description: '4 Main dishes + 2 Sides + 4 Drinks',
      originalPrice: 800,
      comboPrice: 650,
      savings: 150,
      items: ['Main Dish (4x)', 'Side (2x)', 'Drink (4x)']
    }
  ], [])

  // Data loading - start with empty array
  useEffect(() => {
    setTimeout(() => {
      setMenuItems([])
      setLoading(false)
    }, 1000)
  }, [])

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

  // Favorites management
  const toggleFavorite = (itemId: string) => {
    setFavoriteItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  const isFavorite = (itemId: string) => favoriteItems.includes(itemId)

  // Add combo to cart
  const addComboToCart = (combo: typeof availableCombos[0]) => {
    const comboItem: CartItem = {
      id: combo.id,
      name: combo.name,
      price: combo.comboPrice,
      quantity: 1,
      total: combo.comboPrice,
      description: combo.description + ` (Save ₱${combo.savings})`
    }
    
    const existingCombo = cart.find(cartItem => cartItem.id === combo.id)
    if (existingCombo) {
      updateQuantity(combo.id, existingCombo.quantity + 1)
    } else {
      setCart([...cart, comboItem])
    }
  }

  const clearCart = () => {
    setCart([])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Modern Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left - Logo & Branch Info */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <CoreTrackLogo size="sm" />
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
                    <p className="text-sm text-gray-500">Main Branch • Order #1234</p>
                  </div>
                </div>

                {/* Center - Quick Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      showAnalytics 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📊 Analytics
                  </button>
                  
                  <button
                    onClick={() => setShowRecentOrders(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all"
                  >
                    🕒 Recent Orders
                  </button>
                  
                  <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      showQuickActions 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⚡ Quick Actions
                  </button>
                </div>

                {/* Right - End Shift & Settings */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowEndShift(true)}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-lg text-base"
                  >
                    End Shift
                  </button>
                  
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

          {/* Analytics Dashboard */}
          {showAnalytics && (
            <div className="bg-white border-b border-gray-200 px-6 py-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Performance</h3>
                    <p className="text-sm text-gray-500">Real-time sales analytics</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
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

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-blue-600 font-medium text-sm">Orders Today</div>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">{salesData.todaysOrders}</div>
                  <div className="text-xs text-blue-600 mt-1">+8% vs yesterday</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
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

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-orange-600 font-medium text-sm">Items Low Stock</div>
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-700">3</div>
                  <div className="text-xs text-orange-600 mt-1">Restock needed</div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Layout */}
          <div className="flex-1 flex min-h-0">
            
            {/* Left Panel - Menu Items */}
            <div className="flex-1 flex flex-col bg-white">
              
              {/* Quick Actions Bar */}
              {showQuickActions && (
                <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Quick Actions
                    </h3>
                    <button 
                      onClick={() => setShowQuickActions(false)}
                      className="w-6 h-6 bg-orange-200 hover:bg-orange-300 rounded-md flex items-center justify-center transition-colors"
                    >
                      <svg className="w-3 h-3 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <button 
                      onClick={() => {
                        setShowFavorites(!showFavorites)
                        setSelectedCategory('All') // Reset category filter when showing favorites
                      }}
                      className={`bg-white border rounded-xl p-4 hover:bg-orange-50 transition-colors text-left ${
                        showFavorites ? 'border-orange-500 bg-orange-50' : 'border-orange-200'
                      }`}
                    >
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="font-medium text-gray-900">
                        {showFavorites ? 'Showing Favorites' : 'Favorites'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {showFavorites ? `${favoriteItems.length} items` : 'Quick access items'}
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setShowCombos(!showCombos)}
                      className={`bg-white border rounded-xl p-4 hover:bg-orange-50 transition-colors text-left ${
                        showCombos ? 'border-orange-500 bg-orange-50' : 'border-orange-200'
                      }`}
                    >
                      <div className="text-2xl mb-2">🍽️</div>
                      <div className="font-medium text-gray-900">
                        {showCombos ? 'Showing Combos' : 'Combos'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {showCombos ? `${availableCombos.length} combos` : 'Meal combinations'}
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => alert('Customer management feature coming soon!')}
                      className="bg-white border border-orange-200 rounded-xl p-4 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">👥</div>
                      <div className="font-medium text-gray-900">Customers</div>
                      <div className="text-sm text-gray-500">Manage customers</div>
                    </button>
                    
                    <button 
                      onClick={() => alert('Modifiers feature coming soon!')}
                      className="bg-white border border-orange-200 rounded-xl p-4 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">🔧</div>
                      <div className="font-medium text-gray-900">Modifiers</div>
                      <div className="text-sm text-gray-500">Extra options</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Menu Categories</h3>
                  <div className="text-sm text-gray-500">
                    {loading ? 'Loading...' : `${filteredItems.length || 0} items`}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {['All', 'Food', 'Beverages', 'Desserts', 'Appetizers'].map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {showCombos ? (
                  /* Combos Display */
                  <div className="space-y-4">
                    {availableCombos.map((combo) => (
                      <div
                        key={combo.id}
                        onClick={() => addComboToCart(combo)}
                        className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                              {combo.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">{combo.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {combo.items.map((item, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-gray-400 line-through">₱{combo.originalPrice}</span>
                              <span className="text-xl font-bold text-orange-600">₱{combo.comboPrice}</span>
                            </div>
                            <div className="text-sm text-green-600 font-medium">Save ₱{combo.savings}</div>
                            
                            <div className="w-10 h-10 bg-orange-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse"></div>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                      </svg>
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
                        className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer relative"
                      >
                        {/* Favorite Star Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // Prevent adding to cart when clicking star
                            toggleFavorite(item.id)
                          }}
                          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
                            isFavorite(item.id)
                              ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                              : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-500'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={isFavorite(item.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="text-4xl">🍽️</div>
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
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
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
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            // Handle checkout logic here
                            console.log('Processing order:', cart, cartTotal)
                            clearCart()
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                          Process Order
                        </button>
                        
                        <button
                          onClick={clearCart}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Clear Cart
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recent Orders Modal */}
          {showRecentOrders && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
                      <p className="text-gray-500">View and manage recent transactions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRecentOrders(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Orders</h3>
                    <p className="text-gray-500">Start taking orders to see them here</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* End Shift Modal */}
          {showEndShift && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">End Shift Report</h2>
                      <p className="text-gray-500">Review your shift performance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEndShift(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* 💰 FINANCIAL SUMMARY */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                      <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                        💰 FINANCIAL SUMMARY
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Total Sales:</span>
                          <span className="text-xl font-bold text-green-800">₱{salesData.todaysSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Orders Count:</span>
                          <span className="font-semibold text-green-800">{salesData.todaysOrders}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">Avg Order Value:</span>
                          <span className="font-semibold text-green-800">₱{salesData.averageOrderValue.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 📈 SALES PERFORMANCE */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                      <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                        📈 SALES PERFORMANCE
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Peak Hour:</span>
                          <span className="font-semibold text-blue-800">12:00 PM</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Growth vs Yesterday:</span>
                          <span className="font-semibold text-green-600">+12%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Target Achievement:</span>
                          <span className="font-semibold text-blue-800">85%</span>
                        </div>
                      </div>
                    </div>

                    {/* 🍽️ INVENTORY & PRODUCT PERFORMANCE */}
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200">
                      <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                        🍽️ INVENTORY & PRODUCT PERFORMANCE
                      </h3>
                      <div className="space-y-2">
                        {salesData.popularItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-purple-700">{item.name}:</span>
                            <span className="font-semibold text-purple-800">{item.quantity} sold</span>
                          </div>
                        ))}
                        <div className="mt-3 pt-2 border-t border-purple-200">
                          <div className="flex justify-between items-center">
                            <span className="text-purple-700">Low Stock Items:</span>
                            <span className="font-semibold text-orange-600">3 items</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 💸 EXPENSE TRACKING */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                      <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                        💸 EXPENSE TRACKING
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-orange-700">Operating Expenses:</span>
                          <span className="font-semibold text-orange-800">₱2,450</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-700">Net Profit:</span>
                          <span className="font-semibold text-green-600">₱12,970</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-700">Profit Margin:</span>
                          <span className="font-semibold text-orange-800">84%</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* 📋 ACTION ITEMS FOR NEXT SHIFT */}
                  <div className="mt-6 bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      📋 ACTION ITEMS FOR NEXT SHIFT
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700">Restock 3 low inventory items</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-gray-700">Review pricing for underperforming items</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700">Continue promoting combo deals - performing well</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={() => {
                        // Generate PDF logic would go here
                        alert('PDF report generated!')
                        setShowEndShift(false)
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      📄 Generate PDF Report
                    </button>
                    <button
                      onClick={() => setShowEndShift(false)}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
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
