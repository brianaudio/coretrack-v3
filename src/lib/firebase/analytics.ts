import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';
import { POSOrder, getTodaysOrders } from './pos';
import { Expense, getExpensesByDateRange } from './expenses';
import { PurchaseOrder, getPurchaseOrderStats } from './purchaseOrders';
import { InventoryItem, getInventoryItems } from './inventory';

export interface DashboardStats {
  todaysSales: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
  };
  thisWeekSales: {
    revenue: number;
    orders: number;
    growth: number; // percentage vs last week
  };
  thisMonthSales: {
    revenue: number;
    orders: number;
    growth: number; // percentage vs last month
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    criticalItems: number;
    totalValue: number;
  };
  expenses: {
    thisMonth: number;
    pending: number;
    growth: number; // percentage vs last month
  };
  purchaseOrders: {
    pending: number;
    thisMonthValue: number;
    totalOrders: number;
  };
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

export interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
  category: string;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  orders: number;
  items: number;
}

// Helper function to get date range
const getDateRange = (days: number): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Helper function to get start of period
const getStartOfPeriod = (period: 'day' | 'week' | 'month'): Date => {
  const date = new Date();
  
  if (period === 'day') {
    date.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  }
  
  return date;
};

// Get orders by date range
const getOrdersByDateRange = async (
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<POSOrder[]> => {
  try {
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const q = query(
      ordersRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );
    
    const snapshot = await getDocs(q);
    
    // Filter completed orders and sort in memory to avoid index requirement
    const allOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSOrder[];
    
    return allOrders
      .filter(order => order.status === 'completed')
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error('Error fetching orders by date range:', error);
    return [];
  }
};

// Calculate growth percentage
const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Get dashboard statistics
export const getDashboardStats = async (tenantId: string): Promise<DashboardStats> => {
  try {
    // Today's data
    const todayStart = getStartOfPeriod('day');
    const todayEnd = new Date();
    const todaysOrders = await getOrdersByDateRange(tenantId, todayStart, todayEnd);
    
    const todaysSales = {
      revenue: todaysOrders.reduce((sum, order) => sum + order.total, 0),
      orders: todaysOrders.length,
      avgOrderValue: todaysOrders.length > 0 ? 
        todaysOrders.reduce((sum, order) => sum + order.total, 0) / todaysOrders.length : 0
    };

    // This week's data
    const thisWeekStart = getStartOfPeriod('week');
    const thisWeekOrders = await getOrdersByDateRange(tenantId, thisWeekStart, todayEnd);
    
    // Last week's data for comparison
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekOrders = await getOrdersByDateRange(tenantId, lastWeekStart, lastWeekEnd);
    
    const thisWeekRevenue = thisWeekOrders.reduce((sum, order) => sum + order.total, 0);
    const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + order.total, 0);
    
    const thisWeekSales = {
      revenue: thisWeekRevenue,
      orders: thisWeekOrders.length,
      growth: calculateGrowth(thisWeekRevenue, lastWeekRevenue)
    };

    // This month's data
    const thisMonthStart = getStartOfPeriod('month');
    const thisMonthOrders = await getOrdersByDateRange(tenantId, thisMonthStart, todayEnd);
    
    // Last month's data for comparison
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(thisMonthStart);
    lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
    const lastMonthOrders = await getOrdersByDateRange(tenantId, lastMonthStart, lastMonthEnd);
    
    const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
    
    const thisMonthSales = {
      revenue: thisMonthRevenue,
      orders: thisMonthOrders.length,
      growth: calculateGrowth(thisMonthRevenue, lastMonthRevenue)
    };

    // Inventory data
    const inventoryItems = await getInventoryItems(tenantId);
    const lowStockItems = inventoryItems.filter(item => item.status === 'low').length;
    const criticalItems = inventoryItems.filter(item => 
      item.status === 'critical' || item.status === 'out'
    ).length;
    const totalInventoryValue = inventoryItems.reduce((sum, item) => 
      sum + (item.currentStock * (item.costPerUnit || 0)), 0
    );

    // Expenses data
    const thisMonthExpenses = await getExpensesByDateRange(tenantId, thisMonthStart, todayEnd);
    const lastMonthExpenses = await getExpensesByDateRange(tenantId, lastMonthStart, lastMonthEnd);
    
    const thisMonthExpenseAmount = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const lastMonthExpenseAmount = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingExpenses = thisMonthExpenses.filter(e => e.status === 'pending').length;

    // Purchase orders data
    const purchaseOrderStats = await getPurchaseOrderStats(tenantId);

    return {
      todaysSales,
      thisWeekSales,
      thisMonthSales,
      inventory: {
        totalItems: inventoryItems.length,
        lowStockItems,
        criticalItems,
        totalValue: totalInventoryValue
      },
      expenses: {
        thisMonth: thisMonthExpenseAmount,
        pending: pendingExpenses,
        growth: calculateGrowth(thisMonthExpenseAmount, lastMonthExpenseAmount)
      },
      purchaseOrders: {
        pending: purchaseOrderStats.pendingOrders,
        thisMonthValue: purchaseOrderStats.thisMonthValue,
        totalOrders: purchaseOrderStats.totalOrders
      }
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw new Error('Failed to get dashboard statistics');
  }
};

// Get sales data for charts (last 30 days)
export const getSalesChartData = async (tenantId: string, days: number = 30): Promise<SalesData[]> => {
  try {
    const { start, end } = getDateRange(days);
    const orders = await getOrdersByDateRange(tenantId, start, end);
    
    // Group orders by date
    const salesByDate: Record<string, { revenue: number; orders: number }> = {};
    
    orders.forEach(order => {
      const date = order.createdAt.toDate().toLocaleDateString();
      if (!salesByDate[date]) {
        salesByDate[date] = { revenue: 0, orders: 0 };
      }
      salesByDate[date].revenue += order.total;
      salesByDate[date].orders += 1;
    });
    
    // Convert to array and fill missing dates
    const salesData: SalesData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString();
      
      const dayData = salesByDate[dateString] || { revenue: 0, orders: 0 };
      salesData.push({
        date: dateString,
        revenue: dayData.revenue,
        orders: dayData.orders,
        avgOrderValue: dayData.orders > 0 ? dayData.revenue / dayData.orders : 0
      });
    }
    
    return salesData;
  } catch (error) {
    console.error('Error getting sales chart data:', error);
    throw new Error('Failed to get sales chart data');
  }
};

