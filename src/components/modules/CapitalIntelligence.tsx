'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { db } from '../../lib/firebase'
import { collection, getDocs, query, orderBy, limit, where, DocumentData } from 'firebase/firestore'

// Capital Intelligence Dashboard Component
export default function CapitalIntelligence() {
  const { profile, tenant } = useAuth()
  const { selectedBranch } = useBranch()
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
    totalRecentSales: number
    moneyFlowAnalysis: {
      type: string
      message: string
      isGood: boolean
      details: string[]
    }
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
    totalRecentSales: 0,
    moneyFlowAnalysis: {
      type: 'unknown',
      message: 'Loading analysis...',
      isGood: false,
      details: [] as string[]
    },
    recentPurchases: [],
    recommendations: []
  })

  // Load real data from Firebase
  useEffect(() => {
    const loadCapitalData = async () => {
      if (!tenant?.id || !profile?.tenantId || !selectedBranch?.id) return
      
      setLoading(true)
      try {
        // Fetch real data from Firebase collections
        const tenantId = profile.tenantId
        const branchId = selectedBranch.id
        
        // Get inventory data FILTERED BY BRANCH
        const inventoryRef = collection(db, `tenants/${tenantId}/inventory`)
        
        // First, get ALL inventory to see what branch IDs exist
        const allInventorySnapshot = await getDocs(inventoryRef)
        const allInventoryItems = allInventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        console.log('=== BRANCH FILTERING DEBUG ===')
        console.log('🔍 Current selected branch ID:', branchId)
        console.log('🔍 Selected branch object:', selectedBranch)
        console.log('🔍 All inventory items with their branch IDs:')
        allInventoryItems.forEach((item, index) => {
          console.log(`  Item ${index + 1}: ${item.name}`)
          console.log(`    - branchId: "${item.branchId}"`)
          console.log(`    - branch: "${item.branch}"`) 
          console.log(`    - locationId: "${item.locationId}"`)
          console.log(`    - location: "${item.location}"`)
          console.log(`    - all fields:`, Object.keys(item))
        })
        
        // Try multiple filtering approaches
        let inventoryItems: any[] = []
        
        // Try 1: Filter by branchId
        console.log('🔍 Trying filter 1: branchId ==', branchId)
        const query1 = query(inventoryRef, where('branchId', '==', branchId))
        const result1 = await getDocs(query1)
        inventoryItems = result1.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        console.log('🔍 Filter 1 results:', inventoryItems.length, 'items')
        
        // Try 2: Filter by branch field if no results
        if (inventoryItems.length === 0) {
          console.log('🔍 Trying filter 2: branch ==', branchId)
          const query2 = query(inventoryRef, where('branch', '==', branchId))
          const result2 = await getDocs(query2)
          inventoryItems = result2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          console.log('🔍 Filter 2 results:', inventoryItems.length, 'items')
        }
        
        // Try 3: Filter by locationId with "location_" prefix
        if (inventoryItems.length === 0) {
          const locationIdWithPrefix = `location_${branchId}`
          console.log('🔍 Trying filter 3: locationId ==', locationIdWithPrefix)
          const query3 = query(inventoryRef, where('locationId', '==', locationIdWithPrefix))
          const result3 = await getDocs(query3)
          inventoryItems = result3.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          console.log('🔍 Filter 3 results:', inventoryItems.length, 'items')
        }
        
        // Try 4: Filter by locationId without prefix if no results
        if (inventoryItems.length === 0) {
          console.log('🔍 Trying filter 4: locationId ==', branchId)
          const query4 = query(inventoryRef, where('locationId', '==', branchId))
          const result4 = await getDocs(query4)
          inventoryItems = result4.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          console.log('🔍 Filter 4 results:', inventoryItems.length, 'items')
        }
        
        console.log('=== FINAL FILTERING RESULT ===')
        console.log('🔍 BRANCH-FILTERED DATA VERIFICATION:')
        console.log('- Firebase Path:', `tenants/${tenantId}/inventory`)
        console.log('- Branch Filter:', branchId)
        console.log('- Selected Branch:', selectedBranch.name)
        console.log('- Total inventory items found for this branch:', inventoryItems.length)
        console.log('- Data source: Firebase Firestore (BRANCH-SPECIFIC ONLY)')
        console.log('📋 DETAILED INVENTORY BREAKDOWN:')
        
        inventoryItems.forEach((item, index) => {
          console.log(`📦 ITEM ${index + 1}:`, {
            id: item.id,
            name: item.name || 'Unnamed Item',
            category: item.category || 'No category',
            currentStock: item.currentStock || 0,
            costPerUnit: item.costPerUnit || 0,
            sellingPrice: item.sellingPrice || 'Not set',
            unit: item.unit || 'pieces',
            supplier: item.supplier || 'No supplier',
            branchId: item.branchId || item.branch || 'No branch',
            itemValue: (item.currentStock || 0) * (item.costPerUnit || 0)
          })
        })
        
        // Get recent orders for sales data
        const ordersRef = collection(db, `tenants/${tenantId}/orders`)
        const recentOrdersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(100))
        const ordersSnapshot = await getDocs(recentOrdersQuery)
        const recentOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        // Get purchase orders FILTERED BY BRANCH
        const purchaseOrdersRef = collection(db, `tenants/${tenantId}/purchaseOrders`)
        
        // First, get ALL purchase orders to see what branch IDs exist
        const allPurchaseSnapshot = await getDocs(purchaseOrdersRef)
        const allPurchases = allPurchaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        console.log('=== PURCHASE ORDER FILTERING DEBUG ===')
        console.log('🔍 All purchase orders with their branch IDs:')
        allPurchases.forEach((purchase, index) => {
          console.log(`  Purchase ${index + 1}: ${purchase.supplierName || 'Unknown'}`)
          console.log(`    - branchId: "${purchase.branchId}"`)
          console.log(`    - branch: "${purchase.branch}"`) 
          console.log(`    - locationId: "${purchase.locationId}"`)
          console.log(`    - location: "${purchase.location}"`)
          console.log(`    - all fields:`, Object.keys(purchase))
        })
        
        // Try multiple filtering approaches for purchase orders
        let purchases: any[] = []
        
        // Try 1: Filter by branchId
        console.log('🔍 Trying purchase filter 1: branchId ==', branchId)
        const purchaseQuery1 = query(purchaseOrdersRef, where('branchId', '==', branchId))
        const purchaseResult1 = await getDocs(purchaseQuery1)
        purchases = purchaseResult1.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        console.log('🔍 Purchase filter 1 results:', purchases.length, 'items')
        
        // Try 2: Filter by branch field if no results
        if (purchases.length === 0) {
          console.log('🔍 Trying purchase filter 2: branch ==', branchId)
          const purchaseQuery2 = query(purchaseOrdersRef, where('branch', '==', branchId))
          const purchaseResult2 = await getDocs(purchaseQuery2)
          purchases = purchaseResult2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          console.log('🔍 Purchase filter 2 results:', purchases.length, 'items')
        }
        
        // Try 3: Filter by locationId with "location_" prefix
        if (purchases.length === 0) {
          const locationIdWithPrefix = `location_${branchId}`
          console.log('🔍 Trying purchase filter 3: locationId ==', locationIdWithPrefix)
          const purchaseQuery3 = query(purchaseOrdersRef, where('locationId', '==', locationIdWithPrefix))
          const purchaseResult3 = await getDocs(purchaseQuery3)
          purchases = purchaseResult3.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          console.log('🔍 Purchase filter 3 results:', purchases.length, 'items')
        }
        
        // Try 4: Filter by locationId without prefix if no results
        if (purchases.length === 0) {
          console.log('🔍 Trying purchase filter 4: locationId ==', branchId)
          const purchaseQuery4 = query(purchaseOrdersRef, where('locationId', '==', branchId))
          const purchaseResult4 = await getDocs(purchaseQuery4)
          purchases = purchaseResult4.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          console.log('🔍 Purchase filter 4 results:', purchases.length, 'items')
        }
        
        console.log('=== PURCHASE ORDERS FILTERING RESULT ===')
        console.log('🔍 BRANCH-FILTERED PURCHASE ORDERS:')
        console.log('- Total purchase orders found for this branch:', purchases.length)
        
        // Calculate real metrics with DETAILED debugging
        console.log("🔍 DETAILED INVENTORY CALCULATION:")
        let totalInventoryValue = 0
        inventoryItems.forEach((item, index) => {
          const stock = item.currentStock || 0
          const cost = item.costPerUnit || 0
          const value = stock * cost
          
          console.log(`📦 ITEM ${index + 1}: ${item.name || 'Unnamed'}`)
          console.log(`   Stock: ${stock} ${item.unit || 'units'}`)
          console.log(`   Cost per unit: ₱${cost}`)
          console.log(`   Value: ${stock} × ₱${cost} = ₱${value}`)
          
          totalInventoryValue += (isNaN(value) ? 0 : value)
        })
        
        console.log("💰 TOTAL: ₱" + totalInventoryValue)
        console.log("💰 YOUR EXPECTED: ₱6275")
        console.log("💰 DIFFERENCE: ₱" + (totalInventoryValue - 6275))
        
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
        
        // Calculate the difference between spending and current inventory value
        const moneyDifference = totalCapitalDeployed - totalInventoryValue
        const differencePercentage = totalCapitalDeployed > 0 ? (moneyDifference / totalCapitalDeployed) * 100 : 0
        
        // Analyze what happened to the missing money
        let analysisResult: {
          type: string
          message: string
          isGood: boolean
          details: string[]
        } = {
          type: 'unknown',
          message: 'Unable to determine what happened',
          isGood: false,
          details: []
        }
        
        if (Math.abs(moneyDifference) < 100) {
          analysisResult = {
            type: 'balanced',
            message: 'Your spending and inventory value are perfectly balanced',
            isGood: true,
            details: ['Your inventory management is precise']
          }
        } else if (moneyDifference > 0) {
          // Spent more than current inventory value
          if (totalRecentSales > 0) {
            const salesVsMissingMoney = (totalRecentSales / moneyDifference) * 100
            if (salesVsMissingMoney >= 80) {
              analysisResult = {
                type: 'sales_success',
                message: `Great! You've converted ₱${moneyDifference.toLocaleString()} of inventory into sales`,
                isGood: true,
                details: [
                  `Recent sales: ₱${totalRecentSales.toLocaleString()}`,
                  `This explains ${Math.round(salesVsMissingMoney)}% of the difference`,
                  'Your money is flowing properly from inventory to cash'
                ]
              }
            } else {
              analysisResult = {
                type: 'partial_sales',
                message: `Some sales made (₱${totalRecentSales.toLocaleString()}) but ₱${(moneyDifference - totalRecentSales).toLocaleString()} is unaccounted for`,
                isGood: false,
                details: [
                  'Check for damaged/expired items',
                  'Verify inventory counts are accurate',
                  'Review cost price entries'
                ]
              }
            }
          } else {
            analysisResult = {
              type: 'no_sales',
              message: `₱${moneyDifference.toLocaleString()} difference with no recent sales - needs investigation`,
              isGood: false,
              details: [
                'No sales recorded in the last 30 days',
                'Check for missing/damaged inventory',
                'Verify purchase order amounts and inventory cost prices'
              ]
            }
          }
        } else {
          // Inventory value is higher than spending
          analysisResult = {
            type: 'inventory_growth',
            message: `Your inventory value increased by ₱${Math.abs(moneyDifference).toLocaleString()}`,
            isGood: true,
            details: [
              'You may have received bulk discounts',
              'Product values might have appreciated',
              'Efficient restocking strategy'
            ]
          }
        }
        
        console.log('=== MONEY FLOW ANALYSIS ===')
        console.log('Money spent:', totalCapitalDeployed)
        console.log('Current inventory value:', totalInventoryValue)
        console.log('Difference:', moneyDifference)
        console.log('Recent sales:', totalRecentSales)
        console.log('Analysis result:', analysisResult)
        
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
          totalRecentSales: Math.round(totalRecentSales),
          moneyFlowAnalysis: analysisResult,
          recentPurchases: purchases.slice(0, 5).map((p, index) => {
            // Use the correct field name from purchase order structure
            const amount = p.total || p.totalAmount || p.amount || p.grandTotal || 0
            
            console.log('Purchase data for display:', {
              id: p.id,
              supplierName: p.supplierName,
              orderNumber: p.orderNumber,
              total: p.total,
              subtotal: p.subtotal,
              tax: p.tax,
              status: p.status,
              finalAmount: amount
            })
            
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
  }, [tenant?.id, profile?.tenantId, selectedBranch?.id])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tips', label: 'Tips', icon: '💡' }
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

  // Helper functions for easy understanding
  const getStockHealthStatus = () => {
    const days = capitalData.capitalRecoveryTime
    if (days <= 14) return { status: 'Excellent', color: 'green', emoji: '🔥', message: 'Your money moves super fast!' }
    if (days <= 30) return { status: 'Good', color: 'blue', emoji: '✅', message: 'Healthy cash flow' }
    if (days <= 60) return { status: 'Okay', color: 'yellow', emoji: '⚠️', message: 'Could be faster' }
    return { status: 'Slow', color: 'red', emoji: '🐌', message: 'Money is stuck too long' }
  }

  const getSpendingEfficiency = () => {
    const ratio = capitalData.totalCapitalDeployed > 0 ? (capitalData.totalInventoryValue / capitalData.totalCapitalDeployed) : 0
    if (ratio >= 0.8) return { level: 'Excellent', color: 'green', emoji: '💪', message: 'Great purchasing decisions!' }
    if (ratio >= 0.6) return { level: 'Good', color: 'blue', emoji: '👌', message: 'Solid inventory management' }
    if (ratio >= 0.4) return { level: 'Okay', color: 'yellow', emoji: '📈', message: 'Room for improvement' }
    return { level: 'Poor', color: 'red', emoji: '⚠️', message: 'Check your buying strategy' }
  }

  const stockHealth = getStockHealthStatus()
  const spendingEfficiency = getSpendingEfficiency()

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Clean Status Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">{stockHealth.emoji}</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Business Health: {stockHealth.status}</h2>
        <p className="text-gray-600">{stockHealth.message}</p>
      </div>

      {/* Clean Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Money in Inventory */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-blue-200 transition-all duration-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Money in Stock</h3>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              ₱{capitalData.totalInventoryValue.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500">Current inventory value</p>
          </div>
        </div>

        {/* Money Spent */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-orange-200 transition-all duration-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Money Spent</h3>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              ₱{capitalData.totalCapitalDeployed.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500">
              {capitalData.totalCapitalDeployed === 0 ? "No purchases yet" : "Total investment"}
            </p>
          </div>
        </div>

        {/* Days to Sell */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-green-200 transition-all duration-200">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Days to Sell All</h3>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {capitalData.capitalRecoveryTime === Infinity || isNaN(capitalData.capitalRecoveryTime) 
                ? "∞" 
                : Math.round(capitalData.capitalRecoveryTime)
              }
              {capitalData.capitalRecoveryTime !== Infinity && !isNaN(capitalData.capitalRecoveryTime) && (
                <span className="text-lg text-gray-500 ml-1">days</span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {capitalData.capitalRecoveryTime === Infinity || isNaN(capitalData.capitalRecoveryTime)
                ? "Need sales data"
                : capitalData.capitalRecoveryTime <= 30 ? "Healthy pace" : "Could be faster"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Business Intelligence Insights */}
      {capitalData.totalInventoryValue > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Business Intelligence</h3>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Understanding the relationship between your spending and inventory value
            </p>
          </div>
          
          {/* Key Metrics Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Money in Stock</h4>
                  <p className="text-2xl font-bold text-blue-600">₱{capitalData.totalInventoryValue.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Current value of all products sitting in your inventory, calculated using cost prices
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Money Spent</h4>
                  <p className="text-2xl font-bold text-orange-600">₱{capitalData.totalCapitalDeployed.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Total cash invested in purchase orders to suppliers for inventory restocking
              </p>
            </div>
          </div>

          {/* Status Analysis */}
          <div className="mb-8">
            {capitalData.totalInventoryValue < capitalData.totalCapitalDeployed ? (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-yellow-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-yellow-800 mb-2">Money Flow Analysis</h4>
                    <p className="text-yellow-700 mb-3">
                      Your inventory value (₱{capitalData.totalInventoryValue.toLocaleString()}) is less than what you spent (₱{capitalData.totalCapitalDeployed.toLocaleString()})
                    </p>
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Difference:</strong> ₱{(capitalData.totalCapitalDeployed - capitalData.totalInventoryValue).toLocaleString()}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        This typically means you've successfully sold inventory or some items may have lost value
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : capitalData.totalInventoryValue > capitalData.totalCapitalDeployed ? (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-green-800 mb-2">Inventory Growth</h4>
                    <p className="text-green-700 mb-3">
                      Your inventory value (₱{capitalData.totalInventoryValue.toLocaleString()}) exceeds what you spent (₱{capitalData.totalCapitalDeployed.toLocaleString()})
                    </p>
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>Value Increase:</strong> ₱{(capitalData.totalInventoryValue - capitalData.totalCapitalDeployed).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        This indicates efficient purchasing or inventory value appreciation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Perfect Balance</h4>
                    <p className="text-blue-700 mb-3">
                      Your spending and inventory value are perfectly aligned at ₱{capitalData.totalCapitalDeployed.toLocaleString()}
                    </p>
                    <div className="bg-white/60 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        This demonstrates excellent inventory management and precise purchasing decisions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Results */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">AI Analysis</h4>
            </div>
            
            <div className={`rounded-xl p-5 ${
              capitalData.moneyFlowAnalysis.isGood 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  capitalData.moneyFlowAnalysis.isGood ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {capitalData.moneyFlowAnalysis.isGood ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium mb-3 ${
                    capitalData.moneyFlowAnalysis.isGood ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {capitalData.moneyFlowAnalysis.message}
                  </p>
                  <div className="space-y-2">
                    {capitalData.moneyFlowAnalysis.details.map((detail, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          capitalData.moneyFlowAnalysis.isGood ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <p className={`text-sm ${
                          capitalData.moneyFlowAnalysis.isGood ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          {detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sales Performance Summary */}
            {capitalData.totalRecentSales > 0 && (
              <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-4 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Recent Sales Performance</p>
                      <p className="text-xs text-gray-500">Last 30 days</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-indigo-600">
                    ₱{capitalData.totalRecentSales.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Purchases - Clean Design */}
      {capitalData.recentPurchases.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Purchases</h3>
            <span className="text-sm text-gray-500">{capitalData.recentPurchases.length} orders</span>
          </div>
          
          <div className="space-y-3">
            {capitalData.recentPurchases.slice(0, 3).map((purchase: any) => (
              <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{purchase.name}</p>
                    <p className="text-sm text-gray-500">{purchase.date.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {purchase.amount > 0 ? `₱${purchase.amount.toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderTips = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-8">Business Tips</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-4 4" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Keep Money Moving</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                The faster you sell inventory, the faster you get cash back to reinvest. Aim to sell everything in 2-4 weeks.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Watch Your Timeline</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                If it takes more than 30 days to sell everything, you might have too much inventory or slow-moving items.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Smart Buying</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Buy more of what sells quickly and less of what sits around. This keeps cash flowing and customers happy.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Balance Investment</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Don't put all your money into inventory. Keep some cash available for opportunities and expenses.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Steps */}
        <div className="mt-8 p-6 bg-blue-50 rounded-xl">
          <h4 className="font-semibold text-gray-900 mb-4">Quick Action Steps</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-blue-600">1</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Check Numbers</p>
              <p className="text-xs text-gray-600">Review your days to sell</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-blue-600">2</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Find Slow Items</p>
              <p className="text-xs text-gray-600">Identify what's not moving</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-blue-600">3</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Adjust Strategy</p>
              <p className="text-xs text-gray-600">Buy less slow, more fast items</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Clean Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Capital Intelligence</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Track how efficiently your money is working in your business
        </p>
      </div>

      {/* Simple Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'tips' && renderTips()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
