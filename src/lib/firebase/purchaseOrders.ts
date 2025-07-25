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

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PurchaseOrderItem {
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  quantityReceived?: number; // For tracking partial deliveries
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'delivered' | 'cancelled';
  expectedDelivery: Timestamp;
  actualDelivery?: Timestamp;
  deliveredAt?: Timestamp;
  deliveredBy?: string;
  notes?: string;
  requestor?: string;
  createdBy: string;
  approvedBy?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateSupplier {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  tenantId: string;
}

export interface CreatePurchaseOrder {
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  expectedDelivery: Date;
  notes?: string;
  requestor?: string;
  createdBy: string;
  tenantId: string;
}

// Get suppliers collection reference
const getSuppliersCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/suppliers`);
};

// Get purchase orders collection reference
const getPurchaseOrdersCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/purchaseOrders`);
};

// Generate PO number
const generatePONumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `PO-${timestamp}`;
};

// Suppliers CRUD operations
export const getSuppliers = async (tenantId: string): Promise<Supplier[]> => {
  try {
    const suppliersRef = getSuppliersCollection(tenantId);
    const q = query(suppliersRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Supplier[];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw new Error('Failed to fetch suppliers');
  }
};

export const addSupplier = async (supplier: CreateSupplier): Promise<string> => {
  try {
    const suppliersRef = getSuppliersCollection(supplier.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(suppliersRef, {
      ...supplier,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding supplier:', error);
    throw new Error('Failed to add supplier');
  }
};

export const updateSupplier = async (
  tenantId: string,
  supplierId: string,
  updates: Partial<Omit<Supplier, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const supplierRef = doc(db, `tenants/${tenantId}/suppliers`, supplierId);
    const now = Timestamp.now();
    
    await updateDoc(supplierRef, {
      ...updates,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw new Error('Failed to update supplier');
  }
};

export const deleteSupplier = async (
  tenantId: string,
  supplierId: string
): Promise<void> => {
  try {
    const supplierRef = doc(db, `tenants/${tenantId}/suppliers`, supplierId);
    await deleteDoc(supplierRef);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw new Error('Failed to delete supplier');
  }
};

// Purchase Orders CRUD operations
export const getPurchaseOrders = async (tenantId: string): Promise<PurchaseOrder[]> => {
  try {
    const ordersRef = getPurchaseOrdersCollection(tenantId);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    throw new Error('Failed to fetch purchase orders');
  }
};

export const getPurchaseOrderById = async (tenantId: string, orderId: string): Promise<PurchaseOrder | null> => {
  try {
    const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return null;
    }
    
    return {
      id: orderDoc.id,
      ...orderDoc.data()
    } as PurchaseOrder;
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    throw new Error('Failed to fetch purchase order');
  }
};

export const subscribeToPurchaseOrders = (
  tenantId: string, 
  callback: (orders: PurchaseOrder[]) => void
) => {
  const ordersRef = getPurchaseOrdersCollection(tenantId);
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
    
    callback(orders);
  }, (error) => {
    console.error('Error in purchase orders subscription:', error);
  });
};

export const createPurchaseOrder = async (order: CreatePurchaseOrder): Promise<string> => {
  try {
    const ordersRef = getPurchaseOrdersCollection(order.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(ordersRef, {
      ...order,
      orderNumber: generatePONumber(),
      status: 'draft' as const,
      expectedDelivery: Timestamp.fromDate(order.expectedDelivery),
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw new Error('Failed to create purchase order');
  }
};

export const updatePurchaseOrder = async (
  tenantId: string,
  orderId: string,
  updates: Partial<Omit<PurchaseOrder, 'id' | 'tenantId' | 'createdAt' | 'orderNumber'>>
): Promise<void> => {
  try {
    const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
    const now = Timestamp.now();
    
    await updateDoc(orderRef, {
      ...updates,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    throw new Error('Failed to update purchase order');
  }
};

export const updatePurchaseOrderStatus = async (
  tenantId: string,
  orderId: string,
  status: PurchaseOrder['status'],
  approvedBy?: string
): Promise<void> => {
  try {
    const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
    const now = Timestamp.now();
    
    const updateData: any = {
      status,
      updatedAt: now
    };
    
    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
    }
    
    if (status === 'delivered') {
      updateData.actualDelivery = now;
    }
    
    await updateDoc(orderRef, updateData);
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    throw new Error('Failed to update purchase order status');
  }
};

export const deletePurchaseOrder = async (
  tenantId: string,
  orderId: string
): Promise<void> => {
  try {
    const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
    await deleteDoc(orderRef);
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    throw new Error('Failed to delete purchase order');
  }
};

// Deliver purchase order with inventory updates
export const deliverPurchaseOrder = async (
  tenantId: string,
  orderId: string,
  deliveryItems: Array<{
    itemName: string;
    quantityReceived: number;
    unit: string;
    unitPrice: number;
  }>,
  deliveredBy?: string
): Promise<{
  success: boolean;
  inventoryUpdateResult?: {
    updatedItems: string[];
    notFoundItems: string[];
    unitMismatches: Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>;
  };
}> => {
  try {
    // Import the inventory update function
    const { updateInventoryFromDelivery } = await import('./inventory');
    
    // Get the current purchase order
    const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Purchase order not found');
    }
    
    const orderData = orderDoc.data() as PurchaseOrder;
    
    // Check if order is already delivered
    if (orderData.status === 'delivered') {
      throw new Error('Purchase order has already been delivered');
    }
    
    // Check if order can be delivered (must be in 'ordered' status)
    if (orderData.status !== 'ordered') {
      throw new Error(`Cannot deliver purchase order. Current status: ${orderData.status}. Order must be in 'ordered' status to be delivered.`);
    }
    
    // Update the purchase order items with received quantities
    const updatedItems = orderData.items.map(item => {
      const deliveryItem = deliveryItems.find(di => 
        di.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
      );
      
      return {
        ...item,
        quantityReceived: deliveryItem ? deliveryItem.quantityReceived : (item.quantityReceived || 0)
      };
    });
    
    // Update inventory
    const inventoryUpdateResult = await updateInventoryFromDelivery(
      tenantId, 
      deliveryItems,
      undefined, // userId - can be undefined since it's optional
      deliveredBy || 'System' // userName - use deliveredBy or 'System' as fallback
    );
    
    // Update purchase order status and items
    const updateData: any = {
      status: 'delivered' as const,
      items: updatedItems,
      deliveredAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    if (deliveredBy) {
      updateData.deliveredBy = deliveredBy;
    }
    
    await updateDoc(orderRef, updateData);
    
    return {
      success: true,
      inventoryUpdateResult
    };
  } catch (error) {
    console.error('Error delivering purchase order:', error);
    throw new Error('Failed to deliver purchase order');
  }
};

// Analytics functions
export const getPurchaseOrderStats = async (tenantId: string) => {
  try {
    const orders = await getPurchaseOrders(tenantId);
    
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalValue = orders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
    
    // This month's orders
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthOrders = orders.filter(o => 
      o.createdAt.toDate() >= startOfMonth
    );
    
    const thisMonthValue = thisMonthOrders.reduce((sum, o) => sum + o.total, 0);
    
    return {
      totalOrders,
      pendingOrders,
      totalValue,
      avgOrderValue,
      thisMonthValue,
      thisMonthOrders: thisMonthOrders.length
    };
  } catch (error) {
    console.error('Error getting purchase order stats:', error);
    throw new Error('Failed to get purchase order statistics');
  }
};