// Get top selling items
export const getTopSellingItems = async (
  tenantId: string, 
  days: number = 30, 
  limitCount: number = 10
): Promise<TopSellingItem[]> => {
  try {
    const { start, end } = getDateRange(days);
    const orders = await getOrdersByDateRange(tenantId, start, end);
    
    // Aggregate items
    const itemStats: Record<string, {
      name: string;
      quantity: number;
      revenue: number;
      category: string;
    }> = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemStats[item.itemId]) {
          itemStats[item.itemId] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            category: 'Unknown' // Would need to fetch from menu items
          };
        }
        itemStats[item.itemId].quantity += item.quantity;
        itemStats[item.itemId].revenue += item.total;
      });
    });
    
    return Object.values(itemStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting top selling items:', error);
    throw new Error('Failed to get top selling items');
  }
};

// Get category performance
export const getCategoryPerformance = async (tenantId: string, days: number = 30): Promise<CategoryPerformance[]> => {
  try {
    const { start, end } = getDateRange(days);
    const orders = await getOrdersByDateRange(tenantId, start, end);
    
    // This would require joining with menu items to get categories
    // For now, return mock data structure
    const categoryStats: Record<string, {
      revenue: number;
      orders: Set<string>;
      items: Set<string>;
    }> = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const category = 'General'; // Would get from menu item
        if (!categoryStats[category]) {
          categoryStats[category] = {
            revenue: 0,
            orders: new Set(),
            items: new Set()
          };
        }
        categoryStats[category].revenue += item.total;
        categoryStats[category].orders.add(order.id);
        categoryStats[category].items.add(item.itemId);
      });
    });
    
    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      revenue: stats.revenue,
      orders: stats.orders.size,
      items: stats.items.size
    }));
  } catch (error) {
    console.error('Error getting category performance:', error);
    throw new Error('Failed to get category performance');
  }
};
