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

  // Report Categories - Simplified
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: '💰',
      reports: [
        { id: 'daily_sales', name: 'Daily Sales Summary', desc: 'Complete sales breakdown with payment methods' },
        { id: 'profit_loss', name: 'Profit & Loss Statement', desc: 'Revenue vs expenses analysis' },
        { id: 'payment_methods', name: 'Payment Methods Analysis', desc: 'Breakdown by cash, cards, digital payments' }
      ]
    },
    {
      title: 'Operational Reports',
      icon: '📊',
      reports: [
        { id: 'inventory_summary', name: 'Inventory Summary', desc: 'Current stock levels and valuations' },
        { id: 'menu_performance', name: 'Menu Performance', desc: 'Best/worst performing menu items' },
        { id: 'executive_summary', name: 'Executive Summary', desc: 'High-level business overview' }
      ]
    },
    {
      title: 'Purchase Order Reports',
      icon: '📦',
      reports: [
        { id: 'purchase_summary', name: 'Purchase Order Summary', desc: 'Total spending and order analysis' },
        { id: 'supplier_analysis', name: 'Supplier Analysis', desc: 'Spending breakdown by suppliers' },
        { id: 'cost_tracking', name: 'Cost Tracking Report', desc: 'Track inventory costs and price changes' }
      ]
    }
  ]

  const calculateDateRange = () => {
    const endDate = new Date()
    const startDate = new Date()
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        startDate.setDate(startDate.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          const customStart = new Date(customStartDate)
          const customEnd = new Date(customEndDate)
          
          // Validate custom dates
          if (customStart > customEnd) {
            throw new Error('Start date must be before end date')
          }
          
          // Set proper time boundaries
          customStart.setHours(0, 0, 0, 0)
          customEnd.setHours(23, 59, 59, 999)
          
          startDate.setTime(customStart.getTime())
          endDate.setTime(customEnd.getTime())
        } else {
          throw new Error('Please select both start and end dates for custom range')
        }
        break
    }

    return { startDate, endDate }
  }

  const fetchReportData = async (): Promise<ReportData> => {
    if (!selectedBranch || !profile?.tenantId) {
      throw new Error('Missing branch or tenant information. Please ensure you are properly logged in.')
    }

    const { startDate, endDate } = calculateDateRange()
    
    console.log('📊 BusinessReports - Fetching data for range:', {
      dateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      customStartDate,
      customEndDate,
      tenantId: profile.tenantId,
      branchId: selectedBranch.id
    })

    const timeRangeLabel = dateRange === 'custom' 
      ? `${customStartDate} to ${customEndDate}`
      : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)

    // Try multiple approaches for fetching orders
    let orders: any[] = []
    let queryMethod = 'unknown'
    
    // Method 1: Location-based approach (matching analytics structure)
    try {
      const mainLocationId = 'main-location-gJPRV0nFGiULXAW9nciyGad686z2'
      const ordersRef = collection(db, `tenants/${profile.tenantId}/locations/location_${mainLocationId}/posOrders`)
      const ordersQuery = query(
        ordersRef,
        where('completedAt', '>=', Timestamp.fromDate(startDate)),
        where('completedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('completedAt', 'desc')
      )
      const snapshot = await getDocs(ordersQuery)
      if (snapshot.size > 0) {
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        queryMethod = 'location-based'
        console.log('✅ Location-based query succeeded:', orders.length, 'orders')
      }
    } catch (error) {
      console.log('❌ Location-based query failed:', error)
    }

    // Method 2: Direct posOrders collection
    if (orders.length === 0) {
      try {
        const locationId = getBranchLocationId(selectedBranch.id)
        const ordersRef = collection(db, `tenants/${profile.tenantId}/posOrders`)
        const ordersQuery = query(
          ordersRef,
          where('locationId', '==', locationId),
          where('completedAt', '>=', Timestamp.fromDate(startDate)),
          where('completedAt', '<=', Timestamp.fromDate(endDate)),
          orderBy('completedAt', 'desc')
        )
        const snapshot = await getDocs(ordersQuery)
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        queryMethod = 'direct-posOrders'
        console.log('✅ Direct posOrders query:', orders.length, 'orders')
      } catch (error) {
        console.log('❌ Direct posOrders query failed:', error)
      }
    }

    // Method 3: Fallback with createdAt field
    if (orders.length === 0) {
      try {
        const locationId = getBranchLocationId(selectedBranch.id)
        const ordersRef = collection(db, `tenants/${profile.tenantId}/posOrders`)
        const ordersQuery = query(
          ordersRef,
          where('locationId', '==', locationId),
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate)),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(ordersQuery)
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        queryMethod = 'createdAt-fallback'
        console.log('✅ CreatedAt fallback query:', orders.length, 'orders')
      } catch (error) {
        console.log('❌ CreatedAt fallback query failed:', error)
      }
    }

    // Fetch inventory (current state only)
    let inventory: any[] = []
    try {
      const inventoryRef = collection(db, `tenants/${profile.tenantId}/inventory`)
      const inventorySnapshot = await getDocs(inventoryRef)
      inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.log('❌ Inventory fetch failed:', error)
    }

    // Fetch expenses for the period
    let expenses: any[] = []
    try {
      const expensesRef = collection(db, `tenants/${profile.tenantId}/expenses`)
      const expensesQuery = query(
        expensesRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      )
      const expensesSnapshot = await getDocs(expensesQuery)
      expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.log('❌ Expenses fetch failed:', error)
    }

    // Fetch purchase orders for the period
    let purchaseOrders: any[] = []
    try {
      const purchaseOrdersRef = collection(db, `tenants/${profile.tenantId}/purchaseOrders`)
      const purchaseOrdersQuery = query(
        purchaseOrdersRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      )
      const purchaseOrdersSnapshot = await getDocs(purchaseOrdersQuery)
      purchaseOrders = purchaseOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.log('❌ Purchase Orders fetch failed:', error)
    }

    console.log('📊 Final data summary:', {
      queryMethod,
      ordersFound: orders.length,
      inventoryItems: inventory.length,
      expensesFound: expenses.length,
      purchaseOrdersFound: purchaseOrders.length,
      dateRange: timeRangeLabel
    })

    return {
      orders,
      inventory,
      expenses,
      purchaseOrders,
      timeRange: timeRangeLabel,
      startDate,
      endDate
    }
  }

  const generatePDF = async (reportType: string) => {
    setLoading(true)
    try {
      const data = await fetchReportData()
      
      // Validate data
      if (data.orders.length === 0 && reportType.includes('sales')) {
        alert(`No sales data found for the selected period (${data.timeRange}).\n\nTips:\n• Try a different date range\n• Check if you have recorded sales for this period\n• Verify your branch selection`)
        return
      }
      
      console.log('📊 Generating PDF report:', {
        type: reportType,
        period: data.timeRange,
        orders: data.orders.length,
        inventory: data.inventory.length,
        expenses: data.expenses.length
      })

      const pdf = new jsPDF()

      switch (reportType) {
        case 'daily_sales':
          generateDailySalesReport(pdf, data)
          break
        case 'profit_loss':
          generateProfitLossReport(pdf, data)
          break
        case 'payment_methods':
          generatePaymentMethodsReport(pdf, data)
          break
        case 'inventory_summary':
          generateInventoryReport(pdf, data)
          break
        case 'menu_performance':
          generateMenuPerformanceReport(pdf, data)
          break
        case 'executive_summary':
          generateExecutiveSummaryReport(pdf, data)
          break
        case 'purchase_summary':
          generatePurchaseSummaryReport(pdf, data)
          break
        case 'supplier_analysis':
          generateSupplierAnalysisReport(pdf, data)
          break
        case 'cost_tracking':
          generateCostTrackingReport(pdf, data)
          break
        default:
          generateGenericReport(pdf, data, reportType)
      }

      const filename = `coretrack-${reportType}-${data.timeRange.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      
      console.log('✅ PDF generated successfully:', filename)

    } catch (error) {
      console.error('❌ Error generating report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to generate report: ${errorMessage}\n\nPlease check:\n• Your internet connection\n• Selected date range\n• Branch selection\n• That you have data for this period`)
    } finally {
      setLoading(false)
    }
  }

  // Report Generators - Simplified and Clean
  const generateDailySalesReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Daily Sales Summary Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Filter for valid orders
    const validOrders = data.orders.filter(order => {
      const status = order.status
      const total = order.total || 0
      return (status === 'completed' || status === 'Completed' || total > 0)
    })

    const totalRevenue = validOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalTransactions = validOrders.length
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Sales Overview
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Sales Overview', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const salesData = [
      ['Total Revenue:', `₱${totalRevenue.toLocaleString()}`],
      ['Total Transactions:', `${totalTransactions}`],
      ['Average Order Value:', `₱${averageOrderValue.toFixed(2)}`],
      ['Data Quality:', validOrders.length > 0 ? 'Good' : 'No valid orders found'],
      ['Orders Found:', `${data.orders.length} total, ${validOrders.length} valid`]
    ]

    salesData.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Payment Methods Breakdown
    if (validOrders.length > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Payment Methods Breakdown', 20, yPos)
      yPos += 12

      const paymentSummary = { cash: 0, card: 0, gcash: 0, maya: 0, other: 0 }
      
      validOrders.forEach(order => {
        const method = (order.paymentMethod || 'cash').toLowerCase()
        const amount = order.total || 0
        
        if (method.includes('cash')) paymentSummary.cash += amount
        else if (method.includes('card')) paymentSummary.card += amount
        else if (method.includes('gcash')) paymentSummary.gcash += amount
        else if (method.includes('maya') || method.includes('paymaya')) paymentSummary.maya += amount
        else paymentSummary.other += amount
      })

      Object.entries(paymentSummary).forEach(([method, amount]) => {
        if (amount > 0) {
          const percentage = ((amount / totalRevenue) * 100).toFixed(1)
          pdf.text(`${method.toUpperCase()}:`, 20, yPos)
          pdf.text(`₱${amount.toLocaleString()} (${percentage}%)`, 80, yPos)
          yPos += 7
        }
      })
    }

    // Footer
    const footerY = pdf.internal.pageSize.height - 20
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Generated by CoreTrack Business Management System', pageWidth / 2, footerY, { align: 'center' })
  }

  const generateProfitLossReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Profit & Loss Statement', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 15

    const validOrders = data.orders.filter(order => order.status === 'completed' || order.total > 0)
    const totalRevenue = validOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // P&L Statement
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Financial Summary', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    const financialData = [
      ['REVENUE', ''],
      ['Total Sales:', `₱${totalRevenue.toLocaleString()}`],
      ['', ''],
      ['EXPENSES', ''],
      ['Total Expenses:', `₱${totalExpenses.toLocaleString()}`],
      ['', ''],
      ['PROFIT/LOSS', ''],
      ['Net Profit:', `₱${netProfit.toLocaleString()}`],
      ['Profit Margin:', `${profitMargin.toFixed(1)}%`],
      ['Status:', netProfit > 0 ? 'PROFITABLE' : netProfit < 0 ? 'LOSS' : 'BREAK EVEN']
    ]

    financialData.forEach(([label, value]) => {
      if (label.includes('REVENUE') || label.includes('EXPENSES') || label.includes('PROFIT')) {
        pdf.setFont('helvetica', 'bold')
      } else {
        pdf.setFont('helvetica', 'normal')
      }
      
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })
  }

  const generatePaymentMethodsReport = (pdf: jsPDF, data: ReportData) => {
    // Similar structure to daily sales but focused on payment analysis
    generateDailySalesReport(pdf, data) // Reuse for now, can be specialized later
  }

  const generateInventoryReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Inventory Summary Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    const totalItems = data.inventory.length
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) <= (item.lowStockThreshold || 10)).length
    const outOfStockItems = data.inventory.filter(item => (item.quantity || 0) === 0).length
    const totalValue = data.inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0)

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Inventory Overview', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    const inventoryData = [
      ['Total Items:', `${totalItems}`],
      ['Low Stock Alerts:', `${lowStockItems}`],
      ['Out of Stock:', `${outOfStockItems}`],
      ['Total Value:', `₱${totalValue.toLocaleString()}`],
      ['Stock Status:', outOfStockItems === 0 ? 'Good' : 'Needs Attention']
    ]

    inventoryData.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })
  }

  const generateMenuPerformanceReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Menu Performance Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Analyze menu items from orders
    const itemSales: Record<string, { quantity: number, revenue: number }> = {}
    
    data.orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item.name || 'Unknown Item'
          const quantity = item.quantity || 1
          const revenue = (item.price || 0) * quantity
          
          if (!itemSales[name]) {
            itemSales[name] = { quantity: 0, revenue: 0 }
          }
          itemSales[name].quantity += quantity
          itemSales[name].revenue += revenue
        })
      }
    })

    const sortedItems = Object.entries(itemSales)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 10)

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 15

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Top Performing Items', 20, yPos)
    yPos += 12

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    sortedItems.forEach(([name, data], index) => {
      pdf.text(`${index + 1}. ${name}`, 20, yPos)
      pdf.text(`${data.quantity} sold`, 120, yPos)
      pdf.text(`₱${data.revenue.toLocaleString()}`, 160, yPos)
      yPos += 6
    })
  }

  const generateExecutiveSummaryReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Executive Summary', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Combine key metrics from all areas
    const validOrders = data.orders.filter(order => order.status === 'completed' || order.total > 0)
    const totalRevenue = validOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Key Performance Indicators', 20, yPos)
    yPos += 10

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    const kpiData = [
      ['Total Revenue:', `₱${totalRevenue.toLocaleString()}`],
      ['Total Transactions:', `${validOrders.length}`],
      ['Total Expenses:', `₱${totalExpenses.toLocaleString()}`],
      ['Net Profit:', `₱${netProfit.toLocaleString()}`],
      ['Inventory Items:', `${data.inventory.length}`],
      ['Business Status:', netProfit > 0 ? 'PROFITABLE' : 'REVIEW NEEDED']
    ]

    kpiData.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })
  }

  const generateGenericReport = (pdf: jsPDF, data: ReportData, reportType: string) => {
    pdf.setFontSize(20)
    pdf.text(`${reportType.replace('_', ' ').toUpperCase()} Report`, 20, 30)
    pdf.setFontSize(12)
    pdf.text(`Period: ${data.timeRange}`, 20, 50)
    pdf.text(`Data: ${data.orders.length} orders, ${data.inventory.length} inventory items`, 20, 65)
    pdf.text('This report type is being developed. Please check back soon.', 20, 85)
  }

  // Purchase Order Report Generators
  const generatePurchaseSummaryReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Purchase Order Summary Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Calculate purchase order metrics
    const totalPurchaseOrders = data.purchaseOrders.length
    const totalSpending = data.purchaseOrders.reduce((sum, po) => {
      return sum + (po.totalAmount || po.total || 0)
    }, 0)
    
    const completedPurchaseOrders = data.purchaseOrders.filter(po => 
      po.status === 'completed' || po.status === 'received' || po.status === 'delivered'
    )
    const completedSpending = completedPurchaseOrders.reduce((sum, po) => {
      return sum + (po.totalAmount || po.total || 0)
    }, 0)

    const pendingPurchaseOrders = data.purchaseOrders.filter(po => 
      po.status === 'pending' || po.status === 'ordered' || po.status === 'processing'
    )
    const pendingSpending = pendingPurchaseOrders.reduce((sum, po) => {
      return sum + (po.totalAmount || po.total || 0)
    }, 0)

    const averageOrderValue = totalPurchaseOrders > 0 ? totalSpending / totalPurchaseOrders : 0

    // Purchase Overview
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Purchase Order Overview', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const purchaseData = [
      ['Total Purchase Orders:', `${totalPurchaseOrders}`],
      ['Total Spending:', `₱${totalSpending.toLocaleString()}`],
      ['Completed Orders:', `${completedPurchaseOrders.length} (₱${completedSpending.toLocaleString()})`],
      ['Pending Orders:', `${pendingPurchaseOrders.length} (₱${pendingSpending.toLocaleString()})`],
      ['Average Order Value:', `₱${averageOrderValue.toFixed(2)}`],
      ['Completion Rate:', `${totalPurchaseOrders > 0 ? ((completedPurchaseOrders.length / totalPurchaseOrders) * 100).toFixed(1) : 0}%`]
    ]

    purchaseData.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Status Breakdown
    if (totalPurchaseOrders > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Status Breakdown', 20, yPos)
      yPos += 12

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

      Object.entries(statusSummary).forEach(([status, data]) => {
        const percentage = ((data.amount / totalSpending) * 100).toFixed(1)
        pdf.text(`${status.toUpperCase()}:`, 20, yPos)
        pdf.text(`${data.count} orders - ₱${data.amount.toLocaleString()} (${percentage}%)`, 80, yPos)
        yPos += 7
      })
    }

    // Recent Purchase Orders (if space allows)
    if (yPos < 200 && data.purchaseOrders.length > 0) {
      yPos += 10
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recent Purchase Orders', 20, yPos)
      yPos += 12

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')

      const recentOrders = data.purchaseOrders.slice(0, 10)
      recentOrders.forEach(po => {
        const date = po.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'
        const supplier = po.supplier?.name || po.supplierName || 'Unknown'
        const amount = po.totalAmount || po.total || 0
        const status = po.status || 'unknown'
        
        pdf.text(`${date} - ${supplier} - ₱${amount.toLocaleString()} (${status})`, 20, yPos)
        yPos += 5
        
        if (yPos > 250) return // Prevent overflow
      })
    }

    // Footer
    const footerY = pdf.internal.pageSize.height - 20
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Generated by CoreTrack Business Management System', pageWidth / 2, footerY, { align: 'center' })
  }

  const generateSupplierAnalysisReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Supplier Analysis Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 15

    // Analyze suppliers from purchase orders
    const supplierAnalysis: Record<string, { orders: number, totalSpent: number, avgOrderValue: number }> = {}
    
    data.purchaseOrders.forEach(po => {
      const supplier = po.supplier?.name || po.supplierName || 'Unknown Supplier'
      const amount = po.totalAmount || po.total || 0
      
      if (!supplierAnalysis[supplier]) {
        supplierAnalysis[supplier] = { orders: 0, totalSpent: 0, avgOrderValue: 0 }
      }
      
      supplierAnalysis[supplier].orders += 1
      supplierAnalysis[supplier].totalSpent += amount
    })

    // Calculate average order values
    Object.keys(supplierAnalysis).forEach(supplier => {
      const data = supplierAnalysis[supplier]
      data.avgOrderValue = data.orders > 0 ? data.totalSpent / data.orders : 0
    })

    const sortedSuppliers = Object.entries(supplierAnalysis)
      .sort(([,a], [,b]) => b.totalSpent - a.totalSpent)
      .slice(0, 15) // Top 15 suppliers

    const totalSpending = Object.values(supplierAnalysis).reduce((sum, data) => sum + data.totalSpent, 0)

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Top Suppliers by Spending', 20, yPos)
    yPos += 12

    if (sortedSuppliers.length === 0) {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('No purchase order data found for the selected period.', 20, yPos)
      return
    }

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Supplier', 20, yPos)
    pdf.text('Orders', 100, yPos)
    pdf.text('Total Spent', 130, yPos)
    pdf.text('Avg Order', 170, yPos)
    pdf.text('% of Total', 200, yPos)
    yPos += 8

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)

    sortedSuppliers.forEach(([supplier, data], index) => {
      const percentage = totalSpending > 0 ? ((data.totalSpent / totalSpending) * 100).toFixed(1) : '0.0'
      
      // Truncate long supplier names
      const displayName = supplier.length > 15 ? supplier.substring(0, 12) + '...' : supplier
      
      pdf.text(`${index + 1}. ${displayName}`, 20, yPos)
      pdf.text(`${data.orders}`, 100, yPos)
      pdf.text(`₱${data.totalSpent.toLocaleString()}`, 130, yPos)
      pdf.text(`₱${data.avgOrderValue.toFixed(0)}`, 170, yPos)
      pdf.text(`${percentage}%`, 200, yPos)
      yPos += 6
    })

    yPos += 10

    // Summary stats
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Supplier Summary', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const summaryData = [
      ['Total Suppliers:', `${Object.keys(supplierAnalysis).length}`],
      ['Total Spending:', `₱${totalSpending.toLocaleString()}`],
      ['Top Supplier:', sortedSuppliers.length > 0 ? sortedSuppliers[0][0] : 'N/A'],
      ['Top Supplier Spending:', sortedSuppliers.length > 0 ? `₱${sortedSuppliers[0][1].totalSpent.toLocaleString()}` : 'N/A'],
      ['Average per Supplier:', `₱${(totalSpending / Math.max(1, Object.keys(supplierAnalysis).length)).toFixed(2)}`]
    ]

    summaryData.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    // Footer
    const footerY = pdf.internal.pageSize.height - 20
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Generated by CoreTrack Business Management System', pageWidth / 2, footerY, { align: 'center' })
  }

  const generateCostTrackingReport = (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cost Tracking Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 15

    // Cost breakdown by category
    const totalPurchaseOrders = data.purchaseOrders.length
    const totalPurchaseSpending = data.purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || po.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const totalCosts = totalPurchaseSpending + totalExpenses

    // Inventory cost analysis
    const totalInventoryValue = data.inventory.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.price || item.cost || 0))
    }, 0)

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cost Overview', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const costData = [
      ['Purchase Orders:', `₱${totalPurchaseSpending.toLocaleString()}`, `(${totalPurchaseOrders} orders)`],
      ['Operating Expenses:', `₱${totalExpenses.toLocaleString()}`, `(${data.expenses.length} entries)`],
      ['Total Costs:', `₱${totalCosts.toLocaleString()}`, ''],
      ['Current Inventory Value:', `₱${totalInventoryValue.toLocaleString()}`, `(${data.inventory.length} items)`],
      ['', '', ''],
      ['Cost Breakdown:', '', ''],
      ['Purchase Orders %:', `${totalCosts > 0 ? ((totalPurchaseSpending / totalCosts) * 100).toFixed(1) : 0}%`, ''],
      ['Operating Expenses %:', `${totalCosts > 0 ? ((totalExpenses / totalCosts) * 100).toFixed(1) : 0}%`, '']
    ]

    costData.forEach(([label, value, extra]) => {
      if (label.includes('Cost Breakdown') || label.includes('Total Costs')) {
        pdf.setFont('helvetica', 'bold')
      } else {
        pdf.setFont('helvetica', 'normal')
      }
      
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      if (extra) pdf.text(extra, 170, yPos)
      yPos += 7
    })

    yPos += 10

    // Monthly trend (if we have enough data)
    if (data.purchaseOrders.length > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Purchase Order Trends', 20, yPos)
      yPos += 12

      // Group by month
      const monthlySpending: Record<string, number> = {}
      data.purchaseOrders.forEach(po => {
        const date = po.createdAt?.toDate?.() || new Date()
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const amount = po.totalAmount || po.total || 0
        
        monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + amount
      })

      const sortedMonths = Object.entries(monthlySpending)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Last 6 months

      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')

      sortedMonths.forEach(([month, amount]) => {
        const [year, monthNum] = month.split('-')
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        
        pdf.text(`${monthName}:`, 20, yPos)
        pdf.text(`₱${amount.toLocaleString()}`, 120, yPos)
        yPos += 7
      })
    }

    // Low stock items that need purchasing
    if (data.inventory.length > 0) {
      yPos += 10
      const lowStockItems = data.inventory.filter(item => (item.quantity || 0) <= (item.lowStockThreshold || 5))
      
      if (lowStockItems.length > 0) {
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Items Needing Reorder', 20, yPos)
        yPos += 12

        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')

        lowStockItems.slice(0, 10).forEach(item => {
          const name = item.name || 'Unknown Item'
          const current = item.quantity || 0
          const threshold = item.lowStockThreshold || 5
          const cost = item.price || item.cost || 0
          
          pdf.text(`${name} - Current: ${current}, Min: ${threshold}, Cost: ₱${cost}`, 20, yPos)
          yPos += 5
        })
      }
    }

    // Footer
    const footerY = pdf.internal.pageSize.height - 20
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Generated by CoreTrack Business Management System', pageWidth / 2, footerY, { align: 'center' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Business Reports Center</h1>
            <p className="text-blue-100">Generate comprehensive PDF reports for all aspects of your business</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-blue-100 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Professional PDF Reports</span>
            </div>
            <p className="text-xs text-blue-200">Branch: {selectedBranch?.name || 'Not selected'}</p>
          </div>
        </div>
      </div>

      {/* Date Range Selection - Enhanced */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Report Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {(['today', 'week', 'month', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                dateRange === range
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium">
                {range === 'today' && '📅 Today'}
                {range === 'week' && '📅 Last 7 Days'}
                {range === 'month' && '📅 Last 30 Days'}
                {range === 'custom' && '📅 Custom Period'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {range === 'today' && 'Current day'}
                {range === 'week' && '7 days ago to now'}
                {range === 'month' && '30 days ago to now'}
                {range === 'custom' && 'Select date range'}
              </div>
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Custom Date Range</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            {customStartDate && customEndDate && (
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">
                  📊 Selected period: <span className="font-medium">{customStartDate}</span> to <span className="font-medium">{customEndDate}</span>
                  {(() => {
                    const start = new Date(customStartDate)
                    const end = new Date(customEndDate)
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                    return ` (${days} day${days === 1 ? '' : 's'})`
                  })()}
                </p>
                {new Date(customStartDate) > new Date(customEndDate) && (
                  <p className="text-sm text-red-600 mt-1">⚠️ Start date must be before end date</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Categories */}
      <div className="grid gap-6">
        {reportCategories.map((category) => (
          <div key={category.title} className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-lg font-semibold text-surface-900">{category.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-surface-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-25 transition-all cursor-pointer group"
                  onClick={() => setSelectedReportType(report.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-surface-900 group-hover:text-primary-700">
                      {report.name}
                    </h4>
                    <input
                      type="radio"
                      checked={selectedReportType === report.id}
                      onChange={() => setSelectedReportType(report.id)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                  <p className="text-sm text-surface-600 mb-3">{report.desc}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      generatePDF(report.id)
                    }}
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && selectedReportType === report.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        Generate PDF
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => generatePDF('daily_sales')}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-surface-900">Sales Report</p>
              <p className="text-sm text-surface-600">Quick sales summary</p>
            </div>
          </button>

          <button
            onClick={() => generatePDF('profit_loss')}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-surface-900">P&L Statement</p>
              <p className="text-sm text-surface-600">Profit & loss analysis</p>
            </div>
          </button>

          <button
            onClick={() => generatePDF('purchase_summary')}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-surface-900">Purchase Summary</p>
              <p className="text-sm text-surface-600">How much you spent</p>
            </div>
          </button>

          <button
            onClick={() => generatePDF('executive_summary')}
            disabled={loading}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-surface-900">Executive Summary</p>
              <p className="text-sm text-surface-600">High-level overview</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
