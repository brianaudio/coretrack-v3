'use client'

import React, { useState } from 'react'
import { useNotifications } from '../NotificationSystem'

export default function ReportsSection() {
  const { showSuccess, showError } = useNotifications()
  const [downloading, setDownloading] = useState<string | null>(null)

  const reports = [
    {
      id: 'daily-sales',
      title: 'Daily Sales Report',
      description: 'Today\'s detailed sales breakdown',
      icon: '📊',
      color: 'bg-blue-50 border-blue-200 text-blue-600'
    },
    {
      id: 'weekly-summary',
      title: 'Weekly Summary',
      description: 'Past 7 days performance',
      icon: '📈',
      color: 'bg-green-50 border-green-200 text-green-600'
    },
    {
      id: 'inventory-status',
      title: 'Inventory Report',
      description: 'Current stock levels',
      icon: '📦',
      color: 'bg-orange-50 border-orange-200 text-orange-600'
    },
    {
      id: 'customer-insights',
      title: 'Customer Insights',
      description: 'Buying patterns & preferences',
      icon: '👥',
      color: 'bg-purple-50 border-purple-200 text-purple-600'
    }
  ]

  const downloadReport = async (reportId: string, title: string) => {
    setDownloading(reportId)
    
    try {
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create mock CSV data
      let csvContent = ''
      
      switch (reportId) {
        case 'daily-sales':
          csvContent = `Time,Item,Quantity,Amount\n09:15,Americano,2,₱180\n09:30,Latte,1,₱165\n10:00,Cappuccino,3,₱495\n10:15,Croissant,2,₱240\n11:30,Iced Coffee,1,₱145`
          break
        case 'weekly-summary':
          csvContent = `Date,Total Sales,Orders,Average Order\n2025-09-03,₱12450,38,₱328\n2025-09-04,₱15230,45,₱339\n2025-09-05,₱18750,52,₱361\n2025-09-06,₱14680,42,₱349\n2025-09-07,₱16920,48,₱353\n2025-09-08,₱13540,41,₱330\n2025-09-09,₱15420,47,₱328`
          break
        case 'inventory-status':
          csvContent = `Item,Current Stock,Reorder Level,Status\nCoffee Beans,45kg,10kg,Good\nMilk,25L,5L,Good\nSugar,12kg,3kg,Good\nCups (Small),250,50,Good\nCups (Large),180,50,Good\nLids,420,100,Good`
          break
        case 'customer-insights':
          csvContent = `Metric,Value\nTotal Customers,1,247\nReturning Customers,68%\nAverage Visit Frequency,2.3 times/week\nMost Popular Item,Iced Caramel Latte\nPeak Hours,2:00-4:00 PM\nAverage Spend,₱328`
          break
      }
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportId}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      showSuccess('Report Downloaded', `${title} saved to your device`)
    } catch (error) {
      showError('Download Failed', 'Could not generate report')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
        <div className="text-xs text-gray-500">Downloadable CSV</div>
      </div>
      
      <div className="space-y-3">
        {reports.map((report) => (
          <div 
            key={report.id}
            className={`rounded-xl p-4 border transition-all duration-200 ${report.color}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{report.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900">{report.title}</div>
                  <div className="text-sm text-gray-600">{report.description}</div>
                </div>
              </div>
              
              <button
                onClick={() => downloadReport(report.id, report.title)}
                disabled={downloading === report.id}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  downloading === report.id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
                }`}
              >
                {downloading === report.id ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Downloading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Export All */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold mb-1">Export All Data</div>
            <div className="text-sm text-gray-300">Complete business overview</div>
          </div>
          <button
            onClick={() => downloadReport('complete-export', 'Complete Business Export')}
            disabled={downloading === 'complete-export'}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            {downloading === 'complete-export' ? 'Preparing...' : 'Export All'}
          </button>
        </div>
      </div>
    </div>
  )
}
