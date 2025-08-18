import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { ShiftReportData } from '../utils/pdfGenerator'
import { getBranchLocationId } from '../utils/branchUtils'
import { getPOSOrders, getPOSItems } from '../firebase/pos'
import { getExpenses } from '../firebase/expenses'

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

    // Get shift time boundaries
    const shiftStartTime = shiftData.startTime.toDate ? shiftData.startTime.toDate() : new Date(shiftData.startTime)
    const shiftEndTime = shiftData.endTime ? (shiftData.endTime.toDate ? shiftData.endTime.toDate() : new Date(shiftData.endTime)) : new Date()

    // Get POS orders, menu items, and expenses data - same as Financial Performance card
    const [allOrders, menuItems, allExpenses] = await Promise.all([
      getPOSOrders(tenantId, locationId),
      getPOSItems(tenantId, locationId),
      getExpenses(tenantId)
    ])

    // Filter orders for current shift only (completed orders only)
    const shiftOrders = allOrders.filter(order => {
      if (order.status !== 'completed') return false
      const orderDate = order.createdAt.toDate()
      return orderDate >= shiftStartTime && orderDate <= shiftEndTime
    })

    // Filter expenses for current shift
    const shiftExpenses = allExpenses.filter(expense => {
      const expenseDate = expense.date.toDate()
      return expenseDate >= shiftStartTime && expenseDate <= shiftEndTime
    })

    console.log(`📦 Found ${shiftOrders.length} completed orders for shift report`)
    console.log(`💰 Found ${shiftExpenses.length} expenses for shift report`)

    // Calculate financial metrics (same logic as Financial Performance card)
    // 1. Gross Revenue (Total Revenue)
    const grossRevenue = shiftOrders.reduce((sum, order) => sum + order.total, 0)

    // 2. Cost of Goods Sold (COGS)
    let totalCOGS = 0
    shiftOrders.forEach(order => {
      order.items.forEach(orderItem => {
        const menuItem = menuItems.find(item => item.id === orderItem.itemId)
        if (menuItem) {
          totalCOGS += menuItem.cost * orderItem.quantity
        }
      })
    })

    // 3. Total Expenses
    const totalExpenses = shiftExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    // 4. Net Profit (Gross Revenue - COGS - Expenses)
    const grossProfit = grossRevenue - totalCOGS
    const netProfit = grossProfit - totalExpenses

    // Calculate top 3 menu items
    const itemCounts: Record<string, { quantity: number; revenue: number }> = {}
    const hourlyStats: Record<string, { orderCount: number; revenue: number }> = {}
    
    shiftOrders.forEach((order: any) => {
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
      const orderDate = order.createdAt.toDate()
      const hour = orderDate.getHours()
      const hourKey = `${hour}:00 - ${hour + 1}:00`
      
      if (!hourlyStats[hourKey]) {
        hourlyStats[hourKey] = { orderCount: 0, revenue: 0 }
      }
      hourlyStats[hourKey].orderCount += 1
      hourlyStats[hourKey].revenue += order.total || 0
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

    // Get critical inventory that needs to be restocked
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

    const reportData: ShiftReportData = {
      shiftName: shiftData.name,
      staffName,
      branchName,
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      totalOrders: shiftOrders.length, // Added total orders count
      grossSales: grossRevenue, // Updated to use calculated gross revenue
      totalCOGS: totalCOGS, // Cost of Goods Sold
      grossProfit: grossProfit, // Gross Revenue - COGS
      totalExpenses: totalExpenses, // Updated to use calculated shift expenses
      netProfit: netProfit, // Updated to use calculated net profit (Gross Profit - Expenses)
      topItems,
      peakHour,
      inventoryAlerts
    }

    console.log('📊 Shift report data generated successfully:', {
      grossRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      topItemsCount: topItems.length,
      topItemsData: topItems,
      peakHourData: peakHour,
      inventoryAlertsCount: inventoryAlerts.length
    })
    
    return reportData
    
  } catch (error) {
    console.error('❌ Error generating shift report data:', error)
    throw error
  }
}
