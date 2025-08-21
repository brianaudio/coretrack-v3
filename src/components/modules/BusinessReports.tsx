'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { getPOSOrders, getPOSItems, POSOrder } from '../../lib/firebase/pos'
import { getExpenses } from '../../lib/firebase/expenses'
import { 
  getSalesChartData, 
  getTopSellingItems,
  getPaymentAnalytics
} from '../../lib/firebase/analytics'
import {
  getInventoryAnalytics
} from '../../lib/firebase/inventoryAnalytics'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface DailySummary {
  date: string
  dateKey: string // Add unique identifier
  revenue: number
  orders: number
  expenses: number
  cogs: number
  profit: number
}

interface ExportData {
  revenue: number
  orders: number
  expenses: number
  cogs: number
  topItems: any[]
  paymentMethods: any[]
  inventoryData?: any
  dateRange: string
  dailySummaries?: DailySummary[] // For week/month reports
  period: 'today' | 'week' | 'month' | 'custom'
}

export default function BusinessReports() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'analytics' | 'financial' | 'inventory'>('analytics')
  const [exportDateRange, setExportDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [exportCustomStartDate, setExportCustomStartDate] = useState('')
  const [exportCustomEndDate, setExportCustomEndDate] = useState('')

  const calculateDateRange = () => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (exportDateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        // Get start of current week (last 7 days)
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 6) // 6 days ago + today = 7 days
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        // Get start of current month (last 30 days)
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 29) // 29 days ago + today = 30 days
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'custom':
        if (exportCustomStartDate && exportCustomEndDate) {
          startDate = new Date(exportCustomStartDate)
          endDate = new Date(exportCustomEndDate)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
        }
        break
    }

    return { startDate, endDate }
  }

  const fetchExportData = async (): Promise<ExportData> => {
    if (!profile?.tenantId || !selectedBranch) {
      throw new Error('Missing tenant or branch information')
    }

    const { startDate, endDate } = calculateDateRange()
    const locationId = getBranchLocationId(selectedBranch.id)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // 🔍 DEBUG: Test both collection paths to see which has data
    console.log('🔍 TESTING MULTIPLE COLLECTION PATHS:')
    console.log('🔍 TENANT DEBUG:', {
      tenantId: profile.tenantId,
      uid: profile.uid,
      email: profile.email,
      selectedBranchId: selectedBranch.id,
      selectedBranchName: selectedBranch.name,
      locationId: locationId,
      today: new Date().toLocaleDateString(),
      todayISO: new Date().toISOString()
    })
    
    // Test the current path: tenants/${tenantId}/orders
    try {
      const ordersRef1 = collection(db, `tenants/${profile.tenantId}/orders`)
      const snapshot1 = await getDocs(ordersRef1)
      console.log('📊 Collection "orders":', snapshot1.docs.length, 'documents')
    } catch (e) {
      console.log('❌ Error accessing "orders" collection:', e)
    }

    // Test alternative collection paths that might contain recent orders
    const collectionPaths = [
      `tenants/${profile.tenantId}/posOrders`,
      `tenants/${profile.tenantId}/transactions`, 
      `tenants/${profile.tenantId}/sales`,
      `tenants/${profile.tenantId}/completedOrders`,
      `tenants/${profile.tenantId}/orders_completed`,
      `tenants/${profile.tenantId}/pos_transactions`,
      `tenants/${profile.tenantId}/daily_orders`,
      `locations/${selectedBranch.id}/orders`,
      `locations/${selectedBranch.id}/posOrders`,
      `locations/${selectedBranch.id}/transactions`,
      `branches/${selectedBranch.id}/orders`,
      `branches/${selectedBranch.id}/posOrders`,
      `branches/${selectedBranch.id}/transactions`,
      // Check with the actual locationId from existing orders
      `locations/main-location-gJPRV0nFGiULXAW9nciyGad686z2/orders`,
      `locations/main-location-gJPRV0nFGiULXAW9nciyGad686z2/posOrders`,
      `locations/main-location-gJPRV0nFGiULXAW9nciyGad686z2/transactions`,
      // Check root level collections
      `orders`,
      `posOrders`,
      `transactions`,
      `sales`,
      // Check if there's a different tenant structure
      `users/${profile.uid}/orders`,
      `users/${profile.uid}/posOrders`,
      `users/${profile.uid}/transactions`
    ]

    for (const path of collectionPaths) {
      try {
        const ref = collection(db, path)
        const snapshot = await getDocs(ref)
        console.log(`📊 Collection "${path}":`, snapshot.docs.length, 'documents')
        
        if (snapshot.docs.length > 0) {
          const sampleDoc = snapshot.docs[0].data() as any
          console.log(`📄 Sample doc from "${path}":`, {
            id: snapshot.docs[0].id,
            hasTotal: 'total' in sampleDoc,
            hasStatus: 'status' in sampleDoc,
            hasCreatedAt: 'createdAt' in sampleDoc,
            hasLocationId: 'locationId' in sampleDoc,
            sampleFields: Object.keys(sampleDoc).slice(0, 10)
          })
          
          // Check if any documents are from Aug 18-19
          const recentDocs = snapshot.docs.filter(doc => {
            const data = doc.data() as any
            const createdAt = data.createdAt?.toDate?.()
            if (createdAt instanceof Date) {
              const day = createdAt.getDate()
              const month = createdAt.getMonth() + 1
              return (day === 18 || day === 19) && month === 8
            }
            return false
          })
          
          if (recentDocs.length > 0) {
            console.log(`🎯 FOUND ${recentDocs.length} Aug 18-19 orders in "${path}"!`)
            console.log(`📅 Aug 18-19 orders:`, recentDocs.map(doc => {
              const data = doc.data() as any
              return {
                id: doc.id,
                total: data.total,
                status: data.status,
                createdAt: data.createdAt?.toDate?.(),
                locationId: data.locationId
              }
            }))
          } else if (snapshot.docs.length > 0) {
            // Show all dates available in this collection
            const allDates = snapshot.docs.map(doc => {
              const data = doc.data() as any
              const createdAt = data.createdAt?.toDate?.()
              return createdAt instanceof Date ? {
                day: createdAt.getDate(),
                month: createdAt.getMonth() + 1,
                year: createdAt.getFullYear(),
                fullDate: createdAt.toLocaleDateString()
              } : null
            }).filter(date => date !== null)
            
            console.log(`📅 Available dates in "${path}":`, allDates)
            
            // Special detailed analysis for posOrders collection
            if (path.includes('posOrders') && allDates.length > 0) {
              console.log(`🔍 DETAILED DATE ANALYSIS for "${path}":`)
              console.log(`📅 Earliest order: ${allDates[0].fullDate}`)
              console.log(`📅 Latest order: ${allDates[allDates.length - 1].fullDate}`)
              console.log(`📅 All order dates:`, allDates.map(d => d.fullDate).sort())
              console.log(`🚫 Missing Aug 18-19 orders: Orders for these dates do NOT exist in Firebase`)
              console.log(`💡 Recommendation: Check if Aug 18-19 transactions were created in a different system or lost during migration`)
            }
          }
        }
      } catch (e) {
        console.log(`❌ Error accessing "${path}":`, e)
      }
    }

    // 🎯 COMPREHENSIVE SEARCH SUMMARY - UPDATED FOR ARCHIVE SUPPORT
    console.log('🎯 COMPREHENSIVE FIREBASE SEARCH SUMMARY:')
    console.log('✅ NOW SEARCHING: Both operational posOrders AND shift archives')
    console.log('📂 Operational data: Current shift orders in tenants/posOrders')
    console.log('� Archived data: Historical orders in tenants/shift_archives/*/posOrders')
    console.log('� Data lifecycle: Orders → Archives after shift ends (via ShiftResetService)')
    console.log('💡 Result: Complete historical data access for business reports')
    console.log('🎯 Aug 18-19 data: Will now be found in shift archives if it exists')

    // Fetch all data in parallel - USING BOTH OPERATIONAL AND ARCHIVED DATA
    const [allOrders, menuItems, allExpenses, salesData, topItems, paymentAnalytics, inventoryAnalytics] = await Promise.all([
      // ENHANCED: Get orders from BOTH operational posOrders AND shift archives
      (async () => {
        console.log('🔍 FETCHING ORDERS FROM OPERATIONAL + ARCHIVED COLLECTIONS...');
        const allOrders: POSOrder[] = [];
        
        // 1. Get operational orders (current shift)
        try {
          const operationalRef = collection(db, `tenants/${profile.tenantId}/posOrders`)
          const operationalSnapshot = await getDocs(operationalRef)
          const operationalOrders = operationalSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'operational',
            ...doc.data()
          })) as (POSOrder & { source: string })[];
          
          allOrders.push(...operationalOrders);
          console.log(`� Operational orders: ${operationalOrders.length}`);
        } catch (error) {
          console.log('❌ Error fetching operational orders:', error);
        }
        
        // 2. Get archived orders (from completed shifts)
        try {
          const archivesRef = collection(db, `tenants/${profile.tenantId}/shift_archives`)
          const archivesSnapshot = await getDocs(archivesRef)
          
          console.log(`� Found ${archivesSnapshot.docs.length} shift archives`);
          
          // Check each shift archive for orders
          for (const archiveDoc of archivesSnapshot.docs) {
            const archiveId = archiveDoc.id;
            const archiveData = archiveDoc.data();
            
            try {
              const archivedOrdersRef = collection(db, `tenants/${profile.tenantId}/shift_archives/${archiveId}/posOrders`)
              const archivedSnapshot = await getDocs(archivedOrdersRef)
              const archivedOrders = archivedSnapshot.docs.map(doc => ({
                id: doc.id,
                source: `archive:${archiveId}`,
                archiveDate: archiveData.createdAt?.toDate?.(),
                ...doc.data()
              })) as (POSOrder & { source: string; archiveDate?: Date })[];
              
              if (archivedOrders.length > 0) {
                allOrders.push(...archivedOrders);
                console.log(`📦 Archive ${archiveId}: ${archivedOrders.length} orders (${archiveData.createdAt?.toDate?.()})`);
              }
            } catch (error) {
              console.log(`❌ Error fetching archive ${archiveId}:`, error instanceof Error ? error.message : String(error));
            }
          }
        } catch (error) {
          console.log('❌ Error fetching shift archives:', error);
        }
        
        console.log(`🎯 TOTAL ORDERS FOUND: ${allOrders.length} (operational + archived)`);
        
        // 3. Show detailed breakdown of all orders
        console.log(`🔍 ALL ORDERS WITH SOURCES:`, allOrders.map(order => ({
          id: order.id,
          source: (order as any).source,
          locationId: order.locationId,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt?.toDate?.(),
          dayOfMonth: order.createdAt?.toDate?.().getDate(),
          month: order.createdAt?.toDate?.().getMonth() + 1
        })));
        
        // 4. Smart filtering: Location-specific for current operations, comprehensive for business reports
        console.log(`🔍 EXPECTED locationId: "${locationId}"`);
        console.log(`🔍 ACTUAL order locationIds:`, Array.from(new Set(allOrders.map(order => order.locationId))));
        
        const matchingOrders = allOrders.filter(order => order.locationId === locationId);
        const historicalLocationIds = Array.from(new Set(allOrders.map(order => order.locationId).filter(id => id && id !== locationId)));
        
        let filteredOrders = allOrders;
        
        // For Business Reports: Include comprehensive tenant data for historical analysis
        if (historicalLocationIds.length > 0) {
          // We have historical data from different locations - include all for comprehensive reporting
          filteredOrders = allOrders;
          console.log(`📊 BUSINESS REPORTS: Including comprehensive tenant data (${allOrders.length} total orders)`);
          console.log(`🏢 Current location (${locationId}): ${matchingOrders.length} orders`);
          console.log(`📈 Historical locations (${historicalLocationIds.join(', ')}): ${allOrders.length - matchingOrders.length} orders`);
        } else if (locationId && matchingOrders.length > 0) {
          // Only current location data available
          filteredOrders = matchingOrders;
          console.log(`🔍 After locationId filter: ${filteredOrders.length} orders (current location only)`);
        } else if (locationId) {
          // Fallback: use all available data if no current location data
          filteredOrders = allOrders;
          console.log(`⚠️ NO CURRENT LOCATION DATA - Using all ${allOrders.length} tenant orders for historical analysis`);
        }
        
        console.log(`📋 FINAL: ${filteredOrders.length} orders ready for date filtering`);
        return filteredOrders as POSOrder[];
      })(),
      getPOSItems(profile.tenantId, locationId),
      // 🔥 COMPREHENSIVE EXPENSES FETCH (operational + archived like orders)
      (async () => {
        const allExpenses: any[] = [];
        
        // 1. Get operational expenses (current active expenses)
        try {
          const operationalExpenses = await getExpenses(profile.tenantId, locationId);
          allExpenses.push(...operationalExpenses);
          console.log(`💰 Operational expenses: ${operationalExpenses.length}`);
        } catch (error) {
          console.log('❌ Error fetching operational expenses:', error);
        }
        
        // 2. Get archived expenses (from completed shifts)
        try {
          const archivesRef = collection(db, `tenants/${profile.tenantId}/shift_archives`)
          const archivesSnapshot = await getDocs(archivesRef)
          
          console.log(`📁 Checking ${archivesSnapshot.docs.length} shift archives for expenses...`);
          
          // Check each shift archive for expenses
          for (const archiveDoc of archivesSnapshot.docs) {
            const archiveId = archiveDoc.id;
            const archiveData = archiveDoc.data();
            
            try {
              const archivedExpensesRef = collection(db, `tenants/${profile.tenantId}/shift_archives/${archiveId}/expenses`)
              const archivedSnapshot = await getDocs(archivedExpensesRef)
              const archivedExpenses = archivedSnapshot.docs.map(doc => ({
                id: doc.id,
                source: `archive:${archiveId}`,
                archiveDate: archiveData.createdAt?.toDate?.(),
                ...doc.data()
              }));
              
              if (archivedExpenses.length > 0) {
                allExpenses.push(...archivedExpenses);
                console.log(`💸 Archive ${archiveId}: ${archivedExpenses.length} expenses`);
              }
            } catch (error) {
              console.log(`❌ Error fetching expenses from archive ${archiveId}:`, error);
            }
          }
        } catch (error) {
          console.log('❌ Error fetching archived expenses:', error);
        }
        
        console.log(`💰 TOTAL EXPENSES FOUND: ${allExpenses.length} (operational + archived)`);
        console.log('💸 Expenses fetch completed successfully');
        return allExpenses;
      })(),
      getSalesChartData(profile.tenantId, days, locationId),
      getTopSellingItems(profile.tenantId, days, 10, locationId),
      getPaymentAnalytics(profile.tenantId, locationId, startDate, endDate),
      getInventoryAnalytics(profile.tenantId, days, locationId)
    ])

    // 🔍 DEBUG: Check what we got from Promise.all
    console.log('🎯 Promise.all results:');
    console.log('📦 Orders length:', allOrders.length);
    console.log('💸 Expenses length:', allExpenses.length);
    console.log('💸 Expenses sample:', allExpenses.slice(0, 3));

    // Filter data by date range
    console.log('🔍 Date range:', { 
      startDate, 
      endDate, 
      exportDateRange,
      startDateISO: startDate.toISOString(),
      endDateISO: endDate.toISOString(),
      startDateLocal: startDate.toLocaleDateString(),
      endDateLocal: endDate.toLocaleDateString(),
      todayDate: new Date().toLocaleDateString(),
      todayISO: new Date().toISOString()
    })
    console.log('🔍 ALL ORDERS WITH FULL DETAILS:', allOrders.map(order => ({
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt.toDate(),
      createdAtISO: order.createdAt.toDate().toISOString(),
      dateFormatted: order.createdAt.toDate().toLocaleDateString(),
      inSelectedRange: order.createdAt.toDate() >= startDate && order.createdAt.toDate() <= endDate,
      isCompleted: order.status === 'completed',
      locationId: order.locationId,
      dayOfMonth: order.createdAt.toDate().getDate(),
      month: order.createdAt.toDate().getMonth() + 1,
      year: order.createdAt.toDate().getFullYear()
    })))
    
    const filteredOrders = allOrders.filter(order => {
      if (order.status !== 'completed') {
        console.log(`❌ Order ${order.id} excluded: status is '${order.status}', not 'completed'`)
        return false
      }
      const orderDate = order.createdAt.toDate()
      const inRange = orderDate >= startDate && orderDate <= endDate
      
      // Enhanced logging for date comparison
      console.log(`🔍 Order ${order.id} date analysis:`, {
        orderDate: orderDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        orderDateLocal: orderDate.toLocaleDateString(),
        startDateLocal: startDate.toLocaleDateString(),
        endDateLocal: endDate.toLocaleDateString(),
        isAfterStart: orderDate >= startDate,
        isBeforeEnd: orderDate <= endDate,
        inRange,
        status: order.status,
        total: order.total
      })
      
      return inRange
    })
    console.log('📊 Orders filtered:', { total: allOrders.length, filtered: filteredOrders.length })
    console.log('📊 FILTERED ORDERS FOR EXPORT:', filteredOrders.map(order => ({
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt.toDate(),
      dateFormatted: order.createdAt.toDate().toLocaleDateString()
    })))

    const filteredExpenses = allExpenses.filter(expense => {
      const expenseDate = expense.date.toDate()
      return expenseDate >= startDate && expenseDate <= endDate
    })
    console.log('💸 Expenses filtered:', { total: allExpenses.length, filtered: filteredExpenses.length })

    // Calculate metrics
    const revenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Calculate COGS from order items
    let cogs = 0
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          // Find the menu item to get cost information
          const menuItem = menuItems.find(mi => mi.id === item.itemId)
          if (menuItem && menuItem.cost) {
            cogs += menuItem.cost * item.quantity
          }
        })
      }
    })

    // Generate daily summaries for week/month periods
    const generateDailySummaries = (): DailySummary[] => {
      if (exportDateRange === 'today') return []

      const summaries: DailySummary[] = []
      const { startDate, endDate } = calculateDateRange()
      
      // Create array of dates in the range
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayStart = new Date(currentDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(currentDate)  
        dayEnd.setHours(23, 59, 59, 999)
        
        // Filter orders for this specific day
        const dayOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt.toDate()
          return orderDate >= dayStart && orderDate <= dayEnd
        })
        
        // Filter expenses for this day
        const dayExpenses = filteredExpenses.filter(expense => {
          const expenseDate = expense.date.toDate()
          return expenseDate >= dayStart && expenseDate <= dayEnd
        })
        
        const dayRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0)
        const dayExpenseAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        
        // Calculate day COGS
        let dayCogs = 0
        dayOrders.forEach(order => {
          if (order.items) {
            order.items.forEach((item: any) => {
              const menuItem = menuItems.find(mi => mi.id === item.itemId)
              if (menuItem && menuItem.cost) {
                dayCogs += menuItem.cost * item.quantity
              }
            })
          }
        })
        
        summaries.push({
          date: currentDate.toLocaleDateString(),
          dateKey: currentDate.toISOString().split('T')[0], // Add unique date key
          revenue: dayRevenue,
          orders: dayOrders.length,
          expenses: dayExpenseAmount,
          cogs: dayCogs,
          profit: dayRevenue - dayCogs - dayExpenseAmount
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      return summaries
    }

    const getDateRangeLabel = () => {
      switch (exportDateRange) {
        case 'today': return 'Today'
        case 'week': return 'Last 7 Days'
        case 'month': return 'Last 30 Days'
        case 'custom': return exportCustomStartDate && exportCustomEndDate ? `${exportCustomStartDate} to ${exportCustomEndDate}` : 'Select Dates'
        default: return 'Select Range'
      }
    }

    return {
      revenue,
      orders: filteredOrders.length,
      expenses: totalExpenses,
      cogs,
      topItems: topItems || [],
      paymentMethods: paymentAnalytics || [],
      inventoryData: inventoryAnalytics,
      dateRange: getDateRangeLabel(),
      dailySummaries: generateDailySummaries(),
      period: exportDateRange
    }
  }

  // Centralized PDF generation helper
  const generatePDF = (pdfHTML: string, reportName: string) => {
    try {
      console.log(`🎯 Opening PDF window for ${reportName}...`)
      const printWindow = window.open('', '_blank')
      
      if (!printWindow) {
        console.error('❌ Pop-up blocked for PDF generation')
        alert('❌ Pop-up blocked. Please allow pop-ups for this site and try again.')
        return false
      }

      console.log('✅ PDF window opened successfully')
      printWindow.document.write(pdfHTML)
      printWindow.document.close()
      
      // Comprehensive print handling with multiple fallbacks
      let printTriggered = false
      
      // Method 1: OnLoad event
      printWindow.onload = () => {
        console.log('✅ PDF window loaded - triggering print')
        if (!printTriggered) {
          printTriggered = true
          setTimeout(() => {
            try {
              printWindow.print()
              console.log('✅ Print dialog opened via onload')
            } catch (printError) {
              console.error('❌ Print error in onload:', printError)
            }
          }, 1000)
        }
      }
      
      // Method 2: Immediate fallback
      setTimeout(() => {
        if (!printTriggered && printWindow && !printWindow.closed) {
          console.log('⚡ Triggering fallback print')
          printTriggered = true
          try {
            printWindow.print()
            console.log('✅ Print dialog opened via fallback')
          } catch (error) {
            console.error('❌ Fallback print error:', error)
            alert(`❌ Error generating ${reportName} PDF. Please try using Chrome or Safari for better PDF support.`)
          }
        }
      }, 2000)
      
      // Method 3: Final fallback with user guidance
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          console.log('📋 Final check - if print dialog didn\'t appear, showing user instructions')
          // The window is still open, print should have worked or user can manually print
        }
      }, 3000)
      
      return true
    } catch (error) {
      console.error(`❌ PDF generation error for ${reportName}:`, error)
      alert(`❌ Error generating ${reportName}. Please try again or use a different browser.`)
      return false
    }
  }

  const generateAdvancedAnalyticsPDF = async (data: ExportData) => {
    try {
      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const avgOrderValue = data.orders > 0 ? data.revenue / data.orders : 0

      console.log('🎯 Generating Analytics PDF with data:', {
        revenue: data.revenue,
        orders: data.orders,
        grossProfit,
        netProfit,
        grossMargin: grossMargin.toFixed(1) + '%'
      })

      // Generate daily breakdown section for week/month reports
      const generateDailyBreakdown = () => {
        if (!data.dailySummaries || data.dailySummaries.length === 0) return ''
        
        return `
          <div class="section">
            <h2 class="section-title">📈 Daily Performance Breakdown</h2>
            <table class="performance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Expenses</th>
                  <th>Profit</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                ${data.dailySummaries.map((day, index) => {
                  const avgOrder = day.orders > 0 ? day.revenue / day.orders : 0
                  const profitClass = day.profit >= 0 ? 'positive' : 'negative'
                  return `
                    <tr key="${day.dateKey || index}">
                      <td><strong>${day.date}</strong></td>
                      <td>₱${day.revenue.toLocaleString()}</td>
                      <td>${day.orders}</td>
                      <td>₱${day.expenses.toLocaleString()}</td>
                      <td class="${profitClass}">₱${day.profit.toLocaleString()}</td>
                      <td>₱${avgOrder.toFixed(2)}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; background: #f9fafb; padding: 15px; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; color: #374151;">📊 ${data.period === 'week' ? 'Weekly' : 'Monthly'} Insights</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Best Day:</strong> ${(() => {
                    const bestDay = data.dailySummaries.reduce((best, current) => 
                      current.revenue > best.revenue ? current : best
                    )
                    return `${bestDay.date} (₱${bestDay.revenue.toLocaleString()})`
                  })()}
                </div>
                <div>
                  <strong>Avg Daily Revenue:</strong> ₱${(data.revenue / data.dailySummaries.length).toFixed(2)}
                </div>
                <div>
                  <strong>Most Active Day:</strong> ${(() => {
                    const busiestDay = data.dailySummaries.reduce((best, current) => 
                      current.orders > best.orders ? current : best
                    )
                    return `${busiestDay.date} (${busiestDay.orders} orders)`
                  })()}
                </div>
                <div>
                  <strong>Avg Daily Orders:</strong> ${(data.orders / data.dailySummaries.length).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        `
      }

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Advanced Analytics Report - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #2563eb; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .section-title { color: #2563eb; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .section { margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Analytics</div>
              <h1>Advanced Analytics Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            ${generateDailyBreakdown()}
            
            <div class="section">
              <h2 class="section-title">📊 Business Overview</h2>
              <p><strong>Total Orders:</strong> ${data.orders.toLocaleString()}</p>
              <p><strong>Gross Revenue:</strong> ₱${data.revenue.toLocaleString()}</p>
              <p><strong>Net Profit:</strong> <span class="${netProfit >= 0 ? 'positive' : 'negative'}">₱${netProfit.toLocaleString()}</span></p>
              <p><strong>Average Order Value:</strong> ₱${avgOrderValue.toFixed(2)}</p>
              <p><strong>Gross Margin:</strong> ${grossMargin.toFixed(1)}%</p>
            </div>
            
            ${data.topItems.length > 0 ? `
            <div class="section">
              <h2 class="section-title">🏆 Top Performing Products</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product Name</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.topItems.slice(0, 10).map((item, index) => `
                    <tr>
                      <td><strong>#${index + 1}</strong></td>
                      <td>${item.name}</td>
                      <td>${item.quantity.toLocaleString()}</td>
                      <td>₱${item.revenue.toLocaleString()}</td>
                      <td>${data.revenue > 0 ? ((item.revenue / data.revenue) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="footer">
              <p><strong>CoreTrack Business Management System</strong></p>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Advanced Analytics')
    } catch (error) {
      console.error('Advanced Analytics PDF export error:', error)
      alert('❌ Error generating Advanced Analytics PDF. Please try again.')
    }
  }

  const generateFinancialPerformancePDF = async (data: ExportData) => {
    try {
      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

      // Generate daily financial breakdown for week/month reports
      const generateDailyFinancialBreakdown = () => {
        if (!data.dailySummaries || data.dailySummaries.length === 0) return ''
        
        return `
          <div class="section">
            <h2 class="section-title">📈 Daily Financial Performance</h2>
            <table class="performance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Expenses</th>
                  <th>Gross Profit</th>
                  <th>Net Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                ${data.dailySummaries.map((day, index) => {
                  const dailyGrossProfit = day.revenue - day.cogs
                  const dailyNetProfit = dailyGrossProfit - day.expenses
                  const dailyMargin = day.revenue > 0 ? (dailyNetProfit / day.revenue) * 100 : 0
                  const profitClass = dailyNetProfit >= 0 ? 'positive' : 'negative'
                  return `
                    <tr key="${day.dateKey || index}">
                      <td><strong>${day.date}</strong></td>
                      <td>₱${day.revenue.toLocaleString()}</td>
                      <td>₱${day.cogs.toLocaleString()}</td>
                      <td>₱${day.expenses.toLocaleString()}</td>
                      <td class="${dailyGrossProfit >= 0 ? 'positive' : 'negative'}">₱${dailyGrossProfit.toLocaleString()}</td>
                      <td class="${profitClass}">₱${dailyNetProfit.toLocaleString()}</td>
                      <td class="${profitClass}">${dailyMargin.toFixed(1)}%</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7;">
              <h3 style="margin: 0 0 10px 0; color: #0f172a;">💡 Financial Insights</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Most Profitable Day:</strong> ${(() => {
                    const mostProfitable = data.dailySummaries.reduce((best, current) => 
                      current.profit > best.profit ? current : best
                    )
                    return `${mostProfitable.date} (₱${mostProfitable.profit.toLocaleString()})`
                  })()}
                </div>
                <div>
                  <strong>Average Daily Margin:</strong> ${(() => {
                    const avgMargin = data.dailySummaries.reduce((sum, day) => {
                      const margin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0
                      return sum + margin
                    }, 0) / data.dailySummaries.length
                    return `${avgMargin.toFixed(1)}%`
                  })()}
                </div>
                <div>
                  <strong>Total Gross Profit:</strong> ₱${(data.revenue - data.cogs).toLocaleString()}
                </div>
                <div>
                  <strong>Break-even Revenue:</strong> ₱${(data.cogs + data.expenses).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        `
      }

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Financial Performance Report - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #059669; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .neutral { color: #374151; font-weight: bold; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .financial-line { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
              .financial-label { font-weight: 600; color: #374151; }
              .financial-value { font-weight: bold; color: #111827; }
              .subtotal { background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 16px 0; }
              .section { margin-bottom: 30px; }
              .section-title { color: #059669; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Financial</div>
              <h1>Financial Performance Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            ${generateDailyFinancialBreakdown()}
            
            <div class="section">
              <h2>💰 Profit & Loss Statement</h2>
              
              <div class="financial-line">
                <span class="financial-label">Gross Revenue:</span>
                <span class="financial-value">₱${data.revenue.toLocaleString()}</span>
              </div>
              
              <div class="financial-line">
                <span class="financial-label">Cost of Goods Sold:</span>
                <span class="financial-value">₱${data.cogs.toLocaleString()}</span>
              </div>
              
              <div class="subtotal">
                <div class="financial-line">
                  <span class="financial-label">Gross Profit:</span>
                  <span class="financial-value positive">₱${grossProfit.toLocaleString()}</span>
                </div>
                <div class="financial-line">
                  <span class="financial-label">Gross Margin:</span>
                  <span class="financial-value">${grossMargin.toFixed(1)}%</span>
                </div>
              </div>
              
              <div class="financial-line">
                <span class="financial-label">Total Expenses:</span>
                <span class="financial-value ${data.expenses > 0 ? 'negative' : 'neutral'}">₱${data.expenses.toLocaleString()}</span>
              </div>
            </div>
            
            <div class="subtotal">
              <div class="financial-line">
                <span class="financial-label">Net Profit:</span>
                <span class="financial-value ${netProfit >= 0 ? 'positive' : 'negative'}">₱${netProfit.toLocaleString()}</span>
              </div>
              <div class="financial-line">
                <span class="financial-label">Net Margin:</span>
                <span class="financial-value">${netMargin.toFixed(1)}%</span>
              </div>
            </div>
            
            <h3>📊 Financial Breakdown</h3>
            <p><strong>Revenue Breakdown:</strong></p>
            <ul>
              <li>Total Orders: ${data.orders.toLocaleString()}</li>
              <li>Average Order Value: ₱${data.orders > 0 ? (data.revenue / data.orders).toFixed(2) : '0.00'}</li>
            </ul>
            
            <p><strong>Cost Analysis:</strong></p>
            <ul>
              <li>COGS as % of Revenue: ${data.revenue > 0 ? ((data.cogs / data.revenue) * 100).toFixed(1) : '0'}%</li>
              <li>Expenses as % of Revenue: ${data.revenue > 0 ? ((data.expenses / data.revenue) * 100).toFixed(1) : '0'}%</li>
              <li>Total Costs: ₱${(data.cogs + data.expenses).toLocaleString()}</li>
            </ul>
            
            <div class="footer">
              <p><strong>CoreTrack Financial Analysis</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Note: Expenses data from selected period - ${data.expenses === 0 ? 'No expenses found for this period' : 'Including all recorded expenses'}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Financial Performance')
    } catch (error) {
      console.error('Financial Performance PDF export error:', error)
      alert('❌ Error generating Financial Performance PDF. Please try again.')
    }
  }

  const generateInventoryReportPDF = async (data: ExportData) => {
    try {
      const inventory = data.inventoryData
      if (!inventory) {
        alert('No inventory data available for the selected period')
        return
      }

      const totalItems = inventory.totalItems || 0
      const totalValue = inventory.totalValue || 0
      const lowStockItems = inventory.lowStockItems || []
      const outOfStockItems = inventory.outOfStockItems || []

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Inventory Report - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #7c3aed; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .alert-low { color: #f59e0b; background-color: #fef3c7; }
              .alert-out { color: #dc2626; background-color: #fecaca; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Inventory</div>
              <h1>Inventory Analysis Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <h2>📦 Inventory Overview</h2>
            <p><strong>Total Items:</strong> ${totalItems.toLocaleString()}</p>
            <p><strong>Total Value:</strong> ₱${totalValue.toLocaleString()}</p>
            <p><strong>Low Stock Items:</strong> ${lowStockItems.length}</p>
            <p><strong>Out of Stock Items:</strong> ${outOfStockItems.length}</p>
            
            <div class="footer">
              <p><strong>CoreTrack Inventory Management</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Inventory Report')
    } catch (error) {
      console.error('Inventory Report PDF export error:', error)
      alert('❌ Error generating Inventory Report PDF. Please try again.')
    }
  }

  const handleExport = async (reportType: string) => {
    if (!profile?.tenantId || !selectedBranch) {
      alert('Please ensure you are logged in and have selected a branch')
      return
    }

    if (exportDateRange === 'custom' && (!exportCustomStartDate || !exportCustomEndDate)) {
      alert('Please select both start and end dates for custom range')
      return
    }

    setIsExporting(true)
    try {
      const data = await fetchExportData()
      console.log('🎯 FINAL EXPORT DATA FOR PDF GENERATION:', {
        dateRange: data.dateRange,
        period: data.period,
        revenue: data.revenue,
        orders: data.orders,
        expenses: data.expenses,
        cogs: data.cogs,
        dailySummariesCount: data.dailySummaries?.length || 0,
        dailySummaries: data.dailySummaries,
        topItemsCount: data.topItems?.length || 0,
        paymentMethods: data.paymentMethods
      })
      
      if (reportType === 'analytics') {
        await generateAdvancedAnalyticsPDF(data)
      } else if (reportType === 'financial') {
        await generateFinancialPerformancePDF(data)
      } else if (reportType === 'inventory') {
        await generateInventoryReportPDF(data)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to generate export. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Data Export Center</h1>
        <p className="text-gray-600 mt-2">
          Generate and download comprehensive business reports for your analysis.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Select Date Range</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button 
            onClick={() => setExportDateRange('today')}
            className={`p-3 rounded-lg border text-center transition-colors ${
              exportDateRange === 'today' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            Today
          </button>
          <button 
            onClick={() => setExportDateRange('week')}
            className={`p-3 rounded-lg border text-center transition-colors ${
              exportDateRange === 'week' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            This Week
          </button>
          <button 
            onClick={() => setExportDateRange('month')}
            className={`p-3 rounded-lg border text-center transition-colors ${
              exportDateRange === 'month' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            This Month
          </button>
          <button 
            onClick={() => setExportDateRange('custom')}
            className={`p-3 rounded-lg border text-center transition-colors ${
              exportDateRange === 'custom' 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range Inputs */}
        {exportDateRange === 'custom' && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={exportCustomStartDate}
                onChange={(e) => setExportCustomStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={exportCustomEndDate}
                onChange={(e) => setExportCustomEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Analytics Report */}
        <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Analytics Report</h3>
            <p className="text-gray-600 text-sm">
              Sales performance, customer insights, and operational metrics
            </p>
          </div>
          <button 
            onClick={() => handleExport('analytics')}
            disabled={isExporting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Generating...' : 'Export Analytics'}
          </button>
        </div>

        {/* Financial Report */}
        <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Financial Report</h3>
            <p className="text-gray-600 text-sm">
              Revenue, expenses, profit margins, and financial summaries
            </p>
          </div>
          <button 
            onClick={() => handleExport('financial')}
            disabled={isExporting}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Generating...' : 'Export Financial'}
          </button>
        </div>

        {/* Inventory Report */}
        <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Inventory Report</h3>
            <p className="text-gray-600 text-sm">
              Stock levels, usage patterns, and inventory valuation
            </p>
          </div>
          <button 
            onClick={() => handleExport('inventory')}
            disabled={isExporting}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Generating...' : 'Export Inventory'}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900 mb-1">
              Complete Historical Data Access
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              Reports now include data from both active operations and shift archives. 
              Your shift management system automatically archives completed shift data, 
              and we search all locations for comprehensive historical reporting.
            </p>
            <div className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1 inline-block">
              📂 Operational Data + 📦 Shift Archives = Complete Business Intelligence
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
