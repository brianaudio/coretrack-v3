import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase';
import { processInventoryDeduction } from './integration';

export interface POSItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  image?: string;
  emoji?: string; // Emoji for visual representation
  isAvailable: boolean;
  preparationTime: number; // in minutes
  tenantId: string;
  locationId?: string; // Added for branch-specific filtering
  menuItemId?: string; // Link to original menu item
  ingredients?: Array<{
    inventoryItemId: string;
    inventoryItemName: string;
    quantity: number;
    unit: string;
  }>; // Added for ingredient-based inventory deduction
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface POSOrder {
  id: string;
  orderNumber: string;
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'voided';
  customerName?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  paymentMethod: string;
  tenantId: string;
  locationId?: string; // Added for branch-specific filtering
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Void-related fields
  voidReason?: string;
  voidedAt?: Timestamp;
  voidedBy?: string;
}

export interface CreatePOSItem {
  name: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  image?: string;
  emoji?: string; // Emoji for visual representation
  isAvailable: boolean;
  preparationTime: number;
  tenantId: string;
  locationId?: string; // Added for branch-specific items
}

export interface CreatePOSOrder {
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
    addons?: Array<{
      id: string;
      name: string;
      price: number;
      category: string;
    }>;
  }[];
  subtotal: number;
  total: number;
  status?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'voided';
  customerName?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  paymentMethod: string;
  tenantId: string;
  locationId?: string; // Added for branch-specific orders
}

// Get POS items collection reference
const getPOSItemsCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/posItems`);
};

// Get POS orders collection reference  
const getPOSOrdersCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/posOrders`);
};

