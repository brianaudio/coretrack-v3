'use client'

import { db } from '../firebase'
import { collection, getDocs, query, orderBy, limit, where, DocumentData } from 'firebase/firestore'

// Interfaces for better type safety
export interface InventoryItem {
  id: string
  name: string
  currentStock: number
  costPerUnit: number
  sellingPrice: number
  category?: string
  supplier?: string
  branchId?: string
  locationId?: string
  unit?: string
}

export interface PurchaseOrder {
  id: string
  supplierName: string
  orderNumber: string
  total: number
  subtotal?: number
  tax?: number
  status: string
  createdAt: any
  branchId?: string
  locationId?: string
}

export interface SalesOrder {
  id: string
  total: number
  items?: any[]
  createdAt: any
  status: string
  customerId?: string
  customerEmail?: string
  customerName?: string
  branchId?: string
  locationId?: string
}

export interface CapitalMetrics {
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
  recentSales: Array<{
    id: string
    customer: string
    amount: number
    items: number
    orderNumber: string
    status: string
    date: Date
  }>
  recommendations: Array<{
    id: string
    title: string
    message: string
    priority: string
    action: string
  }>
}

export class CapitalIntelligenceService {
  private tenantId: string
  private branchId: string

  constructor(tenantId: string, branchId: string) {
    this.tenantId = tenantId
    this.branchId = branchId
  }

  /**
   * Smart branch filtering with multiple fallback strategies
   */
  private async getFilteredData<T>(
    collectionName: string, 
    additionalQueries?: any[]
  ): Promise<T[]> {
    const ref = collection(db, `tenants/${this.tenantId}/${collectionName}`)
    
    // Strategy 1: Filter by branchId
    try {
      const baseQueries = [where('branchId', '==', this.branchId)]
      const allQueries = additionalQueries ? [...baseQueries, ...additionalQueries] : baseQueries
      const query1 = query(ref, ...allQueries)
      const result1 = await getDocs(query1)
      if (result1.docs.length > 0) {
        return result1.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
      }
    } catch (error) {
      console.warn('Branch filter strategy 1 failed:', error)
    }

    // Strategy 2: Filter by locationId
    try {
      const baseQueries = [where('locationId', '==', this.branchId)]
      const allQueries = additionalQueries ? [...baseQueries, ...additionalQueries] : baseQueries
      const query2 = query(ref, ...allQueries)
      const result2 = await getDocs(query2)
      if (result2.docs.length > 0) {
        return result2.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
      }
    } catch (error) {
      console.warn('Branch filter strategy 2 failed:', error)
    }

    // Strategy 3: Filter by locationId with prefix
    try {
      const locationIdWithPrefix = `location_${this.branchId}`
      const baseQueries = [where('locationId', '==', locationIdWithPrefix)]
      const allQueries = additionalQueries ? [...baseQueries, ...additionalQueries] : baseQueries
      const query3 = query(ref, ...allQueries)
      const result3 = await getDocs(query3)
      if (result3.docs.length > 0) {
        return result3.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
      }
    } catch (error) {
      console.warn('Branch filter strategy 3 failed:', error)
    }

    // Fallback: Get all data (for single-branch businesses)
    try {
      const fallbackQuery = additionalQueries 
        ? query(ref, ...additionalQueries)
        : ref
      const fallbackResult = await getDocs(fallbackQuery)
      return fallbackResult.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
    } catch (error) {
      console.error('All branch filtering strategies failed:', error)
      return []
    }
  }

  /**
   * Get inventory data with proper type safety
   */
  async getInventoryData(): Promise<InventoryItem[]> {
    return this.getFilteredData<InventoryItem>('inventory')
  }

  /**
   * Get purchase orders with proper type safety
   */
  async getPurchaseOrdersData(): Promise<PurchaseOrder[]> {
    return this.getFilteredData<PurchaseOrder>('purchaseOrders', [
      orderBy('createdAt', 'desc'),
      limit(50)
    ])
  }

  /**
   * Get recent POS sales data from posOrders collection (primary source for actual sales transactions)
   * Falls back to orders collection if no POS data found for backward compatibility
   * INCLUDES PROPER BRANCH FILTERING
   */
  async getRecentSalesData(days: number = 30): Promise<SalesOrder[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days)
    
    let allSales: SalesOrder[] = []
    
