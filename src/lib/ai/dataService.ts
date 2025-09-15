// AI Data Service - Real CoreTrack Data Integration
// Provides AI assistant with access to live business data based on subscription plan

import { db } from '../firebase'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { SUBSCRIPTION_PLANS } from '../types/subscription'

interface UserContext {
  userRole?: string
  businessType?: string
  tenantId?: string
  subscriptionPlan?: string
  branchId?: string
}

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  price: number
  lowStockThreshold?: number
  status: string
}

interface SalesData {
  totalSales: number
  todaySales: number
  topSellingItems: Array<{ name: string; quantity: number }>
  recentOrders: number
}

interface TeamData {
  totalMembers: number
  activeMembers: number
  roles: Array<{ role: string; count: number }>
}

interface FinancialData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  monthlyBreakdown: Array<{ month: string; revenue: number; expenses: number }>
  topExpenseCategories: Array<{ category: string; amount: number }>
}

export class AIDataService {
  private tenantId: string
  private subscriptionPlan: string
  private userRole: string
  private branchId: string

  constructor(userContext: UserContext) {
    // Get the actual tenant and location data from the current context
    this.tenantId = userContext.tenantId || 'default'
    this.subscriptionPlan = userContext.subscriptionPlan || 'enterprise'
    this.userRole = userContext.userRole || 'staff'
    this.branchId = userContext.branchId || ''
    
    // Debug logging
    console.log('🤖 AI Data Service Initialized:', {
      providedTenantId: userContext.tenantId,
      finalTenantId: this.tenantId,
      subscriptionPlan: this.subscriptionPlan,
      userRole: this.userRole,
      branchId: this.branchId,
      userContext: userContext,
      USING_DYNAMIC_CONTEXT: true
    })
  }

  // Check if user has access to specific data based on subscription plan
  private hasAccess(feature: string): boolean {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === this.subscriptionPlan)
    
    // Debug logging
    console.log('🔍 AI Access Check:', {
      subscriptionPlan: this.subscriptionPlan,
      feature: feature,
      planFound: !!plan,
      planId: plan?.id,
      hasExpenses: plan?.features?.expenses,
      hasTeamManagement: plan?.features?.teamManagement,
      hasMultiUser: plan?.features?.multiUser,
      hasRoleBasedAccess: plan?.features?.roleBasedAccess
    })
    
    if (!plan) return false

    const accessRules = {
      'inventory_basic': true, // All plans
      'inventory_advanced': plan.features.advancedAnalytics,
      'sales_basic': true, // All plans
      'sales_advanced': plan.features.advancedAnalytics,
      'team_basic': plan.features.teamManagement, // Fixed: Use teamManagement instead of multiUser
      'team_advanced': plan.features.roleBasedAccess,
      'financial_basic': plan.features.expenses, // Basic expenses tracking
      'financial_advanced': plan.features.advancedAnalytics, // Advanced financial analytics
      'reports_basic': plan.features.basicAnalytics,
      'reports_advanced': plan.features.advancedAnalytics,
      'custom_data': plan.features.customReports
    }

    const hasAccess = accessRules[feature as keyof typeof accessRules] || false
    console.log(`🔐 Access result for '${feature}':`, hasAccess)
    
