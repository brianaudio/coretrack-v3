'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import jsPDF from 'jspdf'

interface ReportData {
  orders: any[]
  inventory: any[]
  expenses: any[]
  purchaseOrders: any[]
  timeRange: string
  startDate: Date
  endDate: Date
}

export default function BusinessReports() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  const [loading, setLoading] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState('daily_sales')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showDebugMode, setShowDebugMode] = useState(false)
  const [resetDate, setResetDate] = useState('')

  // Initialize custom dates with reasonable defaults
  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(today.getDate() - 7)
    
    if (!customStartDate) {
      setCustomStartDate(weekAgo.toISOString().split('T')[0])
    }
    if (!customEndDate) {
      setCustomEndDate(today.toISOString().split('T')[0])
    }
  }, [customStartDate, customEndDate])

  // Complete Report Options - All Available Reports
  const reportOptions = [
    { id: 'executive_summary', name: 'Business Overview', desc: 'Complete business summary', icon: '�' },
    { id: 'daily_sales', name: 'Sales Report', desc: 'Revenue and orders', icon: '📊' },
    { id: 'inventory_summary', name: 'Inventory Report', desc: 'Current stock levels', icon: '📦' },
    { id: 'menu_performance', name: 'Menu Performance', desc: 'Best selling items', icon: '🍽️' },
    { id: 'payment_methods', name: 'Payment Analysis', desc: 'Payment breakdown', icon: '💳' },
    { id: 'profit_loss', name: 'Profit & Loss', desc: 'Profits and expenses', icon: '�' },
    { id: 'purchase_summary', name: 'Purchase Orders', desc: 'Supplier spending', icon: '�' }
  ]

  // Add missing reports that were accidentally removed
  reportOptions.push(
    { id: 'supplier_analysis', name: 'Supplier Analysis', desc: 'Supplier spending breakdown', icon: '🏪' },
    { id: 'cost_tracking', name: 'Cost Tracking', desc: 'Inventory cost analysis', icon: '💸' }
  )

  // Fix report names and icons
  const executiveIndex = reportOptions.findIndex(r => r.id === 'executive_summary')
  if (executiveIndex >= 0) {
    reportOptions[executiveIndex] = { id: 'executive_summary', name: 'Executive Summary', desc: 'Business overview', icon: '📋' }
  }
  
  const profitIndex = reportOptions.findIndex(r => r.id === 'profit_loss')
  if (profitIndex >= 0) {
    reportOptions[profitIndex] = { id: 'profit_loss', name: 'Profit & Loss', desc: 'Revenue vs expenses', icon: '💰' }
  }
  
  const purchaseIndex = reportOptions.findIndex(r => r.id === 'purchase_summary')
  if (purchaseIndex >= 0) {
    reportOptions[purchaseIndex] = { id: 'purchase_summary', name: 'Purchase Summary', desc: 'Purchase order analysis', icon: '🛒' }
  }

  const calculateDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dateRange) {
      case 'today':
        return {
          startDate: today,
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        }
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        return { startDate: weekStart, endDate: now }
      case 'month':
        const monthStart = new Date(today)
        monthStart.setDate(today.getDate() - 30)
        return { startDate: monthStart, endDate: now }
      case 'custom':
        return {
          startDate: customStartDate ? new Date(customStartDate) : today,
          endDate: customEndDate ? new Date(customEndDate + 'T23:59:59') : now
        }
      default:
        return { startDate: today, endDate: now }
    }
  }

  const fetchReportData = async (): Promise<ReportData> => {
    if (!selectedBranch || !profile?.tenantId) {
      throw new Error('Missing branch or tenant information. Please ensure you are properly logged in.')
    }

    const { startDate, endDate } = calculateDateRange()
    
    const timeRangeLabel = dateRange === 'custom' 
      ? `${customStartDate} to ${customEndDate}`
      : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)

    // Get branch location ID for filtering
    const branchLocationId = getBranchLocationId(selectedBranch.id)

    try {
      // Fetch Orders with comprehensive debugging
      const ordersData = await fetchOrdersData(profile.tenantId, branchLocationId, startDate, endDate)

      // Quick analysis of found orders
      if (ordersData.length > 0) {
        const totalSales = ordersData.reduce((sum, order: any) => sum + (order.total || 0), 0)
      }

      // Fetch Inventory
      const inventoryRef = collection(db, 'tenants', profile.tenantId, 'inventory')
      const inventoryQuery = query(inventoryRef, where('locationId', '==', branchLocationId))
      const inventorySnapshot = await getDocs(inventoryQuery)
      const inventoryData = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Fetch Expenses (simplified to avoid composite index)
      const expensesRef = collection(db, 'tenants', profile.tenantId, 'expenses')
      const expensesQuery = query(expensesRef, where('locationId', '==', branchLocationId))
      const expensesSnapshot = await getDocs(expensesQuery)
      const expensesData = expensesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((expense: any) => {
          const expenseDate = expense.date?.toDate() || new Date(expense.dateString || 0)
          return expenseDate >= startDate && expenseDate <= endDate
        })

      // Fetch Purchase Orders (simplified to avoid composite index)
      const poRef = collection(db, 'tenants', profile.tenantId, 'purchaseOrders')
      const poQuery = query(poRef, where('locationId', '==', branchLocationId))
      const poSnapshot = await getDocs(poQuery)
      const poData = poSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((po: any) => {
          const poDate = po.createdAt?.toDate() || new Date(po.dateString || 0)
          return poDate >= startDate && poDate <= endDate
        })

      return {
        orders: ordersData,
        inventory: inventoryData,
        expenses: expensesData,
        purchaseOrders: poData,
        timeRange: timeRangeLabel,
        startDate,
        endDate
      }
    } catch (error) {
      console.error('❌ Error fetching report data:', error)
      throw error
    }
  }

  // DEEP INVESTIGATION: Enhanced order fetching with extensive debugging
  const fetchOrdersData = async (tenantId: string, branchLocationId: string, startDate: Date, endDate: Date) => {
    try {
      const ordersRef = collection(db, 'tenants', tenantId, 'orders')
      
      // INVESTIGATION 1: Get ALL orders first to understand the data structure
      let allOrdersSnapshot = await getDocs(query(ordersRef, limit(50)))
      let allOrders = allOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      if (allOrders.length > 0) {
        // Check what branch identifiers exist
        const branchIds = Array.from(new Set((allOrders as any[]).map(o => o.branchId).filter(Boolean)))
        const branchLocationIds = Array.from(new Set((allOrders as any[]).map(o => o.branchLocationId).filter(Boolean)))
      }

      // INVESTIGATION 2: Try different branch matching strategies
      
      // Strategy 2a: Exact branchLocationId match
      let ordersData = (allOrders as any[]).filter(order => order.branchLocationId === branchLocationId)
      
      // Strategy 2b: Exact branchId match
      if (ordersData.length === 0) {
        ordersData = (allOrders as any[]).filter(order => order.branchId === selectedBranch?.id)
      }
      
      // Strategy 2c: Partial match on any branch field
      if (ordersData.length === 0) {
        const searchTerms = [selectedBranch?.id, branchLocationId, selectedBranch?.name].filter(Boolean)
        ordersData = (allOrders as any[]).filter(order => {
          return searchTerms.some(term => 
            order.branchId?.includes(term) || 
            order.branchLocationId?.includes(term) ||
            order.branch?.includes(term) ||
            order.location?.includes(term)
          )
        })
        console.log(`Strategy 2c (partial match): Found ${ordersData.length} orders`)
      }
      
      // Strategy 2d: If still no results, try without branch filtering
      if (ordersData.length === 0) {
        ordersData = allOrders as any[]
      }

      // INVESTIGATION 3: Date range analysis
      
      const dateAnalysis = (ordersData as any[]).map(order => {
        const dates = {
          createdAt: order.createdAt?.toDate?.() || null,
          orderDate: order.orderDate ? new Date(order.orderDate) : null,
          timestamp: order.timestamp?.toDate?.() || null,
          date: order.date ? new Date(order.date) : null,
          dateString: order.dateString ? new Date(order.dateString) : null
        }
        
        return {
          id: order.id,
          total: order.total,
          dates,
          validDates: Object.entries(dates)
            .filter(([key, date]) => date && !isNaN(date.getTime()))
            .map(([key, date]) => ({ field: key, date: date.toISOString() }))
        }
      })

      // INVESTIGATION 4: Apply date filtering with multiple date fields
      console.log('🔍 INVESTIGATION 4: Filtering by date range...')
      
      // Consider reset date if provided
      const effectiveStartDate = resetDate && new Date(resetDate) > startDate 
        ? new Date(resetDate) 
        : startDate
      
      if (resetDate && new Date(resetDate) > startDate) {
        console.log(`🔄 RESET DATE OVERRIDE: Using reset date ${resetDate} instead of ${startDate.toISOString()}`)
      }
      
      const dateFilteredOrders = (ordersData as any[]).filter(order => {
        // Try multiple date fields
        const possibleDates = [
          order.createdAt?.toDate?.(),
          order.orderDate ? new Date(order.orderDate) : null,
          order.timestamp?.toDate?.(),
          order.date ? new Date(order.date) : null,
          order.dateString ? new Date(order.dateString) : null
        ].filter(date => date && !isNaN(date.getTime()))
        
        if (possibleDates.length === 0) {
          console.log(`⚠️ Order ${order.id} has no valid dates`)
          return false
        }
        
        // Use the first valid date
        const orderDate = possibleDates[0]
        const inRange = orderDate >= effectiveStartDate && orderDate <= endDate
        
        if (inRange) {
          console.log(`✅ Order ${order.id} (₱${order.total}) is in range:`, {
            orderDate: orderDate.toISOString(),
            effectiveStartDate: effectiveStartDate.toISOString(),
            endDate: endDate.toISOString(),
            resetDateApplied: resetDate ? true : false
          })
        }
        
        return inRange
      })

      console.log(`📊 FINAL RESULTS: Found ${dateFilteredOrders.length} orders in date range`)
      
      if (dateFilteredOrders.length > 0) {
        const totalSales = dateFilteredOrders.reduce((sum, order) => sum + (order.total || 0), 0)
        console.log(`💰 Total Sales Found: ₱${totalSales}`)
        
        dateFilteredOrders.forEach(order => {
          console.log(`Order: ${order.id} - ₱${order.total}`)
        })
      } else {
        console.log('❌ NO ORDERS FOUND - Debugging info:')
        console.log('Available orders count:', allOrders.length)
        console.log('Orders with valid dates:', (ordersData as any[]).filter(o => {
          const dates = [o.createdAt?.toDate?.(), o.orderDate ? new Date(o.orderDate) : null]
          return dates.some(d => d && !isNaN(d.getTime()))
        }).length)
        console.log('Date range:', { 
          startDate: startDate.toISOString(), 
          effectiveStartDate: effectiveStartDate.toISOString(),
          endDate: endDate.toISOString(),
          resetDate: resetDate || 'Not set'
        })
      }

      // Sort by date
      return dateFilteredOrders.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate() || new Date(a.orderDate || a.timestamp?.toDate() || 0)
        const dateB = b.createdAt?.toDate() || new Date(b.orderDate || b.timestamp?.toDate() || 0)
        return dateB.getTime() - dateA.getTime()
      })

    } catch (error) {
      console.error('❌ Error in fetchOrdersData:', error)
      return []
    }
  }

  // Debug function to analyze all orders
  const analyzeAllOrders = async () => {
    if (!profile?.tenantId) {
      alert('Authentication error. Please refresh and try again.')
      return
    }

    try {
      setLoading(true)
      console.log('🔍 STARTING COMPREHENSIVE ORDER ANALYSIS...')
      
      const ordersRef = collection(db, 'tenants', profile.tenantId, 'orders')
      const allOrdersSnapshot = await getDocs(query(ordersRef, limit(100)))
      const allOrders = allOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      console.log(`📊 FOUND ${allOrders.length} TOTAL ORDERS`)
      console.log('='.repeat(50))
      
      // Group orders by date and calculate totals
      const ordersByDate = new Map()
      let totalAllTime = 0
      let totalPostReset = 0
      const resetDateObj = resetDate ? new Date(resetDate) : null
      
      allOrders.forEach((order: any, index) => {
        const orderDate = order.createdAt?.toDate() || 
                         (order.orderDate ? new Date(order.orderDate) : null) ||
                         (order.timestamp?.toDate()) ||
                         null
        
        const dateStr = orderDate ? orderDate.toISOString().split('T')[0] : 'No Date'
        const total = order.total || 0
        
        totalAllTime += total
        
        // Check if order is after reset date
        if (resetDateObj && orderDate && orderDate >= resetDateObj) {
          totalPostReset += total
        } else if (!resetDateObj) {
          totalPostReset += total
        }
        
        if (!ordersByDate.has(dateStr)) {
          ordersByDate.set(dateStr, { orders: [], total: 0 })
        }
        
        const dayData = ordersByDate.get(dateStr)
        dayData.orders.push({
          id: order.id,
          total: total,
          date: orderDate ? orderDate.toISOString() : 'Invalid Date',
          branchId: order.branchId,
          paymentMethod: order.paymentMethod
        })
        dayData.total += total
        
        console.log(`${index + 1}. Order ${order.id}:`, {
          total: `₱${total}`,
          date: orderDate ? orderDate.toISOString() : 'No valid date',
          branchId: order.branchId,
          isAfterReset: resetDateObj && orderDate ? orderDate >= resetDateObj : 'N/A'
        })
      })
      
      console.log('='.repeat(50))
      console.log('📊 SUMMARY ANALYSIS:')
      console.log(`💰 Total All Time: ₱${totalAllTime}`)
      if (resetDateObj) {
        console.log(`🔄 Total After Reset (${resetDate}): ₱${totalPostReset}`)
        console.log(`🗑️ Amount from before reset: ₱${totalAllTime - totalPostReset}`)
      }
      console.log(`📅 Orders found across ${ordersByDate.size} different dates`)
      
      console.log('='.repeat(50))
      console.log('📅 ORDERS BY DATE:')
      
      // Sort dates and display
      const sortedDates = Array.from(ordersByDate.entries())
        .sort((a, b) => {
          if (a[0] === 'No Date') return 1
          if (b[0] === 'No Date') return -1
          return new Date(b[0]).getTime() - new Date(a[0]).getTime()
        })
      
      sortedDates.forEach(([date, data]) => {
        const isBeforeReset = resetDateObj && date !== 'No Date' && new Date(date) < resetDateObj
        console.log(`${date}: ₱${data.total} (${data.orders.length} orders)${isBeforeReset ? ' [BEFORE RESET]' : ''}`)
        data.orders.forEach((order: any) => {
          console.log(`  - ${order.id}: ₱${order.total}`)
        })
      })
      
      // Alert summary
      const message = resetDateObj 
        ? `Analysis Complete!\n\nTotal All Time: ₱${totalAllTime}\nAfter Reset (${resetDate}): ₱${totalPostReset}\nBefore Reset: ₱${totalAllTime - totalPostReset}\n\nCheck console for detailed breakdown.`
        : `Analysis Complete!\n\nTotal Found: ₱${totalAllTime} from ${allOrders.length} orders\nAcross ${ordersByDate.size} different dates\n\nCheck console for detailed breakdown.`
      
      alert(message)
      
    } catch (error) {
      console.error('❌ Error analyzing orders:', error)
      alert('Failed to analyze orders. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    try {
      setLoading(true)
      console.log('📄 Starting PDF generation...', { selectedReportType, dateRange })

      // Validate inputs before fetching data
      if (!selectedBranch) {
        alert('Please select a branch before generating the report.')
        return
      }

      if (!profile?.tenantId) {
        alert('Authentication error. Please refresh and try again.')
        return
      }

      if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
        alert('Please select both start and end dates for custom date range.')
        return
      }

      // Fetch the data
      console.log('📊 Fetching report data...')
      const data = await fetchReportData()
      
      // Validate that we have data
      if (!data.orders.length && !data.inventory.length && !data.expenses.length && !data.purchaseOrders.length) {
        const message = `No data found for the selected period (${data.timeRange}). Please try a different date range or check if you have any transactions recorded.`
        console.warn('⚠️ No data available for report:', { data })
        alert(message)
        return
      }

      console.log('✅ Data fetched successfully:', {
        orders: data.orders.length,
        inventory: data.inventory.length,
        expenses: data.expenses.length,
        purchaseOrders: data.purchaseOrders.length
      })

      // Generate the PDF
      await generateSpecificReport(selectedReportType, data)
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error)
      alert('Failed to generate report. Please try again or contact support.')
    } finally {
      setLoading(false)
    }
  }

  const generateSpecificReport = async (reportType: string, data: ReportData) => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width
    let yPos = 20

    // Header
    doc.setFontSize(20)
    doc.text('Reports Centre', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text(`Branch: ${selectedBranch?.name || 'All Branches'}`, 20, yPos)
    yPos += 8
    doc.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Add a line
    doc.line(20, yPos, pageWidth - 20, yPos)
    yPos += 10

    switch (reportType) {
      case 'daily_sales':
        await generateSalesReport(doc, data, yPos)
        break
      case 'profit_loss':
        await generateProfitLossReport(doc, data, yPos)
        break
      case 'inventory_summary':
        await generateInventoryReport(doc, data, yPos)
        break
      case 'menu_performance':
        await generateMenuPerformanceReport(doc, data, yPos)
        break
      case 'payment_methods':
        await generatePaymentMethodsReport(doc, data, yPos)
        break
      case 'executive_summary':
        await generateExecutiveSummaryReport(doc, data, yPos)
        break
      case 'purchase_summary':
        await generatePurchaseSummaryReport(doc, data, yPos)
        break
      case 'supplier_analysis':
        await generateSupplierAnalysisReport(doc, data, yPos)
        break
      case 'cost_tracking':
        await generateCostTrackingReport(doc, data, yPos)
        break
    }

    // Save the PDF
    const reportName = reportOptions.find(r => r.id === reportType)?.name || 'Business Report'
    const fileName = `${reportName.replace(/\s+/g, '_')}_${data.timeRange.replace(/\s+/g, '_')}.pdf`
    doc.save(fileName)
  }

  // Report generators
  const generateSalesReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Sales Report', 20, yPos)
    yPos += 15

    if (data.orders.length === 0) {
      doc.setFontSize(12)
      doc.text('No sales data available for the selected period.', 20, yPos)
      return
    }

    // Sales Summary
    const totalSales = data.orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = data.orders.length
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    doc.setFontSize(14)
    doc.text('Sales Summary:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text(`Total Sales: ₱${totalSales.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Total Orders: ${totalOrders}`, 30, yPos)
    yPos += 8
    doc.text(`Average Order Value: ₱${averageOrderValue.toFixed(2)}`, 30, yPos)
    yPos += 15

    // Daily breakdown if we have multiple days
    doc.setFontSize(14)
    doc.text('Daily Breakdown:', 20, yPos)
    yPos += 10

    const dailySales = new Map()
    data.orders.forEach(order => {
      const date = order.createdAt?.toDate()?.toDateString() || new Date(order.orderDate || 0).toDateString()
      const current = dailySales.get(date) || { sales: 0, orders: 0 }
      dailySales.set(date, {
        sales: current.sales + (order.total || 0),
        orders: current.orders + 1
      })
    })

    doc.setFontSize(12)
    dailySales.forEach((summary, date) => {
      if (yPos > 250) { // New page if needed
        doc.addPage()
        yPos = 20
      }
      doc.text(`${date}: ₱${summary.sales.toFixed(2)} (${summary.orders} orders)`, 30, yPos)
      yPos += 8
    })
  }

  const generateProfitLossReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Profit & Loss Report', 20, yPos)
    yPos += 15

    const totalRevenue = data.orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    
    // Calculate Cost of Goods Sold (COGS) from order items
    let totalCOGS = 0
    data.orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const quantity = item.quantity || 1
          const costPrice = item.costPrice || item.cost || 0
          totalCOGS += quantity * costPrice
        })
      }
    })
    
    // If no COGS data available, estimate based on typical food service margins
    if (totalCOGS === 0 && totalRevenue > 0) {
      // Estimate COGS as 30-35% of revenue (typical for food service)
      totalCOGS = totalRevenue * 0.33 // 33% estimated COGS
      console.log(`⚠️ No COGS data found. Estimating COGS at 33% of revenue: ₱${totalCOGS}`)
    }
    
    const grossProfit = totalRevenue - totalCOGS
    const netProfit = grossProfit - totalExpenses

    doc.setFontSize(14)
    doc.text('Financial Summary:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text(`Total Revenue: ₱${totalRevenue.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Cost of Goods Sold (COGS): ₱${totalCOGS.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Gross Profit: ₱${grossProfit.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Operating Expenses: ₱${totalExpenses.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Net Profit: ₱${netProfit.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Gross Margin: ${totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0.00'}%`, 30, yPos)
    yPos += 8
    doc.text(`Net Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00'}%`, 30, yPos)
    yPos += 15

    // COGS breakdown if available
    if (totalCOGS > 0) {
      doc.setFontSize(14)
      doc.text('Cost Analysis:', 20, yPos)
      yPos += 10

      doc.setFontSize(12)
      if (totalCOGS === totalRevenue * 0.33) {
        doc.text('* COGS estimated at 33% of revenue (no cost data available)', 30, yPos)
        yPos += 8
        doc.text('  Configure menu item costs for accurate profit calculation', 30, yPos)
        yPos += 15
      } else {
        doc.text('COGS calculated from menu item costs', 30, yPos)
        yPos += 15
      }
    }

    // Expense breakdown
    if (data.expenses.length > 0) {
      doc.setFontSize(14)
      doc.text('Expense Categories:', 20, yPos)
      yPos += 10

      const expenseCategories = new Map()
      data.expenses.forEach(expense => {
        const category = expense.category || 'Other'
        const current = expenseCategories.get(category) || 0
        expenseCategories.set(category, current + (expense.amount || 0))
      })

      doc.setFontSize(12)
      expenseCategories.forEach((amount, category) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`${category}: ₱${amount.toFixed(2)}`, 30, yPos)
        yPos += 8
      })
    }
  }

  const generateInventoryReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Inventory Report', 20, yPos)
    yPos += 15

    if (data.inventory.length === 0) {
      doc.setFontSize(12)
      doc.text('No inventory data available.', 20, yPos)
      return
    }

    doc.setFontSize(14)
    doc.text('Current Stock Levels:', 20, yPos)
    yPos += 10

    const totalItems = data.inventory.length
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) < (item.minimumStock || 5))
    const outOfStockItems = data.inventory.filter(item => (item.quantity || 0) === 0)

    doc.setFontSize(12)
    doc.text(`Total Items: ${totalItems}`, 30, yPos)
    yPos += 8
    doc.text(`Low Stock Items: ${lowStockItems.length}`, 30, yPos)
    yPos += 8
    doc.text(`Out of Stock: ${outOfStockItems.length}`, 30, yPos)
    yPos += 15

    // Low stock items detail
    if (lowStockItems.length > 0) {
      doc.setFontSize(14)
      doc.text('Items Requiring Attention:', 20, yPos)
      yPos += 10

      doc.setFontSize(12)
      lowStockItems.forEach(item => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        const status = (item.quantity || 0) === 0 ? 'OUT OF STOCK' : 'LOW STOCK'
        doc.text(`${item.name}: ${item.quantity || 0} units (${status})`, 30, yPos)
        yPos += 8
      })
    }
  }

  const generateMenuPerformanceReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Menu Performance Report', 20, yPos)
    yPos += 15

    if (data.orders.length === 0) {
      doc.setFontSize(12)
      doc.text('No order data available for menu analysis.', 20, yPos)
      return
    }

    // Analyze menu items from orders
    const itemSales = new Map()
    data.orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemName = item.name || 'Unknown Item'
          const quantity = item.quantity || 1
          const price = item.price || 0
          const current = itemSales.get(itemName) || { quantity: 0, revenue: 0 }
          itemSales.set(itemName, {
            quantity: current.quantity + quantity,
            revenue: current.revenue + (quantity * price)
          })
        })
      }
    })

    if (itemSales.size === 0) {
      doc.setFontSize(12)
      doc.text('No detailed item data available in orders.', 20, yPos)
      return
    }

    // Sort by quantity sold
    const sortedItems = Array.from(itemSales.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10) // Top 10 items

    doc.setFontSize(14)
    doc.text('Top Selling Items:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    sortedItems.forEach(([itemName, stats], index) => {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      doc.text(`${index + 1}. ${itemName}: ${stats.quantity} sold, ₱${stats.revenue.toFixed(2)}`, 30, yPos)
      yPos += 8
    })
  }

  const generatePaymentMethodsReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Payment Methods Analysis', 20, yPos)
    yPos += 15

    if (data.orders.length === 0) {
      doc.setFontSize(12)
      doc.text('No payment data available.', 20, yPos)
      return
    }

    const paymentMethods = new Map()
    data.orders.forEach(order => {
      const method = order.paymentMethod || 'Cash'
      const amount = order.total || 0
      const current = paymentMethods.get(method) || { count: 0, amount: 0 }
      paymentMethods.set(method, {
        count: current.count + 1,
        amount: current.amount + amount
      })
    })

    const totalAmount = data.orders.reduce((sum, order) => sum + (order.total || 0), 0)

    doc.setFontSize(14)
    doc.text('Payment Method Breakdown:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    paymentMethods.forEach((stats, method) => {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      const percentage = totalAmount > 0 ? ((stats.amount / totalAmount) * 100).toFixed(1) : '0.0'
      doc.text(`${method}: ₱${stats.amount.toFixed(2)} (${stats.count} transactions, ${percentage}%)`, 30, yPos)
      yPos += 8
    })
  }

  const generateExecutiveSummaryReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Executive Summary', 20, yPos)
    yPos += 15

    // Calculate proper profit metrics
    const totalRevenue = data.orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const totalPurchaseSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    
    // Calculate COGS
    let totalCOGS = 0
    data.orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const quantity = item.quantity || 1
          const costPrice = item.costPrice || item.cost || 0
          totalCOGS += quantity * costPrice
        })
      }
    })
    
    // Estimate COGS if no data available
    if (totalCOGS === 0 && totalRevenue > 0) {
      totalCOGS = totalRevenue * 0.33 // 33% estimated COGS
    }
    
    const grossProfit = totalRevenue - totalCOGS
    const netProfit = grossProfit - totalExpenses
    const totalBusinessCosts = totalExpenses + totalPurchaseSpending
    const totalOrders = data.orders.length

    doc.setFontSize(14)
    doc.text('Key Performance Indicators:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text(`Total Revenue: ₱${totalRevenue.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Cost of Goods Sold: ₱${totalCOGS.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Gross Profit: ₱${grossProfit.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Operating Expenses: ₱${totalExpenses.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Purchase Orders: ₱${totalPurchaseSpending.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Net Profit: ₱${netProfit.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Total Orders: ${totalOrders}`, 30, yPos)
    yPos += 8
    doc.text(`Purchase Orders: ${data.purchaseOrders.length}`, 30, yPos)
    yPos += 8
    doc.text(`Average Order Value: ₱${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}`, 30, yPos)
    yPos += 15

    // Business insights
    doc.setFontSize(14)
    doc.text('Business Insights:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    
    doc.text(`• Gross Profit Margin: ${grossMargin}%`, 30, yPos)
    yPos += 8
    doc.text(`• Net Profit Margin: ${netMargin}%`, 30, yPos)
    yPos += 8

    const lowStockCount = data.inventory.filter(item => (item.quantity || 0) < (item.minimumStock || 5)).length
    if (lowStockCount > 0) {
      doc.text(`• ${lowStockCount} items need restocking`, 30, yPos)
      yPos += 8
    }

    const cogsRatio = totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : '0.0'
    doc.text(`• Cost of Goods Sold ratio: ${cogsRatio}%`, 30, yPos)
    yPos += 8
    
    if (totalCOGS === totalRevenue * 0.33) {
      doc.text(`• Note: COGS estimated (configure menu costs for accuracy)`, 30, yPos)
      yPos += 8
    }
  }

  const generatePurchaseSummaryReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Purchase Order Summary', 20, yPos)
    yPos += 15

    if (data.purchaseOrders.length === 0) {
      doc.setFontSize(12)
      doc.text('No purchase order data available for the selected period.', 20, yPos)
      return
    }

    const totalOrders = data.purchaseOrders.length
    const totalSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    const completedOrders = data.purchaseOrders.filter(po => 
      po.status === 'completed' || po.status === 'delivered' || po.status === 'received'
    )
    const pendingOrders = data.purchaseOrders.filter(po => 
      po.status === 'pending' || po.status === 'ordered' || po.status === 'draft'
    )
    const averageOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0

    doc.setFontSize(14)
    doc.text('Purchase Overview:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text(`Total Purchase Orders: ${totalOrders}`, 30, yPos)
    yPos += 8
    doc.text(`Total Spending: ₱${totalSpending.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Completed Orders: ${completedOrders.length}`, 30, yPos)
    yPos += 8
    doc.text(`Pending Orders: ${pendingOrders.length}`, 30, yPos)
    yPos += 8
    doc.text(`Average Order Value: ₱${averageOrderValue.toFixed(2)}`, 30, yPos)
    yPos += 15

    // Status breakdown
    if (totalOrders > 0) {
      doc.setFontSize(14)
      doc.text('Status Breakdown:', 20, yPos)
      yPos += 10

      const statusSummary: Record<string, { count: number, amount: number }> = {}
      data.purchaseOrders.forEach(po => {
        const status = po.status || 'unknown'
        const amount = po.totalAmount || po.total || 0
        if (!statusSummary[status]) {
          statusSummary[status] = { count: 0, amount: 0 }
        }
        statusSummary[status].count += 1
        statusSummary[status].amount += amount
      })

      doc.setFontSize(12)
      Object.entries(statusSummary).forEach(([status, stats]) => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        const percentage = totalSpending > 0 ? ((stats.amount / totalSpending) * 100).toFixed(1) : '0.0'
        doc.text(`${status.toUpperCase()}: ${stats.count} orders - ₱${stats.amount.toFixed(2)} (${percentage}%)`, 30, yPos)
        yPos += 8
      })
    }
  }

  const generateSupplierAnalysisReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Supplier Analysis', 20, yPos)
    yPos += 15

    if (data.purchaseOrders.length === 0) {
      doc.setFontSize(12)
      doc.text('No purchase order data available for supplier analysis.', 20, yPos)
      return
    }

    // Analyze suppliers
    const supplierSummary: Record<string, { orders: number, spending: number }> = {}
    data.purchaseOrders.forEach(po => {
      const supplier = po.supplierName || po.supplier?.name || 'Unknown Supplier'
      const amount = po.totalAmount || po.total || 0
      
      if (!supplierSummary[supplier]) {
        supplierSummary[supplier] = { orders: 0, spending: 0 }
      }
      supplierSummary[supplier].orders += 1
      supplierSummary[supplier].spending += amount
    })

    const totalSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    const sortedSuppliers = Object.entries(supplierSummary)
      .sort((a, b) => b[1].spending - a[1].spending)
      .slice(0, 10) // Top 10 suppliers

    doc.setFontSize(14)
    doc.text('Top Suppliers by Spending:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    sortedSuppliers.forEach(([supplier, stats], index) => {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      const percentage = totalSpending > 0 ? ((stats.spending / totalSpending) * 100).toFixed(1) : '0.0'
      const avgOrder = stats.orders > 0 ? (stats.spending / stats.orders).toFixed(2) : '0.00'
      doc.text(`${index + 1}. ${supplier}`, 30, yPos)
      yPos += 6
      doc.text(`   ${stats.orders} orders - ₱${stats.spending.toFixed(2)} (${percentage}%) - Avg: ₱${avgOrder}`, 35, yPos)
      yPos += 10
    })
  }

  const generateCostTrackingReport = async (doc: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    doc.setFontSize(16)
    doc.text('Cost Tracking Report', 20, yPos)
    yPos += 15

    const totalPurchaseSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const totalCosts = totalPurchaseSpending + totalExpenses

    doc.setFontSize(14)
    doc.text('Cost Summary:', 20, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text(`Purchase Orders: ₱${totalPurchaseSpending.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Operating Expenses: ₱${totalExpenses.toFixed(2)}`, 30, yPos)
    yPos += 8
    doc.text(`Total Business Costs: ₱${totalCosts.toFixed(2)}`, 30, yPos)
    yPos += 15

    // Cost breakdown by category
    if (totalCosts > 0) {
      doc.setFontSize(14)
      doc.text('Cost Categories:', 20, yPos)
      yPos += 10

      doc.setFontSize(12)
      const purchasePercentage = ((totalPurchaseSpending / totalCosts) * 100).toFixed(1)
      const expensePercentage = ((totalExpenses / totalCosts) * 100).toFixed(1)
      
      doc.text(`Inventory Purchases: ${purchasePercentage}%`, 30, yPos)
      yPos += 8
      doc.text(`Operating Expenses: ${expensePercentage}%`, 30, yPos)
      yPos += 15
    }

    // Low stock alerts from inventory
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) < (item.minimumStock || 5))
    if (lowStockItems.length > 0) {
      doc.setFontSize(14)
      doc.text('Reorder Alerts:', 20, yPos)
      yPos += 10

      doc.setFontSize(12)
      doc.text(`${lowStockItems.length} items need restocking:`, 30, yPos)
      yPos += 8

      lowStockItems.slice(0, 10).forEach(item => {
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }
        doc.text(`• ${item.name}: ${item.quantity || 0} units remaining`, 35, yPos)
        yPos += 6
      })
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header - Simplified */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Reports Centre</h1>
          <p className="text-surface-600">Generate business reports and insights</p>
        </div>

        {/* Controls - Simplified */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Period */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Time Period</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range - Only show when needed */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>
              </>
            )}

            {/* Generate Button */}
            <div className={`flex items-end ${dateRange === 'custom' ? '' : 'lg:col-start-3'}`}>
              <button
                onClick={generatePDF}
                disabled={loading}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all font-medium"
              >
                {loading ? 'Generating...' : '📄 Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Report Options - Clean Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportOptions.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReportType(report.id)}
              className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer hover:shadow-md p-6 ${
                selectedReportType === report.id
                  ? 'border-primary-500 shadow-lg shadow-primary-500/10 bg-primary-50'
                  : 'border-surface-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">{report.icon}</div>
                {selectedReportType === report.id && (
                  <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-surface-900 mb-2">{report.name}</h3>
              <p className="text-surface-600">{report.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
