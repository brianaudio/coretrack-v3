import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem, InventoryMovement } from './inventory';

// Analytics interfaces
export interface InventoryAnalytics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageStockLevel: number;
  topValueItems: InventoryValueItem[];
  stockMovements: StockMovementData[];
  categoryBreakdown: CategoryAnalytics[];
  stockPredictions: StockPrediction[];
  usageAnalytics: UsageAnalytics[];
}

export interface InventoryValueItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  costPerUnit: number;
  totalValue: number;
  stockRatio: number;
}

export interface StockMovementData {
  date: string;
  movements: number;
  totalQuantityChanged: number;
  itemsAffected: number;
}

export interface CategoryAnalytics {
  category: string;
  itemCount: number;
  totalValue: number;
  averageStockLevel: number;
  lowStockCount: number;
}

export interface StockPrediction {
  itemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
  dailyUsageRate: number;
  daysUntilEmpty: number;
  recommendedReorderDate: Date;
  status: 'urgent' | 'warning' | 'good';
}

export interface UsageAnalytics {
  itemId: string;
  itemName: string;
  category: string;
  totalMovements: number;
  totalQuantityUsed: number;
  averageDailyUsage: number;
  lastMovement: Date;
  usageFrequency: 'high' | 'medium' | 'low';
}

// Get comprehensive inventory analytics
export const getInventoryAnalytics = async (
  tenantId: string,
  days: number = 30
): Promise<InventoryAnalytics> => {
  try {
    // Get inventory items
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    const inventoryItems: InventoryItem[] = inventorySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure numeric fields are properly typed
        costPerUnit: typeof data.costPerUnit === 'number' ? data.costPerUnit : parseFloat(data.costPerUnit) || 0,
        currentStock: typeof data.currentStock === 'number' ? data.currentStock : parseInt(data.currentStock) || 0,
        minStock: typeof data.minStock === 'number' ? data.minStock : parseInt(data.minStock) || 0,
      };
    }) as InventoryItem[];

    console.log('Raw inventory items from Firestore:', inventoryItems.slice(0, 2));

    // Get movements for the specified period
    const movementsRef = collection(db, `tenants/${tenantId}/inventoryMovements`);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    const movementsQuery = query(
      movementsRef,
      where('timestamp', '>=', Timestamp.fromDate(daysAgo))
    );
    const movementsSnapshot = await getDocs(movementsQuery);
    const movements: InventoryMovement[] = movementsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryMovement[];

    // Calculate analytics
    const totalItems = inventoryItems.length;
    
    console.log('Inventory Analytics Debug:');
    console.log('Total inventory items:', totalItems);
    
    const totalValue = inventoryItems.reduce((sum, item, index) => {
      const cost = Number(item.costPerUnit) || 0;
      const stock = Number(item.currentStock) || 0;
      const itemValue = cost * stock;
      
      if (index < 3) { // Log first 3 items for debugging
        console.log(`Item ${index + 1}:`, {
          name: item.name,
          costPerUnit: item.costPerUnit,
          currentStock: item.currentStock,
          cost: cost,
          stock: stock,
          itemValue: itemValue,
          runningSum: sum + itemValue
        });
      }
      
      return sum + itemValue;
    }, 0);
    
    console.log('Final totalValue:', totalValue, 'Type:', typeof totalValue, 'IsNaN:', isNaN(totalValue));
    
    // Ensure totalValue is never NaN
    const safeTotalValue = isNaN(totalValue) ? 0 : totalValue;
    
    const lowStockItems = inventoryItems.filter(item => item.status === 'low' || item.status === 'critical').length;
    const outOfStockItems = inventoryItems.filter(item => item.status === 'out').length;
    const averageStockLevel = inventoryItems.length > 0 
      ? inventoryItems.reduce((sum, item) => sum + (item.currentStock / Math.max(item.minStock, 1)), 0) / inventoryItems.length 
      : 0;

    // Top value items
    const topValueItems: InventoryValueItem[] = inventoryItems
      .filter(item => {
        const cost = Number(item.costPerUnit) || 0;
        const stock = Number(item.currentStock) || 0;
        return cost > 0 && stock > 0;
      })
      .map(item => {
        const cost = Number(item.costPerUnit) || 0;
        const stock = Number(item.currentStock) || 0;
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          currentStock: stock,
          unit: item.unit,
          costPerUnit: cost,
          totalValue: cost * stock,
          stockRatio: stock / Math.max(item.minStock, 1)
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Stock movements by day
    const stockMovements = generateStockMovementData(movements, days);
    
    // Category breakdown
    const categoryBreakdown = generateCategoryAnalytics(inventoryItems);
    
    // Stock predictions
    const stockPredictions = generateStockPredictions(inventoryItems, movements, days);
    
    // Usage analytics
    const usageAnalytics = generateUsageAnalytics(inventoryItems, movements, days);

    return {
      totalItems,
      totalValue: safeTotalValue,
      lowStockItems,
      outOfStockItems,
      averageStockLevel,
      topValueItems,
      stockMovements,
      categoryBreakdown,
      stockPredictions,
      usageAnalytics
    };
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    
    // Return a safe default analytics object instead of throwing
    return {
      totalItems: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      averageStockLevel: 0,
      topValueItems: [],
      stockMovements: [],
      categoryBreakdown: [],
      stockPredictions: [],
      usageAnalytics: []
    };
  }
};