    try {
      // First try posOrders collection with branch filtering (primary POS sales source)
      // This uses getFilteredData which applies smart branch filtering strategies
      const posOrdersSales = await this.getFilteredData<SalesOrder>('posOrders', [
        orderBy('createdAt', 'desc'),
        limit(100)
      ])
      
      const filteredPosOrdersSales = posOrdersSales.filter(order => {
        try {
          const orderDate = order.createdAt?.toDate?.() || 
                           (order.createdAt ? new Date(order.createdAt) : new Date())
          // Filter for completed POS sales within date range
          return orderDate >= thirtyDaysAgo && 
                 (order.status === 'completed' || order.status === 'paid')
        } catch (error) {
          return false
        }
      })
      
      allSales = [...allSales, ...filteredPosOrdersSales]
      
      // If no POS sales found, fallback to orders collection with branch filtering
      // This also uses getFilteredData which applies smart branch filtering strategies
      if (allSales.length === 0) {
        const ordersSales = await this.getFilteredData<SalesOrder>('orders', [
          orderBy('createdAt', 'desc'),
          limit(100)
        ])
        
        const filteredOrdersSales = ordersSales.filter(order => {
          try {
            const orderDate = order.createdAt?.toDate?.() || 
                             (order.createdAt ? new Date(order.createdAt) : new Date())
            return orderDate >= thirtyDaysAgo && order.status === 'completed'
          } catch (error) {
            return false
          }
        })
        
        allSales = [...allSales, ...filteredOrdersSales]
      }
      
    } catch (error) {
      console.error('Error fetching branch-specific POS sales data:', error)
    }
    
    // Remove duplicates and sort by date
    const uniqueSales = allSales.filter((sale, index, self) => 
      index === self.findIndex(s => s.id === sale.id)
    )
    
