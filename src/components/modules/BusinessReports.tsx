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

  // Apple Design System Colors
  const APPLE_COLORS = {
    BLUE: '#007AFF',      // Apple Blue
    GREEN: '#34C759',     // Apple Green  
    ORANGE: '#FF9500',    // Apple Orange
    RED: '#FF3B30',       // Apple Red
    PURPLE: '#AF52DE',    // Apple Purple
    GRAY: '#8E8E93',      // Apple Gray
    GRAY2: '#AEAEB2',     // Light Gray
    GRAY3: '#C7C7CC',     // Lighter Gray
    BLACK: '#000000',     // Pure Black
    DARK_GRAY: '#1C1C1E'  // Dark Gray
  }

  // Apple-inspired PDF helper functions
  const addReportHeader = (pdf: jsPDF, title: string, data: ReportData): number => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 40

    // Apple-style large title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(32)
    pdf.setTextColor(APPLE_COLORS.BLACK)
    pdf.text(title, 40, yPos)
    yPos += 20

    // Subtitle with business info in Apple gray
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(13)
    pdf.setTextColor(APPLE_COLORS.GRAY)
    pdf.text(`${selectedBranch?.name || 'All Branches'} • ${data.timeRange}`, 40, yPos)
    yPos += 10
    pdf.text(`Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 40, yPos)
    yPos += 30

    return yPos
  }

  const addSectionTitle = (pdf: jsPDF, title: string, yPos: number): number => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(APPLE_COLORS.BLACK)
    pdf.text(title, 40, yPos)
    return yPos + 20
  }

  const addMetricCard = (pdf: jsPDF, label: string, value: string, color: string, x: number, y: number): void => {
    // Apple-style metric card with colored accent
    pdf.setFillColor(color)
    pdf.rect(x, y - 5, 3, 60, 'F') // Colored left accent bar

    pdf.setFillColor('#F9F9F9')
    pdf.rect(x + 3, y - 5, 130, 60, 'F') // Light background

    // Metric value in large, bold text
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(24)
    pdf.setTextColor(APPLE_COLORS.BLACK)
    pdf.text(value, x + 15, y + 20)

    // Label in smaller gray text
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(13)
    pdf.setTextColor(APPLE_COLORS.GRAY)
    pdf.text(label, x + 15, y + 40)
  }

  const addDataTable = (pdf: jsPDF, headers: string[], rows: string[][], startY: number): number => {
    let yPos = startY
    const colWidth = 40
    
    // Headers with Apple blue background
    pdf.setFillColor(APPLE_COLORS.BLUE)
    pdf.rect(40, yPos - 5, headers.length * colWidth, 20, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor('#FFFFFF')
    headers.forEach((header, i) => {
      pdf.text(header, 45 + (i * colWidth), yPos + 8)
    })
    yPos += 20

    // Rows with alternating backgrounds (very subtle)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.setTextColor(APPLE_COLORS.BLACK)
    
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 1) {
        pdf.setFillColor('#FAFAFA')
        pdf.rect(40, yPos - 3, headers.length * colWidth, 16, 'F')
      }
      
      row.forEach((cell, colIndex) => {
        pdf.text(cell, 45 + (colIndex * colWidth), yPos + 8)
      })
      yPos += 16
    })

    return yPos + 10
  }

  // Apple-inspired report generators
  const generateAppleSalesReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    if (data.orders.length === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('No sales data available for the selected period.', 40, yPos)
      return
    }

    // Calculate metrics
    const totalSales = data.orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = data.orders.length
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Payment method breakdown
    const paymentMethods: Record<string, number> = {}
    data.orders.forEach(order => {
      const method = order.paymentMethod || 'Unknown'
      paymentMethods[method] = (paymentMethods[method] || 0) + (order.total || 0)
    })

    // Sales Overview Cards
    yPos = addSectionTitle(pdf, 'Sales Overview', yPos)
    
    // Row 1: Total Sales and Orders
    addMetricCard(pdf, 'Total Sales', `₱${totalSales.toLocaleString()}`, APPLE_COLORS.GREEN, 40, yPos)
    addMetricCard(pdf, 'Total Orders', totalOrders.toString(), APPLE_COLORS.BLUE, 190, yPos)
    yPos += 80

    // Row 2: Average Order Value
    addMetricCard(pdf, 'Average Order Value', `₱${averageOrderValue.toFixed(2)}`, APPLE_COLORS.ORANGE, 40, yPos)
    yPos += 80

    // Payment Methods Section
    yPos = addSectionTitle(pdf, 'Payment Methods', yPos)
    
    const paymentData = Object.entries(paymentMethods).map(([method, amount]) => [
      method,
      `₱${amount.toFixed(2)}`,
      `${((amount / totalSales) * 100).toFixed(1)}%`
    ])

    if (paymentData.length > 0) {
      yPos = addDataTable(pdf, ['Method', 'Amount', 'Percentage'], paymentData, yPos)
    }

    // Recent Orders Section
    yPos = addSectionTitle(pdf, 'Recent Orders', yPos + 20)
    
    const recentOrders = data.orders
      .slice(0, 10)
      .map(order => [
        new Date(order.timestamp?.toDate?.() || order.createdAt?.toDate?.() || Date.now()).toLocaleDateString(),
        `₱${(order.total || 0).toFixed(2)}`,
        order.paymentMethod || 'N/A',
        order.status || 'Completed'
      ])

    if (recentOrders.length > 0) {
      addDataTable(pdf, ['Date', 'Amount', 'Payment', 'Status'], recentOrders, yPos)
    }
  }

  const generateAppleProfitLossReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
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
      totalCOGS = totalRevenue * 0.33 // 33% estimated COGS
    }
    
    const grossProfit = totalRevenue - totalCOGS
    const netProfit = grossProfit - totalExpenses

    // Financial Overview Cards
    yPos = addSectionTitle(pdf, 'Financial Overview', yPos)
    
    // Row 1: Revenue and Expenses
    addMetricCard(pdf, 'Total Revenue', `₱${totalRevenue.toLocaleString()}`, APPLE_COLORS.GREEN, 40, yPos)
    addMetricCard(pdf, 'Total Expenses', `₱${totalExpenses.toLocaleString()}`, APPLE_COLORS.RED, 190, yPos)
    yPos += 80

    // Row 2: Gross and Net Profit
    addMetricCard(pdf, 'Gross Profit', `₱${grossProfit.toLocaleString()}`, APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Net Profit', `₱${netProfit.toLocaleString()}`, 
      netProfit >= 0 ? APPLE_COLORS.GREEN : APPLE_COLORS.RED, 190, yPos)
    yPos += 80

    // Margin Analysis
    yPos = addSectionTitle(pdf, 'Margin Analysis', yPos)
    
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    
    addMetricCard(pdf, 'Gross Margin', `${grossMargin}%`, APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Net Margin', `${netMargin}%`, APPLE_COLORS.ORANGE, 190, yPos)
    yPos += 80

    // Cost Breakdown
    yPos = addSectionTitle(pdf, 'Cost Breakdown', yPos)
    
    const costData = [
      ['Cost of Goods Sold', `₱${totalCOGS.toLocaleString()}`, `${totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : '0'}%`],
      ['Operating Expenses', `₱${totalExpenses.toLocaleString()}`, `${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0'}%`]
    ]
    
    yPos = addDataTable(pdf, ['Category', 'Amount', '% of Revenue'], costData, yPos)

    // Add note if COGS is estimated
    if (totalCOGS === totalRevenue * 0.33 && totalCOGS > 0) {
      yPos += 20
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('* COGS estimated at 33% of revenue. Configure menu item costs for accuracy.', 40, yPos)
    }
  }

  const generateAppleInventoryReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    if (data.inventory.length === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('No inventory data available.', 40, yPos)
      return
    }

    const totalItems = data.inventory.length
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) < (item.minimumStock || 5))
    const outOfStockItems = data.inventory.filter(item => (item.quantity || 0) === 0)
    const totalValue = data.inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0)

    // Inventory Overview Cards
    yPos = addSectionTitle(pdf, 'Inventory Overview', yPos)
    
    // Row 1: Total Items and Value
    addMetricCard(pdf, 'Total Items', totalItems.toString(), APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Total Value', `₱${totalValue.toLocaleString()}`, APPLE_COLORS.GREEN, 190, yPos)
    yPos += 80

    // Row 2: Stock Alerts
    addMetricCard(pdf, 'Low Stock', lowStockItems.length.toString(), APPLE_COLORS.ORANGE, 40, yPos)
    addMetricCard(pdf, 'Out of Stock', outOfStockItems.length.toString(), APPLE_COLORS.RED, 190, yPos)
    yPos += 80

    // Items Requiring Attention
    if (lowStockItems.length > 0) {
      yPos = addSectionTitle(pdf, 'Items Requiring Attention', yPos)
      
      const alertData = lowStockItems.slice(0, 15).map(item => [
        item.name || 'Unknown Item',
        `${item.quantity || 0}`,
        (item.quantity || 0) === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
        `₱${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`
      ])
      
      yPos = addDataTable(pdf, ['Item Name', 'Quantity', 'Status', 'Value'], alertData, yPos)
    }

    // Top Value Items
    if (data.inventory.length > 0) {
      yPos = addSectionTitle(pdf, 'Top Value Items', yPos + 20)
      
      const topItems = data.inventory
        .map(item => ({
          ...item,
          totalValue: (item.quantity || 0) * (item.price || 0)
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10)
        .map(item => [
          item.name || 'Unknown Item',
          `${item.quantity || 0}`,
          `₱${(item.price || 0).toFixed(2)}`,
          `₱${item.totalValue.toFixed(2)}`
        ])
      
      addDataTable(pdf, ['Item Name', 'Quantity', 'Unit Price', 'Total Value'], topItems, yPos)
    }
  }

  const generateAppleMenuPerformanceReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    if (data.orders.length === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('No order data available for menu performance analysis.', 40, yPos)
      return
    }

    // Analyze menu performance
    const itemSales: Record<string, { quantity: number, revenue: number }> = {}
    data.orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item.name || 'Unknown Item'
          const quantity = item.quantity || 1
          const price = item.price || 0
          
          if (!itemSales[name]) {
            itemSales[name] = { quantity: 0, revenue: 0 }
          }
          itemSales[name].quantity += quantity
          itemSales[name].revenue += quantity * price
        })
      }
    })

    const totalRevenue = Object.values(itemSales).reduce((sum, item) => sum + item.revenue, 0)
    const totalQuantity = Object.values(itemSales).reduce((sum, item) => sum + item.quantity, 0)

    // Performance Overview
    yPos = addSectionTitle(pdf, 'Menu Performance Overview', yPos)
    
    addMetricCard(pdf, 'Unique Items Sold', Object.keys(itemSales).length.toString(), APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Total Items Sold', totalQuantity.toString(), APPLE_COLORS.GREEN, 190, yPos)
    yPos += 80

    // Top Performers
    yPos = addSectionTitle(pdf, 'Top Performing Items', yPos)
    
    const topPerformers = Object.entries(itemSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => [
        name,
        data.quantity.toString(),
        `₱${data.revenue.toFixed(2)}`,
        `${((data.revenue / totalRevenue) * 100).toFixed(1)}%`
      ])
    
    if (topPerformers.length > 0) {
      addDataTable(pdf, ['Item Name', 'Qty Sold', 'Revenue', '% of Total'], topPerformers, yPos)
    }
  }

  const generateApplePaymentMethodsReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    if (data.orders.length === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('No payment data available.', 40, yPos)
      return
    }

    // Analyze payment methods
    const paymentMethods: Record<string, { count: number, amount: number }> = {}
    data.orders.forEach(order => {
      const method = order.paymentMethod || 'Unknown'
      const amount = order.total || 0
      
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, amount: 0 }
      }
      paymentMethods[method].count += 1
      paymentMethods[method].amount += amount
    })

    const totalAmount = Object.values(paymentMethods).reduce((sum, pm) => sum + pm.amount, 0)
    const totalTransactions = Object.values(paymentMethods).reduce((sum, pm) => sum + pm.count, 0)

    // Payment Overview
    yPos = addSectionTitle(pdf, 'Payment Method Analysis', yPos)
    
    addMetricCard(pdf, 'Total Transactions', totalTransactions.toString(), APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Total Amount', `₱${totalAmount.toLocaleString()}`, APPLE_COLORS.GREEN, 190, yPos)
    yPos += 80

    // Payment Method Breakdown
    yPos = addSectionTitle(pdf, 'Payment Method Breakdown', yPos)
    
    const paymentData = Object.entries(paymentMethods)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([method, data]) => [
        method,
        data.count.toString(),
        `₱${data.amount.toFixed(2)}`,
        `${((data.amount / totalAmount) * 100).toFixed(1)}%`
      ])
    
    addDataTable(pdf, ['Payment Method', 'Transactions', 'Amount', '% of Total'], paymentData, yPos)
  }

  const generateAppleExecutiveSummaryReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    // Calculate key metrics
    const totalSales = data.orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalOrders = data.orders.length
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalSales - totalExpenses
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) < (item.minimumStock || 5)).length

    // Executive Overview
    yPos = addSectionTitle(pdf, 'Executive Summary', yPos)
    
    // Row 1: Sales and Orders
    addMetricCard(pdf, 'Total Sales', `₱${totalSales.toLocaleString()}`, APPLE_COLORS.GREEN, 40, yPos)
    addMetricCard(pdf, 'Total Orders', totalOrders.toString(), APPLE_COLORS.BLUE, 190, yPos)
    yPos += 80

    // Row 2: Profit and Alerts
    addMetricCard(pdf, 'Net Profit', `₱${netProfit.toLocaleString()}`, 
      netProfit >= 0 ? APPLE_COLORS.GREEN : APPLE_COLORS.RED, 40, yPos)
    addMetricCard(pdf, 'Low Stock Alerts', lowStockItems.toString(), APPLE_COLORS.ORANGE, 190, yPos)
    yPos += 80

    // Key Insights
    yPos = addSectionTitle(pdf, 'Key Business Insights', yPos)
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(13)
    pdf.setTextColor(APPLE_COLORS.BLACK)
    
    const insights = []
    
    if (totalOrders > 0) {
      const avgOrderValue = totalSales / totalOrders
      insights.push(`• Average order value: ₱${avgOrderValue.toFixed(2)}`)
    }
    
    if (totalSales > 0) {
      const profitMargin = ((netProfit / totalSales) * 100).toFixed(1)
      insights.push(`• Profit margin: ${profitMargin}% (${netProfit >= 0 ? 'Profitable' : 'Loss-making'})`)
    }
    
    if (lowStockItems > 0) {
      insights.push(`• ${lowStockItems} items need restocking`)
    }
    
    if (data.purchaseOrders.length > 0) {
      const purchaseSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
      insights.push(`• Purchase orders: ₱${purchaseSpending.toLocaleString()}`)
    }
    
    insights.forEach(insight => {
      pdf.text(insight, 40, yPos)
      yPos += 16
    })
  }

  const generateApplePurchaseSummaryReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    if (data.purchaseOrders.length === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('No purchase order data available.', 40, yPos)
      return
    }

    const totalOrders = data.purchaseOrders.length
    const totalSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    const completedOrders = data.purchaseOrders.filter(po => 
      po.status === 'completed' || po.status === 'delivered' || po.status === 'received'
    )
    const avgOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0

    // Purchase Overview
    yPos = addSectionTitle(pdf, 'Purchase Order Summary', yPos)
    
    addMetricCard(pdf, 'Total Orders', totalOrders.toString(), APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Total Spending', `₱${totalSpending.toLocaleString()}`, APPLE_COLORS.ORANGE, 190, yPos)
    yPos += 80

    addMetricCard(pdf, 'Completed Orders', completedOrders.length.toString(), APPLE_COLORS.GREEN, 40, yPos)
    addMetricCard(pdf, 'Average Order Value', `₱${avgOrderValue.toFixed(2)}`, APPLE_COLORS.PURPLE, 190, yPos)
    yPos += 80

    // Status breakdown
    yPos = addSectionTitle(pdf, 'Order Status Breakdown', yPos)
    
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

    const statusData = Object.entries(statusSummary).map(([status, stats]) => [
      status.toUpperCase(),
      stats.count.toString(),
      `₱${stats.amount.toFixed(2)}`,
      `${totalSpending > 0 ? ((stats.amount / totalSpending) * 100).toFixed(1) : '0'}%`
    ])

    addDataTable(pdf, ['Status', 'Count', 'Amount', '% of Total'], statusData, yPos)
  }

  const generateAppleSupplierAnalysisReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    if (data.purchaseOrders.length === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(16)
      pdf.setTextColor(APPLE_COLORS.GRAY)
      pdf.text('No purchase order data available for supplier analysis.', 40, yPos)
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
    const uniqueSuppliers = Object.keys(supplierSummary).length

    // Supplier Overview
    yPos = addSectionTitle(pdf, 'Supplier Analysis', yPos)
    
    addMetricCard(pdf, 'Unique Suppliers', uniqueSuppliers.toString(), APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Total Spending', `₱${totalSpending.toLocaleString()}`, APPLE_COLORS.GREEN, 190, yPos)
    yPos += 80

    // Top Suppliers
    yPos = addSectionTitle(pdf, 'Top Suppliers by Spending', yPos)
    
    const sortedSuppliers = Object.entries(supplierSummary)
      .sort((a, b) => b[1].spending - a[1].spending)
      .slice(0, 10)
      .map(([supplier, stats]) => [
        supplier,
        stats.orders.toString(),
        `₱${stats.spending.toFixed(2)}`,
        `${totalSpending > 0 ? ((stats.spending / totalSpending) * 100).toFixed(1) : '0'}%`
      ])

    addDataTable(pdf, ['Supplier', 'Orders', 'Total Spending', '% of Total'], sortedSuppliers, yPos)
  }

  const generateAppleCostTrackingReport = async (pdf: jsPDF, data: ReportData, startY: number) => {
    let yPos = startY
    
    const totalPurchaseSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const totalCosts = totalPurchaseSpending + totalExpenses

    // Cost Overview
    yPos = addSectionTitle(pdf, 'Cost Tracking Overview', yPos)
    
    addMetricCard(pdf, 'Purchase Orders', `₱${totalPurchaseSpending.toLocaleString()}`, APPLE_COLORS.BLUE, 40, yPos)
    addMetricCard(pdf, 'Operating Expenses', `₱${totalExpenses.toLocaleString()}`, APPLE_COLORS.ORANGE, 190, yPos)
    yPos += 80

    addMetricCard(pdf, 'Total Business Costs', `₱${totalCosts.toLocaleString()}`, APPLE_COLORS.RED, 40, yPos)
    yPos += 80

    // Cost breakdown
    if (totalCosts > 0) {
      yPos = addSectionTitle(pdf, 'Cost Categories', yPos)
      
      const purchasePercentage = ((totalPurchaseSpending / totalCosts) * 100).toFixed(1)
      const expensePercentage = ((totalExpenses / totalCosts) * 100).toFixed(1)
      
      const costData = [
        ['Inventory Purchases', `₱${totalPurchaseSpending.toLocaleString()}`, `${purchasePercentage}%`],
        ['Operating Expenses', `₱${totalExpenses.toLocaleString()}`, `${expensePercentage}%`]
      ]
      
      yPos = addDataTable(pdf, ['Category', 'Amount', 'Percentage'], costData, yPos)
    }

    // Low stock alerts
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) < (item.minimumStock || 5))
    if (lowStockItems.length > 0) {
      yPos = addSectionTitle(pdf, 'Reorder Alerts', yPos + 20)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(13)
      pdf.setTextColor(APPLE_COLORS.BLACK)
      pdf.text(`${lowStockItems.length} items need restocking:`, 40, yPos)
      yPos += 20

      const reorderData = lowStockItems.slice(0, 10).map(item => [
        item.name || 'Unknown Item',
        `${item.quantity || 0}`,
        `${item.minimumStock || 5}`,
        'REORDER'
      ])

      addDataTable(pdf, ['Item Name', 'Current Stock', 'Min Stock', 'Action'], reorderData, yPos)
    }
  }

  const generateSpecificReport = async (reportType: string, data: ReportData) => {
    const pdf = new jsPDF()
    
    // Get report title
    const getReportTitle = (type: string): string => {
      const titles: Record<string, string> = {
        daily_sales: 'Sales Report',
        profit_loss: 'Profit & Loss Statement', 
        inventory_summary: 'Inventory Summary',
        menu_performance: 'Menu Performance',
        payment_methods: 'Payment Analysis',
        executive_summary: 'Executive Summary',
        purchase_summary: 'Purchase Order Summary',
        supplier_analysis: 'Supplier Analysis',
        cost_tracking: 'Cost Tracking Report'
      }
      return titles[type] || 'Business Report'
    }

    // Add Apple-style header
    const contentStartY = addReportHeader(pdf, getReportTitle(reportType), data)
    
    // Generate content based on report type
    switch (reportType) {
      case 'daily_sales':
        await generateAppleSalesReport(pdf, data, contentStartY)
        break
      case 'profit_loss':
        await generateAppleProfitLossReport(pdf, data, contentStartY)
        break
      case 'inventory_summary':
        await generateAppleInventoryReport(pdf, data, contentStartY)
        break
      case 'menu_performance':
        await generateAppleMenuPerformanceReport(pdf, data, contentStartY)
        break
      case 'payment_methods':
        await generateApplePaymentMethodsReport(pdf, data, contentStartY)
        break
      case 'executive_summary':
        await generateAppleExecutiveSummaryReport(pdf, data, contentStartY)
        break
      case 'purchase_summary':
        await generateApplePurchaseSummaryReport(pdf, data, contentStartY)
        break
      case 'supplier_analysis':
        await generateAppleSupplierAnalysisReport(pdf, data, contentStartY)
        break
      case 'cost_tracking':
        await generateAppleCostTrackingReport(pdf, data, contentStartY)
        break
    }

    // Save with Apple-style filename
    const reportName = reportOptions.find(r => r.id === reportType)?.name || 'Business Report'
    const fileName = `CoreTrack_${reportName.replace(/\s+/g, '_')}_${data.timeRange.replace(/\s+/g, '_')}.pdf`
    pdf.save(fileName)
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
