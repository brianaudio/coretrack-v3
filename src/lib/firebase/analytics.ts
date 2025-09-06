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
  endDate: Date,
  locationId?: string
): Promise<POSOrder[]> => {
  try {
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    
    let q;
    if (locationId) {
      q = query(
        ordersRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        where('locationId', '==', locationId)
      );
    } else {
      q = query(
        ordersRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );
    }
    
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
export const getDashboardStats = async (tenantId: string, locationId: string): Promise<DashboardStats> => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Orders data
    const [todayOrders, thisMonthOrders, lastMonthOrders] = await Promise.all([
      getOrdersByDateRange(tenantId, todayStart, todayEnd, locationId),
      getOrdersByDateRange(tenantId, thisMonthStart, todayEnd, locationId),
      getOrdersByDateRange(tenantId, lastMonthStart, lastMonthEnd, locationId)
    ]);
    
    // Calculate revenue
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
    
    const todaySales = {
      revenue: todayRevenue,
      orders: todayOrders.length,
      growth: calculateGrowth(todayRevenue, thisMonthRevenue / today.getDate())
    };
    
    const thisMonthSales = {
      revenue: thisMonthRevenue,
      orders: thisMonthOrders.length,
      growth: calculateGrowth(thisMonthRevenue, lastMonthRevenue)
    };

    // Inventory data
    const inventoryItems = await getInventoryItems(tenantId, locationId);
    const lowStockItems = inventoryItems.filter(item => item.status === 'low').length;
    const criticalItems = inventoryItems.filter(item => 
      item.status === 'critical' || item.status === 'out'
    ).length;
    const totalInventoryValue = inventoryItems.reduce((sum, item) => 
      sum + (item.currentStock * (item.costPerUnit || 0)), 0
    );

    // For now, return minimal data structure matching DashboardStats interface
    return {
      todaysSales: {
        revenue: todayRevenue,
        orders: todayOrders.length,
        avgOrderValue: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0
      },
      thisWeekSales: {
        revenue: 0, // Calculate from real weekly data
        orders: todayOrders.length * 7,
        growth: calculateGrowth(todayRevenue * 7, lastMonthRevenue / 4)
      },
      thisMonthSales: {
        revenue: thisMonthRevenue,
        orders: thisMonthOrders.length,
        growth: calculateGrowth(thisMonthRevenue, lastMonthRevenue)
      },
      inventory: {
        totalItems: inventoryItems.length,
        lowStockItems,
        criticalItems,
        totalValue: totalInventoryValue
      },
      expenses: {
        thisMonth: 0, // Calculate from real monthly data
        pending: 0,
        growth: 0
      },
      purchaseOrders: {
        pending: 0, // Calculate from real pending data
        thisMonthValue: 0,
        totalOrders: 0
      }
    };
  } catch (error) {
    console.error('Error getting dashboard statistics:', error);
    throw new Error('Failed to get dashboard statistics');
  }
};

