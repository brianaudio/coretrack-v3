'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { 
  getDashboardStats,
  getSalesChartData, 
  getTopSellingItems,
  getPaymentAnalytics,
  getOrderVolumeAnalytics,
  getPeakHoursAnalytics,
  getPaymentMethodAnalytics,
  getComprehensiveOrderAnalytics,
  type DashboardStats,
  type SalesData,
  type TopSellingItem,
  type PaymentAnalytics,
  type OrderVolumeData,
  type PeakHoursData,
  type PaymentMethodAnalytics,
  type ComprehensiveOrderAnalytics
} from '../../lib/firebase/analytics'
import {
  getInventoryAnalytics,
  type InventoryAnalytics
} from '../../lib/firebase/inventoryAnalytics'
import {
  getExpenses,
  getExpensesByDateRange,
  type Expense
} from '../../lib/firebase/expenses'
import {
  getPurchaseOrders,
  type PurchaseOrder
} from '../../lib/firebase/purchaseOrders'
import { subscribeToPOSOrders, type POSOrder } from '../../lib/firebase/pos'
import jsPDF from 'jspdf'

interface ReportData {
  dashboardStats: DashboardStats | null
  salesData: SalesData[]
  topItems: TopSellingItem[]
  inventoryAnalytics: InventoryAnalytics | null
  paymentAnalytics: PaymentAnalytics[]
  expenses: Expense[]
  purchaseOrders: PurchaseOrder[]
  // Enhanced Order Analytics
  orderVolumeData: OrderVolumeData[]
  peakHoursData: PeakHoursData[]
  paymentMethodAnalytics: PaymentMethodAnalytics[]
  comprehensiveOrderAnalytics: ComprehensiveOrderAnalytics | null
  shiftRevenue?: number
  shiftOrders?: number
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
  const { currentShift } = useShift() // Add shift context
  
  console.log('BusinessReports Debug:', { 
    profile: !!profile, 
    selectedBranch: !!selectedBranch, 
    currentShift: !!currentShift,
    shiftId: currentShift?.id
  })
  
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

