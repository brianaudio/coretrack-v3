/**
 * Unified Data Service - Safe read-only service for Data Explorer
 * 
 * This service ONLY reads from existing collections using existing functions.
 * It does NOT modify any existing code or collections.
 * Main CoreTrack app remains completely unaffected.
 */

// Import the ISOLATED enhanced POS service ONLY for Data Explorer - does NOT touch core system
import { getEnhancedPOSOrdersForDataExplorer } from './enhancedDataExplorerPOS';
// Import only getPOSItems from core POS (safe read operation)
import { getPOSItems } from './pos';
import { getExpenses } from './expenses';
import { getInventoryItems } from './inventory';
import { Timestamp } from 'firebase/firestore';

export interface UnifiedBusinessRecord {
  id: string;
  timestamp: Date;
  type: 'transaction' | 'expense' | 'inventory' | 'menu_item';
  source: string;
  
  // Transaction data (from orders)
  orderId?: string;
  revenue?: number;
  items?: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  customer?: string;
  orderStatus?: string;
  
  // Expense data
  expenseId?: string;
  expenseAmount?: number;
  expenseCategory?: string;
  vendor?: string;
  expenseStatus?: string;
  
  // Inventory data
  inventoryItemId?: string;
  itemName?: string;
  currentStock?: number;
  stockStatus?: string;
  costPerUnit?: number;
  totalValue?: number;
  
  // Menu item data
  menuItemId?: string;
  menuItemName?: string;
  menuItemPrice?: number;
  menuItemCost?: number;
  menuItemCategory?: string;
  isAvailable?: boolean;
  
  // Metadata
  branchId?: string;
  locationId?: string;
  tenantId: string;
}