// Get sales data for charts (last 30 days)
export const getSalesChartData = async (tenantId: string, days: number = 30, locationId?: string): Promise<SalesData[]> => {
  try {
    const { start, end } = getDateRange(days);
    const orders = await getOrdersByDateRange(tenantId, start, end, locationId);
    
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
  limitCount: number = 10,
  locationId?: string
): Promise<TopSellingItem[]> => {
  try {
    const { start, end } = getDateRange(days);
    const orders = await getOrdersByDateRange(tenantId, start, end, locationId);
    
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
export const getCategoryPerformance = async (tenantId: string, days: number = 30, locationId?: string): Promise<CategoryPerformance[]> => {
  try {
    const { start, end } = getDateRange(days);
    const orders = await getOrdersByDateRange(tenantId, start, end, locationId);
    
    // This would require joining with menu items to get categories
    // Return real data structure without mock data
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

// Enhanced Order Analytics Interfaces
export interface OrderVolumeData {
  date: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface PeakHoursData {
  hour: number;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  dayOfWeek?: string;
}

export interface PaymentMethodAnalytics {
  method: string;
  amount: number;
  transactions: number;
  percentage: number;
  avgOrderValue: number;
}

export interface OrderTrend {
  period: string;
  orders: number;
  revenue: number;
  growth: number; // percentage change
}

export interface ComprehensiveOrderAnalytics {
  volumeTrends: OrderVolumeData[];
  peakHours: PeakHoursData[];
  paymentMethods: PaymentMethodAnalytics[];
  quarterlyTrends: OrderTrend[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    peakHour: number;
    mostUsedPaymentMethod: string;
    growthRate: number;
  };
}

// Enhanced Order Analytics Functions
export const getOrderVolumeAnalytics = async (
  tenantId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<OrderVolumeData[]> => {
  try {
    const orders = await getOrdersByDateRange(tenantId, startDate, endDate, locationId);
    
    if (orders.length === 0) return [];

    const volumeMap = new Map<string, { orders: number; revenue: number; }>();

    orders.forEach(order => {
      if (!order.createdAt) return;
      
      const orderDate = order.createdAt.toDate();
      let key: string;

      switch (period) {
        case 'hourly':
          key = `${orderDate.toISOString().split('T')[0]} ${orderDate.getHours()}:00`;
          break;
        case 'weekly':
          const weekStart = new Date(orderDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // daily
          key = orderDate.toISOString().split('T')[0];
      }

      if (!volumeMap.has(key)) {
        volumeMap.set(key, { orders: 0, revenue: 0 });
      }

      const data = volumeMap.get(key)!;
      data.orders += 1;
      data.revenue += order.total || 0;
    });

    return Array.from(volumeMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
        period
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

  } catch (error) {
    console.error('Error fetching order volume analytics:', error);
    return [];
  }
};

export const getPeakHoursAnalytics = async (
  tenantId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<PeakHoursData[]> => {
  try {
    const orders = await getOrdersByDateRange(tenantId, startDate, endDate, locationId);
    
    if (orders.length === 0) return [];

    const hourlyData = new Map<number, { orders: number; revenue: number; }>();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, { orders: 0, revenue: 0 });
    }

    orders.forEach(order => {
      if (!order.createdAt) return;
      
      const hour = order.createdAt.toDate().getHours();
      const data = hourlyData.get(hour)!;
      data.orders += 1;
      data.revenue += order.total || 0;
    });

    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour,
        orders: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      }))
      .sort((a, b) => b.orders - a.orders); // Sort by order count descending

  } catch (error) {
    console.error('Error fetching peak hours analytics:', error);
    return [];
  }
};

export const getPaymentMethodAnalytics = async (
  tenantId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<PaymentMethodAnalytics[]> => {
  try {
    const orders = await getOrdersByDateRange(tenantId, startDate, endDate, locationId);
    
    if (orders.length === 0) return [];

    const paymentData = new Map<string, { amount: number; transactions: number; }>();
    let totalAmount = 0;

    orders.forEach(order => {
      const method = order.paymentMethod || 'Cash';
      const amount = order.total || 0;
      
      if (!paymentData.has(method)) {
        paymentData.set(method, { amount: 0, transactions: 0 });
      }
      
      const data = paymentData.get(method)!;
      data.amount += amount;
      data.transactions += 1;
      totalAmount += amount;
    });

    return Array.from(paymentData.entries())
      .map(([method, data]) => ({
        method,
        amount: data.amount,
        transactions: data.transactions,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        avgOrderValue: data.transactions > 0 ? data.amount / data.transactions : 0
      }))
      .sort((a, b) => b.amount - a.amount);

  } catch (error) {
    console.error('Error fetching payment method analytics:', error);
    return [];
  }
};

export const getComprehensiveOrderAnalytics = async (
  tenantId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<ComprehensiveOrderAnalytics> => {
  try {
    const [volumeTrends, peakHours, paymentMethods] = await Promise.all([
      getOrderVolumeAnalytics(tenantId, locationId, startDate, endDate, 'daily'),
      getPeakHoursAnalytics(tenantId, locationId, startDate, endDate),
      getPaymentMethodAnalytics(tenantId, locationId, startDate, endDate)
    ]);

    // Calculate quarterly trends (last 4 quarters)
    const quarterlyTrends: OrderTrend[] = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const quarterEnd = new Date(now.getFullYear(), now.getMonth() - (i * 3), 0);
      const quarterStart = new Date(quarterEnd.getFullYear(), quarterEnd.getMonth() - 2, 1);
      
      const quarterOrders = await getOrdersByDateRange(tenantId, quarterStart, quarterEnd, locationId);
      const revenue = quarterOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      quarterlyTrends.push({
        period: `Q${Math.floor((quarterEnd.getMonth()) / 3) + 1} ${quarterEnd.getFullYear()}`,
        orders: quarterOrders.length,
        revenue,
        growth: 0 // Calculate growth later
      });
    }

    // Calculate growth rates
    quarterlyTrends.forEach((trend, index) => {
      if (index > 0) {
        const previousRevenue = quarterlyTrends[index - 1].revenue;
        trend.growth = previousRevenue > 0 
          ? ((trend.revenue - previousRevenue) / previousRevenue) * 100 
          : 0;
      }
    });

    // Calculate summary
    const totalOrders = volumeTrends.reduce((sum, day) => sum + day.orders, 0);
    const totalRevenue = volumeTrends.reduce((sum, day) => sum + day.revenue, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const peakHour = peakHours.length > 0 ? peakHours[0].hour : 12;
    const mostUsedPaymentMethod = paymentMethods.length > 0 ? paymentMethods[0].method : 'Cash';
    const growthRate = quarterlyTrends.length > 1 
      ? quarterlyTrends[quarterlyTrends.length - 1].growth 
      : 0;

    return {
      volumeTrends,
      peakHours,
      paymentMethods,
      quarterlyTrends,
      summary: {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        peakHour,
        mostUsedPaymentMethod,
        growthRate
      }
    };

  } catch (error) {
    console.error('Error fetching comprehensive order analytics:', error);
    return {
      volumeTrends: [],
      peakHours: [],
      paymentMethods: [],
      quarterlyTrends: [],
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        peakHour: 12,
        mostUsedPaymentMethod: 'Cash',
        growthRate: 0
      }
    };
  }
};

// Legacy PaymentAnalytics interface for backward compatibility
export interface PaymentAnalytics {
  method: string;
  amount: number;
  transactions: number;
  percentage: number;
}

export const getPaymentAnalytics = async (
  tenantId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
): Promise<PaymentAnalytics[]> => {
  const enhanced = await getPaymentMethodAnalytics(tenantId, locationId, startDate, endDate);
  return enhanced.map(item => ({
    method: item.method,
    amount: item.amount,
    transactions: item.transactions,
    percentage: item.percentage
  }));
};
