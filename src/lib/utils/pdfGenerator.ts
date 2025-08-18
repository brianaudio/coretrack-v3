import jsPDF from 'jspdf'

export interface ShiftReportData {
  shiftName: string
  staffName: string
  startTime: Date
  endTime: Date | null
  branchName: string
  totalOrders?: number
  grossSales: number
  netProfit: number
  totalExpenses: number
  totalCOGS?: number
  grossProfit?: number
  topItems: {
    name: string
    quantity: number
    revenue: number
  }[]
  peakHour: {
    hour: string
    orderCount: number
    revenue: number
  }
  inventoryAlerts: {
    itemName: string
    currentStock: number
    alertType: 'low' | 'critical' | 'out'
  }[]
}

// Purchase Order Summary PDF Report - Multiple Orders Summary
export const generatePurchaseOrderSummaryPDF = (orders: any[]): void => {
  try {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const pdfHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Orders Summary Report</title>
          <style>
            @media print { @page { margin: 0.5in; } }
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { color: #7c3aed; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
            .po-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .po-table th, .po-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .po-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
            .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            .status-pending { color: #f59e0b; font-weight: bold; }
            .status-approved { color: #10b981; font-weight: bold; }
            .status-completed { color: #6366f1; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CoreTrack Purchase Orders</div>
            <h1>Purchase Orders Summary Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          ${orders.length > 0 ? `
          <h3>Purchase Orders List</h3>
          <table class="po-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((order: any) => `
                <tr>
                  <td>${order.poNumber || order.id?.slice(-8) || 'N/A'}</td>
                  <td>${order.supplier || order.supplierName || 'N/A'}</td>
                  <td>${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                  <td><span class="status-${order.status}">${(order.status || 'pending').toUpperCase()}</span></td>
                  <td>₱${(order.totalAmount || order.total || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>No purchase orders found.</p>'}
          
          <div class="footer">
            <p><strong>CoreTrack Purchase Order Management</strong></p>
            <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(pdfHTML)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  } catch (error) {
    console.error('Purchase Order Summary PDF export error:', error)
    alert('❌ Error generating Purchase Order Summary PDF. Please try again.')
  }
}

// Note: Shift PDF report generation has been disabled per user request
