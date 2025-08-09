'use client'

import { useState, useEffect } from 'react'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { 
  getWastageEntries, 
  generateDailyWastageReport,
  WastageEntry,
  WasteReport 
} from '../../lib/firebase/wastageTracking'
import jsPDF from 'jspdf'

export default function WastageReports() {
  const { selectedBranch } = useBranch()
  const { profile } = useAuth()
  const [wastageEntries, setWastageEntries] = useState<WastageEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<WasteReport | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  useEffect(() => {
    if (selectedBranch?.id && profile?.tenantId) {
      loadWastageData()
    }
  }, [selectedBranch?.id, profile?.tenantId, selectedDate])

  const loadWastageData = async () => {
    if (!selectedBranch?.id || !profile?.tenantId) return

    try {
      setIsLoading(true)
      
      const date = new Date(selectedDate)
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

      const entries = await getWastageEntries(
        profile.tenantId, 
        selectedBranch.id, 
        startOfDay, 
        endOfDay
      )
      
      setWastageEntries(entries)

    } catch (error) {
      console.error('❌ Error loading wastage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = async () => {
    if (!selectedBranch?.id || !profile?.tenantId) return

    try {
      setIsGeneratingReport(true)
      
      const date = new Date(selectedDate)
      const report = await generateDailyWastageReport(
        profile.tenantId,
        selectedBranch.id,
        date
      )
      
      setReportData(report)
      
    } catch (error) {
      console.error('❌ Error generating report:', error)
      alert('Error generating report. Please try again.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const downloadPDFReport = () => {
    if (!reportData || !selectedBranch) return

    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPosition = 20

    // Header
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Wastage & Shrinkage Report', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Branch: ${selectedBranch.name}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 6
    pdf.text(`Date: ${new Date(selectedDate).toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Summary Statistics
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Summary', 20, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Items Wasted: ${reportData.totalItems}`, 20, yPosition)
    yPosition += 6
    pdf.text(`Total Cost Impact: ₱${reportData.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 20, yPosition)
    yPosition += 15

    // Category Breakdown
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Breakdown by Category', 20, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    Object.entries(reportData.categorySummary).forEach(([category, data]) => {
      if (data.items > 0) {
        pdf.text(
          `${category.charAt(0).toUpperCase() + category.slice(1)}: ${data.items} items (₱${data.cost.toFixed(2)})`,
          20,
          yPosition
        )
        yPosition += 6
      }
    })
    yPosition += 10

    // Top Wasted Items
    if (reportData.topWastedItems.length > 0) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Top Wasted Items', 20, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      reportData.topWastedItems.slice(0, 10).forEach((item, index) => {
        pdf.text(
          `${index + 1}. ${item.itemName}: ${item.quantity} items (₱${item.cost.toFixed(2)})`,
          20,
          yPosition
        )
        yPosition += 6
      })
    }

    // Footer
    yPosition = pdf.internal.pageSize.getHeight() - 20
    pdf.setFontSize(8)
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition)
    pdf.text(`CoreTrack - Inventory Management System`, pageWidth - 20, yPosition, { align: 'right' })

    // Save the PDF
    const fileName = `wastage-report-${selectedBranch.name.replace(/\s+/g, '-')}-${selectedDate}.pdf`
    pdf.save(fileName)
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      expired: '⏰',
      damaged: '💔',
      spillage: '💧',
      theft: '🚨',
      other: '❓'
    }
    return icons[category as keyof typeof icons] || '❓'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      expired: 'orange',
      damaged: 'red',
      spillage: 'blue',
      theft: 'purple',
      other: 'gray'
    }
    return colors[category as keyof typeof colors] || 'gray'
  }

  const getTotalWasteValue = () => {
    return wastageEntries.reduce((sum, entry) => sum + entry.totalCost, 0)
  }

  const getCategorySummary = () => {
    const summary = {
      expired: { items: 0, cost: 0 },
      damaged: { items: 0, cost: 0 },
      spillage: { items: 0, cost: 0 },
      theft: { items: 0, cost: 0 },
      other: { items: 0, cost: 0 }
    }

    wastageEntries.forEach(entry => {
      summary[entry.category].items += entry.quantity
      summary[entry.category].cost += entry.totalCost
    })

    return summary
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-surface-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-surface-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">
          📊 Wastage Reports
        </h1>
        <p className="text-surface-600">
          Analyze wastage patterns and generate reports for {selectedBranch?.name}
        </p>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="space-x-3">
            <button
              onClick={generateReport}
              disabled={isGeneratingReport}
              className="bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
            {reportData && (
              <button
                onClick={downloadPDFReport}
                className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                📄 Download PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Total Items</p>
              <p className="text-2xl font-bold text-surface-900">
                {wastageEntries.reduce((sum, entry) => sum + entry.quantity, 0)}
              </p>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Total Cost</p>
              <p className="text-2xl font-bold text-red-600">
                ₱{getTotalWasteValue().toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Entries</p>
              <p className="text-2xl font-bold text-surface-900">{wastageEntries.length}</p>
            </div>
            <div className="text-3xl">📝</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Avg Cost/Entry</p>
              <p className="text-2xl font-bold text-orange-600">
                ₱{wastageEntries.length > 0 ? (getTotalWasteValue() / wastageEntries.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">Breakdown by Category</h2>
          
          {Object.entries(getCategorySummary()).map(([category, data]) => (
            <div key={category} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
                <div>
                  <p className="font-medium text-surface-900 capitalize">{category}</p>
                  <p className="text-sm text-surface-600">{data.items} items</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-surface-900">₱{data.cost.toFixed(2)}</p>
                <p className="text-sm text-surface-600">
                  {data.items > 0 ? `₱${(data.cost / data.items).toFixed(2)}/item` : '₱0.00/item'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Chart Placeholder */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">Wastage Timeline</h2>
          
          {wastageEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📈</div>
              <p className="text-surface-600">No wastage data for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {wastageEntries
                .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                .slice(0, 8)
                .map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getCategoryIcon(entry.category)}</span>
                      <div>
                        <p className="font-medium text-surface-900">{entry.itemName}</p>
                        <p className="text-sm text-surface-600">
                          {entry.timestamp.toDate().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">₱{entry.totalCost.toFixed(2)}</p>
                      <p className="text-sm text-surface-600">{entry.quantity} items</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Entries */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-xl font-semibold text-surface-900 mb-6">
          Detailed Entries ({wastageEntries.length})
        </h2>
        
        {wastageEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-medium text-surface-900 mb-2">No Wastage Recorded</h3>
            <p className="text-surface-600">No inventory was wasted on this date!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-3 px-4 font-medium text-surface-700">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-surface-700">Item</th>
                  <th className="text-left py-3 px-4 font-medium text-surface-700">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-surface-700">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-surface-700">Cost</th>
                  <th className="text-left py-3 px-4 font-medium text-surface-700">Reason</th>
                  <th className="text-left py-3 px-4 font-medium text-surface-700">Reported By</th>
                  <th className="text-center py-3 px-4 font-medium text-surface-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {wastageEntries
                  .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                  .map(entry => (
                    <tr key={entry.id} className="border-b border-surface-100">
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-surface-900">
                          {entry.timestamp.toDate().toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-surface-900">{entry.itemName}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getCategoryIcon(entry.category)}</span>
                          <span className="capitalize text-sm">{entry.category}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium">{entry.quantity}</td>
                      <td className="py-4 px-4 text-right font-semibold text-red-600">
                        ₱{entry.totalCost.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-sm text-surface-700 truncate" title={entry.reason}>
                          {entry.reason}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-surface-600">{entry.reportedByName}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'disputed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-surface-100 text-surface-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
