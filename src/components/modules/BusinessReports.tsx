'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import jsPDF from 'jspdf'

interface ReportData {
  orders: any[]
  inventory: any[]
  expenses: any[]
  shifts: any[]
  timeRange: string
}

export default function BusinessReports() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  
  const [loading, setLoading] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState('daily_sales')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Report Categories
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: '💰',
      reports: [
        { id: 'daily_sales', name: 'Daily Sales Summary', desc: 'Complete sales breakdown with payment methods' },
        { id: 'profit_loss', name: 'Profit & Loss Statement', desc: 'Revenue vs expenses analysis' },
        { id: 'payment_methods', name: 'Payment Methods Analysis', desc: 'Breakdown by cash, cards, digital payments' },
        { id: 'cash_flow', name: 'Cash Flow Report', desc: 'Cash movements and float management' }
      ]
    },
    {
      title: 'Operational Reports',
      icon: '📊',
      reports: [
        { id: 'shift_performance', name: 'Shift Performance', desc: 'Individual shift analysis and comparison' },
        { id: 'hourly_sales', name: 'Hourly Sales Analysis', desc: 'Peak hours and performance trends' },
        { id: 'staff_productivity', name: 'Staff Productivity', desc: 'Employee performance metrics' },
        { id: 'customer_analytics', name: 'Customer Analytics', desc: 'Customer patterns and behavior' }
      ]
    },
    {
      title: 'Inventory Reports',
      icon: '📦',
      reports: [
        { id: 'inventory_summary', name: 'Inventory Summary', desc: 'Current stock levels and valuations' },
        { id: 'stock_movement', name: 'Stock Movement Report', desc: 'Inventory transactions and changes' },
        { id: 'reorder_alerts', name: 'Reorder Alerts', desc: 'Low stock items and reorder suggestions' },
        { id: 'waste_analysis', name: 'Waste & Shrinkage', desc: 'Inventory losses and waste tracking' }
      ]
    },
    {
      title: 'Menu/Product Reports',
      icon: '🍽️',
      reports: [
        { id: 'menu_performance', name: 'Menu Performance', desc: 'Best/worst performing menu items' },
        { id: 'category_analysis', name: 'Category Analysis', desc: 'Performance by product categories' },
        { id: 'recipe_profitability', name: 'Recipe Profitability', desc: 'Cost analysis and profit margins' },
        { id: 'seasonal_trends', name: 'Seasonal Trends', desc: 'Time-based performance patterns' }
      ]
    },
    {
      title: 'Business Intelligence',
      icon: '📈',
      reports: [
        { id: 'executive_summary', name: 'Executive Summary', desc: 'High-level business overview' },
        { id: 'comparative_analysis', name: 'Comparative Analysis', desc: 'Period-over-period comparisons' },
        { id: 'growth_trends', name: 'Growth Trends', desc: 'Business growth and projections' },
        { id: 'kpi_dashboard', name: 'KPI Dashboard', desc: 'Key performance indicators summary' }
      ]
    }
  ]

  const fetchReportData = async (): Promise<ReportData> => {
    if (!selectedBranch || !profile?.tenantId) {
      throw new Error('Missing branch or tenant information')
    }

    const locationId = getBranchLocationId(selectedBranch.id)
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)  // Fix: Include the full day
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'custom':
        if (customStartDate) startDate.setTime(new Date(customStartDate).getTime())
        if (customEndDate) endDate.setTime(new Date(customEndDate).getTime())
        break
    }

    console.log('📊 BusinessReports Debug - Date Range:', {
      dateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      locationId,
      tenantId: profile.tenantId
    })

    const timeRangeLabel = dateRange === 'custom' 
      ? `${customStartDate} to ${customEndDate}`
      : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)

    // Fetch orders
    const ordersRef = collection(db, `tenants/${profile.tenantId}/posOrders`)
    const ordersQuery = query(
      ordersRef,
      where('locationId', '==', locationId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    )
    const ordersSnapshot = await getDocs(ordersQuery)
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    console.log('📊 BusinessReports Debug - Orders fetched:', {
      totalCount: orders.length,
      firstOrder: orders[0] || 'No orders found',
      sampleData: orders.slice(0, 3).map(o => ({
        id: o.id,
        total: (o as any).total,
        status: (o as any).status,
        paymentMethod: (o as any).paymentMethod,
        createdAt: (o as any).createdAt
      }))
    })

    // Fetch inventory (current state) - SECURED: Filter by locationId
    const inventoryRef = collection(db, `tenants/${profile.tenantId}/inventory`)
    const inventoryQuery = query(
      inventoryRef,
      where('locationId', '==', locationId) // SECURITY: Filter by branch
    )
    const inventorySnapshot = await getDocs(inventoryQuery)
    const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Fetch expenses - SECURED: Filter by locationId
    const expensesRef = collection(db, `tenants/${profile.tenantId}/expenses`)
    const expensesQuery = query(
      expensesRef,
      where('locationId', '==', locationId), // SECURITY: Filter by branch
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    )
    const expensesSnapshot = await getDocs(expensesQuery)
    const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Fetch shifts - SECURED: Filter by locationId
    const shiftsRef = collection(db, `tenants/${profile.tenantId}/shifts`)
    const shiftsQuery = query(
      shiftsRef,
      where('locationId', '==', locationId), // SECURITY: Filter by branch
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    )
    const shiftsSnapshot = await getDocs(shiftsQuery)
    const shifts = shiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    return {
      orders,
      inventory,
      expenses,
      shifts,
      timeRange: timeRangeLabel
    }
  }

  const generatePDF = async (reportType: string) => {
    setLoading(true)
    try {
      const data = await fetchReportData()
      const pdf = new jsPDF()

      switch (reportType) {
        case 'daily_sales':
          await generateDailySalesReport(pdf, data)
          break
        case 'profit_loss':
          await generateProfitLossReport(pdf, data)
          break
        case 'payment_methods':
          await generatePaymentMethodsReport(pdf, data)
          break
        case 'cash_flow':
          await generateCashFlowReport(pdf, data)
          break
        case 'shift_performance':
          await generateShiftPerformanceReport(pdf, data)
          break
        case 'hourly_sales':
          await generateHourlySalesReport(pdf, data)
          break
        case 'staff_productivity':
          await generateStaffProductivityReport(pdf, data)
          break
        case 'customer_analytics':
          await generateCustomerAnalyticsReport(pdf, data)
          break
        case 'inventory_summary':
          await generateInventorySummaryReport(pdf, data)
          break
        case 'stock_movement':
          await generateStockMovementReport(pdf, data)
          break
        case 'reorder_alerts':
          await generateReorderAlertsReport(pdf, data)
          break
        case 'waste_analysis':
          await generateWasteAnalysisReport(pdf, data)
          break
        case 'menu_performance':
          await generateMenuPerformanceReport(pdf, data)
          break
        case 'category_analysis':
          await generateCategoryAnalysisReport(pdf, data)
          break
        case 'recipe_profitability':
          await generateRecipeProfitabilityReport(pdf, data)
          break
        case 'seasonal_trends':
          await generateSeasonalTrendsReport(pdf, data)
          break
        case 'executive_summary':
          await generateExecutiveSummaryReport(pdf, data)
          break
        case 'comparative_analysis':
          await generateComparativeAnalysisReport(pdf, data)
          break
        case 'growth_trends':
          await generateGrowthTrendsReport(pdf, data)
          break
        case 'kpi_dashboard':
          await generateKpiDashboardReport(pdf, data)
          break
        default:
          await generateGenericReport(pdf, data, reportType)
      }

      const filename = `${reportType.replace('_', '-')}-${data.timeRange.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)

    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Report Generators
  const generateDailySalesReport = async (pdf: jsPDF, data: ReportData) => {
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

    // Sales Summary
    const completedOrders = data.orders.filter(o => o.status === 'completed')
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalTransactions = completedOrders.length
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    console.log('📊 PDF Report Debug - Sales Summary:', {
      totalOrders: data.orders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      sampleOrder: completedOrders[0] || 'No completed orders'
    })

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
      ['Peak Hour:', 'Analysis needed'], // Would calculate from orders
      ['Best Performing Day:', 'Analysis needed']
    ]

    salesData.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Payment Methods Breakdown
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Payment Methods Breakdown', 20, yPos)
    yPos += 12

    const paymentSummary = {
      cash: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      maya: { amount: 0, count: 0 },
      gcash: { amount: 0, count: 0 }
    }

    completedOrders.forEach(order => {
      const method = (order.paymentMethod || 'cash').toLowerCase()
      const mappedMethod = method === 'paymaya' ? 'maya' : method
      if (paymentSummary[mappedMethod as keyof typeof paymentSummary]) {
        paymentSummary[mappedMethod as keyof typeof paymentSummary].amount += order.total || 0
        paymentSummary[mappedMethod as keyof typeof paymentSummary].count += 1
      }
    })

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    Object.entries(paymentSummary).forEach(([method, data]) => {
      if (data.count > 0) {
        const percentage = totalRevenue > 0 ? ((data.amount / totalRevenue) * 100).toFixed(1) : '0.0'
        pdf.text(`${method.toUpperCase()}:`, 20, yPos)
        pdf.text(`₱${data.amount.toLocaleString()} (${data.count} transactions, ${percentage}%)`, 60, yPos)
        yPos += 7
      }
    })

    // Footer
    const footerY = pdf.internal.pageSize.height - 15
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Generated by CoreTrack Business Management System', pageWidth / 2, footerY, { align: 'center' })
  }

  const generateProfitLossReport = async (pdf: jsPDF, data: ReportData) => {
    // Implementation for P&L report
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Profit & Loss Statement', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Calculate P&L metrics
    const revenue = data.orders.filter(o => o.status === 'completed').reduce((sum, order) => sum + (order.total || 0), 0)
    const expenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = revenue - expenses

    const pnlData = [
      ['REVENUE', ''],
      ['Total Sales:', `₱${revenue.toLocaleString()}`],
      ['', ''],
      ['EXPENSES', ''],
      ['Total Expenses:', `₱${expenses.toLocaleString()}`],
      ['', ''],
      ['NET PROFIT:', `₱${netProfit.toLocaleString()}`],
      ['Profit Margin:', `${revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0'}%`]
    ]

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')

    pnlData.forEach(([label, value]) => {
      if (label === 'REVENUE' || label === 'EXPENSES') {
        pdf.setFont('helvetica', 'bold')
        pdf.text(label, 20, yPos)
        yPos += 10
        pdf.setFont('helvetica', 'normal')
      } else if (label === 'NET PROFIT:') {
        yPos += 5
        pdf.setFont('helvetica', 'bold')
        pdf.text(label, 20, yPos)
        pdf.text(value, 120, yPos)
        yPos += 7
        pdf.setFont('helvetica', 'normal')
      } else if (label && value) {
        pdf.text(label, 30, yPos)
        pdf.text(value, 120, yPos)
        yPos += 7
      } else {
        yPos += 5
      }
    })
  }

  const generatePaymentMethodsReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Payment Methods Analysis', pageWidth / 2, yPos, { align: 'center' })
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

    // Calculate payment method statistics
    const completedOrders = data.orders.filter(o => o.status === 'completed')
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0)

    const paymentSummary = {
      cash: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      maya: { amount: 0, count: 0 },
      gcash: { amount: 0, count: 0 }
    }

    completedOrders.forEach(order => {
      const method = (order.paymentMethod || 'cash').toLowerCase()
      const mappedMethod = method === 'paymaya' ? 'maya' : method
      if (paymentSummary[mappedMethod as keyof typeof paymentSummary]) {
        paymentSummary[mappedMethod as keyof typeof paymentSummary].amount += order.total || 0
        paymentSummary[mappedMethod as keyof typeof paymentSummary].count += 1
      }
    })

    // Payment Methods Summary
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')  
    pdf.text('Payment Methods Breakdown', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    Object.entries(paymentSummary).forEach(([method, data]) => {
      if (data.count > 0) {
        const percentage = totalRevenue > 0 ? ((data.amount / totalRevenue) * 100).toFixed(1) : '0.0'
        pdf.text(`${method.toUpperCase()}:`, 20, yPos)
        pdf.text(`₱${data.amount.toLocaleString()}`, 80, yPos)
        pdf.text(`${data.count} transactions`, 140, yPos)
        pdf.text(`${percentage}%`, 180, yPos)
        yPos += 8
      }
    })

    yPos += 10

    // Summary totals
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Summary', 20, yPos)
    yPos += 10

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Revenue: ₱${totalRevenue.toLocaleString()}`, 20, yPos)
    yPos += 7
    pdf.text(`Total Transactions: ${completedOrders.length}`, 20, yPos)
    yPos += 7
    pdf.text(`Average Transaction: ₱${completedOrders.length > 0 ? (totalRevenue / completedOrders.length).toFixed(2) : '0.00'}`, 20, yPos)
  }

  const generateGenericReport = async (pdf: jsPDF, data: ReportData, reportType: string) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${reportType.replace('_', ' ').toUpperCase()} Report`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report is under development.', 20, yPos)
    yPos += 10
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
  }

  // Additional report generators would go here...
  const generateShiftPerformanceReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Shift Performance Analysis', pageWidth / 2, yPos, { align: 'center' })
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

    console.log('⏰ Shift Performance Debug:', {
      totalShifts: data.shifts.length,
      totalOrders: data.orders.length,
      sampleShift: data.shifts[0],
      sampleOrder: data.orders[0],
      shiftStatuses: Array.from(new Set(data.shifts.map(s => s.status || 'no-status'))),
      orderFields: data.orders[0] ? Object.keys(data.orders[0]) : 'No orders'
    })

    // Analyze shifts data - FIXED: Better status filtering
    const shifts = data.shifts
    const totalShifts = shifts.length
    const completedShifts = shifts.filter(s => {
      const status = (s.status || '').toLowerCase()
      const isCompleted = status === 'completed' || status === 'closed' || status === 'finished'
      console.log('⏰ Shift status check:', { id: s.id, status: s.status, isCompleted })
      return isCompleted
    })
    const activeShifts = shifts.filter(s => (s.status || '').toLowerCase() === 'active')

    // Shift Overview
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Shift Overview', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const shiftStats = [
      ['Total Shifts:', totalShifts.toString()],
      ['Completed Shifts:', completedShifts.length.toString()],
      ['Active Shifts:', activeShifts.length.toString()],
      ['Average Shift Duration:', calculateAverageShiftDuration(completedShifts)],
      ['Total Revenue from Shifts:', `₱${calculateShiftRevenue(shifts, data.orders).toLocaleString()}`]
    ]

    shiftStats.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Individual Shift Performance - FIXED: Better order matching
    if (completedShifts.length > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Top Performing Shifts', 20, yPos)
      yPos += 12

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')

      // Sort shifts by revenue and show top 5 - FIXED: Multiple matching strategies
      const shiftPerformance = completedShifts.map(shift => {
        const shiftOrders = data.orders.filter(order => {
          if (order.status !== 'completed') return false
          
          // Try multiple matching methods
          const matchByShiftId = order.shiftId === shift.id
          const matchByDate = order.createdAt && shift.startTime && 
                             new Date(order.createdAt).toDateString() === new Date(shift.startTime.seconds ? shift.startTime.seconds * 1000 : shift.startTime).toDateString()
          
          const matched = matchByShiftId || matchByDate
          
          if (matched) {
            console.log('⏰ Order matched to shift:', {
              orderId: order.id,
              shiftId: shift.id,
              method: matchByShiftId ? 'shiftId' : 'date'
            })
          }
          
          return matched
        })
        
        const revenue = shiftOrders.reduce((sum, order) => sum + (order.total || 0), 0)
        
        console.log('⏰ Shift revenue calculation:', {
          shiftId: shift.id,
          ordersFound: shiftOrders.length,
          revenue
        })
        
        return { ...shift, revenue, orderCount: shiftOrders.length }
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

      if (shiftPerformance.length > 0) {
        shiftPerformance.forEach((shift, index) => {
          const startTime = shift.startTime ? 
            new Date(shift.startTime.seconds ? shift.startTime.seconds * 1000 : shift.startTime).toLocaleDateString() : 'N/A'
          pdf.text(`${index + 1}. ${startTime}`, 20, yPos)
          pdf.text(`₱${shift.revenue.toLocaleString()}`, 80, yPos)
          pdf.text(`${shift.orderCount} orders`, 140, yPos)
          yPos += 6
        })
      } else {
        pdf.text('No shift performance data available', 20, yPos)
      }
    } else {
      pdf.setFontSize(10)
      pdf.text('No completed shifts found for the selected period', 20, yPos)
    }
  }

  // Helper functions for shift calculations
  const calculateAverageShiftDuration = (shifts: any[]): string => {
    if (shifts.length === 0) return '0 hours'
    
    const totalMinutes = shifts.reduce((sum, shift) => {
      if (shift.startTime && shift.endTime) {
        const start = new Date(shift.startTime.seconds * 1000)
        const end = new Date(shift.endTime.seconds * 1000)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60)
      }
      return sum
    }, 0)
    
    const avgHours = (totalMinutes / shifts.length / 60).toFixed(1)
    return `${avgHours} hours`
  }

  const calculateShiftRevenue = (shifts: any[], orders: any[]): number => {
    const totalRevenue = shifts.reduce((total, shift) => {
      const shiftOrders = orders.filter(order => {
        if (order.status !== 'completed') return false
        
        // Try multiple matching methods
        const matchByShiftId = order.shiftId === shift.id
        const matchByDate = order.createdAt && shift.startTime && 
                           new Date(order.createdAt).toDateString() === new Date(shift.startTime.seconds ? shift.startTime.seconds * 1000 : shift.startTime).toDateString()
        
        return matchByShiftId || matchByDate
      })
      
      const shiftRevenue = shiftOrders.reduce((sum, order) => sum + (order.total || 0), 0)
      
      console.log('⏰ calculateShiftRevenue for shift:', {
        shiftId: shift.id,
        ordersMatched: shiftOrders.length,
        revenue: shiftRevenue
      })
      
      return total + shiftRevenue
    }, 0)
    
    console.log('⏰ Total shift revenue calculated:', totalRevenue)
    return totalRevenue
  }

  const generateInventorySummaryReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Inventory Summary Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    console.log('📦 Inventory Summary Debug:', {
      totalInventory: data.inventory.length,
      sampleItem: data.inventory[0],
      inventoryFields: data.inventory[0] ? Object.keys(data.inventory[0]) : 'No inventory',
      stockFields: data.inventory.slice(0, 3).map(item => ({
        name: item.name,
        currentStock: item.currentStock,
        quantity: item.quantity,
        unit: item.unit
      })),
      priceFields: data.inventory.slice(0, 3).map(item => ({
        name: item.name,
        price: item.price,
        cost: item.cost,
        costPerUnit: item.costPerUnit,
        unitPrice: item.unitPrice,
        sellPrice: item.sellPrice
      }))
    })

    // Inventory Analysis - FIXED: Handle multiple price field names
    const inventory = data.inventory
    const totalItems = inventory.length
    
    // FIXED: Better low stock detection
    const lowStockItems = inventory.filter(item => {
      const quantity = item.currentStock || item.quantity || 0
      const reorderPoint = item.reorderPoint || item.minStock || item.lowStockThreshold || 5 // fallback to 5
      const isLowStock = quantity <= reorderPoint
      
      if (isLowStock) {
        console.log('📦 Low stock item:', { name: item.name, currentStock: item.currentStock, quantity: item.quantity, reorderPoint })
      }
      
      return isLowStock
    })
    
    const outOfStockItems = inventory.filter(item => (item.currentStock || item.quantity || 0) === 0)
    
    // FIXED: Multiple price field handling
    const totalValue = inventory.reduce((sum, item) => {
      const quantity = item.currentStock || item.quantity || 0
      const price = item.price || item.cost || item.costPerUnit || item.unitPrice || item.sellPrice || 0
      const itemValue = quantity * price
      
      if (itemValue > 0) {
        console.log('📦 Item value:', { name: item.name, currentStock: item.currentStock, quantity: item.quantity, price, itemValue })
      }
      
      return sum + itemValue
    }, 0)

    console.log('📦 Inventory calculations:', {
      totalItems,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      totalValue
    })

    // Inventory Overview
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Inventory Overview', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const inventoryStats = [
      ['Total Items:', totalItems.toString()],
      ['Low Stock Items:', lowStockItems.length.toString()],
      ['Out of Stock Items:', outOfStockItems.length.toString()],
      ['Total Inventory Value:', `₱${totalValue.toLocaleString()}`],
      ['Average Item Value:', `₱${totalItems > 0 ? (totalValue / totalItems).toFixed(2) : '0.00'}`]
    ]

    inventoryStats.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Low Stock Alert
    if (lowStockItems.length > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Low Stock Alert', 20, yPos)
      yPos += 12

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Item Name', 20, yPos)
      pdf.text('Current Stock', 100, yPos)
      pdf.text('Reorder Point', 150, yPos)
      pdf.text('Unit Price', 180, yPos)
      yPos += 8

      // Add a line under headers
      pdf.line(20, yPos - 2, 200, yPos - 2)
      yPos += 2

      lowStockItems.slice(0, 15).forEach(item => { // Show max 15 items
        const price = item.price || item.cost || item.unitPrice || item.sellPrice || 0
        const reorderPoint = item.reorderPoint || item.minStock || item.lowStockThreshold || 5
        const currentStock = item.currentStock || item.quantity || 0
        
        pdf.text(item.name || 'N/A', 20, yPos)
        pdf.text(currentStock.toString(), 100, yPos)
        pdf.text(reorderPoint.toString(), 150, yPos)  
        pdf.text(`₱${price.toFixed(2)}`, 180, yPos)
        yPos += 6
      })

      if (lowStockItems.length > 15) {
        yPos += 5
        pdf.setFont('helvetica', 'italic')
        pdf.text(`... and ${lowStockItems.length - 15} more items`, 20, yPos)
      }
    } else {
      pdf.setFontSize(12)
      pdf.text('✅ No low stock items found', 20, yPos)
      yPos += 10
    }

    yPos += 10

    // Top Value Items - FIXED: Better price field handling
    const topValueItems = inventory
      .map(item => {
        const price = item.price || item.cost || item.unitPrice || item.sellPrice || 0
        const currentStock = item.currentStock || item.quantity || 0
        const totalValue = currentStock * price
        return { ...item, totalValue, displayPrice: price, displayStock: currentStock }
      })
      .filter(item => item.totalValue > 0) // Only show items with value
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)

    if (topValueItems.length > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Top Value Items', 20, yPos)
      yPos += 12

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Item Name', 20, yPos)
      pdf.text('Quantity', 100, yPos)
      pdf.text('Unit Price', 140, yPos)
      pdf.text('Total Value', 180, yPos)
      yPos += 8

      pdf.line(20, yPos - 2, 200, yPos - 2)
      yPos += 2

      topValueItems.forEach(item => {
        pdf.text(item.name || 'N/A', 20, yPos)
        pdf.text(item.displayStock.toString(), 100, yPos)
        pdf.text(`₱${item.displayPrice.toFixed(2)}`, 140, yPos)
        pdf.text(`₱${item.totalValue.toFixed(2)}`, 180, yPos)
        yPos += 6
      })
    } else {
      pdf.setFontSize(12)
      pdf.text('No inventory items with value found', 20, yPos)
    }
  }

  const generateMenuPerformanceReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Menu Performance Analysis', pageWidth / 2, yPos, { align: 'center' })
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

    // Analyze order items
    const completedOrders = data.orders.filter(o => o.status === 'completed')
    const itemSales: { [key: string]: { count: number, revenue: number } } = {}

    // Group items from all orders
    completedOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemName = item.name || 'Unknown Item'
          const itemPrice = item.price || 0
          const quantity = item.quantity || 1
          
          if (!itemSales[itemName]) {
            itemSales[itemName] = { count: 0, revenue: 0 }
          }
          itemSales[itemName].count += quantity
          itemSales[itemName].revenue += itemPrice * quantity
        })
      }
    })

    // Sort by revenue
    const sortedItems = Object.entries(itemSales)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 15) // Top 15 items

    // Top Performing Items
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Top Performing Menu Items', 20, yPos)
    yPos += 12

    if (sortedItems.length > 0) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Item', 20, yPos)
      pdf.text('Qty Sold', 100, yPos)
      pdf.text('Revenue', 140, yPos)
      pdf.text('Avg Price', 180, yPos)
      yPos += 8

      pdf.line(20, yPos - 2, 200, yPos - 2)
      yPos += 2

      sortedItems.forEach(([itemName, data]) => {
        const avgPrice = data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00'
        pdf.text(itemName.length > 25 ? itemName.substring(0, 22) + '...' : itemName, 20, yPos)
        pdf.text(data.count.toString(), 100, yPos)
        pdf.text(`₱${data.revenue.toLocaleString()}`, 140, yPos)
        pdf.text(`₱${avgPrice}`, 180, yPos)
        yPos += 6
      })
    } else {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('No menu item data available for this period.', 20, yPos)
    }

    yPos += 15

    // Summary Statistics
    const totalItems = Object.keys(itemSales).length
    const totalItemsSold = Object.values(itemSales).reduce((sum, item) => sum + item.count, 0)
    const totalRevenue = Object.values(itemSales).reduce((sum, item) => sum + item.revenue, 0)

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Menu Performance Summary', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Unique Items Sold: ${totalItems}`, 20, yPos)
    yPos += 7
    pdf.text(`Total Items Sold: ${totalItemsSold}`, 20, yPos)
    yPos += 7
    pdf.text(`Total Revenue: ₱${totalRevenue.toLocaleString()}`, 20, yPos)
    yPos += 7
    pdf.text(`Average Revenue per Item: ₱${totalItems > 0 ? (totalRevenue / totalItems).toFixed(2) : '0.00'}`, 20, yPos)
  }

  const generateExecutiveSummaryReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Executive Summary', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Business info
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Report Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Key Metrics Calculation
    const completedOrders = data.orders.filter(o => o.status === 'completed')
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses
    const totalTransactions = completedOrders.length
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Key Performance Indicators
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Key Performance Indicators', 20, yPos)
    yPos += 12

    const kpis = [
      ['Total Revenue', `₱${totalRevenue.toLocaleString()}`],
      ['Total Expenses', `₱${totalExpenses.toLocaleString()}`],
      ['Net Profit', `₱${netProfit.toLocaleString()}`],
      ['Profit Margin', `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
      ['Total Transactions', totalTransactions.toString()],
      ['Average Order Value', `₱${averageOrderValue.toFixed(2)}`]
    ]

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    kpis.forEach(([label, value]) => {
      pdf.text(label + ':', 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 8
    })

    yPos += 10

    // Business Health Indicators
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Business Health', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    // Inventory insights
    const totalInventoryValue = data.inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0)
    const lowStockItems = data.inventory.filter(item => (item.quantity || 0) <= (item.reorderPoint || 0))
    
    pdf.text(`Inventory Value: ₱${totalInventoryValue.toLocaleString()}`, 20, yPos)
    yPos += 7
    pdf.text(`Low Stock Items: ${lowStockItems.length}`, 20, yPos)
    yPos += 7
    pdf.text(`Active Shifts: ${data.shifts.filter(s => s.status === 'active').length}`, 20, yPos)
    yPos += 7
    pdf.text(`Completed Shifts: ${data.shifts.filter(s => s.status === 'completed').length}`, 20, yPos)

    yPos += 15

    // Recommendations
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Key Recommendations', 20, yPos)
    yPos += 12

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    const recommendations = []
    if (netProfit < 0) {
      recommendations.push('• Focus on cost reduction - expenses exceed revenue')
    }
    if (lowStockItems.length > 0) {
      recommendations.push(`• Restock ${lowStockItems.length} low inventory items`)
    }
    if (averageOrderValue < 100) {
      recommendations.push('• Consider upselling strategies to increase average order value')
    }
    if (totalTransactions === 0) {
      recommendations.push('• No sales recorded - review operations and marketing efforts')
    }

    if (recommendations.length === 0) {
      recommendations.push('• Business performance is stable - continue current operations')
    }

    recommendations.forEach(rec => {
      pdf.text(rec, 20, yPos)
      yPos += 7
    })
  }

  // Additional Report Generators
  const generateCashFlowReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cash Flow Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    console.log('💰 Cash Flow Report Debug:', {
      totalOrders: data.orders.length,
      totalExpenses: data.expenses.length,
      sampleOrder: data.orders[0],
      sampleExpense: data.expenses[0],
      orderPaymentMethods: Array.from(new Set(data.orders.map(o => o.paymentMethod))),
      expenseFields: data.expenses[0] ? Object.keys(data.expenses[0]) : 'No expenses'
    })

    // Calculate cash flow from orders and expenses - FIXED: Handle missing paymentMethod
    const cashIncome = data.orders.filter(o => {
      const isCompleted = o.status === 'completed'
      const isCash = (o.paymentMethod || '').toLowerCase() === 'cash'
      console.log('💰 Order cash check:', { id: o.id, status: o.status, paymentMethod: o.paymentMethod, isCompleted, isCash })
      return isCompleted && isCash
    }).reduce((sum, order) => sum + (order.total || 0), 0)
    
    // FIXED: Look for expenses without requiring paymentMethod field
    const cashExpenses = data.expenses.filter(e => {
      // Check multiple possible payment method fields
      const paymentMethod = e.paymentMethod || e.method || e.type || 'unknown'
      const isCash = paymentMethod.toLowerCase() === 'cash'
      console.log('💰 Expense cash check:', { id: e.id, amount: e.amount, paymentMethod, isCash })
      return isCash
    }).reduce((sum, expense) => sum + (expense.amount || 0), 0)

    // FALLBACK: If no cash expenses found, use all expenses (assuming cash)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const expensesToUse = cashExpenses > 0 ? cashExpenses : totalExpenses

    const netCashFlow = cashIncome - expensesToUse

    console.log('💰 Cash Flow Calculations:', {
      cashIncome,
      cashExpenses,
      totalExpenses,
      expensesToUse,
      netCashFlow
    })

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Cash Flow Summary', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Cash Income: ₱${cashIncome.toLocaleString()}`, 20, yPos)
    yPos += 7
    pdf.text(`Cash Expenses: ₱${expensesToUse.toLocaleString()}`, 20, yPos)
    yPos += 7
    if (expensesToUse === totalExpenses && cashExpenses === 0) {
      pdf.setFontSize(9)
      pdf.text('(Note: All expenses assumed as cash - no payment method specified)', 20, yPos)
      yPos += 7
    }
    pdf.setFontSize(11)
    pdf.text(`Net Cash Flow: ₱${netCashFlow.toLocaleString()}`, 20, yPos)
  }

  const generateHourlySalesReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Hourly Sales Analysis', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12) 
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Group orders by hour
    const hourlyData: { [key: string]: { count: number, revenue: number } } = {}
    
    data.orders.filter(o => o.status === 'completed').forEach(order => {
      if (order.createdAt) {
        const hour = new Date(order.createdAt.seconds * 1000).getHours()
        const hourKey = `${hour}:00`
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { count: 0, revenue: 0 }
        }
        hourlyData[hourKey].count += 1
        hourlyData[hourKey].revenue += order.total || 0
      }
    })

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Sales by Hour', 20, yPos)
    yPos += 12

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Hour', 20, yPos)
    pdf.text('Orders', 60, yPos)
    pdf.text('Revenue', 100, yPos)
    pdf.text('Avg Order', 140, yPos)
    yPos += 8

    Object.entries(hourlyData).sort().forEach(([hour, data]) => {
      const avgOrder = data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00'
      pdf.text(hour, 20, yPos)
      pdf.text(data.count.toString(), 60, yPos)
      pdf.text(`₱${data.revenue.toLocaleString()}`, 100, yPos)
      pdf.text(`₱${avgOrder}`, 140, yPos)
      yPos += 6
    })
  }

  const generateStaffProductivityReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Staff Productivity Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires staff/user tracking implementation.', 20, yPos)
    yPos += 10
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
  }

  const generateCustomerAnalyticsReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Customer Analytics Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires customer tracking implementation.', 20, yPos)
    yPos += 10
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
  }

  const generateStockMovementReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Stock Movement Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

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

    console.log('📊 Stock Movement Report Debug:', {
      totalOrders: data.orders.length,
      totalInventory: data.inventory.length,
      reportPeriod: data.timeRange
    })

    // IMPLEMENTED: Stock movement analysis based on completed orders
    const completedOrders = data.orders.filter(order => order.status === 'completed')
    
    console.log('📊 Analyzing stock movements from orders:', {
      totalOrders: data.orders.length,
      completedOrders: completedOrders.length
    })

    // Calculate stock movements from sales
    const stockMovements = new Map<string, {
      itemName: string,
      totalSold: number,
      orderCount: number,
      revenue: number,
      unit: string
    }>()

    // Process each completed order
    completedOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((orderItem: any) => {
          const itemName = orderItem.name || orderItem.itemName || 'Unknown Item'
          const quantity = orderItem.quantity || 1
          const price = orderItem.price || orderItem.total || 0
          
          if (stockMovements.has(itemName)) {
            const existing = stockMovements.get(itemName)!
            existing.totalSold += quantity
            existing.orderCount += 1
            existing.revenue += price * quantity
          } else {
            stockMovements.set(itemName, {
              itemName,
              totalSold: quantity,
              orderCount: 1,
              revenue: price * quantity,
              unit: orderItem.unit || 'units'
            })
          }
        })
      }
    })

    console.log('📊 Stock movement summary:', {
      uniqueItems: stockMovements.size,
      movements: Array.from(stockMovements.values())
    })

    // Display movement summary
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Stock Movement Summary', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const totalItemsSold = Array.from(stockMovements.values()).reduce((sum, item) => sum + item.totalSold, 0)
    const totalRevenue = Array.from(stockMovements.values()).reduce((sum, item) => sum + item.revenue, 0)
    
    const summaryStats = [
      ['Period:', data.timeRange],
      ['Completed Orders:', completedOrders.length.toString()],
      ['Unique Items Sold:', stockMovements.size.toString()],
      ['Total Items Moved:', totalItemsSold.toString()],
      ['Total Sales Revenue:', `₱${totalRevenue.toLocaleString()}`]
    ]

    summaryStats.forEach(([label, value]) => {
      pdf.text(label, 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Top moving items
    if (stockMovements.size > 0) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Top Moving Items', 20, yPos)
      yPos += 12

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Item Name', 20, yPos)
      pdf.text('Qty Sold', 100, yPos)
      pdf.text('Orders', 140, yPos)
      pdf.text('Revenue', 180, yPos)
      yPos += 8

      pdf.line(20, yPos - 2, 200, yPos - 2)
      yPos += 2

      // Sort by quantity sold
      const topMovingItems = Array.from(stockMovements.values())
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 15)

      topMovingItems.forEach(item => {
        pdf.text(item.itemName, 20, yPos)
        pdf.text(`${item.totalSold} ${item.unit}`, 100, yPos)
        pdf.text(item.orderCount.toString(), 140, yPos)
        pdf.text(`₱${item.revenue.toLocaleString()}`, 180, yPos)
        yPos += 6
      })

      if (stockMovements.size > 15) {
        yPos += 5
        pdf.setFont('helvetica', 'italic')
        pdf.text(`... and ${stockMovements.size - 15} more items`, 20, yPos)
      }
    } else {
      pdf.setFontSize(12)
      pdf.text('No stock movements found for the selected period', 20, yPos)
      yPos += 10
      pdf.setFontSize(10)
      pdf.text('• No completed orders with item details', 20, yPos)
      yPos += 6
      pdf.text('• Check if orders contain item information', 20, yPos)
      yPos += 6
      pdf.text('• Verify the selected date range includes recent sales', 20, yPos)
    }

    // Current inventory status
    yPos += 15
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Current Inventory Status', 20, yPos)
    yPos += 12

    if (data.inventory.length > 0) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Item Name', 20, yPos)
      pdf.text('Current Stock', 100, yPos)
      pdf.text('Status', 140, yPos)
      pdf.text('Value', 180, yPos)
      yPos += 8

      pdf.line(20, yPos - 2, 200, yPos - 2)
      yPos += 2

      data.inventory.slice(0, 10).forEach(item => {
        const stock = item.currentStock || item.quantity || 0
        const price = item.price || item.cost || item.costPerUnit || 0
        const value = stock * price
        const status = stock === 0 ? 'Out' : (stock <= (item.minStock || item.reorderPoint || 5)) ? 'Low' : 'Good'
        
        pdf.text(item.name || 'Unknown', 20, yPos)
        pdf.text(`${stock} ${item.unit || 'units'}`, 100, yPos)
        pdf.text(status, 140, yPos)
        pdf.text(`₱${value.toFixed(2)}`, 180, yPos)
        yPos += 6
      })

      if (data.inventory.length > 10) {
        yPos += 5
        pdf.setFont('helvetica', 'italic')
        pdf.text(`... and ${data.inventory.length - 10} more inventory items`, 20, yPos)
      }
    } else {
      pdf.setFontSize(12)
      pdf.text('No inventory data available', 20, yPos)
    }
  }

  const generateReorderAlertsReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Reorder Alerts Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Find items that need reordering
    const lowStockItems = data.inventory.filter(item => 
      (item.quantity || 0) <= (item.reorderPoint || 0) && (item.reorderPoint || 0) > 0
    )

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Items Requiring Reorder (${lowStockItems.length})`, 20, yPos)
    yPos += 12

    if (lowStockItems.length > 0) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Item Name', 20, yPos)
      pdf.text('Current', 100, yPos)
      pdf.text('Reorder Point', 140, yPos)
      pdf.text('Suggested Order', 180, yPos)
      yPos += 8

      lowStockItems.forEach(item => {
        const suggestedOrder = Math.max((item.reorderPoint || 0) * 2 - (item.quantity || 0), 0)
        pdf.text(item.name || 'N/A', 20, yPos)
        pdf.text((item.quantity || 0).toString(), 100, yPos)
        pdf.text((item.reorderPoint || 0).toString(), 140, yPos)
        pdf.text(suggestedOrder.toString(), 180, yPos)
        yPos += 6
      })
    } else {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('No items currently need reordering.', 20, yPos)
    }
  }

  const generateWasteAnalysisReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Waste & Shrinkage Analysis', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires waste tracking implementation.', 20, yPos)
    yPos += 10
    pdf.text(`Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
  }

  // New Missing Report Generators
  const generateCategoryAnalysisReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Category Analysis Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

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

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Product Category Performance', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires product category classification.', 20, yPos)
    yPos += 8
    pdf.text('Categories can be set up in inventory management.', 20, yPos)
  }

  const generateRecipeProfitabilityReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Recipe Profitability Analysis', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

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

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Recipe Cost Analysis', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires recipe/ingredient cost tracking.', 20, yPos)
    yPos += 8
    pdf.text('Set up recipes in Menu Builder to enable cost analysis.', 20, yPos)
  }

  const generateSeasonalTrendsReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Seasonal Trends Analysis', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

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

    // Analyze orders by month/season if sufficient data
    const completedOrders = data.orders.filter(o => o.status === 'completed')
    const monthlyData: { [key: string]: { count: number, revenue: number } } = {}

    completedOrders.forEach(order => {
      if (order.createdAt) {
        const date = new Date(order.createdAt.seconds * 1000)
        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' })
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, revenue: 0 }
        }
        monthlyData[monthKey].count += 1
        monthlyData[monthKey].revenue += order.total || 0
      }
    })

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Monthly Performance Trends', 20, yPos)
    yPos += 12

    if (Object.keys(monthlyData).length > 0) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Month', 20, yPos)
      pdf.text('Orders', 80, yPos)
      pdf.text('Revenue', 130, yPos)
      pdf.text('Avg Order', 180, yPos)
      yPos += 8

      Object.entries(monthlyData).forEach(([month, data]) => {
        const avgOrder = data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00'
        pdf.text(month, 20, yPos)
        pdf.text(data.count.toString(), 80, yPos)
        pdf.text(`₱${data.revenue.toLocaleString()}`, 130, yPos)
        pdf.text(`₱${avgOrder}`, 180, yPos)
        yPos += 6
      })
    } else {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Insufficient data for seasonal trend analysis.', 20, yPos)
    }
  }

  const generateComparativeAnalysisReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Comparative Analysis Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, yPos)
    yPos += 8
    pdf.text(`Current Period: ${data.timeRange}`, 20, yPos)
    yPos += 8
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Period-over-Period Comparison', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires historical data comparison.', 20, yPos)
    yPos += 8
    pdf.text('Enable period comparison in advanced analytics.', 20, yPos)
  }

  const generateGrowthTrendsReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Growth Trends Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

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

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Business Growth Analysis', 20, yPos)
    yPos += 12

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text('This report requires long-term historical data.', 20, yPos)
    yPos += 8
    pdf.text('Growth projections available with 3+ months of data.', 20, yPos)
  }

  const generateKpiDashboardReport = async (pdf: jsPDF, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    let yPos = 20

    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('KPI Dashboard Report', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

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

    // Calculate comprehensive KPIs
    const completedOrders = data.orders.filter(o => o.status === 'completed')
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const netProfit = totalRevenue - totalExpenses
    const totalTransactions = completedOrders.length

    // Financial KPIs
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Financial KPIs', 20, yPos)
    yPos += 12

    const financialKPIs = [
      ['Revenue', `₱${totalRevenue.toLocaleString()}`],
      ['Expenses', `₱${totalExpenses.toLocaleString()}`],
      ['Net Profit', `₱${netProfit.toLocaleString()}`],
      ['Profit Margin', `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
      ['Revenue per Transaction', `₱${totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}`]
    ]

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    financialKPIs.forEach(([kpi, value]) => {
      pdf.text(kpi + ':', 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })

    yPos += 10

    // Operational KPIs
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Operational KPIs', 20, yPos)
    yPos += 12

    const operationalKPIs = [
      ['Total Orders', totalTransactions.toString()],
      ['Active Shifts', data.shifts.filter(s => s.status === 'active').length.toString()],
      ['Inventory Items', data.inventory.length.toString()],
      ['Low Stock Items', data.inventory.filter(item => (item.quantity || 0) <= (item.reorderPoint || 0)).length.toString()],
      ['Expense Entries', data.expenses.length.toString()]
    ]

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    operationalKPIs.forEach(([kpi, value]) => {
      pdf.text(kpi + ':', 20, yPos)
      pdf.text(value, 120, yPos)
      yPos += 7
    })
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
            <p className="text-xs text-blue-200">Branch: {selectedBranch?.name}</p>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
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
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
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
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => generatePDF('daily_sales')}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-surface-900">Today&apos;s Sales</p>
              <p className="text-sm text-surface-600">Quick daily summary</p>
            </div>
          </button>

          <button
            onClick={() => generatePDF('profit_loss')}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
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
            onClick={() => generatePDF('executive_summary')}
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
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