// Get all POS menu items (with optional location filtering)
export const getPOSItems = async (tenantId: string, locationId?: string): Promise<POSItem[]> => {
  try {
    const itemsRef = getPOSItemsCollection(tenantId);
    
    // For now, get all items and filter client-side to avoid index requirements
    const q = query(itemsRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSItem[];
    
    // Filter client-side by locationId if specified
    if (locationId) {
      items = items.filter(item => item.locationId === locationId);
    }
    
    console.log(`📦 POS: Loaded ${items.length} items${locationId ? ` for location ${locationId}` : ''}`);
    
    // Debug: Log ingredient information for each item
    items.forEach(item => {
      if (item.ingredients && item.ingredients.length > 0) {
        console.log(`🧾 POS Item "${item.name}" has ${item.ingredients.length} ingredients:`, 
          item.ingredients.map(ing => `${ing.inventoryItemName} (${ing.quantity} ${ing.unit})`));
      } else {
        console.log(`⚠️ POS Item "${item.name}" has NO ingredients configured`);
      }
    });
    
    return items;
  } catch (error) {
    console.error('❌ Error fetching POS items:', error);
    throw new Error('Failed to fetch POS items');
  }
};

// Listen to real-time POS items updates (with optional location filtering)
export const subscribeToPOSItems = (
  tenantId: string, 
  callback: (items: POSItem[]) => void,
  locationId?: string
) => {
  const itemsRef = getPOSItemsCollection(tenantId);
  
  // For now, get all items and filter client-side to avoid index requirements
  const q = query(itemsRef, orderBy('name'));
  
  return onSnapshot(q, (snapshot) => {
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSItem[];
    
    // Filter client-side by locationId if specified
    if (locationId) {
      items = items.filter(item => item.locationId === locationId);
    }
    
    // Real-time update received
    callback(items)
  }, (error) => {
    console.error('Error in POS items subscription:', error);
  });
};

// Add new POS menu item
export const addPOSItem = async (item: CreatePOSItem): Promise<string> => {
  try {
    const itemsRef = getPOSItemsCollection(item.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(itemsRef, {
      ...item,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding POS item:', error);
    throw new Error('Failed to add POS item');
  }
};

// Update POS menu item
export const updatePOSItem = async (
  tenantId: string,
  itemId: string,
  updates: Partial<Omit<POSItem, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/posItems`, itemId);
    const now = Timestamp.now();
    
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating POS item:', error);
    throw new Error('Failed to update POS item');
  }
};

// Delete POS menu item
export const deletePOSItem = async (
  tenantId: string,
  itemId: string
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/posItems`, itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting POS item:', error);
    throw new Error('Failed to delete POS item');
  }
};

// Generate order number
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 3).toUpperCase();
  return `${timestamp}${random}`;
};

// Create new POS order
export const createPOSOrder = async (order: CreatePOSOrder): Promise<string> => {
  try {
    const ordersCollection = getPOSOrdersCollection(order.tenantId);
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Create the order document
    const docRef = await addDoc(ordersCollection, {
      ...order,
      orderNumber,
      status: order.status || 'completed',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // If order is completed, trigger business logic (analytics, inventory, finance)
    if (order.status === 'completed') {
      console.log('🎯 Order completed! Starting inventory deduction for:', order.items.map(i => i.name).join(', '))
      await handleCompletedOrder(order.tenantId, docRef.id, order);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating POS order:', error);
    throw new Error('Failed to create POS order');
  }
};

// Handle completed order business logic - processes analytics, inventory, and finance
const handleCompletedOrder = async (tenantId: string, orderId: string, order: CreatePOSOrder) => {
  try {
    console.log('🔄 Processing completed order:', orderId, 'with', order.items.length, 'items')
    
    // 1. Update analytics (sales, revenue, popular items)
    await updateSalesAnalytics(tenantId, order)
    
    // 2. Process inventory deductions
    console.log('📦 Starting inventory deduction...')
    console.log('📦 Items to process:', order.items.map(item => `${item.name} (x${item.quantity})`).join(', '))
    console.log('📦 Tenant ID:', tenantId)
    console.log('📦 About to call processInventoryDeduction...')
    
    try {
      console.log('🚨 CALLING INVENTORY DEDUCTION NOW! 🚨')
      await processInventoryDeduction(tenantId, order.items)
      console.log('✅ Inventory deduction completed successfully!')
    } catch (error) {
      console.log('❌ Inventory deduction failed:', error instanceof Error ? error.message : String(error))
      console.log('❌ Full error object:', error)
      console.log('❌ This error occurred in processInventoryDeduction function')
    }
    
    // 3. Update financial records
    await updateFinancialRecords(tenantId, orderId, order)
    
  } catch (error) {
    console.error('Error handling completed order business logic:', error)
    // Don't throw error to prevent order creation failure
  }
}

// Update sales analytics

// Update sales analytics
const updateSalesAnalytics = async (tenantId: string, order: CreatePOSOrder) => {
  try {
    const analyticsRef = doc(db, `tenants/${tenantId}/analytics`, 'sales');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get existing analytics or create new
    const analyticsDoc = await getDoc(analyticsRef);
    const currentData = analyticsDoc.exists() ? analyticsDoc.data() : {};
    
    // Update daily totals
    const dailyData = currentData.daily || {};
    const todayData = dailyData[today] || { sales: 0, orders: 0, items: {} };
    
    todayData.sales += order.total;
    todayData.orders += 1;
    
    // Update popular items
    order.items.forEach(item => {
      if (!todayData.items[item.itemId]) {
        todayData.items[item.itemId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      todayData.items[item.itemId].quantity += item.quantity;
      todayData.items[item.itemId].revenue += item.total;
    });
    
    dailyData[today] = todayData;
    
    // Update analytics document (create if doesn't exist)
    await setDoc(analyticsRef, {
      daily: dailyData,
      lastUpdated: Timestamp.now()
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating sales analytics:', error);
  }
};

// Update financial records
const updateFinancialRecords = async (tenantId: string, orderId: string, order: CreatePOSOrder) => {
  try {
    const financialRef = collection(db, `tenants/${tenantId}/financialTransactions`);
    
    await addDoc(financialRef, {
      type: 'sale',
      orderId: orderId,
      amount: order.total,
      description: `POS Sale - ${order.items.length} items`,
      date: Timestamp.now(),
      tenantId: tenantId,
      locationId: order.locationId,
      createdAt: Timestamp.now()
    });
    
  } catch (error) {
    console.error('Error updating financial records:', error);
  }
};

// Get POS orders (with optional location filtering)
export const getPOSOrders = async (tenantId: string, locationId?: string): Promise<POSOrder[]> => {
  try {
    const ordersRef = getPOSOrdersCollection(tenantId);
    
    // For now, get all orders and filter client-side to avoid index requirements
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSOrder[];
    
    // Filter client-side by locationId if specified
    if (locationId) {
      orders = orders.filter(order => order.locationId === locationId);
    }
    
    console.log(`📋 POS: Loaded ${orders.length} orders${locationId ? ` for location ${locationId}` : ''}`);
    return orders;
  } catch (error) {
    console.error('Error fetching POS orders:', error);
    throw new Error('Failed to fetch POS orders');
  }
};

// Listen to real-time POS orders updates (with optional location filtering)
export const subscribeToPOSOrders = (
  tenantId: string, 
  callback: (orders: POSOrder[]) => void,
  locationId?: string
) => {
  console.log('[subscribeToPOSOrders] Starting subscription with locationId:', locationId)
  const ordersRef = getPOSOrdersCollection(tenantId);
  
  // For now, get all orders and filter client-side to avoid index requirements
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSOrder[];
    
    console.log(`[subscribeToPOSOrders] Raw orders from Firebase: ${orders.length}`)
    console.log('[subscribeToPOSOrders] All locationIds:', orders.map(o => o.locationId))
    
    // Filter client-side by locationId if specified
    if (locationId) {
      const originalCount = orders.length
      orders = orders.filter(order => {
        const matches = order.locationId === locationId
        if (!matches) {
          console.log(`[subscribeToPOSOrders] 🚫 Filtering out order ${order.id}: "${order.locationId}" !== "${locationId}"`)
        }
        return matches
      });
      console.log(`[subscribeToPOSOrders] 🎯 Filtered to ${orders.length} orders (from ${originalCount}) for locationId: ${locationId}`)
    } else {
      console.log('[subscribeToPOSOrders] No locationId filtering - returning all orders')
    }
    
    // Real-time orders update received
    callback(orders);
  }, (error) => {
    console.error('Error in POS orders subscription:', error);
  });
};

// Update order status
export const updateOrderStatus = async (
  tenantId: string,
  orderId: string,
  status: POSOrder['status']
): Promise<void> => {
  try {
    const orderRef = doc(db, `tenants/${tenantId}/posOrders`, orderId);
    const now = Timestamp.now();
    
    await updateDoc(orderRef, {
      status,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw new Error('Failed to update order status');
  }
};

// Update an existing POS order
export const updatePOSOrder = async (
  tenantId: string,
  orderId: string, 
  updates: Partial<POSOrder & { voidReason?: string; voidedAt?: Date; voidedBy?: string }>
): Promise<void> => {
  try {
    const ordersRef = getPOSOrdersCollection(tenantId);
    const orderRef = doc(ordersRef, orderId);
    
    // Convert Date objects to Timestamps for Firestore
    const firestoreUpdates: any = { ...updates };
    if (updates.voidedAt && updates.voidedAt instanceof Date) {
      firestoreUpdates.voidedAt = Timestamp.fromDate(updates.voidedAt);
    }
    firestoreUpdates.updatedAt = Timestamp.now();
    
    await updateDoc(orderRef, firestoreUpdates);
    console.log('✅ Order updated successfully:', orderId);
  } catch (error) {
    console.error('❌ Error updating order:', error);
    throw new Error('Failed to update order');
  }
};

// Get today's orders for analytics (excluding voided and cancelled orders)
export const getTodaysOrders = async (tenantId: string): Promise<POSOrder[]> => {
  try {
    const ordersRef = getPOSOrdersCollection(tenantId);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const q = query(
      ordersRef, 
      where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
      where('status', 'in', ['completed', 'pending', 'preparing', 'ready']),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSOrder[];
  } catch (error) {
    console.error('Error fetching today\'s orders:', error);
    throw new Error('Failed to fetch today\'s orders');
  }
};

// Get unique categories from POS items
export const getPOSCategories = async (tenantId: string): Promise<string[]> => {
  try {
    const items = await getPOSItems(tenantId);
    const categories = Array.from(new Set(items.map(item => item.category)));
    return categories.sort();
  } catch (error) {
    console.error('Error fetching POS categories:', error);
    throw new Error('Failed to fetch POS categories');
  }
};

// Get today's sales analytics with fallback to real orders
export const getTodaysSalesAnalytics = async (tenantId: string) => {
  try {
    console.log('🔍 Fetching analytics for tenant:', tenantId);
    
    // Try to get analytics from the dedicated analytics document first
    const analyticsRef = doc(db, `tenants/${tenantId}/analytics`, 'sales');
    const analyticsDoc = await getDoc(analyticsRef);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let todayData = { 
      sales: 0, 
      orders: 0, 
      items: {} as Record<string, { name: string; quantity: number; revenue: number }>
    };
    
    if (analyticsDoc.exists()) {
      const data = analyticsDoc.data();
      const dailyData = data.daily?.[today] || { sales: 0, orders: 0, items: {} };
      todayData = {
        sales: dailyData.sales || 0,
        orders: dailyData.orders || 0,
        items: dailyData.items || {}
      };
      console.log('📊 Found analytics document:', todayData);
    } else {
      console.log('📝 No analytics document found, calculating from orders...');
      
      // Fallback: Calculate from actual orders for today
      try {
        const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        const q = query(
          ordersRef,
          where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
          where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
          where('status', '==', 'completed')
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`📈 Found ${querySnapshot.size} completed orders today`);
        
        querySnapshot.forEach((doc) => {
          const order = doc.data();
          const orderTotal = order.total || 0;
          todayData.sales += orderTotal;
          todayData.orders += 1;
          
          // Track popular items
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              if (item.itemId) {
                if (!todayData.items[item.itemId]) {
                  todayData.items[item.itemId] = { 
                    name: item.name || 'Unknown Item', 
                    quantity: 0, 
                    revenue: 0 
                  };
                }
                todayData.items[item.itemId].quantity += item.quantity || 1;
                todayData.items[item.itemId].revenue += item.total || item.price || 0;
              }
            });
          }
        });
        
        console.log('💰 Calculated totals:', { sales: todayData.sales, orders: todayData.orders });
      } catch (orderError) {
        console.error('❌ Error fetching orders for analytics:', orderError);
      }
    }
    
    // If still no data, return empty state for new businesses
    if (todayData.sales === 0 && todayData.orders === 0) {
      console.log('📊 No sales data found, returning empty state for new business...');
      return {
        todaysSales: 0,
        todaysOrders: 0,
        averageOrderValue: 0,
        popularItems: []
      };
    }
    
    // Prepare popular items from real data
    const popularItems = Object.values(todayData.items || {})
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      todaysSales: todayData.sales || 0,
      todaysOrders: todayData.orders || 0,
      averageOrderValue: todayData.orders > 0 ? todayData.sales / todayData.orders : 0,
      popularItems
    };
  } catch (error) {
    console.error('❌ Error fetching sales analytics:', error);
    // Return empty state on error for production reliability
    return {
      todaysSales: 0,
      todaysOrders: 0,
      averageOrderValue: 0,
      popularItems: []
    };
  }
};
