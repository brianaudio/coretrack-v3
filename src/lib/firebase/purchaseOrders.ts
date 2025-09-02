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
  DocumentData,
  runTransaction,
  writeBatch
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
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partially_delivered' | 'delivered' | 'cancelled';
  expectedDelivery: Timestamp;
  actualDelivery?: Timestamp;
  deliveredAt?: Timestamp;
  deliveredBy?: string;
  notes?: string;
  requestor?: string;
  createdBy: string;
  approvedBy?: string;
  tenantId: string;
  locationId?: string; // Added for branch-specific purchase orders
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
  locationId?: string; // Added for branch-specific purchase orders
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

// Purchase Orders CRUD operations (with optional location filtering)
export const getPurchaseOrders = async (tenantId: string, locationId?: string): Promise<PurchaseOrder[]> => {
  try {
    const ordersRef = getPurchaseOrdersCollection(tenantId);
    
    // For now, get all orders and filter client-side to avoid index requirements
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
    
    // Filter client-side by locationId if specified
    if (locationId) {
      orders = orders.filter(order => order.locationId === locationId);
    }
    
    console.log(`📋 PO: Loaded ${orders.length} purchase orders${locationId ? ` for location ${locationId}` : ''}`);
    return orders;
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
  callback: (orders: PurchaseOrder[]) => void,
  locationId?: string
) => {
  const ordersRef = getPurchaseOrdersCollection(tenantId);
  
  // For now, get all orders and filter client-side to avoid index requirements
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PurchaseOrder[];
    
    // Filter client-side by locationId if specified
    if (locationId) {
      orders = orders.filter(order => order.locationId === locationId);
    }
    
    console.log(`🔄 PO: Real-time update - ${orders.length} purchase orders${locationId ? ` for location ${locationId}` : ''}`);
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

// QUOTA-OPTIMIZED: Use quota-efficient delivery instead - this function has quota issues
// export const deliverPurchaseOrderAtomic = async (
export const deliverPurchaseOrderAtomicLegacy = async (
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
  error?: string;
  inventoryUpdateResult?: {
    updatedItems: string[];
    notFoundItems: string[];
    unitMismatches: Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>;
  };
}> => {
  try {
    // CRITICAL FIX: Import location-specific inventory function instead of getAllInventoryItems
    const { getInventoryItems } = await import('./inventory');
    
    // SECURITY FIX: Get inventory items ONLY for the specific locationId
    if (!deliveredBy) {
      throw new Error('deliveredBy parameter is required for audit trail');
    }
    
    // Get the purchase order first to extract locationId
    const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Purchase order not found');
    }
    
    const orderData = orderDoc.data() as PurchaseOrder;
    
    if (!orderData.locationId) {
      throw new Error('Purchase order missing locationId - cannot determine which branch inventory to update');
    }
    
    // CRITICAL FIX: Get inventory ONLY for the specific branch that made the purchase order
    const inventoryItems = await getInventoryItems(tenantId, orderData.locationId);
    const validationResult = {
      updatedItems: [] as string[],
      notFoundItems: [] as string[],
      unitMismatches: [] as Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>
    };

    // Pre-validate all items before starting transaction
    const itemUpdates: Array<{
      inventoryItem: any;
      deliveryItem: typeof deliveryItems[0];
      newStock: number;
      newCostPerUnit: number;
    }> = [];

    for (const deliveryItem of deliveryItems) {
      if (deliveryItem.quantityReceived <= 0) continue;
      
      // Find matching inventory item
      const matchingItem = inventoryItems.find(item => 
        item.name.toLowerCase().trim() === deliveryItem.itemName.toLowerCase().trim()
      );
      
      if (!matchingItem) {
        validationResult.notFoundItems.push(deliveryItem.itemName);
        continue;
      }
      
      // Check unit compatibility
      if (matchingItem.unit.toLowerCase() !== deliveryItem.unit.toLowerCase()) {
        validationResult.unitMismatches.push({
          itemName: deliveryItem.itemName,
          expectedUnit: matchingItem.unit,
          receivedUnit: deliveryItem.unit
        });
        continue;
      }

      // Calculate new stock and cost
      const newStock = matchingItem.currentStock + deliveryItem.quantityReceived;
      let newCostPerUnit = matchingItem.costPerUnit || 0;

      if (deliveryItem.unitPrice && deliveryItem.unitPrice > 0) {
        if (!matchingItem.costPerUnit || matchingItem.costPerUnit === 0) {
          newCostPerUnit = deliveryItem.unitPrice;
        } else {
          // Weighted average cost
          const existingValue = matchingItem.currentStock * matchingItem.costPerUnit;
          const newValue = deliveryItem.quantityReceived * deliveryItem.unitPrice;
          const totalQuantity = matchingItem.currentStock + deliveryItem.quantityReceived;
          
          if (totalQuantity > 0) {
            newCostPerUnit = (existingValue + newValue) / totalQuantity;
          }
        }
      }

      itemUpdates.push({
        inventoryItem: matchingItem,
        deliveryItem,
        newStock,
        newCostPerUnit
      });
      
      validationResult.updatedItems.push(matchingItem.name);
    }

    // If there are validation errors, return them immediately
    if (validationResult.notFoundItems.length > 0 || validationResult.unitMismatches.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.notFoundItems.length} items not found, ${validationResult.unitMismatches.length} unit mismatches`,
        inventoryUpdateResult: validationResult
      };
    }

    // Now run the atomic transaction
    const result = await runTransaction(db, async (transaction) => {
      // 1. Get current purchase order state
      const orderRef = doc(db, `tenants/${tenantId}/purchaseOrders`, orderId);
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Purchase order not found');
      }
      
      const orderData = orderDoc.data() as PurchaseOrder;
      
      // 2. Validate order can be delivered
      if (orderData.status === 'delivered') {
        throw new Error('Purchase order has already been delivered');
      }
      
      if (orderData.status !== 'ordered' && orderData.status !== 'partially_delivered') {
        throw new Error(`Cannot deliver purchase order. Current status: ${orderData.status}. Order must be in 'ordered' or 'partially_delivered' status.`);
      }

      // 3. Get fresh inventory data within transaction
      const inventoryRefs = itemUpdates.map(update => 
        doc(db, `tenants/${tenantId}/inventory`, update.inventoryItem.id)
      );
      const inventoryDocs = await Promise.all(
        inventoryRefs.map(ref => transaction.get(ref))
      );

      // 4. Verify inventory items still exist and get current stock
      const transactionUpdates: Array<{
        ref: any;
        newStock: number;
        newCostPerUnit: number;
        previousStock: number;
        previousCostPerUnit: number; // CRITICAL FIX: Add previous cost for proper comparison
        deliveryItem: typeof deliveryItems[0];
        itemName: string;
      }> = [];

      for (let i = 0; i < inventoryDocs.length; i++) {
        const doc = inventoryDocs[i];
        const update = itemUpdates[i];
        
        if (!doc.exists()) {
          throw new Error(`Inventory item ${update.inventoryItem.name} no longer exists`);
        }

        const currentData = doc.data();
        const currentStock = currentData.currentStock || 0;
        const newStock = currentStock + update.deliveryItem.quantityReceived;

        // Recalculate cost with current stock data
        let newCostPerUnit = currentData.costPerUnit || 0;
        if (update.deliveryItem.unitPrice && update.deliveryItem.unitPrice > 0) {
          if (!currentData.costPerUnit || currentData.costPerUnit === 0) {
            newCostPerUnit = update.deliveryItem.unitPrice;
          } else {
            const existingValue = currentStock * currentData.costPerUnit;
            const newValue = update.deliveryItem.quantityReceived * update.deliveryItem.unitPrice;
            const totalQuantity = currentStock + update.deliveryItem.quantityReceived;
            
            if (totalQuantity > 0) {
              newCostPerUnit = (existingValue + newValue) / totalQuantity;
            }
          }
        }

        transactionUpdates.push({
          ref: inventoryRefs[i],
          newStock,
          newCostPerUnit,
          previousStock: currentStock,
          previousCostPerUnit: currentData.costPerUnit || 0, // CRITICAL FIX: Store previous cost
          deliveryItem: update.deliveryItem,
          itemName: update.inventoryItem.name
        });
      }

      // 5. Update inventory items
      const now = Timestamp.now();
      for (const update of transactionUpdates) {
        const currentData = inventoryDocs[transactionUpdates.indexOf(update)].data();
        const status = update.newStock <= 0 ? 'out_of_stock' : 
                     update.newStock <= ((currentData?.minStock) || 0) ? 'low_stock' : 'in_stock';

        transaction.update(update.ref, {
          currentStock: update.newStock,
          costPerUnit: update.newCostPerUnit || 0,
          status,
          updatedAt: now,
          lastUpdated: now
        });
      }

      // 6. Update purchase order items with received quantities
      const updatedItems = orderData.items.map(item => {
        const deliveryItem = deliveryItems.find(di => 
          di.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
        );
        
        if (deliveryItem) {
          const previouslyReceived = item.quantityReceived || 0;
          const newlyReceived = deliveryItem.quantityReceived;
          const totalReceived = previouslyReceived + newlyReceived;
          
          return {
            ...item,
            quantityReceived: Math.min(totalReceived, item.quantity)
          };
        } else {
          return {
            ...item,
            quantityReceived: item.quantityReceived || 0
          };
        }
      });

      // 7. Determine new purchase order status
      const isFullyDelivered = updatedItems.every(item => {
        const quantityReceived = item.quantityReceived || 0;
        return quantityReceived >= item.quantity;
      });

      const hasPartialDelivery = updatedItems.some(item => {
        const quantityReceived = item.quantityReceived || 0;
        return quantityReceived > 0 && quantityReceived < item.quantity;
      });

      let newStatus: PurchaseOrder['status'];
      if (isFullyDelivered) {
        newStatus = 'delivered';
      } else if (hasPartialDelivery || updatedItems.some(item => (item.quantityReceived || 0) > 0)) {
        newStatus = 'partially_delivered';
      } else {
        newStatus = 'ordered';
      }

      // 8. Update purchase order
      const orderUpdateData: any = {
        status: newStatus,
        items: updatedItems,
        deliveredAt: now,
        updatedAt: now
      };
      
      if (deliveredBy) {
        orderUpdateData.deliveredBy = deliveredBy;
      }
      
      transaction.update(orderRef, orderUpdateData);

      // 9. Create inventory movement logs (batch write after transaction)
      return {
        transactionUpdates,
        newStatus,
        orderData
      };
    });

    // 10. Log inventory movements after successful transaction
    try {
      const { logInventoryMovement } = await import('./inventory');
      const movementPromises = result.transactionUpdates.map((update, index) => {
        // CRITICAL FIX: Store previous cost in the transaction result for proper comparison
        const priceChanged = update.deliveryItem.unitPrice && update.deliveryItem.unitPrice > 0 &&
          Math.abs(update.newCostPerUnit - (update.previousCostPerUnit || 0)) > 0.01;
        
        const movementReason = priceChanged
          ? `Purchase order delivery - Price updated from ₱${(update.previousCostPerUnit || 0).toFixed(2)} to ₱${update.newCostPerUnit.toFixed(2)} (weighted average)`
          : 'Purchase order delivery received';

        return logInventoryMovement({
          itemId: update.ref.id,
          itemName: update.itemName,
          movementType: 'receiving',
          quantity: update.deliveryItem.quantityReceived,
          previousStock: update.previousStock,
          newStock: update.newStock,
          unit: update.deliveryItem.unit,
          reason: movementReason,
          userId: undefined,
          userName: deliveredBy || 'System',
          tenantId,
          locationId: result.orderData.locationId || ''
        });
      });

      await Promise.all(movementPromises);

      // 🆕 NEW: Send inventory delivery notification with branch information
      try {
        const { notifyInventoryDelivered } = await import('./notifications');
        
        // Get branch name from locationId
        const branchId = result.orderData.locationId?.replace('location_', '') || 'unknown';
        const branchName = branchId.charAt(0).toUpperCase() + branchId.slice(1);
        
        // Count delivered items
        const deliveredItemsCount = result.transactionUpdates.length;
        
        await notifyInventoryDelivered(
          tenantId,
          result.orderData.orderNumber || 'N/A',
          branchName,
          deliveredItemsCount,
          deliveredBy || 'System',
          result.orderData.supplierName || result.orderData.supplierId
        );
        
        console.log(`📦 Inventory delivery notification sent for ${branchName}`);
      } catch (notificationError) {
        console.warn('Failed to send inventory delivery notification:', notificationError);
      }

    } catch (movementError) {
      console.error('Warning: Failed to log inventory movements:', movementError);
      // Don't fail the whole operation for logging issues
    }

    // 11. Trigger menu price sync asynchronously
    try {
      const { triggerMenuPriceSync } = await import('./autoMenuPriceSync');
      if (result.orderData.locationId) {
        const updatedMenuItems = await triggerMenuPriceSync(tenantId, result.orderData.locationId);
        if (updatedMenuItems > 0) {
          console.log(`🍽️ Auto-updated ${updatedMenuItems} menu items with new ingredient costs`);
        }
      }
    } catch (error) {
      console.error('⚠️ Warning: Menu price sync failed:', error);
      // Don't fail delivery for menu sync issues
    }

    return {
      success: true,
      inventoryUpdateResult: validationResult
    };

  } catch (error) {
    console.error('❌ Atomic delivery transaction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deliver purchase order',
      inventoryUpdateResult: undefined
    };
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

// QUOTA-OPTIMIZED VERSION: Export the new quota-efficient delivery function
export { deliverPurchaseOrderQuotaOptimized as deliverPurchaseOrderAtomic } from './purchaseOrdersQuotaOptimized';
