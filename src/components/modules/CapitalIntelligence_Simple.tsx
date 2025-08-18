'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { db } from '../../lib/firebase'
import { collection, getDocs, query, orderBy, limit, DocumentData } from 'firebase/firestore'

// Capital Intelligence Dashboard Component
export default function CapitalIntelligence() {
  const { profile, tenant } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [alertThresholds, setAlertThresholds] = useState({
    highICR: 75,
    slowRecovery: 30,
    lowVelocity: 0.5
  })

  // Real data integration - replace with Firebase data
  const [capitalData, setCapitalData] = useState<{
    currentICR: number
    capitalRecoveryTime: number
    purchaseToSalesVelocity: number
    totalInventoryValue: number
    totalCapitalDeployed: number
    recentPurchases: Array<{
      name: string
      amount: number
      date: Date
    }>
    recommendations: Array<{
      title: string
      message: string
      priority: string
      action: string
    }>
  }>({
    currentICR: 0,
    capitalRecoveryTime: 0,
    purchaseToSalesVelocity: 0,
    totalInventoryValue: 0,
    totalCapitalDeployed: 0,
    recentPurchases: [],
    recommendations: []
  })

  // Load real data from Firebase
  useEffect(() => {
    const loadCapitalData = async () => {
      if (!tenant?.id || !profile?.tenantId) return
      
      setLoading(true)
      try {
        // Fetch real data from Firebase collections
        const tenantId = profile.tenantId
        
        // Get inventory data
        const inventoryRef = collection(db, `tenants/${tenantId}/inventory`)
        const inventorySnapshot = await getDocs(inventoryRef)
        const inventoryItems = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        // Get recent orders for sales data
        const ordersRef = collection(db, `tenants/${tenantId}/orders`)
        const recentOrdersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(100))
        const ordersSnapshot = await getDocs(recentOrdersQuery)
        const recentOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        // Get purchase orders
        const purchaseOrdersRef = collection(db, `tenants/${tenantId}/purchaseOrders`)
        const purchaseSnapshot = await getDocs(purchaseOrdersRef)
        const purchases = purchaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        // Calculate real metrics
        const totalInventoryValue = inventoryItems.reduce((sum, item) => {
          const value = (item.currentStock || 0) * (item.costPerUnit || 0)
          return sum + (isNaN(value) ? 0 : value)
        }, 0)
        
        const totalCapitalDeployed = purchases.reduce((sum, purchase) => {
          // Use the correct field name from purchase order structure
          const amount = purchase.total || purchase.totalAmount || purchase.amount || purchase.grandTotal || 0
          return sum + amount
        }, 0)
        
        // Calculate daily sales average (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const recentSales = recentOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
          return orderDate >= thirtyDaysAgo
        })
        
        const totalRecentSales = recentSales.reduce((sum, order) => sum + (order.total || 0), 0)
        const avgDailySales = recentSales.length > 0 ? totalRecentSales / Math.min(30, recentSales.length) : 0
        
        // Calculate ICR (Inventory to Capital Ratio)
        const currentICR = totalCapitalDeployed > 0 ? totalInventoryValue / totalCapitalDeployed : 0
        
        // Calculate capital recovery time (days to sell current inventory)
        const capitalRecoveryTime = avgDailySales > 0 ? totalInventoryValue / avgDailySales : 0
        
        // Generate recommendations based on real data
        const recommendations = []
        if (currentICR > 0.8) {
          recommendations.push({
            id: 'high-inventory-levels',
            title: 'High Inventory Levels',
            message: 'Consider reducing inventory levels to improve cash flow',
            priority: 'high',
            action: 'Review slow-moving items'
          })
        }
        if (capitalRecoveryTime > 60) {
          recommendations.push({
            id: 'slow-capital-recovery',
            title: 'Slow Capital Recovery',
            message: `Current inventory will take ${Math.round(capitalRecoveryTime)} days to sell`,
            priority: 'medium',
            action: 'Focus on faster-moving products'
          })
        }
        
        const calculatedMetrics = {
          currentICR: Math.round(currentICR * 100) / 100,
          capitalRecoveryTime: Math.round(capitalRecoveryTime * 10) / 10,
          purchaseToSalesVelocity: avgDailySales,
          totalInventoryValue: Math.round(totalInventoryValue),
          totalCapitalDeployed: Math.round(totalCapitalDeployed),
          recentPurchases: purchases.slice(0, 5).map((p, index) => {
            // Use the correct field name from purchase order structure
            const amount = p.total || p.totalAmount || p.amount || p.grandTotal || 0
            
            return {
              id: p.id || `purchase-${index}`,
              name: p.supplierName || p.supplier || 'Unknown Supplier',
              amount: amount,
              orderNumber: p.orderNumber || '',
              status: p.status || 'unknown',
              date: p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || Date.now())
            }
          }),
          recommendations
        }
        
        setCapitalData(calculatedMetrics)
      } catch (error) {
        console.error('Error loading capital intelligence data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadCapitalData()
  }, [tenant?.id, profile?.tenantId])

  const tabs = [
    { id: 'overview', label: 'Simple Overview', icon: '📊' },
    { id: 'tips', label: 'Business Tips', icon: '💡' }
  ]

  const getICRColor = (icr: number) => {
    if (icr <= 40) return 'text-green-600'
    if (icr <= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEfficiencyScore = (icr: number, recoveryTime: number, velocity: number) => {
    const icrScore = Math.max(0, (100 - icr))
    const recoveryScore = Math.max(0, (50 - recoveryTime) * 2)
    const velocityScore = Math.min(100, velocity * 30)
    return Math.round((icrScore + recoveryScore + velocityScore) / 3)
  }

  const efficiencyScore = getEfficiencyScore(capitalData.currentICR, capitalData.capitalRecoveryTime, capitalData.purchaseToSalesVelocity)

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Simple Key Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-medium text-gray-900">Money in Stock</p>
              <p className="text-sm text-gray-500">Total value of your inventory</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            ₱{capitalData.totalInventoryValue.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Current stock value
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-medium text-gray-900">Money Spent</p>
              <p className="text-sm text-gray-500">Total spent on purchases</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-600">
            ₱{capitalData.totalCapitalDeployed.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Purchase investments
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-medium text-gray-900">Days to Sell All</p>
              <p className="text-sm text-gray-500">Time to sell current stock</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {Math.round(capitalData.capitalRecoveryTime)}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {capitalData.capitalRecoveryTime <= 21 ? 'Very Good!' : capitalData.capitalRecoveryTime <= 35 ? 'Good' : 'Too Long'}
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">🛒 Recent Purchases</h3>
        {capitalData.recentPurchases.length > 0 ? (
          <div className="space-y-3">
            {capitalData.recentPurchases.slice(0, 3).map((purchase: any) => (
              <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{purchase.name}</p>
                  <p className="text-sm text-gray-600">{purchase.date.toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {purchase.amount > 0 ? `₱${purchase.amount.toLocaleString()}` : 'Amount not set'}
                  </p>
                  {purchase.amount === 0 && (
                    <p className="text-xs text-yellow-600">Check purchase order details</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent purchases found</p>
            <p className="text-sm text-gray-400">Start making purchase orders to see data here</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderTips = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">💡 Simple Business Tips</h3>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Keep Money Moving</h4>
            <p className="text-sm text-blue-700">The faster you sell inventory, the faster you get your money back to buy more or invest elsewhere.</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Watch Your Days to Sell</h4>
            <p className="text-sm text-green-700">If it takes more than 30 days to sell all your stock, you might have too much inventory or slow-moving items.</p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-900 mb-2">Don't Tie Up Too Much Money</h4>
            <p className="text-sm text-orange-700">Having lots of inventory means lots of money sitting on shelves instead of working for your business.</p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Focus on Fast Sellers</h4>
            <p className="text-sm text-purple-700">Buy more of what sells quickly and less of what sits around. This keeps cash flowing.</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Capital Intelligence Dashboard</h1>
            <p className="text-gray-600">Simple money tracker - see if your inventory purchases are smart or eating your profits</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Business: {tenant?.name || 'CoreTrack Business'}</div>
            <div className="text-xs text-gray-500">Real-time money analysis</div>
          </div>
        </div>
        
        {/* Simple Value Proposition */}
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-sm text-blue-800 font-medium">
              <strong>Simple Truth:</strong> Know if your purchases are making or losing money!
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'tips' && renderTips()}
        </div>
      </div>
    </div>
  )
}
