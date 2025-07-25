import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface POSItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  image?: string;
  isAvailable: boolean;
  preparationTime: number; // in minutes
  tenantId: string;
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
  isAvailable: boolean;
  preparationTime: number;
  tenantId: string;
}

export interface CreatePOSOrder {
  items: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  total: number;
  status?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'voided';
  customerName?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  paymentMethod: string;
  tenantId: string;
}

// Get POS items collection reference
const getPOSItemsCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/posItems`);
};

// Get POS orders collection reference  
const getPOSOrdersCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/posOrders`);
};

// Get all POS menu items
export const getPOSItems = async (tenantId: string): Promise<POSItem[]> => {
  try {
    const itemsRef = getPOSItemsCollection(tenantId);
    const q = query(itemsRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSItem[];
    
    console.log(`📦 POS: Loaded ${items.length} items`);
    return items;
  } catch (error) {
    console.error('❌ Error fetching POS items:', error);
    throw new Error('Failed to fetch POS items');
  }
};

// Listen to real-time POS items updates
export const subscribeToPOSItems = (
  tenantId: string, 
  callback: (items: POSItem[]) => void
) => {
  const itemsRef = getPOSItemsCollection(tenantId);
  const q = query(itemsRef, orderBy('name'));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSItem[];
    
    callback(items);
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
    const ordersRef = getPOSOrdersCollection(order.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(ordersRef, {
      ...order,
      orderNumber: generateOrderNumber(),
      // Use the status provided in the order, or default to 'pending' if not specified
      status: order.status || 'pending' as const,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating POS order:', error);
    throw new Error('Failed to create POS order');
  }
};

// Get POS orders
export const getPOSOrders = async (tenantId: string): Promise<POSOrder[]> => {
  try {
    const ordersRef = getPOSOrdersCollection(tenantId);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSOrder[];
  } catch (error) {
    console.error('Error fetching POS orders:', error);
    throw new Error('Failed to fetch POS orders');
  }
};

// Listen to real-time POS orders updates
export const subscribeToPOSOrders = (
  tenantId: string, 
  callback: (orders: POSOrder[]) => void
) => {
  const ordersRef = getPOSOrdersCollection(tenantId);
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as POSOrder[];
    
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
