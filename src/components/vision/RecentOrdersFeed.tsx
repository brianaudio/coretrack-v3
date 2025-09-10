'use client'

import React from 'react'
import { POSOrder } from '../../lib/firebase/pos'

interface RecentOrdersFeedProps {
  orders: POSOrder[]
  loading: boolean
  error: string | null
}

export default function RecentOrdersFeed({ orders, loading, error }: RecentOrdersFeedProps) {
  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`
  
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown time'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return 'Unknown time'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return '💵'
      case 'card': return '💳'
      case 'credit_card': return '💳'
      case 'debit_card': return '💳'
      case 'gcash': return '📱'
      case 'paymaya': return '📱'
      default: return '💰'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return 'Cash'
      case 'card': return 'Card'
      case 'credit_card': return 'Credit Card'
      case 'debit_card': return 'Debit Card'
      case 'gcash': return 'GCash'
      case 'paymaya': return 'PayMaya'
      default: return method || 'Unknown'
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-sm text-red-700">Failed to load recent orders</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-4">
      
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live Feed</span>
        </div>
      </div>

      {/* Orders Feed */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Orders</h3>
            <p className="text-gray-600 text-sm">
              Orders will appear here as they come in
            </p>
          </div>
        ) : (
          // Orders list
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                
                {/* Order Icon */}
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🛒</span>
                </div>
                
                {/* Order Details */}
                <div className="flex-1 min-w-0">
                  
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-900">
                      Order #{order.orderNumber || order.id?.slice(-6) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(order.total || 0)}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-2">
                    {order.items && order.items.length > 0 ? (
                      <div className="text-sm text-gray-600">
                        {order.items.slice(0, 2).map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-xs text-gray-500 mt-1">
                            +{order.items.length - 2} more items
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No items listed</div>
                    )}
                  </div>

                  {/* Order Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>{getPaymentMethodIcon(order.paymentMethod || '')}</span>
                      <span>{getPaymentMethodLabel(order.paymentMethod || '')}</span>
                    </div>
                    <div>
                      {formatTime(order.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {!loading && orders.length > 0 && (
        <div className="mt-6 text-center">
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All Orders
          </button>
        </div>
      )}
    </div>
  )
}
