// Example of how to integrate real Firebase data into Capital Intelligence

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

export function useCapitalIntelligenceData() {
  const { tenant } = useAuth()
  const { selectedBranch } = useBranch()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCapitalData = async () => {
      if (!tenant?.id || !selectedBranch?.id) return

      try {
        // Get recent purchase orders
        const purchasesQuery = query(
          collection(db, 'tenants', tenant.id, 'purchaseOrders'),
          where('branchId', '==', selectedBranch.id),
          where('status', '==', 'completed'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const purchasesSnap = await getDocs(purchasesQuery)
        const purchases = purchasesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Get inventory data
        const inventoryQuery = query(
          collection(db, 'tenants', tenant.id, 'inventory'),
          where('branchId', '==', selectedBranch.id)
        )
        const inventorySnap = await getDocs(inventoryQuery)
        const inventory = inventorySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Get sales data
        const salesQuery = query(
          collection(db, 'tenants', tenant.id, 'orders'),
          where('branchId', '==', selectedBranch.id),
          where('status', '==', 'completed'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )
        const salesSnap = await getDocs(salesQuery)
        const sales = salesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Calculate capital intelligence metrics
        const metrics = calculateCapitalMetrics({ purchases, inventory, sales })
        
        setData(metrics)
      } catch (error) {
        console.error('Error fetching capital intelligence data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCapitalData()
  }, [tenant?.id, selectedBranch?.id])

  return { data, loading }
}

function calculateCapitalMetrics({ purchases, inventory, sales }) {
  // Calculate Inventory Conversion Rate (ICR)
  const totalInventoryValue = inventory.reduce((sum, item) => 
    sum + (item.currentStock * item.costPerUnit), 0
  )
  
  const totalSalesValue = sales.reduce((sum, sale) => 
    sum + sale.totalAmount, 0
  )
  
  const ICR = totalInventoryValue > 0 ? (totalSalesValue / totalInventoryValue) * 100 : 0

  // Calculate Capital Recovery Time
  const averageDailySales = totalSalesValue / 30 // Last 30 days
  const capitalRecoveryTime = averageDailySales > 0 ? 
    Math.round(totalInventoryValue / averageDailySales) : 0

  // Calculate Purchase-to-Sales Velocity
  const totalPurchaseValue = purchases.reduce((sum, purchase) => 
    sum + purchase.totalAmount, 0
  )
  
  const purchaseToSalesVelocity = totalPurchaseValue > 0 ? 
    totalSalesValue / totalPurchaseValue : 0

  return {
    currentICR: Math.round(ICR * 10) / 10,
    capitalRecoveryTime,
    purchaseToSalesVelocity: Math.round(purchaseToSalesVelocity * 10) / 10,
    totalInventoryValue: Math.round(totalInventoryValue),
    totalCapitalDeployed: Math.round(totalPurchaseValue),
    // Add more calculated metrics...
  }
}
