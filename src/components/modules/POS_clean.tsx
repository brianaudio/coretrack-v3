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

  // Filtered items based on category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return menuItems
    return menuItems.filter(item => item.category === selectedCategory)
  }, [menuItems, selectedCategory])

  // Cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }, [cart])

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
                <div className="flex items-center gap-4">
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
                      onClick={() => alert('Favorites feature coming soon!')}
                      className="bg-white border border-orange-200 rounded-xl p-4 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="font-medium text-gray-900">Favorites</div>
                      <div className="text-sm text-gray-500">Quick access items</div>
                    </button>
                    
                    <button 
                      onClick={() => alert('Combos feature coming soon!')}
                      className="bg-white border border-orange-200 rounded-xl p-4 hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="text-2xl mb-2">🍽️</div>
                      <div className="font-medium text-gray-900">Combos</div>
                      <div className="text-sm text-gray-500">Meal combinations</div>
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
                {loading ? (
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
        </div>
  )
}