// Generate stock movement data by day
const generateStockMovementData = (movements: InventoryMovement[], days: number): StockMovementData[] => {
  const movementsByDay = new Map<string, InventoryMovement[]>();
  
  // Group movements by day
  movements.forEach(movement => {
    const date = movement.timestamp.toDate().toISOString().split('T')[0];
    if (!movementsByDay.has(date)) {
      movementsByDay.set(date, []);
    }
    movementsByDay.get(date)!.push(movement);
  });

  // Generate data for each day
  const result: StockMovementData[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayMovements = movementsByDay.get(dateStr) || [];
    const uniqueItems = new Set(dayMovements.map(m => m.itemId));
    
    result.push({
      date: dateStr,
      movements: dayMovements.length,
      totalQuantityChanged: dayMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0),
      itemsAffected: uniqueItems.size
    });
  }

  return result;
};

// Generate category analytics
const generateCategoryAnalytics = (inventoryItems: InventoryItem[]): CategoryAnalytics[] => {
  const categoryMap = new Map<string, InventoryItem[]>();
  
  inventoryItems.forEach(item => {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category)!.push(item);
  });

  return Array.from(categoryMap.entries()).map(([category, items]) => ({
    category,
    itemCount: items.length,
    totalValue: items.reduce((sum, item) => {
      const cost = Number(item.costPerUnit) || 0;
      const stock = Number(item.currentStock) || 0;
      return sum + (cost * stock);
    }, 0),
    averageStockLevel: items.reduce((sum, item) => sum + (item.currentStock / Math.max(item.minStock, 1)), 0) / items.length,
    lowStockCount: items.filter(item => item.status === 'low' || item.status === 'critical' || item.status === 'out').length
  })).sort((a, b) => b.totalValue - a.totalValue);
};

// Generate stock predictions
const generateStockPredictions = (
  inventoryItems: InventoryItem[], 
  movements: InventoryMovement[], 
  days: number
): StockPrediction[] => {
  const predictions: StockPrediction[] = [];

  inventoryItems.forEach(item => {
    if (item.currentStock <= 0) return;

    // Calculate usage rate from movements
    const itemMovements = movements.filter(m => 
      m.itemId === item.id && 
      (m.movementType === 'subtract' || m.movementType === 'usage')
    );

    if (itemMovements.length === 0) {
      predictions.push({
        itemId: item.id,
        itemName: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        dailyUsageRate: 0,
        daysUntilEmpty: Infinity,
        recommendedReorderDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'good'
      });
      return;
    }

    const totalUsage = itemMovements.reduce((sum, m) => sum + m.quantity, 0);
    const dailyUsageRate = totalUsage / days;

    if (dailyUsageRate <= 0) {
      predictions.push({
        itemId: item.id,
        itemName: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        dailyUsageRate: 0,
        daysUntilEmpty: Infinity,
        recommendedReorderDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'good'
      });
      return;
    }

    const daysUntilEmpty = item.currentStock / dailyUsageRate;
    const daysUntilReorder = Math.max(0, daysUntilEmpty - (item.minStock / dailyUsageRate));
    
    const recommendedReorderDate = new Date();
    recommendedReorderDate.setDate(recommendedReorderDate.getDate() + Math.floor(daysUntilReorder));

    let status: 'urgent' | 'warning' | 'good' = 'good';
    if (daysUntilEmpty <= 3) status = 'urgent';
    else if (daysUntilEmpty <= 7) status = 'warning';

    predictions.push({
      itemId: item.id,
      itemName: item.name,
      currentStock: item.currentStock,
      unit: item.unit,
      dailyUsageRate,
      daysUntilEmpty,
      recommendedReorderDate,
      status
    });
  });

  return predictions.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
};

// Generate usage analytics
const generateUsageAnalytics = (
  inventoryItems: InventoryItem[], 
  movements: InventoryMovement[], 
  days: number
): UsageAnalytics[] => {
  const analytics: UsageAnalytics[] = [];

  inventoryItems.forEach(item => {
    const itemMovements = movements.filter(m => m.itemId === item.id);
    const usageMovements = itemMovements.filter(m => 
      m.movementType === 'subtract' || m.movementType === 'usage'
    );

    const totalQuantityUsed = usageMovements.reduce((sum, m) => sum + m.quantity, 0);
    const averageDailyUsage = totalQuantityUsed / days;
    
    const lastMovement = itemMovements.length > 0 
      ? itemMovements.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())[0].timestamp.toDate()
      : item.createdAt.toDate();

    let usageFrequency: 'high' | 'medium' | 'low' = 'low';
    if (itemMovements.length >= days * 0.5) usageFrequency = 'high';
    else if (itemMovements.length >= days * 0.2) usageFrequency = 'medium';

    analytics.push({
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      totalMovements: itemMovements.length,
      totalQuantityUsed,
      averageDailyUsage,
      lastMovement,
      usageFrequency
    });
  });

  return analytics.sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed);
};

// Export data functions
export const exportInventoryReport = async (tenantId: string): Promise<string> => {
  try {
    const analytics = await getInventoryAnalytics(tenantId, 30);
    
    // Generate CSV content
    let csv = 'Item Name,Category,Current Stock,Min Stock,Unit Cost,Total Value,Status,Stock Ratio\n';
    
    analytics.topValueItems.forEach(item => {
      csv += `"${item.name}","${item.category}",${item.currentStock},${item.costPerUnit},₱${item.costPerUnit.toFixed(2)},₱${item.totalValue.toFixed(2)},${item.stockRatio >= 1 ? 'Good' : 'Low'},${(item.stockRatio * 100).toFixed(1)}%\n`;
    });

    return csv;
  } catch (error) {
    console.error('Error exporting inventory report:', error);
    throw new Error('Failed to export inventory report');
  }
};