    return uniqueSales.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  }

  /**
   * Calculate total inventory value
   */
  calculateInventoryValue(inventory: InventoryItem[]): number {
    return inventory.reduce((sum, item) => {
      const stock = item.currentStock || 0
      const cost = item.costPerUnit || 0
      const value = stock * cost
      return sum + (isNaN(value) ? 0 : value)
    }, 0)
  }

  /**
   * Calculate total capital deployed from purchase orders
   */
  calculateCapitalDeployed(purchases: PurchaseOrder[]): number {
    return purchases.reduce((sum, purchase) => {
      const amount = purchase.total || purchase.subtotal || 0
      return sum + amount
    }, 0)
  }

  /**
   * Calculate recent sales total
   */
  calculateRecentSales(sales: SalesOrder[]): number {
    return sales.reduce((sum, order) => sum + (order.total || 0), 0)
  }

  /**
   * Calculate daily sales velocity
   */
  calculateDailySalesVelocity(sales: SalesOrder[], days: number = 30): number {
    const totalSales = this.calculateRecentSales(sales)
    const daysPassed = Math.max(1, Math.min(days, Math.ceil(
      (new Date().getTime() - (new Date().getTime() - (days * 24 * 60 * 60 * 1000))) / (1000 * 60 * 60 * 24)
    )))
    return totalSales / daysPassed
  }

  /**
   * Analyze money flow with intelligent insights
   */
  analyzeMoneyFlow(
    totalCapitalDeployed: number, 
    totalInventoryValue: number, 
    totalRecentSales: number
  ): CapitalMetrics['moneyFlowAnalysis'] {
    const moneyDifference = totalCapitalDeployed - totalInventoryValue
    
    if (Math.abs(moneyDifference) < 100) {
      return {
        type: 'balanced',
        message: 'Your spending and inventory value are perfectly balanced',
        isGood: true,
        details: ['Your inventory management is precise']
      }
    }
    
    if (moneyDifference > 0) {
      if (totalRecentSales > 0) {
        const salesVsMissingMoney = (totalRecentSales / moneyDifference) * 100
        if (salesVsMissingMoney >= 80) {
          return {
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
          return {
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
        return {
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
      return {
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
  }

  /**
   * Generate intelligent recommendations
   */
  generateRecommendations(
    icr: number, 
    capitalRecoveryTime: number, 
    velocity: number,
    inventory: InventoryItem[]
  ): CapitalMetrics['recommendations'] {
    const recommendations: CapitalMetrics['recommendations'] = []

    // ICR-based recommendations
    if (icr > 0.8) {
      recommendations.push({
        id: 'high-inventory-levels',
        title: 'High Inventory Levels',
        message: 'Consider reducing inventory levels to improve cash flow',
        priority: 'high',
        action: 'Review slow-moving items'
      })
    }

    // Recovery time recommendations
    if (capitalRecoveryTime > 60 && isFinite(capitalRecoveryTime)) {
      recommendations.push({
        id: 'slow-capital-recovery',
        title: 'Slow Capital Recovery',
        message: `Current inventory will take ${Math.round(capitalRecoveryTime)} days to sell`,
        priority: 'medium',
        action: 'Focus on faster-moving products'
      })
    }

    // Velocity recommendations
    if (velocity < 100) {
      recommendations.push({
        id: 'low-sales-velocity',
        title: 'Low Sales Velocity',
        message: 'Daily sales velocity could be improved',
        priority: 'medium',
        action: 'Consider marketing campaigns or promotions'
      })
    }

    // Inventory-specific recommendations
    const highValueItems = inventory.filter(item => 
      (item.currentStock * item.costPerUnit) > 1000
    ).length

    if (highValueItems > 5) {
      recommendations.push({
        id: 'high-value-items',
        title: 'High-Value Inventory Risk',
        message: `You have ${highValueItems} high-value items in stock`,
        priority: 'low',
        action: 'Monitor these items closely for theft or damage'
      })
    }

    return recommendations
  }

  /**
   * Get complete capital intelligence data
   */
  async getCapitalIntelligence(): Promise<CapitalMetrics> {
    try {
      // Fetch all data in parallel for better performance
      const [inventory, purchases, sales] = await Promise.all([
        this.getInventoryData(),
        this.getPurchaseOrdersData(),
        this.getRecentSalesData()
      ])

      // Debug logging to check data sources
      console.log('🔍 Capital Intelligence Debug:', {
        expectedBranch: this.branchId,
        salesCount: sales.length,
        salesBranchIds: sales.slice(0, 3).map(s => ({ id: s.id, branchId: s.branchId, locationId: s.locationId, total: s.total })),
        totalSalesValue: sales.reduce((sum, s) => sum + (s.total || 0), 0),
        inventoryCount: inventory.length,
        purchaseCount: purchases.length
      })

      // Calculate core metrics
      const totalInventoryValue = this.calculateInventoryValue(inventory)
      const totalCapitalDeployed = this.calculateCapitalDeployed(purchases)
      const totalRecentSales = this.calculateRecentSales(sales)
      const avgDailySales = this.calculateDailySalesVelocity(sales)

      // Calculate derived metrics
      const currentICR = totalCapitalDeployed > 0 ? totalInventoryValue / totalCapitalDeployed : 0
      const capitalRecoveryTime = avgDailySales > 0 && totalInventoryValue > 0 
        ? totalInventoryValue / avgDailySales 
        : totalInventoryValue > 0 ? Infinity : 0

      // Generate insights
      const moneyFlowAnalysis = this.analyzeMoneyFlow(
        totalCapitalDeployed, 
        totalInventoryValue, 
        totalRecentSales
      )

      const recommendations = this.generateRecommendations(
        currentICR,
        capitalRecoveryTime,
        avgDailySales,
        inventory
      )

      // Format recent sales for display (replace recent purchases)
      const recentSales = sales.slice(0, 5).map((s, index) => ({
        id: s.id || `sale-${index}`,
        customer: s.customerName || s.customerEmail || s.customerId || 'Walk-in Customer',
        amount: s.total || 0,
        items: s.items?.length || 1,
        orderNumber: `ORDER-${s.id?.slice(-6) || index}`,
        status: s.status || 'completed',
        date: (() => {
          try {
            return s.createdAt?.toDate?.() || 
                   (s.createdAt ? new Date(s.createdAt) : new Date())
          } catch (error) {
            return new Date()
          }
        })()
      }))

      return {
        currentICR: Math.round(currentICR * 100) / 100,
        capitalRecoveryTime: isFinite(capitalRecoveryTime) ? 
          Math.round(capitalRecoveryTime * 10) / 10 : 999,
        purchaseToSalesVelocity: avgDailySales,
        totalInventoryValue: Math.round(totalInventoryValue),
        totalCapitalDeployed: Math.round(totalCapitalDeployed),
        totalRecentSales: Math.round(totalRecentSales),
        moneyFlowAnalysis,
        recentSales,
        recommendations
      }

    } catch (error) {
      console.error('Error in getCapitalIntelligence:', error)
      throw new Error('Failed to fetch capital intelligence data')
    }
  }
}

export default CapitalIntelligenceService
