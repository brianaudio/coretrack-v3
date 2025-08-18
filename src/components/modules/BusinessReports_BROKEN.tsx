'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { getPOSOrders, getPOSItems } from '../../lib/firebase/pos'
import { getExpenses } from '../../lib/firebase/expenses'
import { 
  getSalesChartData, 
  getTopSellingItems,
  getPaymentAnalytics
} from '../../lib/firebase/analytics'
import { getInventoryAnalytics } from '../../lib/firebase/inventoryAnalytics'

interface ExportData {
  revenue: number
  orders: number
  expenses: number
  cogs: number
  topItems: any[]
  paymentMethods: any[]
  inventoryData?: any
  dateRange: string
}

export default function BusinessReports() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  
  // Export Panel State
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'analytics' | 'financial' | 'inventory'>('analytics')
  const [exportDateRange, setExportDateRange] = useState<'shift' | 'today' | 'week' | 'month' | 'custom'>('shift')
  const [exportCustomStartDate, setExportCustomStartDate] = useState('')
  const [exportCustomEndDate, setExportCustomEndDate] = useState('')

  const getExportDateRangeLabel = () => {
    switch (exportDateRange) {
      case 'shift': return currentShift ? 'Current Shift' : 'No Active Shift'
      case 'today': return 'Today'
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      case 'custom': return exportCustomStartDate && exportCustomEndDate ? `${exportCustomStartDate} to ${exportCustomEndDate}` : 'Select Dates'
      default: return 'Select Range'
    }
  }

  const calculateExportDateRange = () => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (exportDateRange) {
      case 'shift':
        if (currentShift?.startTime) {
          startDate = currentShift.startTime.toDate()
          endDate = currentShift.endTime ? currentShift.endTime.toDate() : new Date()
        } else {
          // Fallback to today if no shift
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
        }
        break
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        startDate.setDate(today.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        startDate.setDate(today.getDate() - 30)
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

    const { startDate, endDate } = calculateExportDateRange()
    const locationId = getBranchLocationId(selectedBranch.id)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    // Fetch all data in parallel
    const [allOrders, menuItems, allExpenses, salesData, topItems, paymentAnalytics, inventoryAnalytics] = await Promise.all([
      getPOSOrders(profile.tenantId, locationId),
      getPOSItems(profile.tenantId, locationId),
      getExpenses(profile.tenantId, locationId),
      getSalesChartData(profile.tenantId, days, locationId),
      getTopSellingItems(profile.tenantId, days, 10, locationId),
      getPaymentAnalytics(profile.tenantId, locationId, startDate, endDate),
      getInventoryAnalytics(profile.tenantId, days, locationId)
    ])

    // Filter data by date range
    const filteredOrders = allOrders.filter(order => {
      if (order.status !== 'completed') return false
      const orderDate = order.createdAt.toDate()
      return orderDate >= startDate && orderDate <= endDate
    })

    const filteredExpenses = allExpenses.filter(expense => {
      const expenseDate = expense.date.toDate()
      return expenseDate >= startDate && expenseDate <= endDate
    })

    // Calculate metrics
    const revenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Calculate COGS from order items
    let cogs = 0
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          // Find the menu item to get cost information
          const menuItem = menuItems.find(mi => mi.id === item.itemId)
          if (menuItem && menuItem.cost) {
            cogs += menuItem.cost * item.quantity
          }
        })
      }
    })

    return {
      revenue,
      orders: filteredOrders.length,
      expenses: totalExpenses,
      cogs,
      topItems: topItems || [],
      paymentMethods: paymentAnalytics || [],
      inventoryData: inventoryAnalytics,
      dateRange: getExportDateRangeLabel()
    }
  }

  const generateAdvancedAnalyticsPDF = async (data: ExportData) => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const avgOrderValue = data.orders > 0 ? data.revenue / data.orders : 0

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
              .report-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .detail-group h3 { color: #2563eb; margin-bottom: 15px; font-size: 1.1em; }
              .metric { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
              .metric-label { font-weight: 500; color: #374151; }
              .metric-value { font-weight: bold; color: #111827; }
              .section { margin-bottom: 40px; }
              .section-title { color: #2563eb; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .performance-table tr:hover { background-color: #f9fafb; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .positive { color: #059669; }
              .negative { color: #dc2626; }
              .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
              .kpi-card { background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .kpi-title { font-size: 0.85em; color: #6b7280; margin-bottom: 5px; }
              .kpi-value { font-size: 1.5em; font-weight: bold; color: #111827; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Analytics</div>
              <h1>Advanced Analytics Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="report-details">
              <div class="detail-group">
                <h3>📊 Business Overview</h3>
                <div class="metric">
                  <span class="metric-label">Reporting Period:</span>
                  <span class="metric-value">${data.dateRange}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Report Generated:</span>
                  <span class="metric-value">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Total Orders Processed:</span>
                  <span class="metric-value">${data.orders.toLocaleString()}</span>
                </div>
              </div>
              <div class="detail-group">
                <h3>💰 Financial Summary</h3>
                <div class="metric">
                  <span class="metric-label">Gross Revenue:</span>
                  <span class="metric-value">₱${data.revenue.toLocaleString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Cost of Goods Sold:</span>
                  <span class="metric-value">₱${data.cogs.toLocaleString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Net Profit:</span>
                  <span class="metric-value ${netProfit >= 0 ? 'positive' : 'negative'}">₱${netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-title">Average Order Value</div>
                <div class="kpi-value">₱${avgOrderValue.toFixed(2)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Gross Margin</div>
                <div class="kpi-value">${grossMargin.toFixed(1)}%</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Revenue per Order</div>
                <div class="kpi-value">₱${avgOrderValue.toFixed(2)}</div>
              </div>
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
                    <th>% of Total Sales</th>
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

            ${data.paymentMethods.length > 0 ? `
            <div class="section">
              <h2 class="section-title">💳 Payment Methods Analysis</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.paymentMethods.map(method => `
                    <tr>
                      <td style="text-transform: capitalize;">${method.method}</td>
                      <td>₱${method.amount.toLocaleString()}</td>
                      <td>${method.percentage}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="footer">
              <p><strong>CoreTrack Business Management System</strong></p>
              <p>Advanced Analytics • Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>This report contains confidential business information</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(pdfHTML)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    } catch (error) {
      console.error('Advanced Analytics PDF export error:', error)
      alert('❌ Error generating Advanced Analytics PDF. Please try again.')
    }
  }

  const generateFinancialPerformancePDF = async (data: ExportData) => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

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
              .pl-statement { background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
              .pl-line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
              .pl-category { font-weight: bold; color: #374151; font-size: 1.1em; }
              .pl-item { color: #6b7280; padding-left: 20px; }
              .pl-value { font-weight: 600; color: #111827; }
              .pl-net { border-top: 3px solid #059669; margin-top: 15px; padding-top: 15px; background-color: #ecfdf5; font-size: 1.2em; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Financial</div>
              <h1>Financial Performance Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>

            <div class="pl-statement">
              <div class="pl-line">
                <span class="pl-category">📊 REVENUE</span>
                <span class="pl-value">₱${data.revenue.toLocaleString()}</span>
              </div>
              
              <div class="pl-line">
                <span class="pl-category">🏭 COST OF GOODS SOLD</span>
                <span class="pl-value">₱${data.cogs.toLocaleString()}</span>
              </div>
              
              <div class="pl-line">
                <span class="pl-category">🏢 OPERATING EXPENSES</span>
                <span class="pl-value">₱${data.expenses.toLocaleString()}</span>
              </div>
              
              <div class="pl-net">
                <div class="pl-line">
                  <span class="pl-category">🎯 NET PROFIT</span>
                  <span class="pl-value ${netProfit >= 0 ? 'positive' : 'negative'}">₱${netProfit.toLocaleString()}</span>
                </div>
                <div class="pl-line">
                  <span class="pl-item">Net Margin: ${netMargin.toFixed(1)}%</span>
                  <span class="pl-value"></span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>CoreTrack Financial Analysis</strong></p>
              <p>Profit & Loss Statement • Generated ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(pdfHTML)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    } catch (error) {
      console.error('Financial Performance PDF export error:', error)
      alert('❌ Error generating Financial Performance PDF. Please try again.')
    }
  }

  const generateInventoryReportPDF = async (data: ExportData) => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const inventory = data.inventoryData
      if (!inventory) {
        alert('No inventory data available for the selected period')
        return
      }

      const totalItems = inventory.totalItems || 0
      const totalValue = inventory.totalValue || 0
      const lowStockItems = inventory.lowStockItems || []

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
              .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
              .summary-item { text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
              .summary-value { font-size: 1.8em; font-weight: bold; color: #111827; margin-bottom: 5px; }
              .summary-label { font-size: 0.85em; color: #6b7280; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Inventory</div>
              <h1>Inventory Analysis Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'All Branches'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>

            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">${totalItems}</div>
                <div class="summary-label">Total Items</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">₱${totalValue.toLocaleString()}</div>
                <div class="summary-label">Total Value</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${lowStockItems.length}</div>
                <div class="summary-label">Low Stock Items</div>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>CoreTrack Inventory Management</strong></p>
              <p>Inventory Analysis • Generated ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(pdfHTML)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 500)
    } catch (error) {
      console.error('Inventory Report PDF export error:', error)
      alert('❌ Error generating Inventory Report PDF. Please try again.')
    }
  }

  const handleExport = async () => {
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
      
      if (exportType === 'analytics') {
        await generateAdvancedAnalyticsPDF(data)
      } else if (exportType === 'financial') {
        await generateFinancialPerformancePDF(data)
      } else if (exportType === 'inventory') {
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Export Center</h1>
          <p className="text-xl text-gray-600">Generate professional business reports with comprehensive analytics</p>
        </div>

        {/* Export Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          
          {/* Export Type Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Report Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setExportType('analytics')}
                className={`p-6 rounded-xl text-left transition-all ${
                  exportType === 'analytics'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-sm opacity-90">Sales trends, top products, and performance insights</p>
              </button>
              
              <button
                onClick={() => setExportType('financial')}
                className={`p-6 rounded-xl text-left transition-all ${
                  exportType === 'financial'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="text-3xl mb-3">💰</div>
                <h3 className="text-lg font-semibold mb-2">Financial Performance</h3>
                <p className="text-sm opacity-90">P&L statement, profit margins, and financial KPIs</p>
              </button>
              
              <button
                onClick={() => setExportType('inventory')}
                className={`p-6 rounded-xl text-left transition-all ${
                  exportType === 'inventory'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="text-3xl mb-3">📦</div>
                <h3 className="text-lg font-semibold mb-2">Inventory Report</h3>
                <p className="text-sm opacity-90">Stock levels, alerts, and inventory movements</p>
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Time Period</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { value: 'shift', label: 'Current Shift' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Last 7 Days' },
                { value: 'month', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Range' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setExportDateRange(range.value as any)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    exportDateRange === range.value
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {exportDateRange === 'custom' && (
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={exportCustomStartDate}
                    onChange={(e) => setExportCustomStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={exportCustomEndDate}
                    onChange={(e) => setExportCustomEndDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Summary */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Summary</h3>
            <div className="text-gray-600">
              <p><strong>Report Type:</strong> {
                exportType === 'analytics' ? 'Advanced Analytics' :
                exportType === 'financial' ? 'Financial Performance' :
                'Inventory Report'
              }</p>
              <p><strong>Time Period:</strong> {getExportDateRangeLabel()}</p>
              <p><strong>Branch:</strong> {selectedBranch?.name || 'No branch selected'}</p>
            </div>
          </div>

          {/* Export Button */}
          <div className="text-center">
            <button
              onClick={handleExport}
              disabled={isExporting || !selectedBranch || (exportDateRange === 'custom' && (!exportCustomStartDate || !exportCustomEndDate))}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {isExporting ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating Report...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Generate Professional Report</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="text-blue-600 text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-blue-900 mb-2">Advanced Analytics</h3>
            <p className="text-blue-700 text-sm">Comprehensive business insights with KPIs, top products, payment analysis, and performance metrics.</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="text-green-600 text-2xl mb-3">💰</div>
            <h3 className="font-semibold text-green-900 mb-2">Financial Reports</h3>
            <p className="text-green-700 text-sm">Complete P&L statements with revenue, expenses, COGS, profit margins, and financial KPIs.</p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <div className="text-purple-600 text-2xl mb-3">📦</div>
            <h3 className="font-semibold text-purple-900 mb-2">Inventory Analysis</h3>
            <p className="text-purple-700 text-sm">Stock level monitoring, low stock alerts, inventory valuation, and movement tracking.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
