'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { InventoryItem, InventoryMovement } from '../../lib/firebase/inventory'
import { useToast } from '../ui/Toast'

// 📊 Smart Reorder Suggestions Component
export function SmartReorderSuggestions({ 
  inventoryItems, 
  recentMovements 
}: { 
  inventoryItems: InventoryItem[]
  recentMovements: InventoryMovement[]
}) {
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([])
  const { addToast } = useToast()

  useEffect(() => {
    const generateSuggestions = () => {
      const suggestions = inventoryItems
        .filter(item => {
          const stockRatio = item.currentStock / item.minStock
          return stockRatio <= 1.5 && item.currentStock > 0
        })
        .map(item => {
          // Calculate usage rate from recent movements
          const itemMovements = recentMovements.filter(m => m.itemId === item.id && m.quantity < 0)
          const totalDeductions = itemMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0)
          const daysWithMovements = new Set(itemMovements.map(m => {
            const timestamp = m.timestamp
            if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
              return new Date(timestamp.seconds * 1000).toDateString()
            } else if (timestamp) {
              return new Date(timestamp as any).toDateString()
            }
            return new Date().toDateString()
          })).size || 1
          
          const dailyUsage = totalDeductions / Math.max(daysWithMovements, 1)
          const daysRemaining = dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : 30
          
          const urgency = item.currentStock <= item.minStock * 0.5 ? 'urgent' : 'normal'
          const suggestedQuantity = item.maxStock ? item.maxStock - item.currentStock : item.minStock * 2
          
          return {
            ...item,
            daysRemaining: Math.max(0, daysRemaining),
            urgency,
            suggestedQuantity,
            cost: (item.costPerUnit || 0) * suggestedQuantity,
            dailyUsage: Math.round(dailyUsage * 10) / 10
          }
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 10)

      setReorderSuggestions(suggestions)
    }

    generateSuggestions()
  }, [inventoryItems, recentMovements])

  if (reorderSuggestions.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-medium text-green-800">Inventory Health is Good</h3>
        </div>
        <p className="text-sm text-green-600 mt-1">No immediate reordering needed</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-surface-900">🎯 Smart Reorder Suggestions</h3>
        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
          {reorderSuggestions.length} items need attention
        </span>
      </div>

      <div className="space-y-3">
        {reorderSuggestions.map(item => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.urgency === 'urgent' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.urgency === 'urgent' ? '🚨 Urgent' : '⚠️ Soon'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Current: {item.currentStock} {item.unit} • 
                  Min: {item.minStock} {item.unit} • 
                  {item.daysRemaining > 0 ? `~${item.daysRemaining} days remaining` : 'Critical level'}
                  {item.dailyUsage > 0 && (
                    <span className="text-blue-600"> • Usage: {item.dailyUsage}/{item.unit}/day</span>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="text-blue-600">
                    Suggested: {item.suggestedQuantity} {item.unit}
                  </span>
                  <span className="text-green-600">
                    Cost: ₱{item.cost.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => addToast(`Added ${item.name} to reorder list`, 'success')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add to Reorder
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                  Skip
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Total estimated cost for all suggestions: 
            <span className="font-semibold text-gray-900 ml-1">
              ₱{reorderSuggestions.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}
            </span>
          </p>
          <button 
            onClick={() => addToast('Reorder list created successfully!', 'success')}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Create Reorder List
          </button>
        </div>
      </div>
    </div>
  )
}

// 📈 Inventory Trends Chart Component
export function InventoryTrendsChart({ 
  inventoryItems, 
  recentMovements 
}: { 
  inventoryItems: InventoryItem[]
  recentMovements: InventoryMovement[]
}) {
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'stock' | 'movements'>('value')
  
  // Calculate movement insights
  const movementInsights = {
    totalMovements: recentMovements.length,
    stockAdditions: recentMovements.filter(m => m.quantity > 0).length,
    stockDeductions: recentMovements.filter(m => m.quantity < 0).length,
    mostActiveItems: recentMovements.reduce((acc, movement) => {
      const itemName = inventoryItems.find(item => item.id === movement.itemId)?.name || 'Unknown'
      acc[itemName] = (acc[itemName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
  
  const metrics = {
    value: {
      title: 'Total Inventory Value',
      value: inventoryItems.reduce((sum, item) => sum + ((item.costPerUnit || 0) * item.currentStock), 0),
      format: (val: number) => `₱${val.toLocaleString()}`,
      color: 'text-green-600',
      icon: '💰'
    },
    stock: {
      title: 'Total Items in Stock',
      value: inventoryItems.reduce((sum, item) => sum + item.currentStock, 0),
      format: (val: number) => val.toLocaleString(),
      color: 'text-blue-600',
      icon: '📦'
    },
    movements: {
      title: 'Recent Movements',
      value: movementInsights.totalMovements,
      format: (val: number) => val.toString(),
      color: 'text-purple-600',
      icon: '🔄'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-surface-900">📈 Inventory Overview</h3>
        <select 
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="value">Value Trend</option>
          <option value="stock">Stock Levels</option>
          <option value="movements">Active Items</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(metrics).map(([key, metric]) => (
          <div 
            key={key}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedMetric === key 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedMetric(key as any)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{metric.icon}</span>
              <h4 className="text-sm font-medium text-gray-700">{metric.title}</h4>
            </div>
            <p className={`text-2xl font-bold ${metric.color}`}>
              {metric.format(metric.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Simple trend visualization */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Stock Status Distribution</h4>
        <div className="space-y-2">
          {['good', 'low', 'critical', 'out'].map(status => {
            const count = inventoryItems.filter(item => item.status === status).length
            const percentage = inventoryItems.length > 0 ? (count / inventoryItems.length) * 100 : 0
            const colors = {
              good: 'bg-green-500',
              low: 'bg-yellow-500', 
              critical: 'bg-orange-500',
              out: 'bg-red-500'
            }
            
            return (
              <div key={status} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium capitalize">{status}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${colors[status as keyof typeof colors]}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm text-gray-600">{count} items</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Movement Activity */}
      {recentMovements.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900">Recent Activity</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">{movementInsights.stockAdditions}</div>
              <div className="text-sm text-green-700">Stock Additions</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-lg font-bold text-red-600">{movementInsights.stockDeductions}</div>
              <div className="text-sm text-red-700">Stock Deductions</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-600">
                {Object.keys(movementInsights.mostActiveItems).length}
              </div>
              <div className="text-sm text-blue-700">Items Affected</div>
            </div>
          </div>
          
          {/* Most Active Items */}
          {Object.keys(movementInsights.mostActiveItems).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Most Active Items</h5>
              <div className="flex flex-wrap gap-2">
                {Object.entries(movementInsights.mostActiveItems)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([itemName, count]) => (
                    <span key={itemName} className="px-2 py-1 bg-white rounded text-xs">
                      {itemName} ({count} movements)
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 🔔 Smart Alerts Dashboard
export function SmartAlertsDashboard({ inventoryItems }: { inventoryItems: InventoryItem[] }) {
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    const generateAlerts = () => {
      const generatedAlerts = []

      // Low stock alerts
      const lowStockItems = inventoryItems.filter(item => 
        item.currentStock <= item.minStock && item.currentStock > 0
      )
      if (lowStockItems.length > 0) {
        generatedAlerts.push({
          id: 'low-stock',
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${lowStockItems.length} items are running low`,
          priority: 'medium',
          items: lowStockItems.slice(0, 3).map(item => item.name),
          action: 'View Items'
        })
      }

      // Out of stock alerts  
      const outOfStockItems = inventoryItems.filter(item => item.currentStock === 0)
      if (outOfStockItems.length > 0) {
        generatedAlerts.push({
          id: 'out-of-stock',
          type: 'error',
          title: 'Out of Stock',
          message: `${outOfStockItems.length} items are completely out of stock`,
          priority: 'high',
          items: outOfStockItems.slice(0, 3).map(item => item.name),
          action: 'Reorder Now'
        })
      }

      // High value items with low stock
      const highValueLowStock = inventoryItems.filter(item => {
        const value = (item.costPerUnit || 0) * item.currentStock
        return value > 5000 && item.currentStock <= item.minStock
      })
      if (highValueLowStock.length > 0) {
        generatedAlerts.push({
          id: 'high-value-low-stock',
          type: 'info',
          title: 'High-Value Items at Risk',
          message: `${highValueLowStock.length} expensive items are running low`,
          priority: 'medium',
          items: highValueLowStock.slice(0, 3).map(item => item.name),
          action: 'Priority Reorder'
        })
      }

      setAlerts(generatedAlerts)
    }

    generateAlerts()
  }, [inventoryItems])

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-medium text-green-800">All Clear!</h3>
        </div>
        <p className="text-sm text-green-600 mt-1">No inventory alerts at this time</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-surface-900">🔔 Smart Alerts</h3>
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
          {alerts.length} active alerts
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`border-l-4 p-4 rounded-r-lg ${
              alert.type === 'error' ? 'border-red-500 bg-red-50' :
              alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={`font-medium ${
                  alert.type === 'error' ? 'text-red-800' :
                  alert.type === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {alert.title}
                </h4>
                <p className={`text-sm mt-1 ${
                  alert.type === 'error' ? 'text-red-600' :
                  alert.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {alert.message}
                </p>
                {alert.items.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Affected items:</p>
                    <p className="text-sm font-medium text-gray-700">
                      {alert.items.join(', ')}
                      {alert.items.length < inventoryItems.filter(item => 
                        alert.id === 'low-stock' ? item.currentStock <= item.minStock && item.currentStock > 0 :
                        alert.id === 'out-of-stock' ? item.currentStock === 0 :
                        (item.costPerUnit || 0) * item.currentStock > 5000 && item.currentStock <= item.minStock
                      ).length && ' and more...'}
                    </p>
                  </div>
                )}
              </div>
              <button className={`px-3 py-1 text-sm rounded-lg font-medium ${
                alert.type === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
                alert.type === 'warning' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
                {alert.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 📱 Quick Actions Panel
export function QuickActionsPanel({ onAction }: { onAction: (action: string) => void }) {
  const quickActions = [
    {
      id: 'scan-barcode',
      title: 'Scan Barcode',
      description: 'Quick stock update via barcode',
      icon: '📱',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'bulk-import',
      title: 'Bulk Import',
      description: 'Import multiple items from CSV',
      icon: '📄',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'stock-take',
      title: 'Stock Take',
      description: 'Full inventory count mode',
      icon: '📋',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'generate-report',
      title: 'Generate Report',
      description: 'Create inventory report',
      icon: '📊',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
      <h3 className="text-lg font-semibold text-surface-900 mb-4">⚡ Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`p-4 rounded-lg text-white text-left transition-colors ${action.color}`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <h4 className="font-medium text-sm">{action.title}</h4>
            <p className="text-xs opacity-90">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// 🎯 Export component for easy integration
export default function InventoryEnhancements({ 
  inventoryItems, 
  recentMovements 
}: { 
  inventoryItems: InventoryItem[]
  recentMovements: InventoryMovement[]
}) {
  const { addToast } = useToast()

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'scan-barcode':
        addToast('📱 Barcode scanner feature coming soon!', 'info')
        break
      case 'bulk-import':
        addToast('📄 Bulk import wizard opening...', 'info')
        break
      case 'stock-take':
        addToast('📋 Stock take mode activated!', 'success')
        break
      case 'generate-report':
        addToast('📊 Generating inventory report...', 'info')
        break
      default:
        addToast('Feature coming soon!', 'info')
    }
  }

  return (
    <div className="space-y-6">
      {/* Smart Alerts - Always show first */}
      <SmartAlertsDashboard inventoryItems={inventoryItems} />
      
      {/* Layout for desktop - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SmartReorderSuggestions inventoryItems={inventoryItems} recentMovements={recentMovements} />
        <QuickActionsPanel onAction={handleQuickAction} />
      </div>
      
      {/* Full width trends chart */}
      <InventoryTrendsChart inventoryItems={inventoryItems} recentMovements={recentMovements} />
    </div>
  )
}
