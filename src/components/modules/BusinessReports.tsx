'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { getPOSOrders, getPOSItems, POSOrder } from '../../lib/firebase/pos'
import { getExpenses } from '../../lib/firebase/expenses'
import { 
  getSalesChartData, 
  getTopSellingItems,
  getPaymentAnalytics,
  getOrderVolumeAnalytics,
  getPeakHoursAnalytics,
  getPaymentMethodAnalytics,
  getComprehensiveOrderAnalytics
} from '../../lib/firebase/analytics'
import {
  getInventoryAnalytics
} from '../../lib/firebase/inventoryAnalytics'
import { TrendingUp, Clock, CreditCard, BarChart3, Package } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface DailySummary {
  date: string
  dateKey: string // Add unique identifier
  revenue: number
  orders: number
  expenses: number
  cogs: number
  profit: number
}

interface ExportData {
  revenue: number
  orders: number
  expenses: number
  cogs: number
  topItems: any[]
  paymentMethods: any[]
  inventoryData?: any
  dateRange: string
  dailySummaries?: DailySummary[] // For week/month reports
  period: 'today' | 'week' | 'month' | 'custom'
}

export default function BusinessReports() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'analytics' | 'financial' | 'inventory' | 'order_volume' | 'peak_hours' | 'payment_insights' | 'comprehensive_orders'>('analytics')
  const [exportDateRange, setExportDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [exportCustomStartDate, setExportCustomStartDate] = useState('')
  const [exportCustomEndDate, setExportCustomEndDate] = useState('')

  // Helper function to fetch comprehensive orders (operational + archived)
  const fetchComprehensiveOrders = async (startDate: Date, endDate: Date, locationId: string): Promise<POSOrder[]> => {
    console.log('🔍 Fetching comprehensive order data (operational + archived)...')
    const allOrders: POSOrder[] = [];
    
    // 1. Get operational orders (current shift)
    try {
      const operationalRef = collection(db, `tenants/${profile!.tenantId}/posOrders`)
      const operationalSnapshot = await getDocs(operationalRef)
      const operationalOrders = operationalSnapshot.docs.map(doc => ({
        id: doc.id,
        source: 'operational',
        ...doc.data()
      })) as (POSOrder & { source: string })[];
      
      allOrders.push(...operationalOrders);
      console.log(`📊 Analytics - Operational orders: ${operationalOrders.length}`);
    } catch (error) {
      console.log('❌ Error fetching operational orders for analytics:', error);
    }
    
    // 2. Get archived orders (from completed shifts)
    try {
      const archivesRef = collection(db, `tenants/${profile!.tenantId}/shift_archives`)
      const archivesSnapshot = await getDocs(archivesRef)
      
      console.log(`📊 Analytics - Found ${archivesSnapshot.docs.length} shift archives`);
      
      // Check each shift archive for orders
      for (const archiveDoc of archivesSnapshot.docs) {
        const archiveId = archiveDoc.id;
        const archiveData = archiveDoc.data();
        
        try {
          const archivedOrdersRef = collection(db, `tenants/${profile!.tenantId}/shift_archives/${archiveId}/posOrders`)
          const archivedSnapshot = await getDocs(archivedOrdersRef)
          const archivedOrders = archivedSnapshot.docs.map(doc => ({
            id: doc.id,
            source: `archive:${archiveId}`,
            archiveDate: archiveData.createdAt?.toDate?.(),
            ...doc.data()
          })) as (POSOrder & { source: string; archiveDate?: Date })[];
          
          if (archivedOrders.length > 0) {
            allOrders.push(...archivedOrders);
            console.log(`📦 Analytics - Archive ${archiveId}: ${archivedOrders.length} orders`);
          }
        } catch (error) {
          console.log(`❌ Error fetching archived orders from ${archiveId}:`, error);
        }
      }
    } catch (error) {
      console.log('❌ Error fetching shift archives for analytics:', error);
    }

    // Branch and status filtering
    const filteredOrders = allOrders.filter(order => 
      order.locationId === locationId && 
      order.status === 'completed'
    );
    
    console.log(`🏢 Analytics - Branch filtered orders: ${filteredOrders.length} for location ${locationId}`);

    // Date filtering
    const dateFilteredOrders = filteredOrders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toDate();
      return orderDate >= startDate && orderDate <= endDate;
    });

    console.log(`📅 Analytics - Date filtered orders: ${dateFilteredOrders.length} for period ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    return dateFilteredOrders;
  }

  const calculateDateRange = () => {
    // SURGICAL FIX: The issue is "today" should be the date when expenses exist (Aug 27)
    // But the system is using Aug 28 as "today". Let's use a more flexible approach
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (exportDateRange) {
      case 'today':
        // CORRECT FIX: "Today" should be Aug 28, 2025 as requested
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case 'week':
        // SURGICAL TIMEZONE FIX: Get start of current week (last 7 days) with local timezone
        const weekStartDate = new Date(now)
        weekStartDate.setDate(now.getDate() - 6) // 6 days ago + now = 7 days
        startDate = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case 'month':
        // SURGICAL TIMEZONE FIX: Get start of current month (last 30 days) with local timezone
        const monthStartDate = new Date(now)
        monthStartDate.setDate(now.getDate() - 29) // 29 days ago + now = 30 days
        startDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), monthStartDate.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case 'custom':
        if (exportCustomStartDate && exportCustomEndDate) {
          const customStart = new Date(exportCustomStartDate)
          const customEnd = new Date(exportCustomEndDate)
          startDate = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0)
          endDate = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999)
        } else {
          // Fallback to now if custom dates are not set
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        }
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    // Debug date range calculation with timezone fix
    console.log('📅 SURGICAL TIMEZONE FIX:', {
      exportDateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startLocal: startDate.toLocaleDateString(),
      endLocal: endDate.toLocaleDateString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })

    return { startDate, endDate }
  }

  const fetchExportData = async (): Promise<ExportData> => {
    console.log('🔍 Starting fetchExportData...')
    
    if (!profile?.tenantId || !selectedBranch) {
      console.error('❌ Missing tenant or branch:', { tenantId: profile?.tenantId, branch: selectedBranch?.name })
      throw new Error('Missing tenant or branch information')
    }

    const { startDate, endDate } = calculateDateRange()
    console.log('📅 Date range:', { startDate, endDate, range: exportDateRange })
    
    const locationId = getBranchLocationId(selectedBranch.id)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    console.log('🏢 Branch info:', { locationId, selectedBranch: selectedBranch.name, days })

    // Fetch all data in parallel - USING BOTH OPERATIONAL AND ARCHIVED DATA
    const [allOrders, menuItems, allExpenses, salesData, topItems, paymentAnalytics, inventoryAnalytics] = await Promise.all([
      // ENHANCED: Get orders from BOTH operational posOrders AND shift archives
      (async () => {
        console.log('🔍 FETCHING ORDERS FROM OPERATIONAL + ARCHIVED COLLECTIONS...');
        const allOrders: POSOrder[] = [];
        
        // 1. Get operational orders (current shift)
        try {
          const operationalRef = collection(db, `tenants/${profile.tenantId}/posOrders`)
          const operationalSnapshot = await getDocs(operationalRef)
          const operationalOrders = operationalSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'operational',
            ...doc.data()
          })) as (POSOrder & { source: string })[];
          
          allOrders.push(...operationalOrders);
          console.log(`� Operational orders: ${operationalOrders.length}`);
        } catch (error) {
          console.log('❌ Error fetching operational orders:', error);
        }
        
        // 2. Get archived orders (from completed shifts)
        try {
          const archivesRef = collection(db, `tenants/${profile.tenantId}/shift_archives`)
          const archivesSnapshot = await getDocs(archivesRef)
          
          console.log(`� Found ${archivesSnapshot.docs.length} shift archives`);
          
          // Check each shift archive for orders
          for (const archiveDoc of archivesSnapshot.docs) {
            const archiveId = archiveDoc.id;
            const archiveData = archiveDoc.data();
            
            try {
              const archivedOrdersRef = collection(db, `tenants/${profile.tenantId}/shift_archives/${archiveId}/posOrders`)
              const archivedSnapshot = await getDocs(archivedOrdersRef)
              const archivedOrders = archivedSnapshot.docs.map(doc => ({
                id: doc.id,
                source: `archive:${archiveId}`,
                archiveDate: archiveData.createdAt?.toDate?.(),
                ...doc.data()
              })) as (POSOrder & { source: string; archiveDate?: Date })[];
              
              if (archivedOrders.length > 0) {
                allOrders.push(...archivedOrders);
                console.log(`📦 Archive ${archiveId}: ${archivedOrders.length} orders (${archiveData.createdAt?.toDate?.()})`);
              }
            } catch (error) {
              console.log(`❌ Error fetching archive ${archiveId}:`, error instanceof Error ? error.message : String(error));
            }
          }
        } catch (error) {
          console.log('❌ Error fetching shift archives:', error);
        }
        
        console.log(`🎯 TOTAL ORDERS FOUND: ${allOrders.length} (operational + archived)`);
        
        // 4. Smart filtering: Location-specific for current operations, comprehensive for business reports
        console.log(`🔍 EXPECTED locationId: "${locationId}"`);
        
        const matchingOrders = allOrders.filter(order => order.locationId === locationId);
        const historicalLocationIds = Array.from(new Set(allOrders.map(order => order.locationId).filter(id => id && id !== locationId)));
        
        // BRANCH ISOLATION FIX: Always filter by locationId for proper branch separation
        let filteredOrders = matchingOrders;
        console.log(`� BRANCH ISOLATED: ${filteredOrders.length} orders for location "${locationId}"`);
        
        if (historicalLocationIds.length > 0) {
          console.log(`� Other locations found (${historicalLocationIds.join(', ')}): ${allOrders.length - matchingOrders.length} orders (filtered out)`);
        }
        
        console.log(`📋 FINAL: ${filteredOrders.length} orders ready for date filtering`);
        return filteredOrders as POSOrder[];
      })(),
      getPOSItems(profile.tenantId, locationId),
      // 🔥 COMPREHENSIVE EXPENSES FETCH (operational + archived like orders)
      (async () => {
        const allExpenses: any[] = [];
        
        // 1. Get operational expenses (current active expenses)
        try {
          const operationalExpenses = await getExpenses(profile.tenantId, locationId);
          allExpenses.push(...operationalExpenses);
          console.log(`💰 Operational expenses: ${operationalExpenses.length}`);
        } catch (error) {
          console.log('❌ Error fetching operational expenses:', error);
        }
        
        // 2. Get archived expenses (from completed shifts)
        try {
          const archivesRef = collection(db, `tenants/${profile.tenantId}/shift_archives`)
          const archivesSnapshot = await getDocs(archivesRef)
          
          console.log(`📁 Checking ${archivesSnapshot.docs.length} shift archives for expenses...`);
          
          // Check each shift archive for expenses
          for (const archiveDoc of archivesSnapshot.docs) {
            const archiveId = archiveDoc.id;
            const archiveData = archiveDoc.data();
            
            try {
              const archivedExpensesRef = collection(db, `tenants/${profile.tenantId}/shift_archives/${archiveId}/expenses`)
              const archivedSnapshot = await getDocs(archivedExpensesRef)
              const archivedExpenses = archivedSnapshot.docs.map(doc => ({
                id: doc.id,
                source: `archive:${archiveId}`,
                archiveDate: archiveData.createdAt?.toDate?.(),
                ...doc.data()
              })) as any[];
              
              if (archivedExpenses.length > 0) {
                // 🔥 IMMEDIATE BRANCH FILTERING: Filter archived expenses by locationId right here
                const branchFilteredArchiveExpenses = archivedExpenses.filter((expense: any) => expense.locationId === locationId);
                console.log(`💸 Archive ${archiveId}: ${archivedExpenses.length} total expenses, ${branchFilteredArchiveExpenses.length} for branch "${locationId}"`);
                
                if (branchFilteredArchiveExpenses.length > 0) {
                  allExpenses.push(...branchFilteredArchiveExpenses);
                  console.log(`✅ Added ${branchFilteredArchiveExpenses.length} branch-specific archived expenses from ${archiveId}`);
                }
              }
            } catch (error) {
              console.log(`❌ Error fetching expenses from archive ${archiveId}:`, error);
            }
          }
        } catch (error) {
          console.log('❌ Error fetching archived expenses:', error);
        }
        
        console.log(`💰 TOTAL EXPENSES FOUND: ${allExpenses.length} (operational + archived)`);
        
        // 🔥 BRANCH ISOLATION FIX: Apply same locationId filtering to expenses as orders
        console.log(`🔍 EXPECTED locationId for expenses: "${locationId}"`);
        
        const matchingExpenses = allExpenses.filter((expense: any) => expense.locationId === locationId);
        const historicalExpenseLocationIds = Array.from(new Set(allExpenses.map((expense: any) => expense.locationId).filter(id => id && id !== locationId)));
        
        // BRANCH ISOLATION FIX: Always filter expenses by locationId for proper branch separation
        let filteredExpensesByLocation = matchingExpenses;
        console.log(`🏢 BRANCH ISOLATED EXPENSES: ${filteredExpensesByLocation.length} expenses for location "${locationId}"`);
        
        if (historicalExpenseLocationIds.length > 0) {
          console.log(`💸 Other expense locations found (${historicalExpenseLocationIds.join(', ')}): ${allExpenses.length - matchingExpenses.length} expenses (filtered out)`);
        }
        
        console.log(`� FINAL EXPENSES: ${filteredExpensesByLocation.length} expenses ready for date filtering`);
        console.log('�💸 Branch-filtered expenses fetch completed successfully');
        return filteredExpensesByLocation;
      })(),
      getSalesChartData(profile.tenantId, days, locationId),
      getTopSellingItems(profile.tenantId, days, 10, locationId),
      getPaymentAnalytics(profile.tenantId, locationId, startDate, endDate),
      getInventoryAnalytics(profile.tenantId, days, locationId)
    ])

    // Filter data by date range
    const filteredOrders = allOrders.filter(order => {
      if (order.status !== 'completed') {
        return false
      }
      const orderDate = order.createdAt.toDate()
      const inRange = orderDate >= startDate && orderDate <= endDate
      return inRange
    })

    const filteredExpenses = allExpenses.filter(expense => {
      if (!expense.date) {
        console.warn('❌ EXPENSE MISSING DATE FIELD:', expense);
        return false;
      }
      
      if (!expense.date.toDate) {
        console.warn('❌ EXPENSE DATE NOT TIMESTAMP:', expense);
        return false;
      }
      
      const expenseDate = expense.date.toDate()
      
      // SURGICAL FIX: Compare only the DATE part, not the full timestamp
      const expenseDateOnly = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate())
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
      
      const inDateRange = expenseDateOnly >= startDateOnly && expenseDateOnly <= endDateOnly
      
      console.log('📅 SURGICAL DATE COMPARISON:', {
        expenseId: expense.id,
        title: expense.title,
        expenseDate: expenseDateOnly.toDateString(),
        startDate: startDateOnly.toDateString(),
        endDate: endDateOnly.toDateString(),
        inRange: inDateRange
      });
      
      return inDateRange
    })

    // Calculate metrics
    const revenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Debug expense calculations with detailed date analysis
    console.log('💰 Expense filtering results:', {
      totalExpensesFound: allExpenses.length,
      expensesAfterDateFilter: filteredExpenses.length,
      totalExpenseAmount: totalExpenses,
      dateRange: exportDateRange,
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      sampleExpenses: filteredExpenses.slice(0, 3).map(e => ({
        title: e.title,
        amount: e.amount,
        date: e.date.toDate().toLocaleDateString(),
        dateTime: e.date.toDate().toISOString()
      })),
      // SURGICAL DEBUGGING: Show ALL expense dates for comparison
      allExpenseDates: allExpenses.map(e => ({
        title: e.title,
        amount: e.amount,
        date: e.date.toDate().toLocaleDateString(),
        dateTime: e.date.toDate().toISOString(),
        withinRange: e.date.toDate() >= startDate && e.date.toDate() <= endDate
      })).slice(0, 10),
      // Add helpful context for when no expenses are found
      ...(filteredExpenses.length === 0 && allExpenses.length > 0 && {
        helpMessage: `No expenses found for ${exportDateRange}. Found ${allExpenses.length} expenses from other dates. Check date range filtering.`
      })
    })
    
    // Calculate COGS from order items
    let cogs = 0
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          // Find the menu item to get cost information
          const menuItem = menuItems.find(mi => mi.id === item.itemId)
          if (menuItem && menuItem.cost) {
            cogs += menuItem.cost * item.quantity
          }
        })
      }
    })

    // Generate daily summaries for week/month periods
    const generateDailySummaries = (): DailySummary[] => {
      if (exportDateRange === 'today') return []

      console.log('🔥 DAILY SUMMARY GENERATION:', {
        dateRange: exportDateRange,
        totalFilteredExpenses: filteredExpenses.length,
        expenseDetails: filteredExpenses.map(e => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          date: e.date.toDate().toLocaleDateString(),
          dateTime: e.date.toDate().toISOString(),
          category: e.category,
          source: e.source || 'operational'
        }))
      });

      const summaries: DailySummary[] = []
      const { startDate, endDate } = calculateDateRange()
      
      // Create array of dates in the range
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayStart = new Date(currentDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(currentDate)  
        dayEnd.setHours(23, 59, 59, 999)
        
        // Filter orders for this specific day
        const dayOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt.toDate()
          return orderDate >= dayStart && orderDate <= dayEnd
        })
        
        // Filter expenses for this day
        const dayExpenses = filteredExpenses.filter(expense => {
          const expenseDate = expense.date.toDate()
          // SURGICAL FIX: Use date-only comparison for daily summaries too
          const expenseDateOnly = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate())
          const dayDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
          const isMatch = expenseDateOnly.getTime() === dayDateOnly.getTime()
          
          // 🔥 ENHANCED DEBUG: Show ALL expense matching attempts
          console.log('🗓️ DAILY EXPENSE MATCHING:', {
            expenseId: expense.id,
            title: expense.title,
            amount: expense.amount,
            category: expense.category,
            expenseDate: expenseDateOnly.toDateString(),
            dayDate: dayDateOnly.toDateString(),
            expenseDateTime: expense.date.toDate().toISOString(),
            currentDateTime: currentDate.toISOString(),
            isMatch,
            currentDateFormatted: currentDate.toLocaleDateString(),
            // 🔥 CRITICAL: Show if expense has required fields
            hasId: !!expense.id,
            hasTitle: !!expense.title,
            hasDate: !!expense.date,
            hasAmount: expense.amount !== undefined,
            source: expense.source || 'operational'
          });
          
          return isMatch
        })
        
        const dayRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0)
        const dayExpenseAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        
        // Calculate day COGS
        let dayCogs = 0
        dayOrders.forEach(order => {
          if (order.items) {
            order.items.forEach((item: any) => {
              const menuItem = menuItems.find(mi => mi.id === item.itemId)
              if (menuItem && menuItem.cost) {
                dayCogs += menuItem.cost * item.quantity
              }
            })
          }
        })
        
        summaries.push({
          date: currentDate.toLocaleDateString(),
          dateKey: currentDate.toISOString().split('T')[0], // Add unique date key
          revenue: dayRevenue,
          orders: dayOrders.length,
          expenses: dayExpenseAmount,
          cogs: dayCogs,
          profit: dayRevenue - dayCogs - dayExpenseAmount
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      return summaries
    }

    const getDateRangeLabel = () => {
      switch (exportDateRange) {
        case 'today': return 'Today'
        case 'week': return 'Last 7 Days'
        case 'month': return 'Last 30 Days'
        case 'custom': return exportCustomStartDate && exportCustomEndDate ? `${exportCustomStartDate} to ${exportCustomEndDate}` : 'Select Dates'
        default: return 'Select Range'
      }
    }

    const exportData = {
      revenue,
      orders: filteredOrders.length,
      expenses: totalExpenses,
      cogs,
      topItems: topItems || [],
      paymentMethods: paymentAnalytics || [],
      inventoryData: inventoryAnalytics,
      dateRange: getDateRangeLabel(),
      dailySummaries: generateDailySummaries(),
      period: exportDateRange
    }

    console.log('✅ Export data prepared:', {
      revenue,
      orders: filteredOrders.length,
      expenses: totalExpenses,
      topItemsCount: (topItems || []).length,
      hasInventoryData: !!inventoryAnalytics
    })

    return exportData
  }

  // Centralized PDF generation helper
  const generatePDF = (pdfHTML: string, reportName: string) => {
    try {
      console.log(`🎯 Generating PDF for ${reportName}...`)
      console.log('📄 PDF HTML length:', pdfHTML.length)
      
      // Try to open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (!printWindow) {
        console.error('❌ Pop-up blocked for PDF generation')
        // Fallback: try to use current window
        const fallbackWindow = window.open('', '_blank')
        if (!fallbackWindow) {
          alert('❌ Pop-up blocked. Please allow pop-ups for this site and try again.')
          return false
        }
        console.log('✅ Using fallback window')
        return generatePDFInWindow(fallbackWindow, pdfHTML, reportName)
      }

      return generatePDFInWindow(printWindow, pdfHTML, reportName)
    } catch (error) {
      console.error(`❌ PDF generation error for ${reportName}:`, error)
      alert(`❌ Error generating ${reportName}. Please try again or use a different browser.`)
      return false
    }
  }

  const generatePDFInWindow = (printWindow: Window, pdfHTML: string, reportName: string) => {
    try {
      console.log('✅ PDF window opened successfully')
      
      // Enhanced HTML with download capability
      const enhancedHTML = pdfHTML.replace('<head>', `<head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        `).replace('<body>', `<body>
          <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <button onclick="downloadAsPDF()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-right: 8px; font-size: 14px;">
              📥 Download PDF
            </button>
            <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">
              🖨️ Print
            </button>
          </div>
          <script>
            async function downloadAsPDF() {
              try {
                // Hide the button controls during capture
                const controls = document.querySelector('div[style*="position: fixed"]');
                if (controls) controls.style.display = 'none';
                
                const canvas = await html2canvas(document.body, {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff'
                });
                
                // Show controls again
                if (controls) controls.style.display = 'block';
                
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: 'a4'
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210; // A4 width in mm
                const pageHeight = 295; // A4 height in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                
                // Add first page
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                // Add additional pages if needed
                while (heightLeft >= 0) {
                  position = heightLeft - imgHeight;
                  pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                  heightLeft -= pageHeight;
                }
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = '${reportName.replace(/\s+/g, '_')}_' + timestamp + '.pdf';
                
                pdf.save(filename);
                console.log('✅ PDF downloaded successfully:', filename);
              } catch (error) {
                console.error('❌ Download error:', error);
                alert('Error generating PDF download. Please try the print option instead.');
              }
            }
          </script>
        `)
      
      printWindow.document.write(enhancedHTML)
      printWindow.document.close()
      
      // Enhanced print handling
      let printTriggered = false
      
      const triggerPrint = () => {
        if (!printTriggered && printWindow && !printWindow.closed) {
          printTriggered = true
          try {
            console.log('🖨️ PDF window ready with download option')
            // Don't auto-trigger print, let user choose
          } catch (printError) {
            console.error('❌ Print error:', printError)
            alert(`❌ Error with PDF window for ${reportName}.`)
          }
        }
      }
      
      // Method 1: OnLoad event (most reliable)
      printWindow.addEventListener('load', () => {
        console.log('📄 PDF content loaded with download capability')
        setTimeout(triggerPrint, 500)
      })
      
      // Method 2: Fallback timeout
      setTimeout(() => {
        if (!printTriggered) {
          console.log('⏰ Using fallback trigger')
          triggerPrint()
        }
      }, 2000)
      
      return true
    } catch (error) {
      console.error('❌ Error in generatePDFInWindow:', error)
      return false
    }
  }

  const generateAdvancedAnalyticsPDF = async (data: ExportData) => {
    try {
      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const avgOrderValue = data.orders > 0 ? data.revenue / data.orders : 0

      // Generate daily breakdown section for week/month reports
      const generateDailyBreakdown = () => {
        if (!data.dailySummaries || data.dailySummaries.length === 0) return ''
        
        return `
          <div class="section">
            <h2 class="section-title">📈 Daily Performance Breakdown</h2>
            <table class="performance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Expenses</th>
                  <th>Profit</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                ${data.dailySummaries.map((day, index) => {
                  const avgOrder = day.orders > 0 ? day.revenue / day.orders : 0
                  const profitClass = day.profit >= 0 ? 'positive' : 'negative'
                  return `
                    <tr key="${day.dateKey || index}">
                      <td><strong>${day.date}</strong></td>
                      <td>₱${day.revenue.toLocaleString()}</td>
                      <td>${day.orders}</td>
                      <td>₱${day.expenses.toLocaleString()}</td>
                      <td class="${profitClass}">₱${day.profit.toLocaleString()}</td>
                      <td>₱${avgOrder.toFixed(2)}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; background: #f9fafb; padding: 15px; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; color: #374151;">📊 ${data.period === 'week' ? 'Weekly' : 'Monthly'} Insights</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Best Day:</strong> ${(() => {
                    const bestDay = data.dailySummaries.reduce((best, current) => 
                      current.revenue > best.revenue ? current : best
                    )
                    return `${bestDay.date} (₱${bestDay.revenue.toLocaleString()})`
                  })()}
                </div>
                <div>
                  <strong>Avg Daily Revenue:</strong> ₱${(data.revenue / data.dailySummaries.length).toFixed(2)}
                </div>
                <div>
                  <strong>Most Active Day:</strong> ${(() => {
                    const busiestDay = data.dailySummaries.reduce((best, current) => 
                      current.orders > best.orders ? current : best
                    )
                    return `${busiestDay.date} (${busiestDay.orders} orders)`
                  })()}
                </div>
                <div>
                  <strong>Avg Daily Orders:</strong> ${(data.orders / data.dailySummaries.length).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        `
      }

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
              .section-title { color: #2563eb; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .section { margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Analytics</div>
              <h1>Advanced Analytics Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            ${generateDailyBreakdown()}
            
            <div class="section">
              <h2 class="section-title">📊 Business Overview</h2>
              <p><strong>Total Orders:</strong> ${data.orders.toLocaleString()}</p>
              <p><strong>Gross Revenue:</strong> ₱${data.revenue.toLocaleString()}</p>
              <p><strong>Net Profit:</strong> <span class="${netProfit >= 0 ? 'positive' : 'negative'}">₱${netProfit.toLocaleString()}</span></p>
              <p><strong>Average Order Value:</strong> ₱${avgOrderValue.toFixed(2)}</p>
              <p><strong>Gross Margin:</strong> ${grossMargin.toFixed(1)}%</p>
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
                    <th>% of Total</th>
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
            
            <div class="footer">
              <p><strong>CoreTrack Business Management System</strong></p>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Advanced Analytics')
    } catch (error) {
      console.error('Advanced Analytics PDF export error:', error)
      alert('❌ Error generating Advanced Analytics PDF. Please try again.')
    }
  }

  const generateFinancialPerformancePDF = async (data: ExportData) => {
    try {
      const grossProfit = data.revenue - data.cogs
      const netProfit = grossProfit - data.expenses
      const grossMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0
      const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0

      // Generate daily financial breakdown for week/month reports
      const generateDailyFinancialBreakdown = () => {
        if (!data.dailySummaries || data.dailySummaries.length === 0) return ''
        
        return `
          <div class="section">
            <h2 class="section-title">📈 Daily Financial Performance</h2>
            <table class="performance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Expenses</th>
                  <th>Gross Profit</th>
                  <th>Net Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                ${data.dailySummaries.map((day, index) => {
                  const dailyGrossProfit = day.revenue - day.cogs
                  const dailyNetProfit = dailyGrossProfit - day.expenses
                  const dailyMargin = day.revenue > 0 ? (dailyNetProfit / day.revenue) * 100 : 0
                  const profitClass = dailyNetProfit >= 0 ? 'positive' : 'negative'
                  return `
                    <tr key="${day.dateKey || index}">
                      <td><strong>${day.date}</strong></td>
                      <td>₱${day.revenue.toLocaleString()}</td>
                      <td>₱${day.cogs.toLocaleString()}</td>
                      <td>₱${day.expenses.toLocaleString()}</td>
                      <td class="${dailyGrossProfit >= 0 ? 'positive' : 'negative'}">₱${dailyGrossProfit.toLocaleString()}</td>
                      <td class="${profitClass}">₱${dailyNetProfit.toLocaleString()}</td>
                      <td class="${profitClass}">${dailyMargin.toFixed(1)}%</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7;">
              <h3 style="margin: 0 0 10px 0; color: #0f172a;">💡 Financial Insights</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong>Most Profitable Day:</strong> ${(() => {
                    const mostProfitable = data.dailySummaries.reduce((best, current) => 
                      current.profit > best.profit ? current : best
                    )
                    return `${mostProfitable.date} (₱${mostProfitable.profit.toLocaleString()})`
                  })()}
                </div>
                <div>
                  <strong>Average Daily Margin:</strong> ${(() => {
                    const avgMargin = data.dailySummaries.reduce((sum, day) => {
                      const margin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0
                      return sum + margin
                    }, 0) / data.dailySummaries.length
                    return `${avgMargin.toFixed(1)}%`
                  })()}
                </div>
                <div>
                  <strong>Total Gross Profit:</strong> ₱${(data.revenue - data.cogs).toLocaleString()}
                </div>
                <div>
                  <strong>Break-even Revenue:</strong> ₱${(data.cogs + data.expenses).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        `
      }

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
              .positive { color: #059669; font-weight: bold; }
              .negative { color: #dc2626; font-weight: bold; }
              .neutral { color: #374151; font-weight: bold; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
              .financial-line { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
              .financial-label { font-weight: 600; color: #374151; }
              .financial-value { font-weight: bold; color: #111827; }
              .subtotal { background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 16px 0; }
              .section { margin-bottom: 30px; }
              .section-title { color: #059669; font-size: 1.4em; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Financial</div>
              <h1>Financial Performance Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            ${generateDailyFinancialBreakdown()}
            
            <div class="section">
              <h2>💰 Profit & Loss Statement</h2>
              
              <div class="financial-line">
                <span class="financial-label">Gross Revenue:</span>
                <span class="financial-value">₱${data.revenue.toLocaleString()}</span>
              </div>
              
              <div class="financial-line">
                <span class="financial-label">Cost of Goods Sold:</span>
                <span class="financial-value">₱${data.cogs.toLocaleString()}</span>
              </div>
              
              <div class="subtotal">
                <div class="financial-line">
                  <span class="financial-label">Gross Profit:</span>
                  <span class="financial-value positive">₱${grossProfit.toLocaleString()}</span>
                </div>
                <div class="financial-line">
                  <span class="financial-label">Gross Margin:</span>
                  <span class="financial-value">${grossMargin.toFixed(1)}%</span>
                </div>
              </div>
              
              <div class="financial-line">
                <span class="financial-label">Total Expenses:</span>
                <span class="financial-value ${data.expenses > 0 ? 'negative' : 'neutral'}">₱${data.expenses.toLocaleString()}</span>
              </div>
            </div>
            
            <div class="subtotal">
              <div class="financial-line">
                <span class="financial-label">Net Profit:</span>
                <span class="financial-value ${netProfit >= 0 ? 'positive' : 'negative'}">₱${netProfit.toLocaleString()}</span>
              </div>
              <div class="financial-line">
                <span class="financial-label">Net Margin:</span>
                <span class="financial-value">${netMargin.toFixed(1)}%</span>
              </div>
            </div>
            
            <h3>📊 Financial Breakdown</h3>
            <p><strong>Revenue Breakdown:</strong></p>
            <ul>
              <li>Total Orders: ${data.orders.toLocaleString()}</li>
              <li>Average Order Value: ₱${data.orders > 0 ? (data.revenue / data.orders).toFixed(2) : '0.00'}</li>
            </ul>
            
            <p><strong>Cost Analysis:</strong></p>
            <ul>
              <li>COGS as % of Revenue: ${data.revenue > 0 ? ((data.cogs / data.revenue) * 100).toFixed(1) : '0'}%</li>
              <li>Expenses as % of Revenue: ${data.revenue > 0 ? ((data.expenses / data.revenue) * 100).toFixed(1) : '0'}%</li>
              <li>Total Costs: ₱${(data.cogs + data.expenses).toLocaleString()}</li>
            </ul>
            
            <div class="footer">
              <p><strong>CoreTrack Financial Analysis</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Note: ${data.expenses === 0 ? 'No expenses found for this period' : 'Including all recorded expenses for selected period'}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Financial Performance')
    } catch (error) {
      console.error('Financial Performance PDF export error:', error)
      alert('❌ Error generating Financial Performance PDF. Please try again.')
    }
  }

  const generateInventoryReportPDF = async (data: ExportData) => {
    try {
      const inventory = data.inventoryData
      if (!inventory) {
        alert('No inventory data available for the selected period')
        return
      }

      const totalItems = inventory.totalItems || 0
      const totalValue = inventory.totalValue || 0
      const lowStockItems = inventory.lowStockItems || []
      const outOfStockItems = inventory.outOfStockItems || []

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
              .performance-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .performance-table th, .performance-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .performance-table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .alert-low { color: #f59e0b; background-color: #fef3c7; }
              .alert-out { color: #dc2626; background-color: #fecaca; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Inventory</div>
              <h1>Inventory Analysis Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <h2>📦 Inventory Overview</h2>
            <p><strong>Total Items:</strong> ${totalItems.toLocaleString()}</p>
            <p><strong>Total Value:</strong> ₱${totalValue.toLocaleString()}</p>
            <p><strong>Low Stock Items:</strong> ${lowStockItems.length}</p>
            <p><strong>Out of Stock Items:</strong> ${outOfStockItems.length}</p>
            
            <div class="footer">
              <p><strong>CoreTrack Inventory Management</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Inventory Report')
    } catch (error) {
      console.error('Inventory Report PDF export error:', error)
      alert('❌ Error generating Inventory Report PDF. Please try again.')
    }
  }

  // Enhanced Order Analytics PDF Generation Functions
  const generateOrderVolumeReportPDF = async (data: ExportData) => {
    try {
      const { startDate, endDate } = calculateDateRange()
      const locationId = getBranchLocationId(selectedBranch!.id)
      
      // Use the comprehensive order fetching helper
      const dateFilteredOrders = await fetchComprehensiveOrders(startDate, endDate, locationId)

      if (dateFilteredOrders.length === 0) {
        alert(`No order data found for the selected ${exportDateRange} period. Please try a different date range.`)
        return
      }

      // Build volume data
      const volumeMap = new Map<string, { orders: number; revenue: number; }>();

      dateFilteredOrders.forEach(order => {
        const orderDate = order.createdAt.toDate();
        const key = orderDate.toISOString().split('T')[0]; // daily grouping
        
        if (!volumeMap.has(key)) {
          volumeMap.set(key, { orders: 0, revenue: 0 });
        }

        const data = volumeMap.get(key)!;
        data.orders += 1;
        data.revenue += order.total || 0;
      });

      const volumeData = Array.from(volumeMap.entries())
        .map(([date, data]) => ({
          date,
          orders: data.orders,
          revenue: data.revenue,
          avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
          period: 'daily' as const
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      console.log(`📊 Volume Analysis - Final volume data points: ${volumeData.length}`);

      const totalOrders = volumeData.reduce((sum, day) => sum + day.orders, 0)
      const totalRevenue = volumeData.reduce((sum, day) => sum + day.revenue, 0)
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const bestDay = volumeData.reduce((best, day) => day.orders > best.orders ? day : best, volumeData[0])

      const volumeTableRows = volumeData.slice(0, 15).map(day => `
        <tr>
          <td>${day.date}</td>
          <td style="text-align: center;">${day.orders}</td>
          <td style="text-align: right;">₱${day.revenue.toLocaleString()}</td>
          <td style="text-align: right;">₱${day.avgOrderValue.toFixed(2)}</td>
        </tr>
      `).join('')

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Order Volume Report - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #3b82f6; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .metric-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-label { color: #6b7280; font-size: 0.9em; margin-bottom: 5px; }
              .metric-value { color: #111827; font-size: 1.5em; font-weight: bold; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .table th { background-color: #f8fafc; font-weight: 600; color: #374151; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Order Analytics</div>
              <h1>Order Volume Trends Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Total Orders</div>
                <div class="metric-value">${totalOrders.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">₱${totalRevenue.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Average Order Value</div>
                <div class="metric-value">₱${avgOrderValue.toFixed(2)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Peak Day</div>
                <div class="metric-value">${bestDay.orders} orders</div>
                <div class="metric-label">${bestDay.date}</div>
              </div>
            </div>

            <h2>📈 Daily Volume Breakdown</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="text-align: center;">Orders</th>
                  <th style="text-align: right;">Revenue</th>
                  <th style="text-align: right;">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${volumeTableRows}
              </tbody>
            </table>
            
            <div class="footer">
              <p><strong>CoreTrack Order Analytics</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Order Volume Report')
    } catch (error) {
      console.error('Order Volume Report PDF export error:', error)
      alert('❌ Error generating Order Volume Report PDF. Please try again.')
    }
  }

  const generatePeakHoursReportPDF = async (data: ExportData) => {
    try {
      const { startDate, endDate } = calculateDateRange()
      const locationId = getBranchLocationId(selectedBranch!.id)
      
      // Use the comprehensive order fetching helper
      const dateFilteredOrders = await fetchComprehensiveOrders(startDate, endDate, locationId)

      if (dateFilteredOrders.length === 0) {
        alert(`No order data found for the selected ${exportDateRange} period. Please try a different date range.`)
        return
      }

      // Build peak hours data
      const hourlyMap = new Map<number, { orders: number; revenue: number; }>();

      // Initialize all 24 hours
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { orders: 0, revenue: 0 });
      }

      dateFilteredOrders.forEach(order => {
        const orderDate = order.createdAt.toDate();
        const hour = orderDate.getHours();
        
        const data = hourlyMap.get(hour)!;
        data.orders += 1;
        data.revenue += order.total || 0;
      });

      const peakHoursData = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({
          hour,
          orders: data.orders,
          revenue: data.revenue,
          avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
        }))
        .sort((a, b) => b.orders - a.orders); // Sort by orders descending

      const totalHourlyOrders = peakHoursData.reduce((sum, hour) => sum + hour.orders, 0)
      const totalHourlyRevenue = peakHoursData.reduce((sum, hour) => sum + hour.revenue, 0)
      const peakHour = peakHoursData[0] // Already sorted by orders desc
      const quietHour = peakHoursData[peakHoursData.length - 1]

      const hoursTableRows = peakHoursData.slice(0, 12).map((hour, index) => {
        const timeFormat = hour.hour === 0 ? '12:00 AM' : 
                          hour.hour < 12 ? `${hour.hour}:00 AM` :
                          hour.hour === 12 ? '12:00 PM' : `${hour.hour - 12}:00 PM`
        
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${timeFormat}</td>
            <td style="text-align: center;">${hour.orders}</td>
            <td style="text-align: right;">₱${hour.revenue.toLocaleString()}</td>
            <td style="text-align: right;">₱${hour.avgOrderValue.toFixed(2)}</td>
          </tr>
        `
      }).join('')

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Peak Hours Analysis - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #f59e0b; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .metric-card { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-label { color: #92400e; font-size: 0.9em; margin-bottom: 5px; }
              .metric-value { color: #111827; font-size: 1.5em; font-weight: bold; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .table th { background-color: #fef3c7; font-weight: 600; color: #92400e; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Peak Hours</div>
              <h1>Peak Hours Analysis Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Peak Hour</div>
                <div class="metric-value">${peakHour.hour}:00</div>
                <div class="metric-label">${peakHour.orders} orders</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Peak Revenue</div>
                <div class="metric-value">₱${peakHour.revenue.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Quietest Hour</div>
                <div class="metric-value">${quietHour.hour}:00</div>
                <div class="metric-label">${quietHour.orders} orders</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Active Hours</div>
                <div class="metric-value">${peakHoursData.filter(h => h.orders > 0).length}/24</div>
              </div>
            </div>

            <h2>⏰ Top 12 Busiest Hours</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Hour</th>
                  <th style="text-align: center;">Orders</th>
                  <th style="text-align: right;">Revenue</th>
                  <th style="text-align: right;">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${hoursTableRows}
              </tbody>
            </table>
            
            <div class="footer">
              <p><strong>CoreTrack Peak Hours Analytics</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Peak Hours Analysis')
    } catch (error) {
      console.error('Peak Hours Report PDF export error:', error)
      alert('❌ Error generating Peak Hours Report PDF. Please try again.')
    }
  }

  const generatePaymentInsightsReportPDF = async (data: ExportData) => {
    try {
      const { startDate, endDate } = calculateDateRange()
      const locationId = getBranchLocationId(selectedBranch!.id)
      
      // Use the comprehensive order fetching helper
      const dateFilteredOrders = await fetchComprehensiveOrders(startDate, endDate, locationId)

      if (dateFilteredOrders.length === 0) {
        alert(`No order data found for the selected ${exportDateRange} period. Please try a different date range.`)
        return
      }

      // Build payment method data
      const paymentMap = new Map<string, { amount: number; transactions: number; }>();

      dateFilteredOrders.forEach(order => {
        const method = order.paymentMethod || 'Unknown';
        
        if (!paymentMap.has(method)) {
          paymentMap.set(method, { amount: 0, transactions: 0 });
        }

        const data = paymentMap.get(method)!;
        data.amount += order.total || 0;
        data.transactions += 1;
      });

      const paymentData = Array.from(paymentMap.entries())
        .map(([method, data]) => ({
          method,
          amount: data.amount,
          transactions: data.transactions,
          avgTransactionValue: data.transactions > 0 ? data.amount / data.transactions : 0,
          percentage: 0 // Will be calculated below
        }))
        .sort((a, b) => b.amount - a.amount); // Sort by amount descending

      // Calculate percentages
      const totalAmount = paymentData.reduce((sum, method) => sum + method.amount, 0);
      paymentData.forEach(method => {
        method.percentage = totalAmount > 0 ? (method.amount / totalAmount) * 100 : 0;
      });

      const totalTransactions = paymentData.reduce((sum, method) => sum + method.transactions, 0)
      const topMethod = paymentData[0] // Already sorted by amount desc

      const paymentTableRows = paymentData.map((method) => `
        <tr>
          <td>${method.method}</td>
          <td style="text-align: right;">₱${method.amount.toLocaleString()}</td>
          <td style="text-align: center;">${method.transactions}</td>
          <td style="text-align: center;">${method.percentage.toFixed(1)}%</td>
          <td style="text-align: right;">₱${method.avgTransactionValue.toFixed(2)}</td>
        </tr>
      `).join('')

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Method Insights - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #10b981; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .metric-card { background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-label { color: #065f46; font-size: 0.9em; margin-bottom: 5px; }
              .metric-value { color: #111827; font-size: 1.5em; font-weight: bold; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .table th { background-color: #ecfdf5; font-weight: 600; color: #065f46; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Payment Analytics</div>
              <h1>Payment Method Insights Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Total Transaction Value</div>
                <div class="metric-value">₱${totalAmount.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Transactions</div>
                <div class="metric-value">${totalTransactions.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Most Used Method</div>
                <div class="metric-value">${topMethod.method}</div>
                <div class="metric-label">${topMethod.percentage.toFixed(1)}% of total</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Payment Methods Used</div>
                <div class="metric-value">${paymentData.length}</div>
              </div>
            </div>

            <h2>💳 Payment Method Breakdown</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th style="text-align: right;">Total Amount</th>
                  <th style="text-align: center;">Transactions</th>
                  <th style="text-align: center;">Percentage</th>
                  <th style="text-align: right;">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${paymentTableRows}
              </tbody>
            </table>
            
            <div class="footer">
              <p><strong>CoreTrack Payment Analytics</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Payment Method Insights')
    } catch (error) {
      console.error('Payment Insights Report PDF export error:', error)
      alert('❌ Error generating Payment Insights Report PDF. Please try again.')
    }
  }

  const generateComprehensiveOrderReportPDF = async (data: ExportData) => {
    try {
      const { startDate, endDate } = calculateDateRange()
      const locationId = getBranchLocationId(selectedBranch!.id)
      
      // Use the comprehensive order fetching helper
      const dateFilteredOrders = await fetchComprehensiveOrders(startDate, endDate, locationId)

      if (dateFilteredOrders.length === 0) {
        alert(`No order data found for the selected ${exportDateRange} period. Please try a different date range.`)
        return
      }

      // Build comprehensive analytics manually
      const totalOrders = dateFilteredOrders.length;
      const totalRevenue = dateFilteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Peak hour analysis
      const hourlyMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);
      
      dateFilteredOrders.forEach(order => {
        const hour = order.createdAt.toDate().getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      });
      
      const peakHour = Array.from(hourlyMap.entries()).reduce((peak, [hour, orders]) => 
        orders > peak[1] ? [hour, orders] : peak, [0, 0])[0];

      // Payment method analysis
      const paymentMap = new Map<string, number>();
      dateFilteredOrders.forEach(order => {
        const method = order.paymentMethod || 'Unknown';
        paymentMap.set(method, (paymentMap.get(method) || 0) + 1);
      });
      
      const mostUsedPaymentMethod = Array.from(paymentMap.entries()).reduce((top, [method, count]) => 
        count > top[1] ? [method, count] : top, ['Unknown', 0])[0];

      // Growth rate calculation (simplified)
      const growthRate = 0; // Would need historical data for accurate calculation

      const summary = {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        peakHour,
        mostUsedPaymentMethod,
        growthRate
      }

      // Simple daily breakdown for the period
      const dailyMap = new Map<string, { orders: number; revenue: number; }>();
      
      dateFilteredOrders.forEach(order => {
        const date = order.createdAt.toDate().toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { orders: 0, revenue: 0 });
        }
        const dayData = dailyMap.get(date)!;
        dayData.orders += 1;
        dayData.revenue += order.total || 0;
      });

      const dailyRows = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 10) // Show last 10 days
        .map(([date, data]) => `
          <tr>
            <td>${date}</td>
            <td style="text-align: center;">${data.orders}</td>
            <td style="text-align: right;">₱${data.revenue.toLocaleString()}</td>
            <td style="text-align: right;">₱${(data.orders > 0 ? data.revenue / data.orders : 0).toFixed(2)}</td>
          </tr>
        `).join('')

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Comprehensive Order Report - ${data.dateRange}</title>
            <style>
              @media print { @page { margin: 0.5in; } }
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 3px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { color: #8b5cf6; font-size: 2.2em; font-weight: bold; margin-bottom: 10px; }
              .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
              .metric-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-label { color: #6b7280; font-size: 0.9em; margin-bottom: 5px; }
              .metric-value { color: #111827; font-size: 1.3em; font-weight: bold; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              .table th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
              .insights { background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .insights h3 { color: #92400e; margin-top: 0; }
              .insights ul { color: #451a03; }
              .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 0.9em; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CoreTrack Comprehensive Analytics</div>
              <h1>Comprehensive Order Report</h1>
              <p><strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${data.dateRange}</p>
            </div>
            
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Total Orders</div>
                <div class="metric-value">${summary.totalOrders.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total Revenue</div>
                <div class="metric-value">₱${summary.totalRevenue.toLocaleString()}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Avg Order Value</div>
                <div class="metric-value">₱${summary.avgOrderValue.toFixed(2)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Peak Hour</div>
                <div class="metric-value">${summary.peakHour}:00</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Preferred Payment</div>
                <div class="metric-value">${summary.mostUsedPaymentMethod}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Growth Rate</div>
                <div class="metric-value">${summary.growthRate.toFixed(1)}%</div>
              </div>
            </div>

            <h2>� Daily Performance Breakdown</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="text-align: center;">Orders</th>
                  <th style="text-align: right;">Revenue</th>
                  <th style="text-align: right;">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                ${dailyRows}
              </tbody>
            </table>

            <div class="insights">
              <h3>💡 Strategic Insights</h3>
              <ul>
                <li>Peak performance occurs at ${summary.peakHour}:00 - optimize staffing during this time</li>
                <li>${summary.mostUsedPaymentMethod} is the preferred payment method - ensure reliable processing</li>
                <li>Average order value of ₱${summary.avgOrderValue.toFixed(2)} indicates customer spending patterns</li>
                <li>Total of ${summary.totalOrders} orders generated ₱${summary.totalRevenue.toLocaleString()} in revenue</li>
                <li>Consider promotional campaigns during low-volume hours for increased revenue</li>
              </ul>
            </div>
            
            <div class="footer">
              <p><strong>CoreTrack Comprehensive Order Analytics</strong></p>
              <p>Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `

      generatePDF(pdfHTML, 'Comprehensive Order Report')
    } catch (error) {
      console.error('Comprehensive Order Report PDF export error:', error)
      alert('❌ Error generating Comprehensive Order Report PDF. Please try again.')
    }
  }

  const handleExport = async (reportType: string) => {
    console.log(`🚀 Starting export for: ${reportType}`)
    
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
      console.log('📊 Fetching export data...')
      const data = await fetchExportData()
      console.log('✅ Data fetched successfully:', data)
      
      // Add user feedback
      const statusDiv = document.createElement('div')
      statusDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: #2563eb; color: white; 
        padding: 15px; border-radius: 8px; 
        z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `
      statusDiv.innerHTML = `🔄 Generating ${reportType} report...`
      document.body.appendChild(statusDiv)
      
      // Generate report based on type
      if (reportType === 'analytics') {
        await generateAdvancedAnalyticsPDF(data)
      } else if (reportType === 'financial') {
        await generateFinancialPerformancePDF(data)
      } else if (reportType === 'inventory') {
        await generateInventoryReportPDF(data)
      } else if (reportType === 'orderVolume') {
        await generateOrderVolumeReportPDF(data)
      } else if (reportType === 'peakHours') {
        await generatePeakHoursReportPDF(data)
      } else if (reportType === 'paymentInsights') {
        await generatePaymentInsightsReportPDF(data)
      } else if (reportType === 'comprehensiveOrders') {
        await generateComprehensiveOrderReportPDF(data)
      } else {
        console.error('Unknown report type:', reportType)
        alert('Unknown report type. Please try again.')
        return
      }
      
      // Update status
      statusDiv.innerHTML = `✅ ${reportType} report generated successfully!`
      statusDiv.style.background = '#059669'
      setTimeout(() => document.body.removeChild(statusDiv), 3000)
      
    } catch (error) {
      console.error('Export error:', error)
      
      // Show error to user
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: #dc2626; color: white; 
        padding: 15px; border-radius: 8px; 
        z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `
      errorDiv.innerHTML = `❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      document.body.appendChild(errorDiv)
      setTimeout(() => document.body.removeChild(errorDiv), 5000)
      
      alert('Failed to generate export. Please check the console for details and try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Modern Loading state: Wait for branch selection
  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-light text-gray-900">Loading branch data...</p>
                <p className="text-gray-500">Please wait while we initialize your branch settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white space-y-6">
      {/* Modern Ultra-Clean Header - Capital Intelligence Style */}
      <div className="bg-gradient-to-br from-gray-50 to-white backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl shadow-gray-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Business Reports</h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
                Generate comprehensive business insights and performance analytics with advanced data visualization and export capabilities.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right space-y-2">
              <div className="text-sm text-gray-500 font-light">Report Status</div>
              <div className="text-2xl font-light tracking-tight text-emerald-900">
                📊 Ready to Export
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Modern Date Range Selector */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6">
          <h3 className="text-xl font-light text-gray-900 tracking-wide mb-6">Select Reporting Period</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setExportDateRange('today')}
              className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 font-medium ${
                exportDateRange === 'today' 
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-700 shadow-md scale-105' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm text-gray-700'
              }`}
            >
              <div className="text-lg mb-1">Today</div>
              <div className="text-xs opacity-70">Current day</div>
            </button>
            <button 
              onClick={() => setExportDateRange('week')}
              className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 font-medium ${
                exportDateRange === 'week' 
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-700 shadow-md scale-105' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm text-gray-700'
              }`}
            >
              <div className="text-lg mb-1">This Week</div>
              <div className="text-xs opacity-70">Last 7 days</div>
            </button>
            <button 
              onClick={() => setExportDateRange('month')}
              className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 font-medium ${
                exportDateRange === 'month' 
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-700 shadow-md scale-105' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm text-gray-700'
              }`}
            >
              <div className="text-lg mb-1">This Month</div>
              <div className="text-xs opacity-70">Last 30 days</div>
            </button>
            <button 
              onClick={() => setExportDateRange('custom')}
              className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 font-medium ${
                exportDateRange === 'custom' 
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-700 shadow-md scale-105' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm text-gray-700'
              }`}
            >
              <div className="text-lg mb-1">Custom Range</div>
              <div className="text-xs opacity-70">Pick dates</div>
            </button>
          </div>

        {/* Modern Custom Date Range Inputs */}
        {exportDateRange === 'custom' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={exportCustomStartDate}
                onChange={(e) => setExportCustomStartDate(e.target.value)}
                className="w-full p-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={exportCustomEndDate}
                onChange={(e) => setExportCustomEndDate(e.target.value)}
                className="w-full p-4 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white hover:border-gray-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modern Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Enhanced Analytics Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Analytics Report</h3>
            <p className="text-gray-500 leading-relaxed">
              Sales performance, customer insights, and operational metrics
            </p>
          </div>
          <button 
            onClick={() => {
              console.log('🔥 Analytics button clicked!')
              handleExport('analytics')
            }}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-blue-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export Analytics'
            )}
          </button>
        </div>

        {/* Enhanced Financial Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Financial Report</h3>
            <p className="text-gray-500 leading-relaxed">
              Revenue, expenses, profit margins, and financial summaries
            </p>
          </div>
          <button 
            onClick={() => {
              console.log('🔥 Financial button clicked!')
              handleExport('financial')
            }}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-2xl hover:from-green-600 hover:to-green-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-green-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export Financial'
            )}
          </button>
        </div>

        {/* Enhanced Inventory Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Inventory Report</h3>
            <p className="text-gray-500 leading-relaxed">
              Stock levels, usage patterns, and inventory valuation
            </p>
          </div>
          <button 
            onClick={() => handleExport('inventory')}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-2xl hover:from-orange-600 hover:to-orange-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-orange-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export Inventory'
            )}
          </button>
        </div>

        {/* Order Volume Trends Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Order Volume Trends</h3>
            <p className="text-gray-500 leading-relaxed">
              Daily, weekly, and monthly order volume analysis with growth trends
            </p>
          </div>
          <button 
            onClick={() => handleExport('orderVolume')}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-purple-600 hover:to-purple-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-purple-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export Order Trends'
            )}
          </button>
        </div>

        {/* Peak Hours Analysis Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Peak Hours Analysis</h3>
            <p className="text-gray-500 leading-relaxed">
              Hourly order patterns, busiest times, and staff optimization insights
            </p>
          </div>
          <button 
            onClick={() => handleExport('peakHours')}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4 px-6 rounded-2xl hover:from-indigo-600 hover:to-indigo-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-indigo-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export Peak Hours'
            )}
          </button>
        </div>

        {/* Payment Method Insights Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Payment Insights</h3>
            <p className="text-gray-500 leading-relaxed">
              Payment method preferences, transaction amounts, and customer behavior
            </p>
          </div>
          <button 
            onClick={() => handleExport('paymentInsights')}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 px-6 rounded-2xl hover:from-teal-600 hover:to-teal-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-teal-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export Payment Data'
            )}
          </button>
        </div>

        {/* Comprehensive Order Analytics Report */}
        <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Comprehensive Orders</h3>
            <p className="text-gray-500 leading-relaxed">
              Complete order analytics with all metrics, trends, and business insights
            </p>
          </div>
          <button 
            onClick={() => handleExport('comprehensiveOrders')}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 px-6 rounded-2xl hover:from-cyan-600 hover:to-cyan-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-cyan-500/25"
          >
            {isExporting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </div>
            ) : (
              'Export All Analytics'
            )}
          </button>
        </div>

      </div>
      </div>
    </div>
  );
}
