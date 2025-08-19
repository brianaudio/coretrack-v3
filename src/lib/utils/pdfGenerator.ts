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

// Professional Purchase Order Detailed Report - Individual Order with Full Details
export const generatePurchaseOrderDetailedPDF = (order: any, tenantInfo?: any): void => {
  try {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const formatDate = (date: any) => {
      if (!date) return 'N/A'
      try {
        return date.toDate ? new Date(date.toDate()).toLocaleDateString() : new Date(date).toLocaleDateString()
      } catch {
        return 'N/A'
      }
    }

    const formatCurrency = (amount: number) => {
      return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const getStatusColor = (status: string) => {
      const colors: { [key: string]: string } = {
        'draft': '#6b7280',
        'pending': '#f59e0b',
        'approved': '#10b981',
        'ordered': '#8b5cf6',
        'partially_delivered': '#f97316',
        'delivered': '#059669',
        'cancelled': '#ef4444'
      }
      return colors[status] || '#6b7280'
    }

    const pdfHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${order.orderNumber || 'PO-' + (order.id?.slice(-6) || 'XXXX')}</title>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: A4 portrait; 
              margin: 0.75in; 
              @top-center { content: "Purchase Order Report"; }
              @bottom-center { content: "Page " counter(page) " of " counter(pages); }
            }
            @media print { 
              .page-break { page-break-before: always; }
              .no-print { display: none !important; }
              body { 
                -webkit-print-color-adjust: exact !important; 
                color-adjust: exact !important; 
              }
              .header { 
                flex-direction: column; 
                align-items: center; 
                text-align: center;
              }
              .document-info { 
                text-align: center; 
                padding-left: 0; 
                margin-top: 10px;
              }
            }
            
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.4; 
              color: #1f2937; 
              background: #ffffff; 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Ensure portrait orientation */
            @media screen {
              body { max-width: 8.5in; margin: 0 auto; padding: 0.5in; }
            }
            
            .container { max-width: 100%; margin: 0 auto; }
            
            /* Header Section */
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 25px; 
              padding-bottom: 15px; 
              border-bottom: 3px solid #2563eb; 
              flex-wrap: wrap;
            }
            .company-info { flex: 1; min-width: 250px; }
            .company-logo { 
              font-size: 26px; 
              font-weight: 800; 
              color: #2563eb; 
              margin-bottom: 6px; 
            }
            .company-subtitle { 
              color: #6b7280; 
              font-size: 13px; 
              margin-bottom: 12px; 
            }
            .document-info { 
              text-align: right; 
              flex: 1; 
              min-width: 200px;
              padding-left: 20px; 
            }
            .document-title { 
              font-size: 22px; 
              font-weight: 700; 
              color: #1f2937; 
              margin-bottom: 8px; 
            }
            
            /* Order Information Grid */
            .order-overview { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 25px; 
            }
            @media print {
              .order-overview { 
                grid-template-columns: 1fr; 
                gap: 15px; 
              }
            }
            .info-section { 
              background: #f8fafc; 
              padding: 15px; 
              border-radius: 6px; 
              border-left: 4px solid #2563eb; 
            }
            .section-title { 
              font-size: 15px; 
              font-weight: 600; 
              color: #374151; 
              margin-bottom: 10px; 
              border-bottom: 1px solid #e5e7eb; 
              padding-bottom: 5px; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px; 
            }
            .info-label { 
              font-weight: 500; 
              color: #6b7280; 
              min-width: 120px; 
            }
            .info-value { 
              font-weight: 600; 
              color: #1f2937; 
              flex: 1; 
              text-align: right; 
            }
            
            /* Status Badge */
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: 600; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
              color: white; 
            }
            
            /* Items Table */
            .items-section { 
              margin: 25px 0; 
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              border: 1px solid #e5e7eb; 
              border-radius: 6px; 
              overflow: hidden; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
              font-size: 13px;
            }
            .items-table th { 
              background: linear-gradient(135deg, #2563eb, #1d4ed8); 
              color: white; 
              font-weight: 600; 
              padding: 10px 8px; 
              text-align: left; 
              font-size: 12px; 
              text-transform: uppercase; 
              letter-spacing: 0.3px; 
            }
            .items-table td { 
              padding: 8px; 
              border-bottom: 1px solid #f3f4f6; 
              vertical-align: top; 
              font-size: 12px;
            }
            .items-table tr:nth-child(even) { 
              background: #fafbfc; 
            }
            .items-table tr:hover { 
              background: #f0f9ff; 
            }
            .item-name { 
              font-weight: 600; 
              color: #1f2937; 
            }
            .item-description { 
              color: #6b7280; 
              font-size: 13px; 
              margin-top: 4px; 
            }
            .quantity-cell { 
              text-align: center; 
              font-weight: 600; 
            }
            .price-cell { 
              text-align: right; 
              font-weight: 600; 
            }
            .total-cell { 
              text-align: right; 
              font-weight: 700; 
              color: #059669; 
            }
            
            /* Financial Summary */
            .financial-summary { 
              margin-top: 20px; 
              display: flex; 
              justify-content: flex-end; 
            }
            .summary-table { 
              border-collapse: collapse; 
              min-width: 280px; 
            }
            .summary-table td { 
              padding: 6px 12px; 
              border-bottom: 1px solid #e5e7eb; 
              font-size: 13px;
            }
            .summary-label { 
              text-align: right; 
              font-weight: 500; 
              color: #6b7280; 
            }
            .summary-value { 
              text-align: right; 
              font-weight: 600; 
              color: #1f2937; 
              min-width: 120px; 
            }
            .summary-total { 
              border-top: 2px solid #2563eb; 
              background: #f0f9ff; 
            }
            .summary-total .summary-label, 
            .summary-total .summary-value { 
              font-weight: 700; 
              color: #1f2937; 
              font-size: 16px; 
            }
            
            /* Notes Section */
            .notes-section { 
              margin-top: 30px; 
              padding: 20px; 
              background: #fffbeb; 
              border: 1px solid #f3e8ff; 
              border-radius: 8px; 
              border-left: 4px solid #f59e0b; 
            }
            .notes-title { 
              font-weight: 600; 
              color: #92400e; 
              margin-bottom: 10px; 
            }
            .notes-content { 
              color: #78350f; 
              white-space: pre-wrap; 
              line-height: 1.6; 
            }
            
            /* Footer */
            .footer { 
              margin-top: 40px; 
              padding-top: 15px; 
              border-top: 1px solid #e5e7eb; 
              display: grid; 
              grid-template-columns: 1fr 1fr 1fr; 
              gap: 20px; 
              font-size: 11px; 
              color: #6b7280; 
            }
            @media print {
              .footer { 
                margin-top: 30px; 
                gap: 15px;
              }
            }
            .signature-box { 
              text-align: center; 
              padding: 12px 0; 
              border-bottom: 1px solid #d1d5db; 
            }
            .signature-title { 
              font-weight: 600; 
              margin-top: 8px; 
              font-size: 11px;
            }
            
            /* Delivery Information */
            .delivery-info { 
              margin-top: 20px; 
              padding: 15px; 
              background: #f0fdf4; 
              border: 1px solid #bbf7d0; 
              border-radius: 6px; 
            }
            .delivery-title { 
              font-weight: 600; 
              color: #065f46; 
              margin-bottom: 8px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="company-info">
                <div class="company-logo">CoreTrack</div>
                <div class="company-subtitle">Business Inventory Management System</div>
                <div style="font-size: 12px; color: #6b7280;">
                  ${tenantInfo?.businessName || 'Professional Business Solutions'}<br>
                  ${tenantInfo?.address || ''}<br>
                  ${tenantInfo?.phone || ''} ${tenantInfo?.email ? '• ' + tenantInfo.email : ''}
                </div>
              </div>
              <div class="document-info">
                <div class="document-title">PURCHASE ORDER</div>
                <div style="font-size: 14px; margin-bottom: 8px;">
                  <strong>PO #:</strong> ${order.orderNumber || 'PO-' + (order.id?.slice(-6) || 'XXXX')}
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                  <strong>Generated:</strong> ${new Date().toLocaleDateString('en-PH', { 
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            <!-- Order Overview -->
            <div class="order-overview">
              <div class="info-section">
                <div class="section-title">📋 Order Information</div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value">
                    <span class="status-badge" style="background-color: ${getStatusColor(order.status || 'draft')}">
                      ${(order.status || 'draft').replace('_', ' ')}
                    </span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Created Date:</span>
                  <span class="info-value">${formatDate(order.createdAt)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Expected Delivery:</span>
                  <span class="info-value">${formatDate(order.expectedDelivery)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Requester:</span>
                  <span class="info-value">${order.requestedBy || order.createdBy || 'System User'}</span>
                </div>
                ${order.approvedBy ? `
                <div class="info-row">
                  <span class="info-label">Approved By:</span>
                  <span class="info-value">${order.approvedBy}</span>
                </div>
                ` : ''}
              </div>

              <div class="info-section">
                <div class="section-title">🏢 Supplier Information</div>
                <div class="info-row">
                  <span class="info-label">Supplier:</span>
                  <span class="info-value">${order.supplierName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contact:</span>
                  <span class="info-value">${order.supplierContact || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${order.supplierEmail || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Terms:</span>
                  <span class="info-value">${order.paymentTerms || 'Net 30'}</span>
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <div class="items-section">
              <div class="section-title" style="font-size: 18px; margin-bottom: 15px;">📦 Order Items</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 5%">#</th>
                    <th style="width: 40%">Item Details</th>
                    <th style="width: 18%">Quantity</th>
                    <th style="width: 18%">Unit Price</th>
                    <th style="width: 19%">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(order.items || []).map((item: any, index: number) => `
                    <tr>
                      <td style="text-align: center; color: #6b7280; font-weight: 600;">${index + 1}</td>
                      <td>
                        <div class="item-name">${item.itemName || 'Unnamed Item'}</div>
                        ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                        ${item.sku ? `<div class="item-description">SKU: ${item.sku}</div>` : ''}
                      </td>
                      <td class="quantity-cell">
                        ${item.quantity || 0} ${item.unit || 'pcs'}
                        ${item.quantityReceived ? `<br><small style="color: #059669;">Received: ${item.quantityReceived}</small>` : ''}
                      </td>
                      <td class="price-cell">${formatCurrency(item.unitPrice || 0)}</td>
                      <td class="total-cell">${formatCurrency(item.total || ((item.quantity || 0) * (item.unitPrice || 0)))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Financial Summary -->
            <div class="financial-summary">
              <table class="summary-table">
                <tr>
                  <td class="summary-label">Subtotal:</td>
                  <td class="summary-value">${formatCurrency(order.subtotal || 0)}</td>
                </tr>
                ${(order.shippingFee || 0) > 0 ? `
                <tr>
                  <td class="summary-label">Shipping Fee:</td>
                  <td class="summary-value">${formatCurrency(order.shippingFee)}</td>
                </tr>
                ` : ''}
                ${(order.taxAmount || 0) > 0 ? `
                <tr>
                  <td class="summary-label">Tax (${order.taxRate || 12}%):</td>
                  <td class="summary-value">${formatCurrency(order.taxAmount)}</td>
                </tr>
                ` : ''}
                ${(order.discountAmount || 0) > 0 ? `
                <tr>
                  <td class="summary-label">Discount:</td>
                  <td class="summary-value">-${formatCurrency(order.discountAmount)}</td>
                </tr>
                ` : ''}
                <tr class="summary-total">
                  <td class="summary-label">TOTAL AMOUNT:</td>
                  <td class="summary-value">${formatCurrency(order.total || order.subtotal || 0)}</td>
                </tr>
              </table>
            </div>

            <!-- Notes Section -->
            ${order.notes ? `
            <div class="notes-section">
              <div class="notes-title">📝 Order Notes & Special Instructions</div>
              <div class="notes-content">${order.notes}</div>
            </div>
            ` : ''}

            <!-- Delivery Information -->
            ${order.status === 'delivered' || order.status === 'partially_delivered' ? `
            <div class="delivery-info">
              <div class="delivery-title">🚚 Delivery Information</div>
              ${order.deliveredDate ? `<strong>Delivered Date:</strong> ${formatDate(order.deliveredDate)}<br>` : ''}
              ${order.receivedBy ? `<strong>Received By:</strong> ${order.receivedBy}<br>` : ''}
              ${order.deliveryNotes ? `<strong>Delivery Notes:</strong> ${order.deliveryNotes}` : ''}
            </div>
            ` : ''}

            <!-- Footer with Signatures -->
            <div class="footer">
              <div>
                <div class="signature-box"></div>
                <div class="signature-title">Requested By</div>
                <div>${order.requestedBy || order.createdBy || '_______________'}</div>
                <div>Date: ${formatDate(order.createdAt)}</div>
              </div>
              <div>
                <div class="signature-box"></div>
                <div class="signature-title">Approved By</div>
                <div>${order.approvedBy || '_______________'}</div>
                <div>Date: ${order.approvedDate ? formatDate(order.approvedDate) : '_______________'}</div>
              </div>
              <div>
                <div class="signature-box"></div>
                <div class="signature-title">Received By</div>
                <div>${order.receivedBy || '_______________'}</div>
                <div>Date: ${order.deliveredDate ? formatDate(order.deliveredDate) : '_______________'}</div>
              </div>
            </div>

            <!-- Document Info Footer -->
            <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              <p><strong>CoreTrack Purchase Order Management System</strong></p>
              <p>This document was generated electronically and is valid without signature if marked as approved in the system.</p>
              <p>Generated on ${new Date().toLocaleDateString('en-PH', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              })}</p>
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(pdfHTML)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 800)
  } catch (error) {
    console.error('Purchase Order Detailed PDF export error:', error)
    alert('❌ Error generating Purchase Order PDF. Please try again.')
  }
}

// Purchase Order Summary PDF Report - Multiple Orders Summary (Legacy)
export const generatePurchaseOrderSummaryPDF = (orders: any[]): void => {
  // If single order, use detailed report instead
  if (orders.length === 1) {
    generatePurchaseOrderDetailedPDF(orders[0])
    return
  }

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
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { color: #2563eb; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
            .po-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .po-table th, .po-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .po-table th { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; font-weight: 600; }
            .po-table tr:nth-child(even) { background: #f8fafc; }
            .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            .status-draft { color: #6b7280; font-weight: bold; }
            .status-pending { color: #f59e0b; font-weight: bold; }
            .status-approved { color: #10b981; font-weight: bold; }
            .status-ordered { color: #8b5cf6; font-weight: bold; }
            .status-delivered { color: #059669; font-weight: bold; }
            .status-cancelled { color: #ef4444; font-weight: bold; }
            .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #2563eb; }
            .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
            .stat-label { color: #6b7280; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CoreTrack Purchase Orders</div>
            <h1>Purchase Orders Summary Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-PH', { 
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}</p>
            <p><strong>Total Orders:</strong> ${orders.length}</p>
          </div>
          
          ${(() => {
            const totalAmount = orders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0)
            const statusCounts = orders.reduce((counts, order) => {
              const status = order.status || 'draft'
              counts[status] = (counts[status] || 0) + 1
              return counts
            }, {})
            
            return `
            <div class="summary-stats">
              <div class="stat-card">
                <div class="stat-number">${orders.length}</div>
                <div class="stat-label">Total Orders</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">₱${totalAmount.toLocaleString('en-PH')}</div>
                <div class="stat-label">Total Value</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${statusCounts.delivered || 0}</div>
                <div class="stat-label">Completed</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${statusCounts.pending || 0}</div>
                <div class="stat-label">Pending</div>
              </div>
            </div>
            `
          })()}

          ${orders.length > 0 ? `
          <h3>Purchase Orders List</h3>
          <table class="po-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date Created</th>
                <th>Expected Delivery</th>
                <th>Status</th>
                <th>Items Count</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((order: any) => `
                <tr>
                  <td><strong>${order.orderNumber || 'PO-' + (order.id?.slice(-6) || 'XXXX')}</strong></td>
                  <td>${order.supplier || order.supplierName || 'N/A'}</td>
                  <td>${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                  <td>${order.expectedDelivery ? new Date(order.expectedDelivery.toDate()).toLocaleDateString() : 'N/A'}</td>
                  <td><span class="status-${order.status || 'draft'}">${((order.status || 'draft').replace('_', ' ')).toUpperCase()}</span></td>
                  <td style="text-align: center;">${(order.items || []).length}</td>
                  <td style="text-align: right;"><strong>₱${(order.totalAmount || order.total || 0).toLocaleString('en-PH')}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>No purchase orders found.</p>'}
          
          <div class="footer">
            <p><strong>CoreTrack Purchase Order Management System</strong></p>
            <p>Professional Business Inventory Solutions</p>
            <p>Generated ${new Date().toLocaleDateString('en-PH', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })} at ${new Date().toLocaleTimeString('en-PH')}</p>
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
