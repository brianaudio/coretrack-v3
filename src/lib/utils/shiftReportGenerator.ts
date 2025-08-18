import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { ShiftReportData } from '../utils/pdfGenerator'
import { getBranchLocationId } from '../utils/branchUtils'

interface ShiftData {
  id: string
  name: string
  startTime: any // Firestore Timestamp
  endTime?: any
  totalSales: number
  totalExpenses: number
  totalOrders: number
  metadata?: {
    cashFloat?: number
    endingCash?: number
  }
}

export const generateShiftReportData = async (
  shiftData: ShiftData,
  tenantId: string,
  branchName: string,
  staffName: string,
  locationId: string
): Promise<ShiftReportData> => {
  try {
    console.log('📊 Generating shift report data...')

    // Get real-time sales data for top items and peak hour
    const ordersRef = collection(db, `tenants/${tenantId}/orders`)
    const ordersQuery = query(
      ordersRef,
      where('locationId', '==', locationId),
      where('createdAt', '>=', shiftData.startTime),
      ...(shiftData.endTime ? [where('createdAt', '<=', shiftData.endTime)] : [])
    )
    
    let orders: any[] = []
    try {
      const ordersSnapshot = await getDocs(ordersQuery)
      orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (ordersError) {
      console.log('📊 Orders query failed, using manual filtering...')
      
      // Fallback: Get all orders and filter manually
      const allOrdersQuery = query(collection(db, `tenants/${tenantId}/orders`))
      const allOrdersSnapshot = await getDocs(allOrdersQuery)
      const allOrders = allOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Filter manually
      orders = allOrders.filter((order: any) => {
        if (order.locationId !== locationId) return false
        if (!order.createdAt || !order.createdAt.toDate) return false
        
        const orderDate = order.createdAt.toDate()
        const shiftStartDate = shiftData.startTime.toDate ? shiftData.startTime.toDate() : new Date(shiftData.startTime)
        
        if (shiftData.endTime) {
          const shiftEndDate = shiftData.endTime.toDate ? shiftData.endTime.toDate() : new Date(shiftData.endTime)
          return orderDate >= shiftStartDate && orderDate <= shiftEndDate
        }
        
        return orderDate >= shiftStartDate
      })
    }

    console.log(`📦 Found ${orders.length} orders for shift report`)

    // Calculate top 3 items
    const itemCounts: Record<string, { quantity: number; revenue: number }> = {}
    const hourlyStats: Record<string, { orderCount: number; revenue: number }> = {}
    
    orders.forEach((order: any) => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const key = item.name || 'Unknown Item'
          if (!itemCounts[key]) {
            itemCounts[key] = { quantity: 0, revenue: 0 }
          }
          itemCounts[key].quantity += item.quantity || 1
          itemCounts[key].revenue += (item.price || 0) * (item.quantity || 1)
        })
      }

      // Track hourly performance
      if (order.createdAt) {
        const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
        const hour = orderDate.getHours()
        const hourKey = `${hour}:00 - ${hour + 1}:00`
        
        if (!hourlyStats[hourKey]) {
          hourlyStats[hourKey] = { orderCount: 0, revenue: 0 }
        }
        hourlyStats[hourKey].orderCount += 1
        hourlyStats[hourKey].revenue += order.total || 0
      }
    })

    // Get top 3 items
    const topItems = Object.entries(itemCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)

    // Get peak hour
    const peakHourEntry = Object.entries(hourlyStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)[0]
    
    const peakHour = peakHourEntry 
      ? {
          hour: peakHourEntry[0],
          orderCount: peakHourEntry[1].orderCount,
          revenue: peakHourEntry[1].revenue
        }
      : {
          hour: 'No sales recorded',
          orderCount: 0,
          revenue: 0
        }

    // Get inventory alerts (items with low stock)
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`)
    const inventoryQuery = query(inventoryRef, where('locationId', '==', locationId))
    
    let inventoryAlerts: Array<{
      itemName: string
      currentStock: number
      alertType: 'low' | 'out' | 'critical'
    }> = []

    try {
      const inventorySnapshot = await getDocs(inventoryQuery)
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data()
        const stock = data.currentStock || data.quantity || 0
        const name = data.name || 'Unknown Item'

        if (stock === 0) {
          inventoryAlerts.push({
            itemName: name,
            currentStock: stock,
            alertType: 'out'
          })
        } else if (stock <= 5) {
          inventoryAlerts.push({
            itemName: name,
            currentStock: stock,
            alertType: 'critical'
          })
        } else if (stock <= 20) {
          inventoryAlerts.push({
            itemName: name,
            currentStock: stock,
            alertType: 'low'
          })
        }
      })
    } catch (error) {
      console.log('📦 Could not fetch inventory alerts:', error)
    }

    // Calculate financial data
    const grossSales = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || shiftData.totalSales || 0
    const netProfit = grossSales - (shiftData.totalExpenses || 0)

    const reportData: ShiftReportData = {
      shiftId: shiftData.id,
      shiftName: shiftData.name,
      startTime: shiftData.startTime.toDate ? shiftData.startTime.toDate() : new Date(shiftData.startTime),
      endTime: shiftData.endTime ? (shiftData.endTime.toDate ? shiftData.endTime.toDate() : new Date(shiftData.endTime)) : new Date(),
      staffName,
      branchName,
      grossSales,
      totalExpenses: shiftData.totalExpenses || 0,
      netProfit,
      startingCash: shiftData.metadata?.cashFloat || 0,
      endingCash: shiftData.metadata?.endingCash,
      topItems,
      peakHour,
      inventoryAlerts
    }

    console.log('📊 Shift report data generated successfully:', reportData)
    return reportData
    
  } catch (error) {
    console.error('❌ Error generating shift report data:', error)
    throw error
  }
}