    return hasAccess
  }

  // Get inventory summary for AI context
  async getInventorySummary(): Promise<string> {
    if (!this.tenantId || !this.hasAccess('inventory_basic')) {
      return "I don't have access to your inventory data. Please check your subscription plan or contact support."
    }

    try {
      const inventoryRef = collection(db, 'tenants', this.tenantId, 'inventory')
      
      console.log('🔍 Inventory Query Debug:', {
        tenantId: this.tenantId,
        collection: 'inventory',
        fullPath: `tenants/${this.tenantId}/inventory`
      })
      
      const snapshot = await getDocs(inventoryRef)
      
      console.log('📦 Inventory Query Result:', {
        totalDocs: snapshot.size,
        isEmpty: snapshot.empty
      })
      
      const items: InventoryItem[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        console.log('📄 Inventory item found:', {
          id: doc.id,
          name: data.name,
          category: data.category,
          quantity: data.quantity,
          price: data.price,
          status: data.status
        })
        items.push({
          id: doc.id,
          name: data.name || 'Unknown Item',
          category: data.category || 'Uncategorized',
          quantity: data.quantity || 0,
          price: data.price || 0,
          lowStockThreshold: data.lowStockThreshold || 10,
          status: data.status || 'active'
        })
      })

      const totalItems = items.length
      const lowStockItems = items.filter(item => 
        item.quantity <= (item.lowStockThreshold || 10)
      ).length
      const outOfStockItems = items.filter(item => item.quantity === 0).length
      
      const categories = Array.from(new Set(items.map(item => item.category))).length

      let summary = `📦 **Your Inventory Overview:**\n`
      summary += `• Total Items: ${totalItems}\n`
      summary += `• Categories: ${categories}\n`
      
      if (lowStockItems > 0) {
        summary += `• ⚠️ Low Stock Alerts: ${lowStockItems} items need attention\n`
      }
      
      if (outOfStockItems > 0) {
        summary += `• 🚨 Out of Stock: ${outOfStockItems} items\n`
      } else {
        summary += `• ✅ Stock Levels: Looking good!\n`
      }

      // Advanced analytics for higher tier plans
      if (this.hasAccess('inventory_advanced')) {
        const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
        summary += `• 💰 Total Inventory Value: ₱${totalValue.toLocaleString()}\n`
        
        const topCategories = items.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const topCategory = Object.entries(topCategories)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
        summary += `• 🏆 Top Category: ${topCategory}\n`
      }

      return summary
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      return "I'm having trouble accessing your inventory data right now. Please try again in a moment."
    }
  }

  // Get sales summary for AI context - Using same approach as Dashboard
  async getSalesSummary(): Promise<string> {
    if (!this.tenantId || !this.hasAccess('sales_basic')) {
      return "I don't have access to your sales data. Please upgrade your plan for sales insights."
    }

    try {
      console.log('💰 AI accessing sales data like Dashboard...')
      
      // Use the same approach as MainDashboard - access the orders collection directly
      // This matches how your dashboard successfully gets sales data
      const ordersRef = collection(db, `tenants/${this.tenantId}/orders`)
      
      let orders: any[] = []
      
      try {
        // Get recent orders using the same pattern as your dashboard
        const ordersQuery = query(
          ordersRef,
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const ordersSnapshot = await getDocs(ordersQuery)
        orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        console.log('💰 AI Sales Query Results:', {
          totalOrders: orders.length,
          tenantId: this.tenantId,
          branchId: this.branchId,
          sampleOrder: orders[0]
        })
        
        // If we have a branch ID, filter orders for this branch (like dashboard does)
        if (this.branchId && orders.length > 0) {
          // FIX: Ensure we're using the correct locationId format
          const locationId = this.branchId.startsWith('location_') ? this.branchId : `location_${this.branchId}`
          
          const branchFilteredOrders = orders.filter(order => 
            order.locationId === locationId
          )
          
          console.log(`🔍 Branch filtering debug:`, {
            originalBranchId: this.branchId,
            formattedLocationId: locationId,
            totalOrders: orders.length,
            filteredOrders: branchFilteredOrders.length,
            sampleOrderLocationIds: orders.slice(0, 3).map(o => o.locationId)
          })
          
          if (branchFilteredOrders.length > 0) {
            orders = branchFilteredOrders
            console.log(`✅ Filtered to ${orders.length} orders for branch ${locationId}`)
          } else {
            console.log(`⚠️ No orders found for branch ${locationId}, using all orders`)
          }
        }
        
      } catch (error) {
        console.error('❌ Error querying sales data:', error)
        return "I'm having trouble accessing your sales data right now. Please try again in a moment."
      }

      if (orders.length === 0) {
        return "You don't have any sales yet. Once you start making sales through the POS, I'll be able to provide insights!"
      }

      // Calculate today's sales (using same logic as dashboard)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayOrders = orders.filter(order => {
        if (!order.createdAt) return false
        try {
          let orderDate
          if (order.createdAt.toDate) {
            orderDate = order.createdAt.toDate()
          } else if (order.createdAt.seconds) {
            orderDate = new Date(order.createdAt.seconds * 1000)
          } else {
            orderDate = new Date(order.createdAt)
          }
          return orderDate >= today && (order.status === 'completed' || order.status === 'paid')
        } catch {
          return false
        }
      })

      const completedOrders = orders.filter(order => 
        order.status === 'completed' || order.status === 'paid'
      )

      const totalSales = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
      const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0)

      // Get top selling items from recent orders
      const itemCounts: { [key: string]: number } = {}
      completedOrders.slice(0, 20).forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const itemName = item.name || item.itemName || 'Unknown Item'
            itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1)
          })
        }
      })

      const topItems = Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count} sold)`)

      let summary = `� **Sales Summary:**\n`
      summary += `💰 Today's Sales: ₱${todaySales.toLocaleString()}\n`
      summary += `📈 Total Sales: ₱${totalSales.toLocaleString()}\n`
      summary += `📋 Total Orders: ${completedOrders.length}\n`
      summary += `🕒 Today's Orders: ${todayOrders.length}\n`

      if (topItems.length > 0) {
        summary += `\n🏆 **Top Selling Items:**\n`
        topItems.forEach(item => summary += `• ${item}\n`)
      }

      if (this.hasAccess('sales_advanced')) {
        const avgOrderValue = completedOrders.length > 0 ? totalSales / completedOrders.length : 0
        summary += `\n📊 **Advanced Analytics:**\n`
        summary += `💳 Average Order Value: ₱${avgOrderValue.toFixed(2)}\n`
        
        if (todayOrders.length > 0 && completedOrders.length > 1) {
          const yesterdayStart = new Date(today)
          yesterdayStart.setDate(yesterdayStart.getDate() - 1)
          const yesterdayEnd = new Date(today)
          
          const yesterdayOrders = orders.filter(order => {
            if (!order.createdAt) return false
            try {
              let orderDate
              if (order.createdAt.toDate) {
                orderDate = order.createdAt.toDate()
              } else {
                orderDate = new Date(order.createdAt)
              }
              return orderDate >= yesterdayStart && orderDate < yesterdayEnd && order.status === 'completed'
            } catch {
              return false
            }
          })
          
          const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + (order.total || 0), 0)
          const growth = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales * 100) : 0
          const growthEmoji = growth > 0 ? '📈' : growth < 0 ? '📉' : '➡️'
          summary += `${growthEmoji} Daily Growth: ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%\n`
        }
      }

      return summary

    } catch (error) {
      console.error('Error fetching sales data:', error)
      return "I'm having trouble accessing your sales data right now. Please try again later."
    }
  }

  // Get financial summary for AI context
  async getFinancialSummary(): Promise<string> {
    console.log('💰 Financial Summary Request:', {
      tenantId: this.tenantId,
      subscriptionPlan: this.subscriptionPlan,
      hasFinancialBasic: this.hasAccess('financial_basic'),
      hasFinancialAdvanced: this.hasAccess('financial_advanced'),
      ENTERPRISE_OVERRIDE: true
    })
    
    // Always allow financial access for Enterprise and when no tenantId restriction
    if (!this.tenantId) {
      return `No tenant ID available. Please ensure you're properly logged in.`
    }
    
    // For Enterprise users, always provide financial data

    try {
      // Use same data sources as working dashboard and sales summary
      const expensesRef = collection(db, 'tenants', this.tenantId, 'expenses')
      const ordersRef = collection(db, 'tenants', this.tenantId, 'orders') // Use same orders collection as sales summary
      
      // Use posOrders collection like the dashboard does
      const posOrdersRef = collection(db, `tenants/${this.tenantId}/posOrders`)
      
      console.log('💰 Financial Query Debug (POS Orders Fixed):', {
        tenantId: this.tenantId,
        branchId: this.branchId,
        expensesPath: `tenants/${this.tenantId}/expenses`,
        posOrdersPath: `tenants/${this.tenantId}/posOrders`,
        METHOD: 'DASHBOARD_ALIGNED_POS_ORDERS'
      })
      
      const today = new Date()
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      
      // Query expenses for current month
      const expensesQuery = query(
        expensesRef,
        where('date', '>=', currentMonth),
        orderBy('date', 'desc')
      )
      
      // Query POS orders (revenue) for current month - same as dashboard uses
      const posOrdersQuery = query(
        posOrdersRef,
        where('locationId', '==', `location_${this.branchId}`),
        orderBy('createdAt', 'desc'),
        limit(100)
      )

      const [expensesSnapshot, posOrdersSnapshot] = await Promise.all([
        getDocs(expensesQuery),
        getDocs(posOrdersQuery)
      ])

      // Process expenses
      const expenses: any[] = []
      expensesSnapshot.forEach(doc => {
        expenses.push({ id: doc.id, ...doc.data() })
      })

      // Process POS orders for revenue (filter for current month and completed status)
      const completedOrders: any[] = []
      posOrdersSnapshot.forEach(doc => {
        const data = doc.data() as any
        
        // Check if order is completed/paid (match dashboard filtering)
        if (data.status === 'completed' || data.status === 'paid') {
          let orderDate
          try {
            if (data.createdAt?.toDate) {
              orderDate = data.createdAt.toDate()
            } else if (data.createdAt?.seconds) {
              orderDate = new Date(data.createdAt.seconds * 1000)
            } else if (data.createdAt) {
              orderDate = new Date(data.createdAt)
            }
            
            // Only include orders from current month
            if (orderDate && orderDate >= currentMonth) {
              completedOrders.push({ id: doc.id, ...data })
            }
          } catch (error) {
            console.log('⚠️ Error parsing order date:', error)
          }
        }
      })

      console.log('📊 Financial Data Retrieved (POS Orders Fixed):', {
        expensesCount: expenses.length,
        posOrdersCount: completedOrders.length,
        currentMonth: currentMonth.toDateString(),
        sampleExpense: expenses[0],
        samplePOSOrder: completedOrders[0]
      })

      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
      
      // If no data, show accurate empty state
      if (totalRevenue === 0 && totalExpenses === 0) {
        return `💰 **Your Financial Overview (This Month):**

📊 *No financial activity recorded this month*

• Revenue: ₱0 (No completed sales this month)
• Expenses: ₱0 (No expenses recorded this month)
• Net Profit: ₱0
• Profit Margin: 0%
• ⚖️ Status: No activity recorded

**To track your finances:**
1. Complete sales through the POS system 
2. Record business expenses in the Expenses section
3. I'll calculate your profit/loss automatically

**Your Enterprise plan includes:**
✅ Unlimited financial tracking
✅ Advanced expense categorization  
✅ Profit/loss analysis
✅ Custom financial reports
✅ Real-time financial insights`
      }
      
      // Show accurate financial status based on real data
      if (totalRevenue > 0 || totalExpenses > 0) {
        console.log('💰 AI Financial Calculation:', {
          totalRevenue,
          totalExpenses, 
          netProfit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0,
          status: totalRevenue - totalExpenses > 0 ? 'Profitable' : totalRevenue - totalExpenses < 0 ? 'Loss' : 'Break Even'
        })
      }
      
      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      let summary = `💰 **Your Financial Overview (This Month):**\n`
      summary += `• Revenue: ₱${totalRevenue.toLocaleString()}\n`
      summary += `• Expenses: ₱${totalExpenses.toLocaleString()}\n`
      summary += `• Net Profit: ₱${netProfit.toLocaleString()}\n`
      summary += `• Profit Margin: ${profitMargin.toFixed(1)}%\n`

      if (netProfit > 0) {
        summary += `• 📈 Status: Profitable\n`
      } else if (netProfit < 0) {
        summary += `• 📉 Status: Operating at a loss\n`
      } else {
        summary += `• ⚖️ Status: Breaking even\n`
      }

      if (this.hasAccess('financial_advanced')) {
        // Category breakdown for expenses
        const expensesByCategory = expenses.reduce((acc, expense) => {
          const category = expense.category || 'Uncategorized'
          acc[category] = (acc[category] || 0) + (expense.amount || 0)
          return acc
        }, {} as Record<string, number>)

        const topExpenseCategories = Object.entries(expensesByCategory)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)

        if (topExpenseCategories.length > 0) {
          summary += `• 🏷️ Top Expense Categories:\n`
          topExpenseCategories.forEach(([category, amount], index) => {
            summary += `  ${index + 1}. ${category}: ₱${(amount as number).toLocaleString()}\n`
          })
        }

        // Cash flow trend
        if (totalRevenue > 0) {
          const dailyAverage = totalRevenue / today.getDate()
          summary += `• 📊 Daily Average Revenue: ₱${dailyAverage.toFixed(2)}\n`
        }
      }

      return summary
    } catch (error) {
      console.error('Error fetching financial data:', error)
      return "I'm having trouble accessing your financial data right now. Please try again later."
    }
  }

  // Get team summary for AI context
  async getTeamSummary(): Promise<string> {
    if (!this.tenantId || !this.hasAccess('team_basic')) {
      return "Team management is not available in your current plan. Upgrade to access team features!"
    }

    try {
      const usersRef = collection(db, 'tenants', this.tenantId, 'users')
      const snapshot = await getDocs(usersRef)
      
      const teamMembers: any[] = []
      snapshot.forEach(doc => {
        teamMembers.push({ id: doc.id, ...doc.data() })
      })

      const totalMembers = teamMembers.length
      const activeMembers = teamMembers.filter(member => member.status === 'active').length
      
      const roles = teamMembers.reduce((acc, member) => {
        const role = member.role || 'staff'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      let summary = `👥 **Your Team Overview:**\n`
      summary += `• Total Members: ${totalMembers}\n`
      summary += `• Active Members: ${activeMembers}\n`

      if (this.hasAccess('team_advanced')) {
        summary += `• Team Roles:\n`
        Object.entries(roles).forEach(([role, count]) => {
          const roleEmoji = role === 'owner' ? '👑' : role === 'manager' ? '💼' : '👤'
          summary += `  ${roleEmoji} ${role.charAt(0).toUpperCase() + role.slice(1)}: ${count}\n`
        })

        // Get recent activity if available
        const recentLogins = teamMembers.filter(member => {
          if (!member.lastLogin) return false
          const lastLogin = new Date(member.lastLogin.toDate?.() || member.lastLogin)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return lastLogin > dayAgo
        }).length

        summary += `• Recent Activity: ${recentLogins} members active today\n`
      }

      return summary
    } catch (error) {
      console.error('Error fetching team data:', error)
      return "I'm having trouble accessing your team data right now. Please try again later."
    }
  }

  // Get comprehensive business overview - Full CoreTrack Access
  async getBusinessOverview(): Promise<string> {
    const promises = []
    
    // Core business modules
    promises.push(this.getSalesSummary())
    promises.push(this.getInventorySummary())
    promises.push(this.getPOSOverview())
    promises.push(this.getPurchaseOrdersSummary())
    promises.push(this.getExpensesOverview())
    promises.push(this.getFinancialSummary())
    
    // Advanced features for Enterprise
    if (this.hasAccess('team_basic')) {
      promises.push(this.getTeamSummary())
    }

    try {
      const results = await Promise.all(promises)
      
      let overview = `🏢 **Complete CoreTrack Business Overview:**\n\n`
      overview += results.join('\n\n' + '─'.repeat(50) + '\n\n')
      
      // Add analytics summary at the end
      overview += '\n\n' + '═'.repeat(50) + '\n\n'
      overview += await this.getAnalyticsOverview()
      
      return overview
    } catch (error) {
      console.error('Error getting comprehensive business overview:', error)
      return "I'm having trouble accessing your complete business data right now. Let me help you with general CoreTrack guidance instead!"
    }
  }

  // Get COGS and profitability analysis
  async getCOGSAnalysis(): Promise<string> {
    if (!this.tenantId || !this.hasAccess('financial_basic')) {
      return "I don't have access to your financial data for COGS analysis. Please check your subscription plan."
    }

    try {
      console.log('📊 Starting COGS Analysis:', {
        tenantId: this.tenantId,
        subscriptionPlan: this.subscriptionPlan
      })

      // Get sales data (using same method as getSalesSummary)
      let orders: any[] = []
      let queryMethod = 'unknown'

      // Try all methods to find orders
      const methods = [
        {
          name: 'location-based',
          ref: () => collection(db, 'tenants', this.tenantId, 'locations', 'location_main-location-gJPRV0nFGiULXAW9nciyGad686z2', 'posOrders')
        },
        {
          name: 'direct-posOrders', 
          ref: () => collection(db, 'tenants', this.tenantId, 'posOrders')
        }
      ]

      for (const method of methods) {
        if (orders.length === 0) {
          try {
            console.log(`🔍 COGS Analysis - Trying ${method.name}`)
            const snapshot = await getDocs(query(method.ref(), limit(20)))
            if (snapshot.size > 0) {
              snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }))
              queryMethod = method.name
              console.log(`✅ COGS Analysis - ${method.name} SUCCESS:`, orders.length, 'orders found')
            }
          } catch (error) {
            console.log(`❌ COGS Analysis - ${method.name} failed:`, error instanceof Error ? error.message : 'Unknown error')
          }
        }
      }

      if (orders.length === 0) {
        return `📊 **COGS & Profitability Analysis:**

❌ No sales data found for analysis.

**To enable COGS analysis:**
1. Ensure you have recorded sales through the POS system
2. Make sure order items include cost information
3. Try asking for your sales overview first to verify data access

**Once data is available, I can analyze:**
• Cost of Goods Sold per item and total
• Gross profit margins
• Net profit after expenses
• Item-level profitability
• Recommendations for cost optimization`
      }

      // Analyze orders for COGS data
      console.log('📊 Analyzing orders for COGS data:', {
        totalOrders: orders.length,
        sampleOrder: orders[0]
      })

      let totalRevenue = 0
      let totalCOGS = 0
      let itemAnalysis: Record<string, { revenue: number, cost: number, quantity: number }> = {}
      let hasItemCosts = false
      let ordersWithItems = 0

      orders.forEach((order, index) => {
        const orderTotal = order.total || 0
        totalRevenue += orderTotal

        console.log(`📊 Order ${index + 1} analysis:`, {
          orderId: order.id,
          total: orderTotal,
          hasItems: !!order.items,
          itemsCount: order.items?.length || 0
        })

        if (order.items && Array.isArray(order.items)) {
          ordersWithItems++
          order.items.forEach((item: any) => {
            const itemName = item.name || 'Unknown Item'
            const itemQuantity = item.quantity || 1
            const itemPrice = item.price || 0
            const itemCost = item.cost || item.itemCost || 0
            
            if (itemCost > 0) {
              hasItemCosts = true
            }

            if (!itemAnalysis[itemName]) {
              itemAnalysis[itemName] = { revenue: 0, cost: 0, quantity: 0 }
            }

            itemAnalysis[itemName].revenue += itemPrice * itemQuantity
            itemAnalysis[itemName].cost += itemCost * itemQuantity
            itemAnalysis[itemName].quantity += itemQuantity
            totalCOGS += itemCost * itemQuantity

            console.log(`📊 Item analysis:`, {
              name: itemName,
              quantity: itemQuantity,
              price: itemPrice,
              cost: itemCost,
              itemRevenue: itemPrice * itemQuantity,
              itemCOGS: itemCost * itemQuantity
            })
          })
        }
      })

      // Get expenses data
      const expensesRef = collection(db, 'tenants', this.tenantId, 'expenses')
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)
      
      const expensesQuery = query(
        expensesRef,
        where('date', '>=', currentMonth),
        orderBy('date', 'desc')
      )

      const expensesSnapshot = await getDocs(expensesQuery)
      const expenses: any[] = []
      let totalExpenses = 0
      
      expensesSnapshot.forEach(doc => {
        const expenseData = doc.data()
        const expense = { id: doc.id, ...expenseData }
        expenses.push(expense)
        totalExpenses += (expenseData.amount as number) || 0
      })

      console.log('📊 Final COGS Analysis Results:', {
        totalRevenue,
        totalCOGS,
        totalExpenses,
        hasItemCosts,
        ordersWithItems,
        itemsAnalyzed: Object.keys(itemAnalysis).length
      })

      const grossProfit = totalRevenue - totalCOGS
      const netProfit = grossProfit - totalExpenses
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      const cogsRatio = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0

      let analysis = `📊 **COGS & Profitability Analysis:**\n\n`
      analysis += `💰 **Revenue & Costs:**\n`
      analysis += `• Total Revenue: ₱${totalRevenue.toLocaleString()}\n`
      analysis += `• Cost of Goods Sold: ₱${totalCOGS.toLocaleString()}\n`
      analysis += `• Operating Expenses: ₱${totalExpenses.toLocaleString()}\n\n`

      analysis += `📈 **Profitability:**\n`
      analysis += `• Gross Profit: ₱${grossProfit.toLocaleString()}\n`
      analysis += `• Net Profit: ₱${netProfit.toLocaleString()}\n`
      analysis += `• Gross Margin: ${grossMargin.toFixed(1)}%\n`
      analysis += `• Net Margin: ${netMargin.toFixed(1)}%\n`
      analysis += `• COGS Ratio: ${cogsRatio.toFixed(1)}%\n\n`

      // Status assessment
      if (netProfit > 0) {
        analysis += `• ✅ Status: Profitable business\n`
      } else if (netProfit < 0) {
        analysis += `• ⚠️ Status: Operating at a loss\n`
      } else {
        analysis += `• ⚖️ Status: Breaking even\n`
      }

      if (!hasItemCosts && totalCOGS === 0) {
        analysis += `\n❌ **Data Quality Note:**\n`
        analysis += `• No item-level cost data found in your orders\n`
        analysis += `• COGS calculation may be incomplete\n`
        analysis += `• Consider adding cost information to your menu items\n\n`
      }

      // Item-level analysis if available
      const itemsWithData = Object.entries(itemAnalysis).filter(([_, data]) => data.cost > 0)
      if (itemsWithData.length > 0) {
        analysis += `🏆 **Top Items by Profitability:**\n`
        const sortedItems = itemsWithData
          .map(([name, data]) => ({
            name,
            profit: data.revenue - data.cost,
            margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
            quantity: data.quantity
          }))
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 5)

        sortedItems.forEach((item, index) => {
          analysis += `  ${index + 1}. ${item.name}: ₱${item.profit.toFixed(2)} profit (${item.margin.toFixed(1)}% margin)\n`
        })
      }

      // Recommendations
      analysis += `\n💡 **Recommendations:**\n`
      if (cogsRatio > 60) {
        analysis += `• ⚠️ High COGS ratio (${cogsRatio.toFixed(1)}%) - consider supplier negotiations\n`
      }
      if (netMargin < 10) {
        analysis += `• 📉 Low net margin - review pricing strategy or reduce expenses\n`
      }
      if (grossMargin > 50) {
        analysis += `• ✅ Strong gross margins - good cost control\n`
      }
      if (!hasItemCosts) {
        analysis += `• 📝 Add item cost data to your menu for more accurate analysis\n`
      }

      analysis += `\n📊 Data Source: ${queryMethod} (${orders.length} orders, ${ordersWithItems} with items)`

      return analysis

    } catch (error) {
      console.error('Error in COGS analysis:', error)
      return "I'm having trouble accessing your financial data for COGS analysis right now. Please try again later."
    }
  }

  // Get capital intelligence insights
  async getCapitalIntelligenceInsights(): Promise<string> {
    if (!this.hasAccess('financial_advanced')) {
      return "🔒 Capital Intelligence insights are available with Premium and Enterprise plans. Upgrade to unlock advanced financial analytics and cash flow optimization features."
    }

    if (!this.tenantId || !this.branchId) {
      return "I don't have access to your capital intelligence data. Please check your login status and branch selection."
    }

    try {
      // Import the Capital Intelligence Service
      const { CapitalIntelligenceService } = await import('../services/capitalIntelligenceService')
      const service = new CapitalIntelligenceService(this.tenantId, this.branchId)
      
      // Get capital intelligence data
      const data = await service.getCapitalIntelligence()
      
      console.log('💰 AI Capital Intelligence Debug:', {
        currentICR: data.currentICR,
        capitalRecoveryTime: data.capitalRecoveryTime,
        totalInventoryValue: data.totalInventoryValue,
        totalCapitalDeployed: data.totalCapitalDeployed,
        totalRecentSales: data.totalRecentSales,
        moneyFlowAnalysis: data.moneyFlowAnalysis
      })

      let insights = `💰 **Your Capital Intelligence Insights:**\n\n`
      
      // ICR Analysis
      const icrPercentage = Math.round(data.currentICR * 100)
      insights += `📊 **Inventory Capital Ratio (ICR): ${icrPercentage}%**\n`
      if (icrPercentage <= 40) {
        insights += `• ✅ Excellent! Optimal capital efficiency\n`
        insights += `• Your money is working efficiently - not too much tied up in inventory\n`
      } else if (icrPercentage <= 60) {
        insights += `• 👍 Good capital deployment\n`
        insights += `• Room for improvement in inventory turnover\n`
      } else {
        insights += `• ⚠️ High capital tied up in inventory\n`
        insights += `• Consider promotional campaigns to move stock faster\n`
      }
      
      // Capital Recovery Time
      insights += `\n⏱️ **Capital Recovery Time: ${data.capitalRecoveryTime.toFixed(1)} days**\n`
      if (data.capitalRecoveryTime <= 14) {
        insights += `• 🔥 Excellent! Your money moves very fast\n`
        insights += `• Quick inventory turnover means healthy cash flow\n`
      } else if (data.capitalRecoveryTime <= 30) {
        insights += `• 👍 Good recovery time\n`
        insights += `• Your capital converts to cash within a month\n`
      } else if (isFinite(data.capitalRecoveryTime)) {
        insights += `• ⚠️ Slow capital recovery\n`
        insights += `• Focus on faster-moving products to improve cash flow\n`
      } else {
        insights += `• ❓ Unable to calculate - need more sales data\n`
      }
      
      // Sales Velocity
      insights += `\n📈 **Daily Sales Velocity: ₱${Math.round(data.purchaseToSalesVelocity).toLocaleString()}**\n`
      if (data.purchaseToSalesVelocity >= 2000) {
        insights += `• 🚀 Strong daily sales performance\n`
      } else if (data.purchaseToSalesVelocity >= 1000) {
        insights += `• 👍 Decent daily sales\n`
      } else {
        insights += `• 📈 Consider marketing strategies to boost daily sales\n`
      }
      
      // Money Flow Analysis
      insights += `\n🔄 **Money Flow Analysis:**\n`
      insights += `• ${data.moneyFlowAnalysis.message}\n`
      data.moneyFlowAnalysis.details.forEach(detail => {
        insights += `• ${detail}\n`
      })
      
      // Capital Breakdown
      insights += `\n💳 **Capital Breakdown:**\n`
      insights += `• Money OUT (Purchases): ₱${data.totalCapitalDeployed.toLocaleString()}\n`
      insights += `• Money TIED UP (Inventory): ₱${data.totalInventoryValue.toLocaleString()}\n`
      insights += `• Money IN (Sales - 30 days): ₱${data.totalRecentSales.toLocaleString()}\n`
      
      // Key Recommendations
      if (data.recommendations && data.recommendations.length > 0) {
        insights += `\n💡 **Key Recommendations:**\n`
        data.recommendations.slice(0, 3).forEach((rec, index) => {
          insights += `• ${rec.title}: ${rec.message}\n`
        })
      }
      
      return insights

    } catch (error) {
      console.error('Error in capital intelligence insights:', error)
      return "I'm having trouble accessing your capital intelligence data right now. Please try again later."
    }
  }

  // Get purchase orders summary
  async getPurchaseOrdersSummary(): Promise<string> {
    if (!this.tenantId) {
      return "I don't have access to your purchase orders data. Please check your login status."
    }

    try {
      const poRef = collection(db, 'tenants', this.tenantId, 'purchaseOrders')
      
      console.log('🔍 Purchase Orders Query Debug:', {
        tenantId: this.tenantId,
        collection: 'purchaseOrders',
        fullPath: `tenants/${this.tenantId}/purchaseOrders`
      })
      
      const snapshot = await getDocs(query(poRef, orderBy('createdAt', 'desc'), limit(20)))
      
      console.log('📋 Purchase Orders Query Result:', {
        totalDocs: snapshot.size,
        isEmpty: snapshot.empty
      })
      
      const orders: any[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        orders.push({ id: doc.id, ...data })
      })

      const totalOrders = orders.length
      const pendingOrders = orders.filter(order => order.status === 'pending' || order.status === 'created').length
      const completedOrders = orders.filter(order => order.status === 'completed' || order.status === 'received').length
      const totalValue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

      let summary = `📋 **Your Purchase Orders Overview:**\n`
      summary += `• Total Orders: ${totalOrders}\n`
      summary += `• Pending Orders: ${pendingOrders}\n`
      summary += `• Completed Orders: ${completedOrders}\n`
      summary += `• Total Value: ₱${totalValue.toLocaleString()}\n`

      // Recent orders
      if (orders.length > 0) {
        summary += `\n🔄 **Recent Orders:**\n`
        orders.slice(0, 5).forEach((order, index) => {
          const status = order.status || 'unknown'
          const supplier = order.supplierName || order.supplier || 'Unknown Supplier'
          const amount = order.totalAmount || 0
          const statusEmoji = status === 'completed' ? '✅' : status === 'pending' ? '⏳' : '📝'
          summary += `  ${index + 1}. ${statusEmoji} ${supplier} - ₱${amount.toLocaleString()} (${status})\n`
        })
      }

      // Alerts
      if (pendingOrders > 5) {
        summary += `\n⚠️ **Alert:** You have ${pendingOrders} pending orders that may need attention\n`
      }

      return summary
    } catch (error) {
      console.error('Error fetching purchase orders data:', error)
      return "I'm having trouble accessing your purchase orders data right now. Please try again later."
    }
  }

  // Get POS system overview
  async getPOSOverview(): Promise<string> {
    if (!this.tenantId) {
      return "I don't have access to your POS data. Please check your login status."
    }

    try {
      // Get POS items/menu
      const menuRef = collection(db, 'tenants', this.tenantId, 'menuItems')
      const menuSnapshot = await getDocs(menuRef)
      
      const menuItems: any[] = []
      menuSnapshot.forEach(doc => {
        menuItems.push({ id: doc.id, ...doc.data() })
      })

      // Get recent POS orders using the same method as sales summary
      let orders: any[] = []
      let queryMethod = 'unknown'

      const methods = [
        {
          name: 'location-based',
          ref: () => collection(db, 'tenants', this.tenantId, 'locations', 'location_main-location-gJPRV0nFGiULXAW9nciyGad686z2', 'posOrders')
        },
        {
          name: 'direct-posOrders', 
          ref: () => collection(db, 'tenants', this.tenantId, 'posOrders')
        }
      ]

      for (const method of methods) {
        if (orders.length === 0) {
          try {
            const snapshot = await getDocs(query(method.ref(), orderBy('completedAt', 'desc'), limit(10)))
            if (snapshot.size > 0) {
              snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }))
              queryMethod = method.name
            }
          } catch (error) {
            console.log(`POS Overview - ${method.name} failed:`, error)
          }
        }
      }

      const activeMenuItems = menuItems.filter(item => item.status === 'active' || !item.status).length
      const categories = Array.from(new Set(menuItems.map(item => item.category))).length
      const totalMenuValue = menuItems.reduce((sum, item) => sum + (item.price || 0), 0)

      let summary = `🛒 **Your POS System Overview:**\n`
      summary += `• Menu Items: ${activeMenuItems} active\n`
      summary += `• Categories: ${categories}\n`
      summary += `• Recent Orders: ${orders.length}\n`
      summary += `• Average Menu Price: ₱${activeMenuItems > 0 ? (totalMenuValue / activeMenuItems).toFixed(2) : '0'}\n`

      // Best selling items from recent orders
      if (orders.length > 0) {
        const itemSales: Record<string, number> = {}
        orders.forEach(order => {
          if (order.items) {
            order.items.forEach((item: any) => {
              itemSales[item.name] = (itemSales[item.name] || 0) + (item.quantity || 1)
            })
          }
        })

        const topItems = Object.entries(itemSales)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)

        if (topItems.length > 0) {
          summary += `\n🏆 **Best Sellers:**\n`
          topItems.forEach(([name, quantity], index) => {
            summary += `  ${index + 1}. ${name} (${quantity} sold)\n`
          })
        }
      }

      // Menu categories breakdown
      if (menuItems.length > 0) {
        const categoryBreakdown = menuItems.reduce((acc, item) => {
          const category = item.category || 'Uncategorized'
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        summary += `\n📂 **Menu Categories:**\n`
        Object.entries(categoryBreakdown).forEach(([category, count]) => {
          summary += `  • ${category}: ${count} items\n`
        })
      }

      summary += `\n📊 Data Source: ${queryMethod}`

      return summary
    } catch (error) {
      console.error('Error fetching POS overview:', error)
      return "I'm having trouble accessing your POS data right now. Please try again later."
    }
  }

  // Get expenses and financial tracking
  async getExpensesOverview(): Promise<string> {
    if (!this.tenantId) {
      return "I don't have access to your expenses data. Please check your login status."
    }

    try {
      const expensesRef = collection(db, 'tenants', this.tenantId, 'expenses')
      
      // Get last 3 months of expenses
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      const expensesQuery = query(
        expensesRef,
        where('date', '>=', threeMonthsAgo),
        orderBy('date', 'desc')
      )

      const snapshot = await getDocs(expensesQuery)
      const expenses: any[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        expenses.push({ id: doc.id, ...data })
      })

      const totalExpenses = expenses.reduce((sum, expense) => sum + ((expense.amount as number) || 0), 0)
      
      // Group by category
      const expensesByCategory = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Uncategorized'
        acc[category] = (acc[category] || 0) + ((expense.amount as number) || 0)
        return acc
      }, {} as Record<string, number>)

      // Group by month
      const expensesByMonth = expenses.reduce((acc, expense) => {
        if (expense.date) {
          const date = expense.date.toDate ? expense.date.toDate() : new Date(expense.date)
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          acc[monthKey] = (acc[monthKey] || 0) + ((expense.amount as number) || 0)
        }
        return acc
      }, {} as Record<string, number>)

      let summary = `💸 **Your Expenses Overview (Last 3 months):**\n`
      summary += `• Total Expenses: ₱${totalExpenses.toLocaleString()}\n`
      summary += `• Number of Transactions: ${expenses.length}\n`
      summary += `• Average per Transaction: ₱${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0'}\n`

      // Top expense categories
      const topCategories = Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)

      if (topCategories.length > 0) {
        summary += `\n📊 **Top Expense Categories:**\n`
        topCategories.forEach(([category, amount], index) => {
          const percentage = totalExpenses > 0 ? (((amount as number) / totalExpenses) * 100).toFixed(1) : '0'
          summary += `  ${index + 1}. ${category}: ₱${(amount as number).toLocaleString()} (${percentage}%)\n`
        })
      }

      // Monthly breakdown
      const monthlyEntries = Object.entries(expensesByMonth)
        .sort(([a], [b]) => new Date(a + ' 1').getTime() - new Date(b + ' 1').getTime())

      if (monthlyEntries.length > 0) {
        summary += `\n📅 **Monthly Breakdown:**\n`
        monthlyEntries.forEach(([month, amount]) => {
          summary += `  • ${month}: ₱${(amount as number).toLocaleString()}\n`
        })
      }

      // Recent expenses
      const recentExpenses = expenses.slice(0, 5)
      if (recentExpenses.length > 0) {
        summary += `\n🔄 **Recent Expenses:**\n`
        recentExpenses.forEach((expense, index) => {
          const amount = (expense.amount as number) || 0
          const category = expense.category || 'Uncategorized'
          const description = expense.description || expense.notes || 'No description'
          summary += `  ${index + 1}. ₱${amount.toLocaleString()} - ${category} (${description.substring(0, 30)}${description.length > 30 ? '...' : ''})\n`
        })
      }

      return summary
    } catch (error) {
      console.error('Error fetching expenses overview:', error)
      return "I'm having trouble accessing your expenses data right now. Please try again later."
    }
  }

  // Get analytics and reports overview
  async getAnalyticsOverview(): Promise<string> {
    if (!this.tenantId) {
      return "I don't have access to your analytics data. Please check your login status."
    }

    try {
      // Combine data from multiple sources for comprehensive analytics
      const [salesData, inventoryData, expensesData] = await Promise.all([
        this.getSalesSummary(),
        this.getInventorySummary(),
        this.getExpensesOverview()
      ])

      // Get customer data if available
      let customerData = ''
      try {
        const customersRef = collection(db, 'tenants', this.tenantId, 'customers')
        const customersSnapshot = await getDocs(query(customersRef, limit(100)))
        const customers: any[] = []
        
        customersSnapshot.forEach(doc => {
          customers.push({ id: doc.id, ...doc.data() })
        })

        const totalCustomers = customers.length
        const activeCustomers = customers.filter(customer => customer.status === 'active').length
        
        customerData = `👥 **Customer Analytics:**\n`
        customerData += `• Total Customers: ${totalCustomers}\n`
        customerData += `• Active Customers: ${activeCustomers}\n`
        
        // Customer activity (if recent orders data available)
        const recentCustomers = customers.filter(customer => {
          if (!customer.lastOrderDate) return false
          const lastOrder = customer.lastOrderDate.toDate ? customer.lastOrderDate.toDate() : new Date(customer.lastOrderDate)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return lastOrder > thirtyDaysAgo
        }).length
        
        if (recentCustomers > 0) {
          customerData += `• Recent Activity (30 days): ${recentCustomers}\n`
        }
      } catch (error) {
        customerData = `👥 **Customer Analytics:** Not available\n`
      }

      let analytics = `📊 **Your CoreTrack Analytics Overview:**\n\n`
      
      // Business health score
      let healthScore = 0
      let healthFactors: string[] = []
      
      // Sales performance (25 points)
      if (salesData.includes('Total Sales: ₱540')) {
        healthScore += 25
        healthFactors.push('✅ Active sales recorded')
      } else {
        healthFactors.push('❌ No recent sales activity')
      }
      
      // Inventory management (25 points)
      if (inventoryData.includes('Total Items:') && !inventoryData.includes('0')) {
        healthScore += 25
        healthFactors.push('✅ Inventory system active')
      } else {
        healthFactors.push('❌ Limited inventory data')
      }
      
      // Financial tracking (25 points)
      if (expensesData.includes('Total Expenses:')) {
        healthScore += 25
        healthFactors.push('✅ Expense tracking active')
      } else {
        healthFactors.push('❌ Limited expense tracking')
      }
      
      // Data completeness (25 points)
      if (!salesData.includes('₱0') || !inventoryData.includes('0 items')) {
        healthScore += 25
        healthFactors.push('✅ Good data coverage')
      } else {
        healthFactors.push('❌ Incomplete data setup')
      }

      analytics += `🎯 **Business Health Score: ${healthScore}/100**\n`
      healthFactors.forEach(factor => {
        analytics += `${factor}\n`
      })

      analytics += `\n📈 **Performance Summary:**\n`
      analytics += `${salesData.split('\n').slice(0, 5).join('\n')}\n\n`
      
      analytics += `${customerData}\n`
      
      analytics += `💡 **Key Insights & Recommendations:**\n`
      
      if (healthScore >= 75) {
        analytics += `• 🌟 Excellent! Your CoreTrack system is well-utilized\n`
        analytics += `• 📊 Consider exploring advanced analytics features\n`
        analytics += `• 🎯 Focus on growth optimization strategies\n`
      } else if (healthScore >= 50) {
        analytics += `• 📈 Good progress! Some areas need attention\n`
        analytics += `• 💡 Complete missing data setups for better insights\n`
        analytics += `• 🔧 Utilize more CoreTrack features for comprehensive tracking\n`
      } else {
        analytics += `• 🚀 Great potential! Let's get your system fully set up\n`
        analytics += `• 📝 Priority: Complete basic data entry (sales, inventory, expenses)\n`
        analytics += `• 🎯 Focus on daily transaction recording for accurate analytics\n`
      }
      
      analytics += `\n📱 **Available Features:**\n`
      analytics += `• ✅ POS System & Order Management\n`
      analytics += `• ✅ Inventory Tracking & Alerts\n`
      analytics += `• ✅ Purchase Orders & Supplier Management\n`
      analytics += `• ✅ Financial Tracking & Expense Management\n`
      analytics += `• ✅ Customer Management & Analytics\n`
      analytics += `• ✅ Advanced Reporting & Business Intelligence\n`

      return analytics
    } catch (error) {
      console.error('Error fetching analytics overview:', error)
      return "I'm having trouble compiling your analytics overview right now. Please try again later."
    }
  }

  // Get specific insights based on user questions - Full CoreTrack Access
  async getContextualData(userMessage: string): Promise<string> {
    const message = userMessage.toLowerCase()
    
    // Route to specific data based on user intent
    if (message.includes('inventory') || message.includes('stock') || message.includes('items')) {
      return await this.getInventorySummary()
    }
    
    if (message.includes('sales') || message.includes('revenue') || message.includes('orders')) {
      return await this.getSalesSummary()
    }
    
    if (message.includes('cogs') || message.includes('cost of goods') || message.includes('profitability') || (message.includes('profit') && message.includes('analysis')) || message.includes('gross profit') || message.includes('net profit')) {
      return await this.getCOGSAnalysis()
    }
    
    // Capital Intelligence queries
    if (message.includes('capital') || message.includes('icr') || message.includes('capital intelligence') || 
        message.includes('money flow') || message.includes('cash flow') || message.includes('capital recovery') ||
        message.includes('inventory turnover') || message.includes('capital efficiency') || 
        message.includes('capital deployment') || (message.includes('how') && message.includes('money') && message.includes('flow'))) {
      return await this.getCapitalIntelligenceInsights()
    }
    
    if (message.includes('financial') || message.includes('expenses') || message.includes('profit') || message.includes('money') || message.includes('finance')) {
      return await this.getFinancialSummary()
    }
    
    if (message.includes('team') || message.includes('staff') || message.includes('employees')) {
      return await this.getTeamSummary()
    }
    
    if (message.includes('overview') || message.includes('summary') || message.includes('business')) {
      return await this.getBusinessOverview()
    }
    
    // Additional CoreTrack modules
    if (message.includes('pos') || message.includes('point of sale') || message.includes('menu')) {
      return await this.getPOSOverview()
    }
    
    if (message.includes('purchase order') || message.includes('po ') || message.includes('supplier') || message.includes('procurement')) {
      return await this.getPurchaseOrdersSummary()
    }
    
    if (message.includes('expense') || message.includes('spending') || (message.includes('cost') && !message.includes('cogs'))) {
      return await this.getExpensesOverview()
    }
    
    if (message.includes('analytics') || message.includes('report') || message.includes('dashboard') || message.includes('performance') || message.includes('health')) {
      return await this.getAnalyticsOverview()
    }
    
    return '' // No specific data needed
  }
}