export interface UnifiedDataStats {
  totalRecords: number;
  transactions: {
    count: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  expenses: {
    count: number;
    totalAmount: number;
  };
  inventory: {
    count: number;
    totalValue: number;
    lowStockCount: number;
  };
  menuItems: {
    count: number;
    availableCount: number;
  };
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

export class UnifiedDataService {
  private static instance: UnifiedDataService;
  
  public static getInstance(): UnifiedDataService {
    if (!UnifiedDataService.instance) {
      UnifiedDataService.instance = new UnifiedDataService();
    }
    return UnifiedDataService.instance;
  }

  /**
   * Get all business data from existing collections
   * SAFE: Only reads from existing collections using existing functions
   */
  async getAllBusinessData(
    tenantId: string, 
    locationId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<UnifiedBusinessRecord[]> {
    console.log('🔍 Unified Data Service: Fetching data safely...');
    
    try {
      // Use existing functions - completely safe, no modifications
      const [orders, expenses, inventory, menuItems] = await Promise.all([
        this.safeGetPOSOrders(tenantId, locationId),
        this.safeGetExpenses(tenantId),
        this.safeGetInventory(tenantId, locationId),
        this.safeGetMenuItems(tenantId, locationId)
      ]);

      console.log('📊 Raw data fetched:', {
        orders: orders.length,
        expenses: expenses.length,
        inventory: inventory.length,
        menuItems: menuItems.length
      });

      // Merge all data into unified format
      const unifiedData = this.mergeAllData(orders, expenses, inventory, menuItems, tenantId);
      
      // Apply date filter if specified
      let filteredData = unifiedData;
      if (dateRange) {
        filteredData = unifiedData.filter(record => 
          record.timestamp >= dateRange.start && record.timestamp <= dateRange.end
        );
      }

      console.log('✅ Unified Data Service: Success!', {
        totalRecords: filteredData.length,
        dateFiltered: !!dateRange
      });

      return filteredData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
    } catch (error) {
      console.error('❌ Unified Data Service error (main app unaffected):', error);
      return []; // Graceful fallback - doesn't break anything
    }
  }

  /**
   * Get comprehensive statistics from unified data
   */
  async getUnifiedStats(
    tenantId: string, 
    locationId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<UnifiedDataStats> {
    const data = await this.getAllBusinessData(tenantId, locationId, dateRange);
    
    const transactions = data.filter(r => r.type === 'transaction');
    const expenses = data.filter(r => r.type === 'expense');
    const inventory = data.filter(r => r.type === 'inventory');
    const menuItems = data.filter(r => r.type === 'menu_item');
    
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.expenseAmount || 0), 0);
    const totalInventoryValue = inventory.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    const lowStockCount = inventory.filter(i => i.stockStatus === 'low' || i.stockStatus === 'critical').length;
    
    const allDates = data.map(r => r.timestamp).filter(Boolean);
    
    return {
      totalRecords: data.length,
      transactions: {
        count: transactions.length,
        totalRevenue,
        avgOrderValue: transactions.length > 0 ? totalRevenue / transactions.length : 0
      },
      expenses: {
        count: expenses.length,
        totalAmount: totalExpenses
      },
      inventory: {
        count: inventory.length,
        totalValue: totalInventoryValue,
        lowStockCount
      },
      menuItems: {
        count: menuItems.length,
        availableCount: menuItems.filter(m => m.isAvailable).length
      },
      dateRange: {
        earliest: allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null,
        latest: allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null
      }
    };
  }

  // Safe wrapper functions that handle errors gracefully
  private async safeGetPOSOrders(tenantId: string, locationId?: string) {
    try {
      return await getEnhancedPOSOrdersForDataExplorer(tenantId, locationId);
    } catch (error) {
      console.warn('Could not fetch POS orders:', error);
      return [];
    }
  }

  private async safeGetExpenses(tenantId: string) {
    try {
      return await getExpenses(tenantId);
    } catch (error) {
      console.warn('Could not fetch expenses:', error);
      return [];
    }
  }

  private async safeGetInventory(tenantId: string, locationId?: string) {
    try {
      return await getInventoryItems(tenantId, locationId || '');
    } catch (error) {
      console.warn('Could not fetch inventory:', error);
      return [];
    }
  }

  private async safeGetMenuItems(tenantId: string, locationId?: string) {
    try {
      return await getPOSItems(tenantId, locationId);
    } catch (error) {
      console.warn('Could not fetch menu items:', error);
      return [];
    }
  }

  /**
   * Merge all data sources into unified format
   * Pure data transformation - no database operations
   */
  private mergeAllData(orders: any[], expenses: any[], inventory: any[], menuItems: any[], tenantId: string): UnifiedBusinessRecord[] {
    const unifiedData: UnifiedBusinessRecord[] = [];

    // Convert orders to unified format
    orders.forEach(order => {
      unifiedData.push({
        id: `order_${order.id}`,
        timestamp: order.createdAt?.toDate?.() || new Date(order.createdAt || Date.now()),
        type: 'transaction',
        source: 'POS Orders',
        orderId: order.id,
        revenue: order.total || 0,
        items: order.items || [],
        customer: order.customer || 'Walk-in Customer',
        orderStatus: order.status || 'unknown',
        branchId: order.branchId,
        locationId: order.locationId,
        tenantId
      });
    });

    // Convert expenses to unified format
    expenses.forEach(expense => {
      unifiedData.push({
        id: `expense_${expense.id}`,
        timestamp: expense.date?.toDate?.() || new Date(expense.date || Date.now()),
        type: 'expense',
        source: 'Expenses',
        expenseId: expense.id,
        expenseAmount: expense.amount || 0,
        expenseCategory: expense.category || 'Uncategorized',
        vendor: expense.vendor || 'Unknown Vendor',
        expenseStatus: expense.status || 'unknown',
        tenantId
      });
    });

    // Convert inventory to unified format
    inventory.forEach(item => {
      unifiedData.push({
        id: `inventory_${item.id}`,
        timestamp: item.updatedAt?.toDate?.() || item.createdAt?.toDate?.() || new Date(),
        type: 'inventory',
        source: 'Inventory',
        inventoryItemId: item.id,
        itemName: item.name || 'Unknown Item',
        currentStock: item.currentStock || 0,
        stockStatus: item.status || 'unknown',
        costPerUnit: item.costPerUnit || 0,
        totalValue: (item.currentStock || 0) * (item.costPerUnit || 0),
        locationId: item.locationId,
        tenantId
      });
    });

    // Convert menu items to unified format
    menuItems.forEach(item => {
      unifiedData.push({
        id: `menu_${item.id}`,
        timestamp: item.updatedAt?.toDate?.() || item.createdAt?.toDate?.() || new Date(),
        type: 'menu_item',
        source: 'Menu Items',
        menuItemId: item.id,
        menuItemName: item.name || 'Unknown Item',
        menuItemPrice: item.price || 0,
        menuItemCost: item.cost || 0,
        menuItemCategory: item.category || 'Uncategorized',
        isAvailable: item.isAvailable ?? true,
        locationId: item.locationId,
        tenantId
      });
    });

    return unifiedData;
  }
}

// Export singleton instance for easy use
export const unifiedDataService = UnifiedDataService.getInstance();
