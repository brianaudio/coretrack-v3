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
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
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

  // Report Categories - Streamlined
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: '💰',
      reports: [
        { id: 'daily_sales', name: 'Daily Sales Summary', desc: 'Complete sales breakdown with payment methods' },
        { id: 'profit_loss', name: 'Profit & Loss Statement', desc: 'Revenue vs expenses analysis' },
        { id: 'payment_methods', name: 'Payment Methods Analysis', desc: 'Cash, cards, digital payments' }
      ]
    },
    {
      title: 'Operational Reports',
      icon: '📊',
      reports: [
        { id: 'inventory_summary', name: 'Inventory Summary', desc: 'Stock levels and valuations' },
        { id: 'menu_performance', name: 'Menu Performance', desc: 'Best/worst performing items' },
        { id: 'executive_summary', name: 'Executive Summary', desc: 'High-level business overview' }
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

      setLoadingState({ isLoading: true, progress: 60, stage: 'Fetching additional data...' })

      // Fetch expenses
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
        console.log('Expenses not available:', error)
      }

      // Fetch purchase orders  
      let purchaseOrders: any[] = []
      try {
        const purchaseOrdersRef = collection(db, `tenants/${profile.tenantId}/purchaseOrders`)
        const purchaseOrdersQuery = query(
          purchaseOrdersRef,
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate))
        )
        const purchaseOrdersSnapshot = await getDocs(purchaseOrdersQuery)
        purchaseOrders = purchaseOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (error) {
        console.log('Purchase orders not available:', error)
      }

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
      
      // Add common header to all reports
      addReportHeader(pdf, getReportTitle(reportType), data)
      
      // Generate specific report content
      switch (reportType) {
        case 'daily_sales':
          addSalesContent(pdf, data, 30)
          break
        case 'profit_loss':
          addProfitLossContent(pdf, data, 30)
          break
        case 'payment_methods':
          addPaymentMethodsContent(pdf, data, 30)
          break
        case 'inventory_summary':
          addInventoryContent(pdf, data, 30)
          break
        case 'menu_performance':
          addMenuPerformanceContent(pdf, data, 30)
          break
        case 'executive_summary':
          addExecutiveSummaryContent(pdf, data, 30)
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

  // Reusable PDF helper functions
  const addReportHeader = (pdf: jsPDF, title: string, data: ReportData) => {
    const pageWidth = pdf.internal.pageSize.width
    
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, pageWidth / 2, 20, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Business: ${profile?.displayName || 'N/A'}`, 20, 35)
    pdf.text(`Branch: ${selectedBranch?.name || 'N/A'}`, 20, 43)
    pdf.text(`Period: ${data.dateRange}`, 20, 51)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 59)
  }

  const addSalesContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart + 40
    
    // Sales Overview
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Sales Overview', 20, yPos)
    yPos += 15
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = data.salesData.reduce((sum, day) => sum + day.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Revenue: ₱${totalRevenue.toLocaleString()}`, 20, yPos)
    yPos += 8
    pdf.text(`Total Orders: ${totalOrders}`, 20, yPos)
    yPos += 8
    pdf.text(`Average Order Value: ₱${avgOrderValue.toFixed(2)}`, 20, yPos)
    yPos += 15
    
    // Top Items
    if (data.topItems.length > 0) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Top Selling Items', 20, yPos)
      yPos += 15
      
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      data.topItems.slice(0, 5).forEach((item, index) => {
        pdf.text(`${index + 1}. ${item.name} - ${item.quantity} sold - ₱${item.revenue.toFixed(2)}`, 25, yPos)
        yPos += 8
      })
    }
  }

  const addProfitLossContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart + 40
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const grossProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Profit & Loss Statement', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Revenue: ₱${totalRevenue.toLocaleString()}`, 20, yPos)
    yPos += 10
    pdf.text(`Expenses: ₱${totalExpenses.toLocaleString()}`, 20, yPos)
    yPos += 10
    pdf.text(`Gross Profit: ₱${grossProfit.toLocaleString()}`, 20, yPos)
    yPos += 10
    pdf.text(`Profit Margin: ${profitMargin.toFixed(2)}%`, 20, yPos)
  }

  const addPaymentMethodsContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart + 40
    
    // This would require actual payment method data from orders
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Payment Methods Analysis', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Payment method breakdown requires order-level data.', 20, yPos)
    pdf.text('This feature will be enhanced with detailed payment tracking.', 20, yPos + 10)
  }

  const addInventoryContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart + 40
    
    if (!data.inventoryAnalytics) {
      pdf.text('No inventory data available', 20, yPos)
      return
    }
    
    const inv = data.inventoryAnalytics
    
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Inventory Summary', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Items: ${inv.totalItems}`, 20, yPos)
    yPos += 10
    pdf.text(`Total Value: ₱${inv.totalValue.toLocaleString()}`, 20, yPos)
    yPos += 10
    pdf.text(`Low Stock Items: ${inv.lowStockItems}`, 20, yPos)
    yPos += 10
    pdf.text(`Out of Stock Items: ${inv.outOfStockItems}`, 20, yPos)
    yPos += 20
    
    // Top value items
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Top Value Items', 20, yPos)
    yPos += 12
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    inv.topValueItems.slice(0, 8).forEach((item, index) => {
      pdf.text(`${index + 1}. ${item.name} - Stock: ${item.currentStock} ${item.unit} - Value: ₱${item.totalValue.toLocaleString()}`, 25, yPos)
      yPos += 8
    })
  }

  const addMenuPerformanceContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart + 40
    
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Menu Performance', 20, yPos)
    yPos += 15
    
    if (data.topItems.length === 0) {
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text('No menu performance data available for this period', 20, yPos)
      return
    }
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Best Performing Items', 20, yPos)
    yPos += 12
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    data.topItems.slice(0, 10).forEach((item, index) => {
      pdf.text(`${index + 1}. ${item.name}`, 25, yPos)
      pdf.text(`Qty: ${item.quantity}`, 120, yPos)
      pdf.text(`Revenue: ₱${item.revenue.toFixed(2)}`, 160, yPos)
      yPos += 8
    })
  }

  const addExecutiveSummaryContent = (pdf: jsPDF, data: ReportData, yStart: number) => {
    let yPos = yStart + 40
    
    const totalRevenue = data.salesData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = data.salesData.reduce((sum, day) => sum + day.orders, 0)
    const totalExpenses = data.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Executive Summary', 20, yPos)
    yPos += 20
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Key Performance Metrics:', 20, yPos)
    yPos += 12
    
    pdf.text(`• Total Revenue: ₱${totalRevenue.toLocaleString()}`, 25, yPos)
    yPos += 8
    pdf.text(`• Total Orders: ${totalOrders}`, 25, yPos)
    yPos += 8
    pdf.text(`• Total Expenses: ₱${totalExpenses.toLocaleString()}`, 25, yPos)
    yPos += 8
    pdf.text(`• Net Profit: ₱${(totalRevenue - totalExpenses).toLocaleString()}`, 25, yPos)
    yPos += 15
    
    if (data.inventoryAnalytics) {
      pdf.text('Inventory Highlights:', 20, yPos)
      yPos += 12
      pdf.text(`• Total Items: ${data.inventoryAnalytics.totalItems}`, 25, yPos)
      yPos += 8
      pdf.text(`• Inventory Value: ₱${data.inventoryAnalytics.totalValue.toLocaleString()}`, 25, yPos)
      yPos += 8
      pdf.text(`• Items Needing Attention: ${data.inventoryAnalytics.lowStockItems + data.inventoryAnalytics.outOfStockItems}`, 25, yPos)
    }
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
