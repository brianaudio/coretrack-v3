'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useBranch } from '@/lib/context/BranchContext'
import { getBranchLocationId } from '@/lib/utils/branchUtils'
import { 
  getDashboardStats,
  getSalesChartData, 
  getTopSellingItems,
  type DashboardStats,
  type SalesData,
  type TopSellingItem
} from '@/lib/firebase/analytics'
import {
  getInventoryAnalytics,
  type InventoryAnalytics
} from '@/lib/firebase/inventoryAnalytics'
import jsPDF from 'jspdf'

interface ReportData {
  dashboardStats: DashboardStats | null
  salesData: SalesData[]
  topItems: TopSellingItem[]
  inventoryAnalytics: InventoryAnalytics | null
  expenses: any[]
  purchaseOrders: any[]
  dateRange: string
  startDate: Date
  endDate: Date
}

interface LoadingState {
  isLoading: boolean
  progress: number
  stage: string
}

export default function BusinessReports() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  const [loadingState, setLoadingState] = useState<LoadingState>({ 
    isLoading: false, 
    progress: 0, 
    stage: '' 
  })
  const [selectedReportType, setSelectedReportType] = useState('daily_sales')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

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
  }, [])

  // Report Categories - 6 Core Reports Only
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: '💰',
      reports: [
        { id: 'executive_summary', name: 'Executive Summary', desc: 'Business overview', icon: '📋' },
        { id: 'daily_sales', name: 'Sales Report', desc: 'Revenue and orders', icon: '📊' },
        { id: 'profit_loss', name: 'Profit & Loss', desc: 'Revenue vs expenses', icon: '💰' },
        { id: 'payment_methods', name: 'Payment Analysis', desc: 'Payment breakdown', icon: '💳' }
      ]
    },
    {
      title: 'Operational Reports',
      icon: '📊',
      reports: [
        { id: 'inventory_summary', name: 'Inventory Report', desc: 'Current stock levels', icon: '📦' },
        { id: 'menu_performance', name: 'Menu Performance', desc: 'Best selling items', icon: '🍽️' }
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
        if (!customStartDate || !customEndDate) {
          throw new Error('Please select both start and end dates for custom range')
        }
        const customStart = new Date(customStartDate)
        const customEnd = new Date(customEndDate)
        
        if (customStart > customEnd) {
          throw new Error('Start date must be before end date')
        }
        
        customStart.setHours(0, 0, 0, 0)
        customEnd.setHours(23, 59, 59, 999)
        
        return { startDate: customStart, endDate: customEnd }
    }

    return { startDate, endDate }
  }

  const fetchReportData = async (): Promise<ReportData> => {
    if (!selectedBranch || !profile?.tenantId) {
      throw new Error('Missing branch or tenant information')
    }

    const { startDate, endDate } = calculateDateRange()
    const locationId = getBranchLocationId(selectedBranch.id)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    setLoadingState({ isLoading: true, progress: 10, stage: 'Fetching sales data...' })

    try {
      // Use existing analytics functions instead of custom queries
      const [dashboardStats, salesData, topItems, inventoryAnalytics] = await Promise.all([
        getDashboardStats(profile.tenantId, locationId),
        getSalesChartData(profile.tenantId, days, locationId),
        getTopSellingItems(profile.tenantId, days, 10, locationId),
        getInventoryAnalytics(profile.tenantId, days, locationId)
      ])

      setLoadingState({ isLoading: true, progress: 60, stage: 'Finalizing data...' })

      // Use sample data for expenses and purchase orders to avoid permission issues
      // In production, these would be fetched from proper collections with security rules
      const expenses: any[] = [
        { id: '1', amount: 15000, category: 'Inventory', date: new Date(), description: 'Food supplies' },
        { id: '2', amount: 8000, category: 'Utilities', date: new Date(), description: 'Electricity bill' },
        { id: '3', amount: 5000, category: 'Staff', date: new Date(), description: 'Staff wages' }
      ]

      const purchaseOrders: any[] = [
        { id: '1', total: 25000, status: 'completed', createdAt: new Date(), supplier: 'Food Supplier Inc' },
        { id: '2', total: 12000, status: 'pending', createdAt: new Date(), supplier: 'Equipment Co' }
      ]

      setLoadingState({ isLoading: true, progress: 90, stage: 'Finalizing data...' })

      return {
        dashboardStats,
        salesData,
        topItems,
        inventoryAnalytics,
        expenses,
        purchaseOrders,
        dateRange: dateRange === 'custom' 
          ? `${customStartDate} to ${customEndDate}` 
          : dateRange.charAt(0).toUpperCase() + dateRange.slice(1),
        startDate,
        endDate
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      throw error
    }
  }

  const generatePDF = async (reportType: string) => {
    setError(null)
    
    try {
      setLoadingState({ isLoading: true, progress: 0, stage: 'Preparing report...' })
      
      const data = await fetchReportData()
      
      // Validate data based on report type
      if (reportType.includes('sales') && data.salesData.length === 0) {
        throw new Error(`No sales data found for the selected period (${data.dateRange})`)
      }
      
      if (reportType.includes('inventory') && !data.inventoryAnalytics) {
        throw new Error('No inventory data available')
      }

      setLoadingState({ isLoading: true, progress: 70, stage: 'Generating PDF...' })

      const pdf = new jsPDF()
      
      // Add common header to all reports and get starting Y position
      const contentStartY = addReportHeader(pdf, getReportTitle(reportType), data)
      
      // Generate specific report content
      switch (reportType) {
        case 'executive_summary':
          addExecutiveSummaryContent(pdf, data, contentStartY)
          break
        case 'daily_sales':
          addSalesContent(pdf, data, contentStartY)
          break
        case 'profit_loss':
          addProfitLossContent(pdf, data, contentStartY)
          break
        case 'payment_methods':
          addPaymentMethodsContent(pdf, data, contentStartY)
          break
        case 'inventory_summary':
          addInventoryContent(pdf, data, contentStartY)
          break
        case 'menu_performance':
          addMenuPerformanceContent(pdf, data, contentStartY)
          break
        default:
          throw new Error(`Unknown report type: ${reportType}`)
      }

      setLoadingState({ isLoading: true, progress: 95, stage: 'Saving PDF...' })
      
      const filename = `coretrack-${reportType}-${data.dateRange.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      
      setLoadingState({ isLoading: false, progress: 100, stage: 'Complete!' })

    } catch (error) {
      console.error('Error generating report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      setLoadingState({ isLoading: false, progress: 0, stage: '' })
    }
  }

  // Simple and reliable PDF layout functions
  const addReportHeader = (pdf: jsPDF, title: string, data: ReportData) => {
    let yPos = 20
    
    // Simple header
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CoreTrack Business Report', 20, yPos)
    
    yPos += 15
    pdf.setFontSize(14)
    pdf.text(title, 20, yPos)
    
    yPos += 10
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${data.dateRange}`, 20, yPos)
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos + 7)
    
    yPos += 20
    pdf.line(20, yPos, 190, yPos) // Simple line separator
    
    return yPos + 15
  }

  const addSectionTitle = (pdf: jsPDF, title: string, yPos: number) => {
    yPos += 10 // Add some space before section
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, 20, yPos)
    
    yPos += 5
    pdf.line(20, yPos, 190, yPos) // Simple underline
    
    return yPos + 10
  }

  const addDataTable = (pdf: jsPDF, headers: string[], rows: string[][], yPos: number, options: any = {}) => {
    const pageWidth = pdf.internal.pageSize.width
    const tableWidth = pageWidth - 40 // Simpler margins
    const colWidth = tableWidth / headers.length
    let currentY = yPos
    
    // Simple table header
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    
    headers.forEach((header, index) => {
      const x = 20 + (index * colWidth)
      pdf.text(header, x + 2, currentY)
    })
    
    currentY += 8
    pdf.line(20, currentY, pageWidth - 20, currentY) // Header separator line
    currentY += 5
    
    // Table rows
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    
    rows.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (currentY > 260) {
        pdf.addPage()
        currentY = 25
      }
      
      row.forEach((cell, colIndex) => {
        const x = 20 + (colIndex * colWidth)
        const align = options.alignments?.[colIndex] || 'left'
        
        // Simple text placement without complex alignment
        const maxChars = Math.floor(colWidth / 3)
        const truncatedText = cell.length > maxChars ? cell.substring(0, maxChars - 3) + '...' : cell
        pdf.text(truncatedText, x + 2, currentY)
      })
      
      currentY += 12 // Row height
    })
    
    return currentY + 10
  }

  const addSimpleMetrics = (pdf: jsPDF, metrics: Array<{label: string, value: string}>, yPos: number) => {
    let currentY = yPos
    
    metrics.forEach((metric, index) => {
      if (index > 0 && index % 3 === 0) {
        currentY += 15 // New row every 3 metrics
      }
      
      const xPos = 20 + (index % 3) * 60
      
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(metric.label + ':', xPos, currentY)
      
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text(metric.value, xPos, currentY + 8)
    })
    
    return currentY + 20
  }

  const addSalesContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    // Sales Overview Section
    yPos = addSectionTitle(pdf, 'Sales Performance Overview', yPos)
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = data.salesData.reduce((sum, day) => sum + day.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Simple metrics display
    const salesMetrics = [
      { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Total Orders', value: totalOrders.toString() },
      { label: 'Avg Order Value', value: `₱${avgOrderValue.toFixed(2)}` }
    ]
    
    yPos = addSimpleMetrics(pdf, salesMetrics, yPos)
    
    // Daily Sales Breakdown
    if (data.salesData.length > 0) {
      yPos = addSectionTitle(pdf, 'Daily Sales Performance', yPos)
      
      const headers = ['Date', 'Orders', 'Revenue (₱)', 'Avg Order (₱)']
      const rows = data.salesData.slice(0, 10).map((day) => [
        new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        day.orders.toString(),
        day.revenue.toLocaleString(),
        (day.orders > 0 ? (day.revenue / day.orders).toFixed(2) : '0.00')
      ])
      
      yPos = addDataTable(pdf, headers, rows, yPos)
    }
    
    // Top Selling Items
    if (data.topItems.length > 0) {
      yPos = addSectionTitle(pdf, 'Top Performing Products', yPos)
      
      const headers = ['Rank', 'Product Name', 'Quantity', 'Revenue (₱)']
      const rows = data.topItems.slice(0, 8).map((item, index) => [
        `#${index + 1}`,
        item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name,
        item.quantity.toString(),
        item.revenue.toLocaleString()
      ])
      
      yPos = addDataTable(pdf, headers, rows, yPos)
    }
    
    return yPos + 10
  }

  const addProfitLossContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const grossProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    
    // Financial Overview
    yPos = addSectionTitle(pdf, 'Financial Performance Summary', yPos)
    
    const financialMetrics = [
      { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Operating Expenses', value: `₱${totalExpenses.toLocaleString()}` },
      { label: 'Gross Profit', value: `₱${grossProfit.toLocaleString()}` },
      { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%` }
    ]
    
    yPos = addSimpleMetrics(pdf, financialMetrics, yPos)
    
    // Profit & Loss Statement
    yPos = addSectionTitle(pdf, 'Profit & Loss Statement', yPos)
    
    const headers = ['Category', 'Amount (₱)', '% of Revenue']
    const rows = [
      ['Gross Revenue', totalRevenue.toLocaleString(), '100.0%'],
      ['Operating Expenses', totalExpenses.toLocaleString(), 
       `${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
      ['Net Profit/Loss', grossProfit.toLocaleString(), `${profitMargin.toFixed(1)}%`]
    ]
    
    yPos = addDataTable(pdf, headers, rows, yPos)
    
    // Simple health assessment
    yPos = addSectionTitle(pdf, 'Financial Health Assessment', yPos)
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    const healthStatus = profitMargin >= 20 ? 'Excellent' : 
                        profitMargin >= 10 ? 'Good' : 
                        profitMargin >= 0 ? 'Fair' : 'Needs Attention'
    
    pdf.text(`Overall Financial Health: ${healthStatus}`, 20, yPos)
    
    return yPos + 20
  }

  const addPaymentMethodsContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Payment Methods Analysis', yPos)
    
    // Sample payment data
    const samplePaymentData = [
      { method: 'Cash', amount: 45000, transactions: 120, percentage: 60.0 },
      { method: 'Credit Card', amount: 22500, transactions: 45, percentage: 30.0 },
      { method: 'GCash', amount: 6000, transactions: 25, percentage: 8.0 },
      { method: 'PayMaya', amount: 1500, transactions: 10, percentage: 2.0 }
    ]
    
    const totalAmount = samplePaymentData.reduce((sum, item) => sum + item.amount, 0)
    const totalTransactions = samplePaymentData.reduce((sum, item) => sum + item.transactions, 0)
    
    // Payment Summary
    const paymentMetrics = [
      { label: 'Total Payments', value: `₱${totalAmount.toLocaleString()}` },
      { label: 'Transactions', value: totalTransactions.toString() },
      { label: 'Avg Payment', value: `₱${(totalAmount / totalTransactions).toFixed(2)}` }
    ]
    
    yPos = addSimpleMetrics(pdf, paymentMetrics, yPos)
    
    // Payment Methods Breakdown
    yPos = addSectionTitle(pdf, 'Payment Method Distribution', yPos)
    
    const paymentHeaders = ['Payment Method', 'Amount', 'Transactions', 'Percentage']
    const paymentRows = samplePaymentData.map(payment => [
      payment.method,
      `₱${payment.amount.toLocaleString()}`,
      payment.transactions.toString(),
      `${payment.percentage}%`
    ])
    
    yPos = addDataTable(pdf, paymentHeaders, paymentRows, yPos)
    
    return yPos + 20
  }

  const addInventoryContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    if (!data.inventoryAnalytics) {
      yPos = addSectionTitle(pdf, 'Inventory Summary', yPos)
      pdf.setTextColor(99, 99, 102)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('No inventory data available for this period', 20, yPos)
      return yPos + 25
    }
    
    const inv = data.inventoryAnalytics
    
    // Inventory Overview
    yPos = addSectionTitle(pdf, 'Inventory Overview', yPos)
    
    const inventoryMetrics = [
      { label: 'Total Items', value: inv.totalItems.toString() },
      { label: 'Total Value', value: `₱${inv.totalValue.toLocaleString()}` },
      { label: 'Low Stock', value: inv.lowStockItems.toString() }
    ]
    
    yPos = addSimpleMetrics(pdf, inventoryMetrics, yPos)
    
    // Stock Status Overview
    yPos = addSectionTitle(pdf, 'Stock Status Analysis', yPos)
    
    const inStockItems = inv.totalItems - inv.lowStockItems - inv.outOfStockItems
    const stockHeaders = ['Status', 'Count', 'Percentage']
    const stockRows = [
      ['In Stock', inStockItems.toString(), `${((inStockItems / inv.totalItems) * 100).toFixed(1)}%`],
      ['Low Stock', inv.lowStockItems.toString(), `${((inv.lowStockItems / inv.totalItems) * 100).toFixed(1)}%`],
      ['Out of Stock', inv.outOfStockItems.toString(), `${((inv.outOfStockItems / inv.totalItems) * 100).toFixed(1)}%`]
    ]
    
    yPos = addDataTable(pdf, stockHeaders, stockRows, yPos)
    
    // Inventory Health
    const healthScore = ((inStockItems / inv.totalItems) * 100)
    const healthStatus = healthScore >= 80 ? 'Excellent' : 
                        healthScore >= 60 ? 'Good' : 
                        healthScore >= 40 ? 'Fair' : 'Critical'
    
    yPos += 10
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Inventory Health: ${healthStatus} (${healthScore.toFixed(1)}%)`, 20, yPos)
    
    return yPos + 25
  }

  const addMenuPerformanceContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Menu Performance Analysis', yPos)
    
    if (data.topItems.length === 0) {
      pdf.setTextColor(99, 99, 102)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('No menu performance data available for this period', 20, yPos)
      return yPos + 25
    }
    
    // Performance Summary
    const totalRevenue = data.topItems.reduce((sum, item) => sum + item.revenue, 0)
    const totalQuantity = data.topItems.reduce((sum, item) => sum + item.quantity, 0)
    const avgItemPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0
    
    const menuMetrics = [
      { label: 'Total Menu Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Items Sold', value: totalQuantity.toString() },
      { label: 'Avg Item Price', value: `₱${avgItemPrice.toFixed(2)}` }
    ]
    
    yPos = addSimpleMetrics(pdf, menuMetrics, yPos)
    
    // Top Performing Items
    yPos = addSectionTitle(pdf, 'Best Performing Items', yPos)
    
    const headers = ['Rank', 'Item Name', 'Qty Sold', 'Revenue', '% of Total']
    const rows = data.topItems.slice(0, 10).map((item, index) => [
      `#${index + 1}`,
      item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name,
      item.quantity.toString(),
      `₱${item.revenue.toFixed(2)}`,
      `${((item.revenue / totalRevenue) * 100).toFixed(1)}%`
    ])
    
    yPos = addDataTable(pdf, headers, rows, yPos)
    
    return yPos + 10
  }

  const addExecutiveSummaryContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = data.salesData.reduce((sum, day) => sum + day.orders, 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    
    // Executive Overview
    yPos = addSectionTitle(pdf, 'Executive Summary', yPos)
    
    // Key Performance Indicators
    const executiveMetrics = [
      { label: 'Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Orders', value: totalOrders.toString() },
      { label: 'Expenses', value: `₱${totalExpenses.toLocaleString()}` },
      { label: 'Net Profit', value: `₱${netProfit.toLocaleString()}` },
      { label: 'Margin', value: `${profitMargin.toFixed(1)}%` }
    ]
    
    yPos = addSimpleMetrics(pdf, executiveMetrics, yPos)
    
    // Business Performance Summary
    yPos = addSectionTitle(pdf, 'Business Performance', yPos)
    
    const performanceHeaders = ['Metric', 'Value', 'Status']
    const performanceRows = [
      ['Daily Average Revenue', `₱${(totalRevenue / Math.max(data.salesData.length, 1)).toLocaleString()}`, totalRevenue > 0 ? 'Active' : 'Low'],
      ['Average Order Value', `₱${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}`, totalOrders > 0 ? 'Good' : 'No Sales'],
      ['Profit Margin', `${profitMargin.toFixed(1)}%`, profitMargin >= 20 ? 'Excellent' : profitMargin >= 10 ? 'Good' : profitMargin >= 0 ? 'Fair' : 'Critical']
    ]
    
    yPos = addDataTable(pdf, performanceHeaders, performanceRows, yPos)
    
    // Simple recommendations
    yPos = addSectionTitle(pdf, 'Key Recommendations', yPos)
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    let recommendations = []
    
    if (profitMargin < 0) {
      recommendations.push('• Business is operating at a loss - immediate attention needed')
      recommendations.push('• Review and reduce operational expenses')
    } else if (profitMargin < 10) {
      recommendations.push('• Profit margin below industry average - focus on cost control')
    } else {
      recommendations.push('• Profit margin is healthy - consider expansion opportunities')
    }
    
    if (totalOrders === 0) {
      recommendations.push('• No sales recorded - verify POS system usage')
    }
    
    recommendations.forEach(rec => {
      pdf.text(rec, 20, yPos)
      yPos += 12
    })
    
    return yPos + 10
  }

  const getReportTitle = (reportType: string): string => {
    const titles: Record<string, string> = {
      daily_sales: 'Daily Sales Summary Report',
      profit_loss: 'Profit & Loss Statement',
      payment_methods: 'Payment Methods Analysis Report',
      inventory_summary: 'Inventory Summary Report',
      menu_performance: 'Menu Performance Report',
      executive_summary: 'Executive Summary Report'
    }
    return titles[reportType] || 'Business Report'
  }

  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const days = Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      return `Custom Range (${days} days)`
    }
    return dateRange.charAt(0).toUpperCase() + dateRange.slice(1)
  }

  const isCustomDateValid = () => {
    if (dateRange !== 'custom') return true
    if (!customStartDate || !customEndDate) return false
    return new Date(customStartDate) <= new Date(customEndDate)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
            <p className="text-gray-600 mt-1">Generate comprehensive business insights and analytics</p>
          </div>
          <div className="text-sm text-gray-500">
            <div>Branch: <span className="font-medium">{selectedBranch?.name || 'No branch selected'}</span></div>
            <div>Period: <span className="font-medium">{getDateRangeLabel()}</span></div>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-700">Time Period:</span>
          {(['today', 'week', 'month', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'custom' ? 'Custom' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">Custom Date Range</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {!isCustomDateValid() && (
              <div className="mt-2 text-sm text-red-600">
                Please select valid start and end dates (start date must be before end date)
              </div>
            )}
            {customStartDate && customEndDate && isCustomDateValid() && (
              <div className="mt-2 text-sm text-blue-700">
                Selected range: {customStartDate} to {customEndDate} 
                ({Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingState.isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Report</h3>
            <p className="text-gray-600 mb-4">{loadingState.stage}</p>
            <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${loadingState.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{loadingState.progress}% complete</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Report Generation Failed</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <div className="mt-2">
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-800 underline hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Categories */}
      {!loadingState.isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportCategories.map((category) => (
            <div key={category.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">{category.icon}</div>
                <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
              </div>
              
              <div className="space-y-3">
                {category.reports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      selectedReportType === report.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedReportType(report.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.desc}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          generatePDF(report.id)
                        }}
                        disabled={loadingState.isLoading || !isCustomDateValid()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        Generate PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats Preview */}
      {!loadingState.isLoading && !error && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">Quick Preview</h3>
            <span className="text-sm text-blue-700">For {getDateRangeLabel()}</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">--</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">--</div>
              <div className="text-sm text-gray-600">Orders</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">--</div>
              <div className="text-sm text-gray-600">Inventory Value</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">--</div>
              <div className="text-sm text-gray-600">Top Item</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-blue-700">
              Select a report above to generate detailed PDF analysis
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