  // Report Categories - Enhanced with Order Analytics
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
      title: 'Order Analytics',
      icon: '📋',
      reports: [
        { id: 'order_volume_trends', name: 'Order Volume Trends', desc: 'Volume analysis by period', icon: '📈' },
        { id: 'peak_hours_analysis', name: 'Peak Hours Analysis', desc: 'Hourly breakdown & patterns', icon: '⏰' },
        { id: 'payment_method_insights', name: 'Payment Method Insights', desc: 'Transaction preferences', icon: '💳' },
        { id: 'order_comprehensive', name: 'Comprehensive Order Report', desc: 'Complete order analytics', icon: '📊' }
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

  const getCurrentShiftOrders = async (tenantId: string, locationId: string, shift: any): Promise<POSOrder[]> => {
    if (!shift?.id) return []
    
    try {
      // Use the same POS subscription logic as MainDashboard
      return new Promise((resolve) => {
        const unsubscribe = subscribeToPOSOrders(
          tenantId,
          (orders: POSOrder[]) => {
            // Filter orders by current shift only (same as MainDashboard)
            const currentShiftOrders = orders.filter(order => {
              const orderTime = order.createdAt?.toDate()
              const shiftStartTime = shift.startTime?.toDate()
              return orderTime && shiftStartTime && orderTime >= shiftStartTime
            })
            
            console.log(`[Reports] 🎯 SHIFT FILTERED: ${currentShiftOrders.length} orders from current shift (out of ${orders.length} total)`)
            unsubscribe()
            resolve(currentShiftOrders)
          },
          locationId
        )
      })
    } catch (error) {
      console.error('Error fetching current shift orders:', error)
      return []
    }
  }

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
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Debug date range calculation
    console.log('Date Range Calculation Debug:', {
      dateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(), 
      days,
      locationId,
      tenantId: profile.tenantId
    })
    
    setLoadingState({ isLoading: true, progress: 10, stage: 'Fetching sales data...' })

    try {
      // Get shift-aware sales data (same as MainDashboard) + Enhanced Order Analytics
      const [
        dashboardStats, 
        salesData, 
        topItems, 
        inventoryAnalytics, 
        paymentAnalytics, 
        expensesData, 
        purchaseOrdersData, 
        currentShiftOrders,
        // Enhanced Order Analytics
        orderVolumeData,
        peakHoursData,
        paymentMethodAnalytics,
        comprehensiveOrderAnalytics
      ] = await Promise.all([
        getDashboardStats(profile.tenantId, locationId),
        getSalesChartData(profile.tenantId, days, locationId),
        getTopSellingItems(profile.tenantId, days, 10, locationId),
        getInventoryAnalytics(profile.tenantId, days, locationId),
        getPaymentAnalytics(profile.tenantId, locationId, startDate, endDate),
        getExpensesByDateRange(profile.tenantId, startDate, endDate),
        getPurchaseOrders(profile.tenantId, locationId),
        // Get current shift orders directly (same as MainDashboard)
        getCurrentShiftOrders(profile.tenantId, locationId, currentShift),
        // Enhanced Order Analytics
        getOrderVolumeAnalytics(profile.tenantId, locationId, startDate, endDate, 'daily'),
        getPeakHoursAnalytics(profile.tenantId, locationId, startDate, endDate),
        getPaymentMethodAnalytics(profile.tenantId, locationId, startDate, endDate),
        getComprehensiveOrderAnalytics(profile.tenantId, locationId, startDate, endDate)
      ])

      // Calculate shift-aware sales totals
      const shiftRevenue = currentShiftOrders.reduce((sum: number, order: POSOrder) => sum + order.total, 0)
      const shiftOrders = currentShiftOrders.length
      const shiftAvgOrderValue = shiftOrders > 0 ? shiftRevenue / shiftOrders : 0

      console.log('🎯 SHIFT-AWARE DATA:', {
        allDashboardRevenue: dashboardStats?.todaysSales?.revenue || 0,
        shiftRevenue,
        shiftOrders,
        shiftAvgOrderValue,
        currentShiftId: currentShift?.id
      })

      // If getSalesChartData returns no data for today, create synthetic data from SHIFT data
      let finalSalesData = salesData
      if (salesData.length === 0 && shiftRevenue > 0 && dateRange === 'today') {
        console.log('Creating synthetic sales data from CURRENT SHIFT data for today...')
        finalSalesData = [{
          date: new Date().toISOString().split('T')[0],
          revenue: shiftRevenue,
          orders: shiftOrders,
          avgOrderValue: shiftAvgOrderValue
        }]
      }

      // Debug logging
      console.log('Report Data Debug:', {
        dashboardStats,
        originalSalesDataLength: salesData.length,
        finalSalesDataLength: finalSalesData.length,
        topItemsLength: topItems.length,
        inventoryAnalytics,
        paymentAnalyticsLength: paymentAnalytics.length,
        expensesLength: expensesData.length,
        purchaseOrdersLength: purchaseOrdersData.length,
        tenantId: profile.tenantId,
        locationId,
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      // Additional detailed debugging
      console.log('Sales Data Details:', finalSalesData)
      console.log('Top Items Details:', topItems)
      console.log('Dashboard Stats Details:', dashboardStats)
      console.log('Payment Analytics Details:', paymentAnalytics)

      // Use all the data without aggressive filtering - the user has real data
      const filteredSalesData = finalSalesData
      const filteredTopItems = topItems
      const filteredPaymentAnalytics = paymentAnalytics

      // Log summary
      console.log('Data Summary:', {
        salesData: filteredSalesData.length,
        topItems: filteredTopItems.length,  
        paymentAnalytics: filteredPaymentAnalytics.length,
        expenses: expensesData.length,
        purchaseOrders: purchaseOrdersData.length
      })

      setLoadingState({ isLoading: true, progress: 60, stage: 'Finalizing data...' })

      // Use the actual data from Firebase instead of empty arrays
      const expenses = expensesData || []
      const purchaseOrders = purchaseOrdersData || []

      setLoadingState({ isLoading: true, progress: 90, stage: 'Finalizing data...' })

      return {
        dashboardStats,
        salesData: filteredSalesData,
        topItems: filteredTopItems,
        inventoryAnalytics,
        paymentAnalytics: filteredPaymentAnalytics,
        expenses: expensesData,
        purchaseOrders: purchaseOrdersData,
        // Enhanced Order Analytics
        orderVolumeData,
        peakHoursData,
        paymentMethodAnalytics,
        comprehensiveOrderAnalytics,
        shiftRevenue,
        shiftOrders,
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
    
    console.log('🚀 Starting PDF Generation:', {
      reportType,
      dateRange,
      selectedBranch: selectedBranch?.name,
      tenantId: profile?.tenantId
    })

    try {
      setLoadingState({ isLoading: true, progress: 0, stage: 'Preparing report...' })
      
      const data = await fetchReportData()
      
      console.log('📊 Raw Data Fetched:', {
        dashboardStats: data.dashboardStats,
        salesDataLength: data.salesData.length,
        salesData: data.salesData,
        dateRange: data.dateRange,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString()
      })
      
      // Validate data based on report type - with better debugging
      console.log('Report Validation Debug:', {
        reportType,
        salesDataLength: data.salesData.length,
        dashboardStats: data.dashboardStats,
        todaysSales: data.dashboardStats?.todaysSales,
        hasInventory: !!data.inventoryAnalytics,
        dateRange: data.dateRange
      })
      
      if (reportType.includes('sales')) {
        // Check both sales data and shift-aware data
        const hasSalesData = data.salesData.length > 0
        const hasDashboardSales = data.dashboardStats?.todaysSales?.revenue && data.dashboardStats.todaysSales.revenue > 0
        const hasShiftSales = currentShift && data.shiftRevenue && data.shiftRevenue > 0
        
        console.log('🎯 SHIFT-AWARE VALIDATION:', {
          hasSalesData,
          hasDashboardSales,
          hasShiftSales,
          shiftRevenue: data.shiftRevenue || 0,
          shiftId: currentShift?.id
        })
        
        // For "Today" reports, prioritize shift data over dashboard stats
        if (dateRange === 'today' && !hasSalesData && hasShiftSales) {
          console.log('✅ Using SHIFT data for TODAY report - this matches your main dashboard!')
          // Don't throw error - we have valid shift data
        } else if (dateRange === 'today' && !hasSalesData && hasDashboardSales) {
          console.log('✅ Using dashboard stats for TODAY report since chart data is empty but we have today\'s sales:', data.dashboardStats?.todaysSales)
          // Don't throw error - we have valid today's data from dashboard stats
        } else if (!hasSalesData && !hasDashboardSales && !hasShiftSales) {
          console.warn('No sales data found in either sales data, dashboard stats, or shift data:', {
            dashboardStats: data.dashboardStats,
            todaysSales: data.dashboardStats?.todaysSales,
            salesData: data.salesData,
            shiftRevenue: data.shiftRevenue || 0,
            dateRange
          })
          throw new Error(`No sales data found for the selected period (${data.dateRange}). Please check if you have any sales transactions recorded for this period.`)
        }
        
        if (!hasSalesData && (hasDashboardSales || hasShiftSales)) {
          console.log('Using dashboard stats or shift data for sales since chart data is empty')
        }
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
        // Enhanced Order Analytics Reports
        case 'order_volume_trends':
          addOrderVolumeTrendsContent(pdf, data, contentStartY)
          break
        case 'peak_hours_analysis':
          addPeakHoursAnalysisContent(pdf, data, contentStartY)
          break
        case 'payment_method_insights':
          addPaymentMethodInsightsContent(pdf, data, contentStartY)
          break
        case 'order_comprehensive':
          addComprehensiveOrderReportContent(pdf, data, contentStartY)
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

  // Professional PDF layout functions with enterprise-grade styling
  const addReportHeader = (pdf: jsPDF, title: string, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 30
    
    // Simple header - just like receipt
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    const titleWidth = pdf.getTextWidth(title)
    pdf.text(title, (pageWidth - titleWidth) / 2, yPos)
    
    yPos += 20
    
    // Report info - simple and clean
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const dateText = `Date: ${new Date().toLocaleDateString()}`
    const periodText = `Period: ${data.dateRange}`
    
    pdf.text(dateText, 25, yPos)
    pdf.text(periodText, 25, yPos + 10)
    
    // Simple line separator
    yPos += 25
    pdf.setLineWidth(1)
    pdf.line(25, yPos, pageWidth - 25, yPos)
    
    return yPos + 15
  }

  const addSimpleHeader = (pdf: jsPDF, title: string) => {
    // Simple page header for continuation pages
    pdf.setTextColor(100, 100, 100)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(title, 25, 20)
    
    // Simple line
    pdf.setLineWidth(0.5)
    pdf.line(25, 25, pdf.internal.pageSize.width - 25, 25)
    
    return 35
  }

  const addSectionTitle = (pdf: jsPDF, title: string, yPos: number) => {
    // Check if section title would fit on current page with some content
    if (yPos + 40 > 270) {
      pdf.addPage()
      yPos = addSimpleHeader(pdf, 'Business Report (continued)')
    } else {
      yPos += 15
    }
    
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, 25, yPos)
    
    // Simple underline
    yPos += 5
    pdf.setLineWidth(0.5)
    pdf.line(25, yPos, 25 + pdf.getTextWidth(title), yPos)
    
    return yPos + 10
  }

  const addDataTable = (pdf: jsPDF, headers: string[], rows: string[][], yPos: number, options: any = {}) => {
    const pageWidth = pdf.internal.pageSize.width
    let currentY = yPos + 15
    
    const addTableHeaders = (y: number) => {
      // Table title if provided
      if (options?.title) {
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(options.title, 25, y)
        y += 15
      }
      
      // Simple table headers
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      
      const colWidth = (pageWidth - 50) / headers.length
      
      headers.forEach((header, index) => {
        const x = 25 + (index * colWidth)
        pdf.text(header, x, y)
      })
      
      // Simple line under headers
      y += 5
      pdf.setLineWidth(0.5)
      pdf.line(25, y, pageWidth - 25, y)
      
      return y + 10
    }
    
    // Add headers for first page
    currentY = addTableHeaders(currentY)
    
    // Simple table rows
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    
    const colWidth = (pageWidth - 50) / headers.length
    
    rows.forEach((row) => {
      // Check for new page
      if (currentY > 260) {
        pdf.addPage()
        currentY = addSimpleHeader(pdf, 'Business Report (continued)')
        
        // Re-add headers on new page
        currentY = addTableHeaders(currentY)
      }
      
      row.forEach((cell, index) => {
        const x = 25 + (index * colWidth)
        let cellText = String(cell || '--')
        
        // Truncate if too long
        const maxWidth = colWidth - 5
        while (pdf.getTextWidth(cellText) > maxWidth && cellText.length > 3) {
          cellText = cellText.substring(0, cellText.length - 4) + '...'
        }
        
        pdf.text(cellText, x, currentY)
      })
      
      currentY += 12
    })
    
    return currentY + 10
  }

  const addSimpleMetrics = (pdf: jsPDF, metrics: Array<{label: string, value: string}>, yPos: number) => {
    const pageWidth = pdf.internal.pageSize.width
    let currentY = yPos + 10
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    
    // Display metrics like receipt items - simple and clean
    metrics.forEach((metric) => {
      // Check for new page
      if (currentY > 260) {
        pdf.addPage()
        currentY = addSimpleHeader(pdf, 'Business Report (continued)')
      }
      
      // Left-align label, right-align value (like receipt items)
      const label = metric.label + ':'
      const value = metric.value
      
      pdf.text(label, 25, currentY)
      
      // Right align the value
      const valueWidth = pdf.getTextWidth(value)
      pdf.text(value, pageWidth - 25 - valueWidth, currentY)
      
      currentY += 12
    })
    
    return currentY + 10
  }

  const addProfessionalFooter = (pdf: jsPDF) => {
    const pageWidth = pdf.internal.pageSize.width
    const pageHeight = pdf.internal.pageSize.height
    
    // Simple footer like receipt
    pdf.setTextColor(100, 100, 100)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    
    // Simple footer text
    const footerText = 'Thank you for using CoreTrack'
    const textWidth = pdf.getTextWidth(footerText)
    pdf.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 15)
  }

  const addNoDataState = (pdf: jsPDF, title: string, message: string, suggestions: string[], yPos: number) => {
    const pageWidth = pdf.internal.pageSize.width
    const margin = 25
    const boxWidth = pageWidth - (margin * 2)
    const boxHeight = 120
    
    // Professional no-data container
    pdf.setFillColor(248, 250, 252) // Very light gray background
    pdf.setDrawColor(226, 232, 240) // Light border
    pdf.setLineWidth(1)
    pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 8, 8, 'FD')
    
    // Icon area (simulated with styled text)
    pdf.setFillColor(241, 245, 249)
    pdf.setDrawColor(203, 213, 225)
    const iconSize = 24
    const iconX = (pageWidth - iconSize) / 2
    pdf.roundedRect(iconX, yPos + 15, iconSize, iconSize, 4, 4, 'FD')
    
    // Icon symbol
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('No Data', iconX + 2, yPos + 32)
    
    // No data title
    pdf.setTextColor(51, 65, 85)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    const titleWidth = pdf.getTextWidth(title)
    pdf.text(title, (pageWidth - titleWidth) / 2, yPos + 55)
    
    // Description
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const msgWidth = pdf.getTextWidth(message)
    pdf.text(message, (pageWidth - msgWidth) / 2, yPos + 70)
    
    // Suggestions
    if (suggestions.length > 0) {
      pdf.setTextColor(71, 85, 105)
      pdf.setFontSize(9)
      let suggY = yPos + 85
      
      suggestions.forEach((suggestion, index) => {
        pdf.text(`• ${suggestion}`, margin + 20, suggY)
        suggY += 10
      })
    }
    
    return yPos + boxHeight + 20
  }

  const addSalesContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    // Sales Performance Overview
    yPos = addSectionTitle(pdf, 'Sales Performance Overview', yPos)
    
    if (data.salesData.length === 0) {
      const suggestions = [
        'Verify POS system is processing completed orders',
        'Check if orders exist within the selected date range',
        'Ensure database connectivity is functioning properly'
      ]
      yPos = addNoDataState(pdf, 'No Sales Data Available', 
        'No sales transactions found for the selected period', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = data.salesData.reduce((sum, day) => sum + day.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const bestDay = data.salesData.reduce((best, day) => day.revenue > best.revenue ? day : best, data.salesData[0])
    
    // Key Performance Metrics
    const salesMetrics = [
      { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Total Orders', value: totalOrders.toLocaleString() },
      { label: 'Avg Order Value', value: `₱${avgOrderValue.toFixed(2)}` },
      { label: 'Best Day Revenue', value: `₱${bestDay.revenue.toLocaleString()}` },
      { label: 'Order Frequency', value: `${(totalOrders / data.salesData.length).toFixed(1)}/day` }
    ]
    
    yPos = addSimpleMetrics(pdf, salesMetrics, yPos)

    // Executive Summary Text
    pdf.setTextColor(71, 85, 105)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const summaryText = `Your business processed ${totalOrders.toLocaleString()} orders generating ₱${totalRevenue.toLocaleString()} in revenue. The analysis below provides detailed insights into daily performance and top-performing products driving your business growth.`
    
    // Word wrap for summary text
    const words = summaryText.split(' ')
    let line = ''
    let lineY = yPos
    const maxWidth = pdf.internal.pageSize.width - 50
    
    words.forEach(word => {
      const testLine = line + word + ' '
      if (pdf.getTextWidth(testLine) > maxWidth && line !== '') {
        pdf.text(line.trim(), 25, lineY)
        line = word + ' '
        lineY += 12
      } else {
        line = testLine
      }
    })
    if (line.trim() !== '') {
      pdf.text(line.trim(), 25, lineY)
    }
    
    yPos = lineY + 25
    
    // Daily Sales Performance
    if (data.salesData.length > 0) {
      yPos = addSectionTitle(pdf, 'Daily Sales Performance', yPos)
      
      const headers = ['Date', 'Orders', 'Revenue', 'Avg Order', 'Performance']
      const rows = data.salesData.slice(0, 12).map((day) => {
        const avgOrder = day.orders > 0 ? (day.revenue / day.orders) : 0
        const performance = day.revenue > (totalRevenue / data.salesData.length) ? 'Above Avg' : 
                          day.revenue === 0 ? 'No Sales' : 'Below Avg'
        
        return [
          new Date(day.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short' 
          }),
          day.orders.toLocaleString(),
          `₱${day.revenue.toLocaleString()}`,
          `₱${avgOrder.toFixed(2)}`,
          performance
        ]
      })
      
      yPos = addDataTable(pdf, headers, rows, yPos)
    }
    
    // Top Performing Products
    yPos = addSectionTitle(pdf, 'Top Performing Products', yPos)
    
    if (data.topItems.length === 0) {
      const suggestions = [
        'Ensure POS system is recording product details',
        'Verify menu items are properly configured',
        'Check that sales transactions are completing successfully'
      ]
      yPos = addNoDataState(pdf, 'No Product Sales Data', 
        'No product performance data found for this period', suggestions, yPos)
    } else {
      const headers = ['Date', 'Item', 'Qty', 'Revenue', 'Share']
      const totalProductRevenue = data.topItems.reduce((sum, item) => sum + item.revenue, 0)
      
      const rows = data.topItems.slice(0, 10).map((item, index) => {
        const marketShare = totalProductRevenue > 0 ? ((item.revenue / totalProductRevenue) * 100).toFixed(1) : '0.0'
        return [
          `#${index + 1}`,
          item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name,
          item.quantity.toString(),
          `₱${item.revenue.toLocaleString()}`,
          `${marketShare}%`
        ]
      })
      
      yPos = addDataTable(pdf, headers, rows, yPos)
    }
    
    addProfessionalFooter(pdf)
    return yPos + 10
  }

  const addProfitLossContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const grossProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    
    // Profit & Loss Header
    yPos = addSectionTitle(pdf, 'Profit & Loss Statement', yPos)
    
    if (totalRevenue === 0 && totalExpenses === 0 && data.salesData.length === 0) {
      const suggestions = [
        'Record sales transactions through POS system',
        'Track business expenses in the expense module',
        'Ensure all financial activities are properly documented'
      ]
      yPos = addNoDataState(pdf, 'No Financial Data Available', 
        'Profit & loss analysis requires both revenue and expense data', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }
    
    // Financial Performance Metrics
    const netProfitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    const expenseRatio = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0.0'
    const breakEvenPoint = totalExpenses > 0 ? Math.ceil(totalExpenses / (totalRevenue / Math.max(data.salesData.filter(d => d.orders > 0).length, 1))) : 0
    
    const financialMetrics = [
      { label: 'Gross Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Operating Expenses', value: `₱${totalExpenses.toLocaleString()}` },
      { label: 'Net Profit', value: `₱${grossProfit.toLocaleString()}` },
      { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%` },
      { label: 'Expense Ratio', value: `${expenseRatio}%` },
      { label: 'Break-Even Days', value: `${breakEvenPoint} days` }
    ]
    
    yPos = addSimpleMetrics(pdf, financialMetrics, yPos)
    
    // Detailed P&L Statement
    yPos = addSectionTitle(pdf, 'Financial Statement Breakdown', yPos)
    
    const headers = ['Line Item', 'Amount', '% of Revenue', 'Performance']
    const revenuePercent = '100.0%'
    const expensePercent = totalRevenue > 0 ? `${((totalExpenses / totalRevenue) * 100).toFixed(1)}%` : '0.0%'
    const profitPercent = `${profitMargin.toFixed(1)}%`
    
    const rows = [
      [
        'Gross Revenue',
        `₱${totalRevenue.toLocaleString()}`,
        revenuePercent,
        totalRevenue > 0 ? 'Active' : 'No Sales'
      ],
      [
        'Operating Expenses',
        `₱${totalExpenses.toLocaleString()}`,
        expensePercent,
        parseFloat(expensePercent) > 80 ? 'High' : parseFloat(expensePercent) > 60 ? 'Moderate' : 'Controlled'
      ],
      [
        'Net Profit/Loss',
        `₱${grossProfit.toLocaleString()}`,
        profitPercent,
        grossProfit > 0 ? 'Profitable' : grossProfit === 0 ? 'Break-even' : 'Loss'
      ]
    ]
    
    yPos = addDataTable(pdf, headers, rows, yPos)
    
    // Financial Health Assessment
    yPos = addSectionTitle(pdf, 'Financial Health Analysis', yPos)
    
    const pageWidth = pdf.internal.pageSize.width
    const margin = 25
    const healthBoxWidth = (pageWidth - (margin * 2) - 20) / 2
    const healthBoxHeight = 60
    
    // Profitability Health Card
    const profitabilityStatus = profitMargin >= 20 ? 'Excellent' : 
                              profitMargin >= 10 ? 'Good' : 
                              profitMargin >= 0 ? 'Fair' : 'Critical'
    
    // Left health card - Profitability
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(1)
    pdf.roundedRect(margin, yPos, healthBoxWidth, healthBoxHeight, 6, 6, 'FD')
    
    pdf.setTextColor(71, 85, 105)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PROFITABILITY HEALTH', margin + 10, yPos + 15)
    
    if (profitMargin >= 20) pdf.setTextColor(34, 197, 94)
    else if (profitMargin >= 10) pdf.setTextColor(251, 191, 36)
    else if (profitMargin >= 0) pdf.setTextColor(59, 130, 246)
    else pdf.setTextColor(239, 68, 68)
    
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(profitabilityStatus.toUpperCase(), margin + 10, yPos + 35)
    
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${profitMargin.toFixed(1)}% Profit Margin`, margin + 10, yPos + 50)
    
    // Right health card - Expense Control
    const expenseHealth = parseFloat(expensePercent) <= 60 ? 'Excellent' :
                         parseFloat(expensePercent) <= 80 ? 'Good' : 'Needs Attention'
    
    const rightCardX = margin + healthBoxWidth + 20
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(rightCardX, yPos, healthBoxWidth, healthBoxHeight, 6, 6, 'FD')
    
    pdf.setTextColor(71, 85, 105)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EXPENSE CONTROL', rightCardX + 10, yPos + 15)
    
    if (parseFloat(expensePercent) <= 60) pdf.setTextColor(34, 197, 94)
    else if (parseFloat(expensePercent) <= 80) pdf.setTextColor(251, 191, 36)
    else pdf.setTextColor(239, 68, 68)
    
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(expenseHealth.toUpperCase(), rightCardX + 10, yPos + 35)
    
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${expensePercent} of Revenue`, rightCardX + 10, yPos + 50)
    
    yPos += healthBoxHeight + 20
    
    addProfessionalFooter(pdf)
    return yPos
  }

  const addPaymentMethodsContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Payment Methods Analysis', yPos)
    
    if (data.paymentAnalytics.length === 0) {
      const suggestions = [
        'Process transactions through the POS system',
        'Ensure payment methods are properly recorded',
        'Verify transaction completion and data synchronization'
      ]
      yPos = addNoDataState(pdf, 'No Payment Data Available', 
        'Payment analytics requires completed transactions with recorded payment methods', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }
    
    const paymentData = data.paymentAnalytics
    const totalAmount = paymentData.reduce((sum, item) => sum + item.amount, 0)
    const totalTransactions = paymentData.reduce((sum, item) => sum + item.transactions, 0)
    const avgTransactionValue = totalTransactions > 0 ? totalAmount / totalTransactions : 0
    const mostUsedMethod = paymentData.reduce((max, method) => method.transactions > max.transactions ? method : max, paymentData[0])
    
    // Payment Performance Metrics
    const paymentMetrics = [
      { label: 'Total Payments', value: `₱${totalAmount.toLocaleString()}` },
      { label: 'Total Transactions', value: totalTransactions.toLocaleString() },
      { label: 'Avg Transaction', value: `₱${avgTransactionValue.toFixed(2)}` },
      { label: 'Most Used Method', value: mostUsedMethod.method },
      { label: 'Method Diversity', value: `${paymentData.length} methods` },
      { label: 'Digital Payment %', value: `${(paymentData.filter(p => p.method !== 'cash').reduce((sum, p) => sum + p.percentage, 0)).toFixed(1)}%` }
    ]
    
    yPos = addSimpleMetrics(pdf, paymentMetrics, yPos)
    
    // Payment Methods Breakdown Table
    yPos = addSectionTitle(pdf, 'Payment Method Distribution', yPos)
    
    const paymentHeaders = ['Payment Method', 'Amount', 'Transactions', 'Market Share', 'Avg Transaction']
    const paymentRows = paymentData.map(payment => [
      payment.method.charAt(0).toUpperCase() + payment.method.slice(1),
      `₱${payment.amount.toLocaleString()}`,
      payment.transactions.toLocaleString(),
      `${payment.percentage.toFixed(1)}%`,
      `₱${(payment.amount / payment.transactions).toFixed(2)}`
    ])
    
    yPos = addDataTable(pdf, paymentHeaders, paymentRows, yPos)
    
    addProfessionalFooter(pdf)
    return yPos + 20
  }

  const addInventoryContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    if (!data.inventoryAnalytics) {
      const suggestions = [
        'Add inventory items to your system',
        'Update stock levels regularly',
        'Ensure inventory data is properly synchronized'
      ]
      yPos = addSectionTitle(pdf, 'Inventory Summary', yPos)
      yPos = addNoDataState(pdf, 'No Inventory Data Available', 
        'Inventory analysis requires active inventory management', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }
    
    const inv = data.inventoryAnalytics
    
    // Inventory Overview
    yPos = addSectionTitle(pdf, 'Inventory Overview', yPos)
    
    const inStockItems = inv.totalItems - (Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0) - (Array.isArray(inv.outOfStockItems) ? inv.outOfStockItems.length : inv.outOfStockItems || 0)
    const healthScore = inv.totalItems > 0 ? ((inStockItems / inv.totalItems) * 100) : 0
    const avgItemValue = inv.totalItems > 0 ? inv.totalValue / inv.totalItems : 0
    
    const inventoryMetrics = [
      { label: 'Total Items', value: inv.totalItems.toLocaleString() },
      { label: 'Total Value', value: `₱${inv.totalValue.toLocaleString()}` },
      { label: 'In Stock Items', value: inStockItems.toLocaleString() },
      { label: 'Low Stock Items', value: (Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0).toLocaleString() },
      { label: 'Out of Stock', value: (Array.isArray(inv.outOfStockItems) ? inv.outOfStockItems.length : inv.outOfStockItems || 0).toLocaleString() },
      { label: 'Avg Item Value', value: `₱${avgItemValue.toFixed(2)}` },
      { label: 'Stock Health', value: `${healthScore.toFixed(1)}%` },
      { label: 'Reorder Priority', value: (Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0) > 0 ? 'HIGH' : 'LOW' }
    ]
    
    yPos = addSimpleMetrics(pdf, inventoryMetrics, yPos)
    
    // Stock Status Analysis
    yPos = addSectionTitle(pdf, 'Stock Status Analysis', yPos)
    
    const stockHeaders = ['Stock Status', 'Item Count', 'Percentage', 'Value Impact', 'Action Required']
    const stockRows = [
      [
        'In Stock',
        inStockItems.toLocaleString(),
        `${((inStockItems / inv.totalItems) * 100).toFixed(1)}%`,
        'Optimal',
        'Monitor levels'
      ],
      [
        'Low Stock',
        (Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0).toLocaleString(),
        `${(((Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0) / inv.totalItems) * 100).toFixed(1)}%`,
        'At Risk',
        'Reorder soon'
      ],
      [
        'Out of Stock',
        (Array.isArray(inv.outOfStockItems) ? inv.outOfStockItems.length : inv.outOfStockItems || 0).toLocaleString(),
        `${(((Array.isArray(inv.outOfStockItems) ? inv.outOfStockItems.length : inv.outOfStockItems || 0) / inv.totalItems) * 100).toFixed(1)}%`,
        'Critical',
        'Immediate reorder'
      ]
    ]
    
    yPos = addDataTable(pdf, stockHeaders, stockRows, yPos)
    
    // Inventory Health Assessment
    const healthStatus = healthScore >= 80 ? 'Excellent' : 
                        healthScore >= 60 ? 'Good' : 
                        healthScore >= 40 ? 'Fair' : 'Critical'
    
    yPos = addSectionTitle(pdf, 'Inventory Health Assessment', yPos)
    
    pdf.setTextColor(51, 65, 85)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Overall Inventory Health: ${healthStatus.toUpperCase()}`, 25, yPos)
    
    pdf.setTextColor(100, 116, 139)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${healthScore.toFixed(1)}% of inventory is adequately stocked`, 25, yPos + 15)
    
    if ((Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0) > 0) {
      pdf.setTextColor(245, 158, 11)
      pdf.text(`Warning: ${(Array.isArray(inv.lowStockItems) ? inv.lowStockItems.length : inv.lowStockItems || 0)} items require immediate attention`, 25, yPos + 30)
    }
    
    if ((Array.isArray(inv.outOfStockItems) ? inv.outOfStockItems.length : inv.outOfStockItems || 0) > 0) {
      pdf.setTextColor(239, 68, 68)
      pdf.text(`Alert: ${(Array.isArray(inv.outOfStockItems) ? inv.outOfStockItems.length : inv.outOfStockItems || 0)} items are completely out of stock`, 25, yPos + 45)
    }
    
    addProfessionalFooter(pdf)
    return yPos + 60
  }

  const addMenuPerformanceContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Menu Performance Analysis', yPos)
    
    if (data.topItems.length === 0) {
      const suggestions = [
        'Process sales through the POS system',
        'Ensure menu items are properly categorized',
        'Verify product data is being tracked correctly'
      ]
      yPos = addNoDataState(pdf, 'No Menu Performance Data', 
        'Menu analysis requires sales transactions with product details', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }
    
    // Performance Summary Calculations
    const totalRevenue = data.topItems.reduce((sum, item) => sum + item.revenue, 0)
    const totalQuantity = data.topItems.reduce((sum, item) => sum + item.quantity, 0)
    const avgItemPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0
    const topPerformer = data.topItems[0]
    const topPerformerShare = totalRevenue > 0 ? (topPerformer.revenue / totalRevenue) * 100 : 0
    
    const menuMetrics = [
      { label: 'Total Menu Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Total Items Sold', value: totalQuantity.toLocaleString() },
      { label: 'Avg Item Price', value: `₱${avgItemPrice.toFixed(2)}` },
      { label: 'Top Performer', value: topPerformer.name.length > 15 ? topPerformer.name.substring(0, 12) + '...' : topPerformer.name },
      { label: 'Top Item Revenue', value: `₱${topPerformer.revenue.toLocaleString()}` },
      { label: 'Market Leader Share', value: `${topPerformerShare.toFixed(1)}%` },
      { label: 'Active Menu Items', value: data.topItems.length.toString() },
      { label: 'Revenue Diversity', value: topPerformerShare < 30 ? 'Balanced' : topPerformerShare < 50 ? 'Moderate' : 'Concentrated' }
    ]
    
    yPos = addSimpleMetrics(pdf, menuMetrics, yPos)
    
    // Top Performing Items Analysis
    yPos = addSectionTitle(pdf, 'Best Performing Menu Items', yPos)
    
    if (data.topItems.length === 0) {
      const suggestions = [
        'Process sales through POS system',
        'Ensure menu items are being tracked',
        'Verify transaction data is properly recorded'
      ]
      yPos = addNoDataState(pdf, 'No Menu Sales Data', 
        'No menu item sales found for this period', suggestions, yPos)
    } else {
      const headers = ['Rank', 'Item', 'Qty', 'Revenue', 'Share', 'Price']
      
      const rows = data.topItems.slice(0, 12).map((item, index) => {
        const marketShare = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0.0'
        const avgPrice = item.quantity > 0 ? (item.revenue / item.quantity).toFixed(2) : '0.00'
        
        return [
          `#${index + 1}`,
          item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name,
          item.quantity.toString(),
          `₱${item.revenue.toLocaleString()}`,
          `${marketShare}%`,
          `₱${avgPrice}`
        ]
      })
      
      yPos = addDataTable(pdf, headers, rows, yPos)
    }
    
    // Menu Performance Insights
    yPos = addSectionTitle(pdf, 'Performance Insights', yPos)
    
    const pageWidth = pdf.internal.pageSize.width
    const margin = 25
    
    // Create insight cards
    const insights = []
    
    if (topPerformerShare > 40) {
      insights.push({
        title: 'Revenue Concentration Risk',
        message: `${topPerformer.name} generates ${topPerformerShare.toFixed(1)}% of menu revenue`,
        type: 'warning',
        recommendation: 'Consider promoting other high-margin items'
      })
    }
    
    if (data.topItems.length < 5) {
      insights.push({
        title: 'Limited Menu Diversity',
        message: `Only ${data.topItems.length} items are generating sales`,
        type: 'info',
        recommendation: 'Expand menu offerings or promote existing items'
      })
    }
    
    if (avgItemPrice > 300) {
      insights.push({
        title: 'Premium Pricing Strategy',
        message: `Average item price of ₱${avgItemPrice.toFixed(2)} indicates premium positioning`,
        type: 'success',
        recommendation: 'Maintain quality standards to justify premium pricing'
      })
    }
    
    // Display insights
    insights.forEach((insight, index) => {
      const cardHeight = 50
      const cardY = yPos + (index * (cardHeight + 10))
      
      // Insight card background
      if (insight.type === 'warning') {
        pdf.setFillColor(254, 243, 199)
        pdf.setDrawColor(251, 191, 36)
      } else if (insight.type === 'success') {
        pdf.setFillColor(236, 253, 245)
        pdf.setDrawColor(34, 197, 94)
      } else {
        pdf.setFillColor(239, 246, 255)
        pdf.setDrawColor(59, 130, 246)
      }
      
      pdf.setLineWidth(1)
      pdf.roundedRect(margin, cardY, pageWidth - (margin * 2), cardHeight, 4, 4, 'FD')
      
      // Icon and title
      const icon = insight.type === 'warning' ? 'Warning:' : insight.type === 'success' ? 'Success:' : 'Info:'
      pdf.setTextColor(71, 85, 105)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${icon} ${insight.title}`, margin + 10, cardY + 15)
      
      // Message
      pdf.setTextColor(100, 116, 139)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(insight.message, margin + 10, cardY + 28)
      
      // Recommendation
      pdf.setTextColor(71, 85, 105)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'italic')
      pdf.text(`Recommendation: ${insight.recommendation}`, margin + 10, cardY + 40)
    })
    
    yPos += insights.length * 60 + 20
    
    addProfessionalFooter(pdf)
    return yPos + 10
  }

  const addExecutiveSummaryContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = data.salesData.reduce((sum, day) => sum + day.orders, 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    
    // Executive Summary Header
    yPos = addSectionTitle(pdf, 'Executive Summary', yPos)
    
    if (totalRevenue === 0 && totalOrders === 0 && data.salesData.length === 0) {
      const suggestions = [
        'Activate POS system to start recording transactions',
        'Verify business operations are generating sales',
        'Check system integration and data synchronization'
      ]
      yPos = addNoDataState(pdf, 'No Business Activity Detected', 
        'No operational data available for executive analysis', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }
    
    // Executive KPIs with enhanced styling
    const avgDailyRevenue = totalRevenue / Math.max(data.salesData.length, 1)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    const executiveMetrics = [
      { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Net Profit', value: `₱${netProfit.toLocaleString()}` },
      { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%` },
      { label: 'Total Orders', value: totalOrders.toLocaleString() },
      { label: 'Avg Order Value', value: `₱${avgOrderValue.toFixed(2)}` },
      { label: 'Daily Average', value: `₱${avgDailyRevenue.toLocaleString()}` },
      { label: 'Operating Expenses', value: `₱${totalExpenses.toLocaleString()}` },
      { label: 'Business Health', value: profitMargin >= 20 ? 'Excellent' : profitMargin >= 10 ? 'Good' : profitMargin >= 0 ? 'Fair' : 'Critical' }
    ]
    
    yPos = addSimpleMetrics(pdf, executiveMetrics, yPos)
    
    // Executive Analysis
    yPos = addSectionTitle(pdf, 'Business Performance Analysis', yPos)
    
    const performanceHeaders = ['Key Metric', 'Current Value', 'Performance Rating', 'Trend']
    const performanceRows = [
      [
        'Revenue Performance', 
        `₱${totalRevenue.toLocaleString()}`, 
        totalRevenue > 50000 ? 'Excellent' : totalRevenue > 20000 ? 'Good' : 'Developing',
        'Growing'
      ],
      [
        'Order Volume', 
        totalOrders.toLocaleString(), 
        totalOrders > 100 ? 'High Volume' : totalOrders > 50 ? 'Moderate' : 'Growing',
        totalOrders > 50 ? 'Strong' : 'Steady'
      ],
      [
        'Profit Margin', 
        `${profitMargin.toFixed(1)}%`, 
        profitMargin >= 20 ? 'Excellent' : profitMargin >= 10 ? 'Good' : profitMargin >= 0 ? 'Fair' : 'Critical',
        profitMargin > 15 ? 'Healthy' : profitMargin > 0 ? 'Stable' : 'Needs Attention'
      ],
      [
        'Customer Spend', 
        `₱${avgOrderValue.toFixed(2)}`, 
        avgOrderValue > 500 ? 'Premium' : avgOrderValue > 200 ? 'Standard' : 'Value',
        'Optimizing'
      ]
    ]
    
    yPos = addDataTable(pdf, performanceHeaders, performanceRows, yPos)
    
    // Strategic Recommendations
    yPos = addSectionTitle(pdf, 'Strategic Recommendations', yPos)
    
    // Create recommendation cards
    const pageWidth = pdf.internal.pageSize.width
    const margin = 25
    let recommendations: string[] = []
    
    if (profitMargin < 0) {
      recommendations = [
        'CRITICAL: Address negative profit margin through cost reduction',
        'Review all operational expenses and identify cost-saving opportunities',
        'Consider pricing strategy adjustments to improve margins'
      ]
    } else if (profitMargin < 10) {
      recommendations = [
        'Focus on operational efficiency to improve profit margins',
        'Analyze top-performing products and optimize product mix',
        'Implement cost control measures across all business areas'
      ]
    } else if (profitMargin < 20) {
      recommendations = [
        'Strong foundation - consider expansion opportunities',
        'Invest in marketing to increase customer acquisition',
        'Optimize high-margin products and services'
      ]
    } else {
      recommendations = [
        'Excellent performance - scale successful strategies',
        'Consider market expansion or new product lines',
        'Maintain operational excellence while growing'
      ]
    }
    
    if (totalOrders === 0) {
      recommendations.unshift('URGENT: Activate sales operations immediately')
    }
    
    // Simple recommendations like receipt text
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    recommendations.forEach((rec) => {
      // Check if we need a new page
      if (yPos > 260) {
        pdf.addPage()
        yPos = addSimpleHeader(pdf, 'Business Report (continued)')
        yPos = addSectionTitle(pdf, 'Strategic Recommendations (continued)', yPos)
      }
      
      // Simple bullet point and text
      const cleanRec = rec.replace(/[^\w\s\-.,]/g, '').trim()
      pdf.text(`• ${cleanRec}`, 25, yPos)
      yPos += 15
    })
    
    addProfessionalFooter(pdf)
    return yPos + 20
  }

  // Enhanced Order Analytics PDF Content Functions
  const addOrderVolumeTrendsContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Order Volume Analysis', yPos)
    
    if (data.orderVolumeData.length === 0) {
      const suggestions = [
        'Verify orders exist within the selected date range',
        'Check POS system connectivity and data sync',
        'Review order processing workflow'
      ]
      yPos = addNoDataState(pdf, 'No Order Volume Data', 
        'No order volume data found for the selected period', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }

    const totalOrders = data.orderVolumeData.reduce((sum, day) => sum + day.orders, 0)
    const totalRevenue = data.orderVolumeData.reduce((sum, day) => sum + day.revenue, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const bestDay = data.orderVolumeData.reduce((best, day) => day.orders > best.orders ? day : best, data.orderVolumeData[0])
    const worstDay = data.orderVolumeData.reduce((worst, day) => day.orders < worst.orders ? day : worst, data.orderVolumeData[0])

    // Key Volume Metrics
    const volumeMetrics = [
      { label: 'Total Orders', value: totalOrders.toLocaleString() },
      { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
      { label: 'Avg Order Value', value: `₱${avgOrderValue.toFixed(2)}` },
      { label: 'Peak Day Orders', value: `${bestDay.orders} orders (${bestDay.date})` },
      { label: 'Lowest Day Orders', value: `${worstDay.orders} orders (${worstDay.date})` }
    ]

    yPos = addSimpleMetrics(pdf, volumeMetrics, yPos)
    yPos += 15

    // Volume Trends Analysis
    yPos = addSectionTitle(pdf, 'Daily Volume Breakdown', yPos)
    
    data.orderVolumeData.slice(0, 10).forEach((day) => {
      pdf.text(`${day.date}: ${day.orders} orders, ₱${day.revenue.toLocaleString()} revenue`, 25, yPos)
      yPos += 12
      
      if (yPos > 260) {
        pdf.addPage()
        yPos = addSimpleHeader(pdf, 'Order Volume Trends (continued)')
      }
    })

    addProfessionalFooter(pdf)
    return yPos + 20
  }

  const addPeakHoursAnalysisContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Peak Hours Performance Analysis', yPos)
    
    if (data.peakHoursData.length === 0) {
      const suggestions = [
        'Ensure orders have proper timestamps',
        'Verify order processing during different hours',
        'Check for system timezone configuration'
      ]
      yPos = addNoDataState(pdf, 'No Peak Hours Data', 
        'No hourly order data found for analysis', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }

    const totalHourlyOrders = data.peakHoursData.reduce((sum, hour) => sum + hour.orders, 0)
    const totalHourlyRevenue = data.peakHoursData.reduce((sum, hour) => sum + hour.revenue, 0)
    const peakHour = data.peakHoursData[0] // Already sorted by orders desc
    const quietHour = data.peakHoursData[data.peakHoursData.length - 1]

    // Peak Hours Metrics
    const peakMetrics = [
      { label: 'Peak Hour', value: `${peakHour.hour}:00 (${peakHour.orders} orders)` },
      { label: 'Peak Hour Revenue', value: `₱${peakHour.revenue.toLocaleString()}` },
      { label: 'Quietest Hour', value: `${quietHour.hour}:00 (${quietHour.orders} orders)` },
      { label: 'Active Hours', value: `${data.peakHoursData.filter(h => h.orders > 0).length}/24` },
      { label: 'Avg Hourly Orders', value: `${(totalHourlyOrders / 24).toFixed(1)}` }
    ]

    yPos = addSimpleMetrics(pdf, peakMetrics, yPos)
    yPos += 15

    // Top 10 Peak Hours
    yPos = addSectionTitle(pdf, 'Top 10 Busiest Hours', yPos)
    
    data.peakHoursData.slice(0, 10).forEach((hour, index) => {
      const timeFormat = hour.hour === 0 ? '12:00 AM' : 
                        hour.hour < 12 ? `${hour.hour}:00 AM` :
                        hour.hour === 12 ? '12:00 PM' : `${hour.hour - 12}:00 PM`
      
      pdf.text(`${index + 1}. ${timeFormat}: ${hour.orders} orders, ₱${hour.revenue.toLocaleString()}`, 25, yPos)
      yPos += 12
      
      if (yPos > 260) {
        pdf.addPage()
        yPos = addSimpleHeader(pdf, 'Peak Hours Analysis (continued)')
      }
    })

    addProfessionalFooter(pdf)
    return yPos + 20
  }

  const addPaymentMethodInsightsContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Payment Method Analysis', yPos)
    
    if (data.paymentMethodAnalytics.length === 0) {
      const suggestions = [
        'Verify payment method data is being recorded',
        'Check POS system payment tracking',
        'Review order completion workflow'
      ]
      yPos = addNoDataState(pdf, 'No Payment Data', 
        'No payment method data found for analysis', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }

    const totalAmount = data.paymentMethodAnalytics.reduce((sum, method) => sum + method.amount, 0)
    const totalTransactions = data.paymentMethodAnalytics.reduce((sum, method) => sum + method.transactions, 0)
    const topMethod = data.paymentMethodAnalytics[0] // Already sorted by amount desc

    // Payment Insights Metrics
    const paymentMetrics = [
      { label: 'Total Transaction Value', value: `₱${totalAmount.toLocaleString()}` },
      { label: 'Total Transactions', value: totalTransactions.toLocaleString() },
      { label: 'Most Used Method', value: `${topMethod.method} (${topMethod.percentage.toFixed(1)}%)` },
      { label: 'Payment Methods Used', value: data.paymentMethodAnalytics.length.toString() },
      { label: 'Avg Transaction Value', value: `₱${(totalAmount / totalTransactions).toFixed(2)}` }
    ]

    yPos = addSimpleMetrics(pdf, paymentMetrics, yPos)
    yPos += 15

    // Payment Method Breakdown
    yPos = addSectionTitle(pdf, 'Payment Method Breakdown', yPos)
    
    data.paymentMethodAnalytics.forEach((method) => {
      pdf.text(`${method.method}:`, 25, yPos)
      pdf.text(`  Amount: ₱${method.amount.toLocaleString()} (${method.percentage.toFixed(1)}%)`, 25, yPos + 8)
      pdf.text(`  Transactions: ${method.transactions} | Avg: ₱${method.avgOrderValue.toFixed(2)}`, 25, yPos + 16)
      yPos += 30
      
      if (yPos > 260) {
        pdf.addPage()
        yPos = addSimpleHeader(pdf, 'Payment Method Analysis (continued)')
      }
    })

    addProfessionalFooter(pdf)
    return yPos + 20
  }

  const addComprehensiveOrderReportContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart
    
    yPos = addSectionTitle(pdf, 'Comprehensive Order Analytics', yPos)
    
    if (!data.comprehensiveOrderAnalytics) {
      const suggestions = [
        'Verify comprehensive order data is available',
        'Check all analytics data sources',
        'Review order processing pipeline'
      ]
      yPos = addNoDataState(pdf, 'No Comprehensive Data', 
        'Comprehensive order analytics data unavailable', suggestions, yPos)
      addProfessionalFooter(pdf)
      return yPos
    }

    const analytics = data.comprehensiveOrderAnalytics.summary

    // Executive Summary Metrics
    const summaryMetrics = [
      { label: 'Total Orders', value: analytics.totalOrders.toLocaleString() },
      { label: 'Total Revenue', value: `₱${analytics.totalRevenue.toLocaleString()}` },
      { label: 'Average Order Value', value: `₱${analytics.avgOrderValue.toFixed(2)}` },
      { label: 'Peak Operating Hour', value: `${analytics.peakHour}:00` },
      { label: 'Preferred Payment', value: analytics.mostUsedPaymentMethod },
      { label: 'Growth Rate', value: `${analytics.growthRate.toFixed(1)}%` }
    ]

    yPos = addSimpleMetrics(pdf, summaryMetrics, yPos)
    yPos += 15

    // Quarterly Trends
    if (data.comprehensiveOrderAnalytics.quarterlyTrends.length > 0) {
      yPos = addSectionTitle(pdf, 'Quarterly Performance Trends', yPos)
      
      data.comprehensiveOrderAnalytics.quarterlyTrends.forEach((quarter) => {
        const growthText = quarter.growth > 0 ? `+${quarter.growth.toFixed(1)}%` : `${quarter.growth.toFixed(1)}%`
        pdf.text(`${quarter.period}: ${quarter.orders} orders, ₱${quarter.revenue.toLocaleString()} (${growthText})`, 25, yPos)
        yPos += 12
        
        if (yPos > 260) {
          pdf.addPage()
          yPos = addSimpleHeader(pdf, 'Comprehensive Order Report (continued)')
        }
      })
      yPos += 15
    }

    // Key Insights
    yPos = addSectionTitle(pdf, 'Strategic Insights', yPos)
    
    const insights = [
      `Peak performance occurs at ${analytics.peakHour}:00 - optimize staffing during this time`,
      `${analytics.mostUsedPaymentMethod} is the preferred payment method (${analytics.totalOrders} orders)`,
      `Average order value of ₱${analytics.avgOrderValue.toFixed(2)} indicates customer spending patterns`,
      `Growth rate of ${analytics.growthRate.toFixed(1)}% shows business trajectory`,
      'Consider promotional campaigns during low-volume hours for increased revenue'
    ]

    insights.forEach((insight) => {
      if (yPos > 260) {
        pdf.addPage()
        yPos = addSimpleHeader(pdf, 'Comprehensive Order Report (continued)')
      }
      
      pdf.text(`• ${insight}`, 25, yPos)
      yPos += 15
    })

    addProfessionalFooter(pdf)
    return yPos + 20
  }

  const getReportTitle = (reportType: string): string => {
    const titles: Record<string, string> = {
      daily_sales: 'Daily Sales Summary Report',
      profit_loss: 'Profit & Loss Statement',
      payment_methods: 'Payment Methods Analysis Report',
      inventory_summary: 'Inventory Summary Report',
      menu_performance: 'Menu Performance Report',
      executive_summary: 'Executive Summary Report',
      // Enhanced Order Analytics
      order_volume_trends: 'Order Volume Trends Analysis',
      peak_hours_analysis: 'Peak Hours Performance Report',
      payment_method_insights: 'Payment Method Insights Report',
      order_comprehensive: 'Comprehensive Order Analytics Report'
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

  // Debug rendering - show something even if contexts aren't loaded
  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-yellow-800">Authentication Required</h2>
          <p className="text-yellow-700 mt-1">Please log in to access Business Reports.</p>
        </div>
      </div>
    )
  }

  if (!selectedBranch) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-orange-800">Branch Selection Required</h2>
          <p className="text-orange-700 mt-1">Please select a branch to access Business Reports.</p>
        </div>
      </div>
    )
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