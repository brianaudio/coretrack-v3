'use client'

import { useState } from 'react'
import { useAuth } from '../lib/context/AuthContext'
import { useBranch } from '../lib/context/BranchContext'
import { useShift } from '../lib/context/ShiftContext'
import { getBranchLocationId } from '../lib/utils/branchUtils'
import { getPOSOrders, getPOSItems } from '../lib/firebase/pos'
import { getExpenses } from '../lib/firebase/expenses'
import { 
  getDashboardStats,
  getSalesChartData, 
  getTopSellingItems,
  getPaymentAnalytics
} from '../lib/firebase/analytics'
import {
  getInventoryAnalytics
} from '../lib/firebase/inventoryAnalytics'

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

export default function ExportPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'analytics' | 'financial' | 'inventory'>('analytics')
  const [dateRange, setDateRange] = useState<'shift' | 'today' | 'week' | 'month' | 'custom'>('shift')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'shift': return currentShift ? 'Current Shift' : 'No Active Shift'
      case 'today': return 'Today'
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      case 'custom': return customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : 'Select Dates'
      default: return 'Select Range'
    }
  }

  const calculateDateRange = () => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (dateRange) {
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
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
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
      dateRange: getDateRangeLabel()
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
              .highlight-metric { background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb; }
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
                <div class="kpi-title">Orders per Day</div>
                <div class="kpi-value">${(data.orders / Math.max(1, Math.ceil((Date.now() - Date.now()) / (1000 * 60 * 60 * 24)) || 1)).toFixed(1)}</div>
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
                    <th>Transaction Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.paymentMethods.map(method => `
                    <tr>
                      <td style="text-transform: capitalize;">${method.method}</td>
                      <td>₱${method.amount.toLocaleString()}</td>
                      <td>${method.percentage}%</td>
                      <td>-</td>
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

      // Calculate derived metrics
      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0
      const cogsPercentage = data.revenue > 0 ? (data.cogs / data.revenue) * 100 : 0
      const expensePercentage = data.revenue > 0 ? (data.expenses / data.revenue) * 100 : 0
      const breakEvenRevenue = data.cogs + data.expenses
      const avgOrderValue = data.orders > 0 ? data.revenue / data.orders : 0

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
              .report-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .detail-group h3 { color: #059669; margin-bottom: 15px; font-size: 1.1em; }
              .section { margin-bottom: 40px; }
              .section-title { color: #059669; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .pl-statement { background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
              .pl-line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
              .pl-category { font-weight: bold; color: #374151; font-size: 1.1em; margin-bottom: 5px; }
              .pl-item { color: #6b7280; padding-left: 20px; }
              .pl-value { font-weight: 600; color: #111827; }
              .pl-gross { border-top: 2px solid #d1d5db; border-bottom: 2px solid #d1d5db; margin: 15px 0; padding: 15px 0; background-color: #f0fdf4; }
              .pl-net { border-top: 3px solid #059669; margin-top: 15px; padding-top: 15px; background-color: #ecfdf5; font-size: 1.2em; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
              .kpi-card { background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
              .kpi-title { font-size: 0.85em; color: #6b7280; margin-bottom: 8px; }
              .kpi-value { font-size: 1.4em; font-weight: bold; color: #111827; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .performance-table tr:hover { background-color: #f9fafb; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .metric { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
              .metric-label { font-weight: 500; color: #374151; }
              .metric-value { font-weight: bold; color: #111827; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Financial</div>
              <h1>Financial Performance Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="report-details">
              <div class="detail-group">
                <h3>📊 Reporting Information</h3>
                <div class="metric">
                  <span class="metric-label">Analysis Period:</span>
                  <span class="metric-value">${data.dateRange}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Generated On:</span>
                  <span class="metric-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Generated At:</span>
                  <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              <div class="detail-group">
                <h3>📈 Business Metrics</h3>
                <div class="metric">
                  <span class="metric-label">Total Orders:</span>
                  <span class="metric-value">${data.orders.toLocaleString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Avg Order Value:</span>
                  <span class="metric-value">₱${avgOrderValue.toFixed(2)}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Break-even Revenue:</span>
                  <span class="metric-value">₱${breakEvenRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">💰 Profit & Loss Statement</h2>
              <div class="pl-statement">
                
                <!-- Revenue Section -->
                <div class="pl-line">
                  <span class="pl-category">📊 REVENUE</span>
                  <span class="pl-value"></span>
                </div>
                <div class="pl-line">
                  <span class="pl-item">Gross Revenue</span>
                  <span class="pl-value">₱${data.revenue.toLocaleString()}</span>
                </div>
                
                <!-- COGS Section -->
                <div class="pl-line" style="margin-top: 20px;">
                  <span class="pl-category">🏭 COST OF GOODS SOLD</span>
                  <span class="pl-value"></span>
                </div>
                <div class="pl-line">
                  <span class="pl-item">Total COGS (${cogsPercentage.toFixed(1)}% of revenue)</span>
                  <span class="pl-value">₱${data.cogs.toLocaleString()}</span>
                </div>
                
                <!-- Gross Profit -->
                <div class="pl-gross">
                  <div class="pl-line">
                    <span class="pl-category">💚 GROSS PROFIT</span>
                    <span class="pl-value positive">₱${grossProfit.toLocaleString()}</span>
                  </div>
                  <div class="pl-line">
                    <span class="pl-item">Gross Margin: ${grossMargin.toFixed(1)}%</span>
                    <span class="pl-value"></span>
                  </div>
                </div>
                
                <!-- Operating Expenses -->
                <div class="pl-line">
                  <span class="pl-category">🏢 OPERATING EXPENSES</span>
                  <span class="pl-value"></span>
                </div>
                <div class="pl-line">
                  <span class="pl-item">Total Expenses (${expensePercentage.toFixed(1)}% of revenue)</span>
                  <span class="pl-value">₱${data.expenses.toLocaleString()}</span>
                </div>
                
                <!-- Net Profit -->
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
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-title">Revenue Growth</div>
                <div class="kpi-value">-</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Cost Efficiency</div>
                <div class="kpi-value">${(100 - cogsPercentage).toFixed(1)}%</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Operating Efficiency</div>
                <div class="kpi-value">${(100 - expensePercentage).toFixed(1)}%</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Profit per Order</div>
                <div class="kpi-value">₱${data.orders > 0 ? (netProfit / data.orders).toFixed(2) : '0'}</div>
              </div>
            </div>

            ${data.paymentMethods.length > 0 ? `
            <div class="section">
              <h2 class="section-title">💳 Revenue by Payment Method</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>% of Revenue</th>
                    <th>Growth Trend</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.paymentMethods.map(method => `
                    <tr>
                      <td style="text-transform: capitalize;">${method.method}</td>
                      <td>₱${method.amount.toLocaleString()}</td>
                      <td>${method.percentage}%</td>
                      <td>-</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="footer">
              <p><strong>CoreTrack Financial Analysis</strong></p>
              <p>Profit & Loss Statement • Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Confidential Financial Information - For Internal Use Only</p>
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

      // Calculate inventory metrics
      const totalItems = inventory.totalItems || 0
      const totalValue = inventory.totalValue || 0
      const lowStockItems = inventory.lowStockItems || []
      const outOfStockItems = inventory.outOfStockItems || []
      const topValueItems = inventory.topValueItems || []
      const recentMovements = inventory.recentMovements || []

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
              .report-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .detail-group h3 { color: #7c3aed; margin-bottom: 15px; font-size: 1.1em; }
              .section { margin-bottom: 40px; }
              .section-title { color: #7c3aed; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .inventory-summary { background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
              .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
              .summary-item { text-align: center; padding: 15px; background-color: white; border-radius: 8px; border: 1px solid #e5e7eb; }
              .summary-value { font-size: 1.8em; font-weight: bold; color: #111827; margin-bottom: 5px; }
              .summary-label { font-size: 0.85em; color: #6b7280; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .performance-table tr:hover { background-color: #f9fafb; }
              .alert-low { color: #f59e0b; background-color: #fef3c7; }
              .alert-out { color: #dc2626; background-color: #fecaca; }
              .status-good { color: #059669; font-weight: bold; }
              .status-warning { color: #f59e0b; font-weight: bold; }
              .status-danger { color: #dc2626; font-weight: bold; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .metric { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
              .metric-label { font-weight: 500; color: #374151; }
              .metric-value { font-weight: bold; color: #111827; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Inventory</div>
              <h1>Inventory Analysis Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'All Branches'} • <strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="report-details">
              <div class="detail-group">
                <h3>📊 Report Information</h3>
                <div class="metric">
                  <span class="metric-label">Analysis Period:</span>
                  <span class="metric-value">${data.dateRange}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Generated On:</span>
                  <span class="metric-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Generated At:</span>
                  <span class="metric-value">${new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              <div class="detail-group">
                <h3>📦 Inventory Overview</h3>
                <div class="metric">
                  <span class="metric-label">Total Items:</span>
                  <span class="metric-value">${totalItems.toLocaleString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Total Value:</span>
                  <span class="metric-value">₱${totalValue.toLocaleString()}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Items at Risk:</span>
                  <span class="metric-value">${lowStockItems.length + outOfStockItems.length}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">📈 Inventory Summary</h2>
              <div class="inventory-summary">
                <div class="summary-grid">
                  <div class="summary-item">
                    <div class="summary-value status-good">${totalItems}</div>
                    <div class="summary-label">Total Items</div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-value">₱${totalValue.toLocaleString()}</div>
                    <div class="summary-label">Total Value</div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-value status-warning">${lowStockItems.length}</div>
                    <div class="summary-label">Low Stock</div>
                  </div>
                  <div class="summary-item">
                    <div class="summary-value status-danger">${outOfStockItems.length}</div>
                    <div class="summary-label">Out of Stock</div>
                  </div>
                </div>
              </div>
            </div>

            ${outOfStockItems.length > 0 ? `
            <div class="section">
              <h2 class="section-title">🚨 Critical: Out of Stock Items</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Last Stock</th>
                    <th>Unit Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${outOfStockItems.slice(0, 10).map((item: any) => `
                    <tr class="alert-out">
                      <td><strong>${item.name || 'N/A'}</strong></td>
                      <td>${item.category || 'Uncategorized'}</td>
                      <td>0</td>
                      <td>₱${(item.cost || 0).toFixed(2)}</td>
                      <td><span class="status-danger">OUT OF STOCK</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            ${lowStockItems.length > 0 ? `
            <div class="section">
              <h2 class="section-title">⚠️ Low Stock Alerts</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Current Stock</th>
                    <th>Min Level</th>
                    <th>Unit Cost</th>
                    <th>Reorder Needed</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStockItems.slice(0, 10).map((item: any) => `
                    <tr class="alert-low">
                      <td><strong>${item.name || 'N/A'}</strong></td>
                      <td>${item.quantity || 0}</td>
                      <td>${item.minLevel || 0}</td>
                      <td>₱${(item.cost || 0).toFixed(2)}</td>
                      <td><span class="status-warning">${Math.max(0, (item.minLevel || 0) - (item.quantity || 0)) * 2} units</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            ${topValueItems.length > 0 ? `
            <div class="section">
              <h2 class="section-title">💎 High Value Inventory</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Item Name</th>
                    <th>Current Stock</th>
                    <th>Unit Cost</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${topValueItems.slice(0, 10).map((item: any, index: number) => `
                    <tr>
                      <td><strong>#${index + 1}</strong></td>
                      <td>${item.name || 'N/A'}</td>
                      <td>${item.quantity || 0}</td>
                      <td>₱${(item.cost || 0).toFixed(2)}</td>
                      <td><strong>₱${((item.cost || 0) * (item.quantity || 0)).toLocaleString()}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            ${recentMovements.length > 0 ? `
            <div class="section">
              <h2 class="section-title">📊 Recent Inventory Movements</h2>
              <table class="performance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentMovements.slice(0, 15).map((movement: any) => `
                    <tr>
                      <td>${new Date(movement.date).toLocaleDateString()}</td>
                      <td>${movement.itemName || 'N/A'}</td>
                      <td style="text-transform: capitalize;">${movement.type || 'N/A'}</td>
                      <td>${movement.quantity || 0}</td>
                      <td>${movement.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="footer">
              <p><strong>CoreTrack Inventory Management</strong></p>
              <p>Inventory Analysis • Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Confidential Inventory Information - For Internal Use Only</p>
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

    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      {/* Toggle Bar - Always Visible */}
      <div 
        className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">Data Export</span>
          </div>
          <div className="text-xs text-gray-500">
            Professional reporting & analytics
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {!isExpanded && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span>📊 Analytics</span>
              <span>•</span>
              <span>💰 Financial</span>
              <span>•</span>
              <span>📦 Inventory</span>
            </div>
          )}
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>

      {/* Expanded Panel - Sleek & Professional */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Export Type Selection */}
            <div className="flex items-center space-x-1 mb-4">
              <button
                onClick={() => setExportType('analytics')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  exportType === 'analytics'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                📊 Advanced Analytics
              </button>
              <button
                onClick={() => setExportType('financial')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  exportType === 'financial'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                💰 Financial Performance
              </button>
              <button
                onClick={() => setExportType('inventory')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  exportType === 'inventory'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                📦 Inventory Report
              </button>
            </div>

            {/* Date Range Selection */}
            <div className="flex items-center space-x-1 mb-4">
              {['shift', 'today', 'week', 'month', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {range === 'shift' ? 'Current Shift' :
                   range === 'today' ? 'Today' :
                   range === 'week' ? '7 Days' :
                   range === 'month' ? '30 Days' :
                   'Custom'}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {exportType === 'analytics' ? 
                  'Sales trends, top items, customer analytics, and performance insights' :
                  exportType === 'financial' ?
                  'Revenue, expenses, profit margins, and financial KPIs' :
                  'Stock levels, movements, alerts, and inventory valuation'
                } for <span className="font-medium">{getDateRangeLabel()}</span>
              </div>
              
              <button
                onClick={handleExport}
                disabled={isExporting || (dateRange === 'custom' && (!customStartDate || !customEndDate))}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Generate Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
