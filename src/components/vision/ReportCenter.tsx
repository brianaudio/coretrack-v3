'use client'

import React, { useState, useEffect } from 'react'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface ReportData {
  // Financial Metrics
  totalRevenue: number
  grossProfit: number
  netIncome: number
  totalExpenses: number
  profitMargin: number
  
  // Sales Metrics
  totalOrders: number
  averageOrderValue: number
  topSellingItems: { name: string; quantity: number; revenue: number }[]
  
  // Operational Metrics
  totalCustomers: number
  repeatCustomers: number
  inventoryValue: number
  
  // Period Info
  startDate: Date
  endDate: Date
  periodDays: number
}

export default function ReportCenter() {
  const { selectedBranch } = useBranch()
  const { user, profile } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const generateReport = async () => {
    if (!selectedBranch?.id || !user || !profile?.tenantId) return

    setLoading(true)
    try {
      const endDate = new Date()
      let startDate = new Date()
      let days = 30

      // Calculate date range
      switch (reportPeriod) {
        case '7d':
          days = 7
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          days = 30
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          days = 90
          startDate.setDate(endDate.getDate() - 90)
          break
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate)
            endDate.setTime(new Date(customEndDate).getTime())
            days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          }
          break
      }

      // Fetch sales data
      const salesQuery = query(
        collection(db, 'sales'),
        where('locationId', '==', selectedBranch.id),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      )

      // Fetch expenses data
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('locationId', '==', selectedBranch.id),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      )

      // Fetch inventory data
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('locationId', '==', selectedBranch.id)
      )

      const [salesSnapshot, expensesSnapshot, inventorySnapshot] = await Promise.all([
        getDocs(salesQuery),
        getDocs(expensesQuery),
        getDocs(inventoryQuery)
      ])

      const salesData = salesSnapshot.docs.map(doc => doc.data())
      const expensesData = expensesSnapshot.docs.map(doc => doc.data())
      const inventoryData = inventorySnapshot.docs.map(doc => doc.data())

      // Calculate metrics
      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)
      const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const totalCOGS = salesData.reduce((sum, sale) => sum + (sale.costOfGoods || sale.total * 0.35), 0)
      const grossProfit = totalRevenue - totalCOGS
      const netIncome = grossProfit - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

      const totalOrders = salesData.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Calculate inventory value
      const inventoryValue = inventoryData.reduce((sum, item) => {
        const cost = item.cost || 0
        const quantity = item.quantity || 0
        return sum + (cost * quantity)
      }, 0)

      // Get top selling items
      const itemSales: { [key: string]: { quantity: number; revenue: number } } = {}
      salesData.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            if (!itemSales[item.name]) {
              itemSales[item.name] = { quantity: 0, revenue: 0 }
            }
            itemSales[item.name].quantity += item.quantity || 1
            itemSales[item.name].revenue += item.price * (item.quantity || 1)
          })
        }
      })

      const topSellingItems = Object.entries(itemSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Calculate customer metrics
      const uniqueCustomers = new Set(salesData.map(sale => sale.customerId || sale.customerEmail).filter(Boolean))
      const totalCustomers = uniqueCustomers.size
      
      // Simple repeat customer calculation (customers with more than one order)
      const customerOrderCounts: { [key: string]: number } = {}
      salesData.forEach(sale => {
        const customerId = sale.customerId || sale.customerEmail
        if (customerId) {
          customerOrderCounts[customerId] = (customerOrderCounts[customerId] || 0) + 1
        }
      })
      const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length

      const report: ReportData = {
        totalRevenue,
        grossProfit,
        netIncome,
        totalExpenses,
        profitMargin,
        totalOrders,
        averageOrderValue,
        topSellingItems,
        totalCustomers,
        repeatCustomers,
        inventoryValue,
        startDate,
        endDate,
        periodDays: days
      }

      setReportData(report)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    if (!reportData || !selectedBranch) return

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    }

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    // Create report content
    const reportContent = `
CORETRACK BUSINESS REPORT
========================

Business: ${selectedBranch.name}
Report Period: ${formatDate(reportData.startDate)} - ${formatDate(reportData.endDate)}
Generated: ${formatDate(new Date())}
Duration: ${reportData.periodDays} days

FINANCIAL SUMMARY
================
Total Revenue:        ${formatCurrency(reportData.totalRevenue)}
Gross Profit:         ${formatCurrency(reportData.grossProfit)}
Net Income:           ${formatCurrency(reportData.netIncome)}
Total Expenses:       ${formatCurrency(reportData.totalExpenses)}
Profit Margin:        ${reportData.profitMargin.toFixed(2)}%

SALES METRICS
=============
Total Orders:         ${reportData.totalOrders}
Average Order Value:  ${formatCurrency(reportData.averageOrderValue)}
Daily Average Revenue: ${formatCurrency(reportData.totalRevenue / reportData.periodDays)}
Daily Average Orders:  ${(reportData.totalOrders / reportData.periodDays).toFixed(1)}

CUSTOMER INSIGHTS
=================
Total Customers:      ${reportData.totalCustomers}
Repeat Customers:     ${reportData.repeatCustomers}
Customer Retention:   ${reportData.totalCustomers > 0 ? ((reportData.repeatCustomers / reportData.totalCustomers) * 100).toFixed(1) : 0}%

INVENTORY
=========
Current Inventory Value: ${formatCurrency(reportData.inventoryValue)}

TOP SELLING ITEMS
=================
${reportData.topSellingItems.map((item, index) => 
  `${index + 1}. ${item.name}
     Quantity Sold: ${item.quantity}
     Revenue: ${formatCurrency(item.revenue)}`
).join('\n\n')}

PERFORMANCE INDICATORS
====================
Revenue per Day:      ${formatCurrency(reportData.totalRevenue / reportData.periodDays)}
Profit per Day:       ${formatCurrency(reportData.netIncome / reportData.periodDays)}
Orders per Day:       ${(reportData.totalOrders / reportData.periodDays).toFixed(1)}

---
Report generated by CoreTrack Vision
Business Intelligence Platform
    `

    // Create and download the file
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `CoreTrack-Report-${selectedBranch.name}-${reportData.startDate.toISOString().split('T')[0]}-to-${reportData.endDate.toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-md font-medium text-gray-900">Report Center</h3>
          <p className="text-xs text-gray-500">Generate business reports</p>
        </div>
      </div>

      {/* Report Configuration - Vision Style */}
      <div className="mb-4">
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-2">Report Period</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: '7d', label: '7 Days', icon: '📅' },
              { key: '30d', label: '30 Days', icon: '📊' },
              { key: '90d', label: '90 Days', icon: '📈' },
              { key: 'custom', label: 'Custom', icon: '⚙️' }
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => setReportPeriod(period.key as any)}
                className={`bg-white rounded-xl p-3 shadow-sm border transition-all ${
                  reportPeriod === period.key
                    ? 'border-purple-200 bg-purple-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="text-center">
                  <div className="text-md mb-1">{period.icon}</div>
                  <div className={`text-xs font-medium ${
                    reportPeriod === period.key ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {period.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {reportPeriod === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={loading || (reportPeriod === 'custom' && (!customStartDate || !customEndDate))}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="border-t border-gray-100 pt-4">
          {/* Download Button */}
          <div className="mb-3">
            <button
              onClick={downloadReport}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Report</span>
            </button>
          </div>

          {/* Report Preview Header */}
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            📊 Report Preview
          </h4>

          {/* Key Metrics - Vision Style 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">💰 Net Income</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(reportData.netIncome)}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">📈 Gross Profit</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(reportData.grossProfit)}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">💳 Total Revenue</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(reportData.totalRevenue)}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">📊 Profit Margin</div>
              <div className="text-sm font-semibold text-gray-900">{reportData.profitMargin.toFixed(1)}%</div>
            </div>
          </div>

          {/* Additional Business Metrics - Vision Style 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">🛒 Orders</div>
              <div className="text-sm font-semibold text-gray-900">{reportData.totalOrders}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">💵 Avg Order</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(reportData.averageOrderValue)}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">👥 Customers</div>
              <div className="text-sm font-semibold text-gray-900">{reportData.totalCustomers}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-600 mb-0.5">📦 Inventory</div>
              <div className="text-sm font-semibold text-gray-900">{formatCurrency(reportData.inventoryValue)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
