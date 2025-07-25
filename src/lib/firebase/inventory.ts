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

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  costPerUnit?: number;
  supplier?: string;
  lastUpdated: Timestamp;
  status: 'good' | 'low' | 'critical' | 'out';
  tenantId: string; // For multi-tenant support
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Expiration tracking fields
  isPerishable?: boolean;
  expirationDate?: Timestamp;
  batchNumber?: string;
  shelfLife?: number; // days
}

export interface CreateInventoryItem {
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  costPerUnit?: number;
  supplier?: string;
  tenantId: string;
  // Expiration tracking fields
  isPerishable?: boolean;
  expirationDate?: Date;
  batchNumber?: string;
  shelfLife?: number; // days
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: 'add' | 'subtract' | 'adjustment' | 'receiving' | 'usage' | 'waste' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  unit: string;
  reason?: string;
  userId?: string;
  userName?: string;
  timestamp: Timestamp;
  tenantId: string;
}

export interface CreateInventoryMovement {
  itemId: string;
  itemName: string;
  movementType: InventoryMovement['movementType'];
  quantity: number;
  previousStock: number;
  newStock: number;
  unit: string;
  reason?: string;
  userId?: string;
  userName?: string;
  tenantId: string;
}

// Get inventory collection reference
const getInventoryCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/inventory`);
};

// Get inventory movements collection reference
const getInventoryMovementsCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/inventoryMovements`);
};

// Calculate status based on stock levels
const calculateStatus = (currentStock: number, minStock: number): InventoryItem['status'] => {
  if (currentStock === 0) return 'out';
  if (currentStock <= minStock * 0.5) return 'critical';
  if (currentStock <= minStock) return 'low';
  return 'good';
};

// Get all inventory items for a tenant
export const getInventoryItems = async (tenantId: string): Promise<InventoryItem[]> => {
  try {
    const inventoryRef = getInventoryCollection(tenantId);
    const q = query(inventoryRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: calculateStatus(doc.data().currentStock, doc.data().minStock)
    })) as InventoryItem[];
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw new Error('Failed to fetch inventory items');
  }
};

// Listen to real-time inventory updates
export const subscribeToInventoryItems = (
  tenantId: string, 
  callback: (items: InventoryItem[]) => void
) => {
  const inventoryRef = getInventoryCollection(tenantId);
  const q = query(inventoryRef, orderBy('name'));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: calculateStatus(doc.data().currentStock, doc.data().minStock)
    })) as InventoryItem[];
    
    callback(items);
  }, (error) => {
    console.error('Error in inventory subscription:', error);
  });
};

// Add new inventory item
export const addInventoryItem = async (
  item: CreateInventoryItem,
  userId?: string,
  userName?: string
): Promise<string> => {
  try {
    const inventoryRef = getInventoryCollection(item.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(inventoryRef, {
      ...item,
      status: calculateStatus(item.currentStock, item.minStock),
      lastUpdated: now,
      createdAt: now,
      updatedAt: now
    });
    
    // Log initial stock as a movement
    if (item.currentStock > 0) {
      await logInventoryMovement({
        itemId: docRef.id,
        itemName: item.name,
        movementType: 'add',
        quantity: item.currentStock,
        previousStock: 0,
        newStock: item.currentStock,
        unit: item.unit,
        reason: 'Initial stock - item created',
        userId,
        userName,
        tenantId: item.tenantId
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw new Error('Failed to add inventory item');
  }
};

// Update inventory item
export const updateInventoryItem = async (
  tenantId: string,
  itemId: string,
  updates: Partial<Omit<InventoryItem, 'id' | 'tenantId' | 'createdAt'>>,
  userId?: string,
  userName?: string
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/inventory`, itemId);
    const now = Timestamp.now();
    
    // Get current data for movement logging
    const currentDoc = await getDoc(itemRef);
    if (!currentDoc.exists()) {
      throw new Error('Item not found');
    }
    
    const currentData = currentDoc.data();
    const wasStockChanged = updates.currentStock !== undefined && updates.currentStock !== currentData.currentStock;
    
    const updateData = {
      ...updates,
      updatedAt: now,
      lastUpdated: now
    };
    
    // Recalculate status if stock levels changed
    if (updates.currentStock !== undefined || updates.minStock !== undefined) {
      const newCurrentStock = updates.currentStock ?? currentData.currentStock;
      const newMinStock = updates.minStock ?? currentData.minStock;
      updateData.status = calculateStatus(newCurrentStock, newMinStock);
    }
    
    await updateDoc(itemRef, updateData);
    
    // Log movement if stock was changed
    if (wasStockChanged) {
      const currentStock = currentData.currentStock || 0;
      const newStock = updates.currentStock!;
      const quantityChange = newStock - currentStock;
      
      await logInventoryMovement({
        itemId,
        itemName: currentData.name,
        movementType: quantityChange >= 0 ? 'add' : 'subtract',
        quantity: Math.abs(quantityChange),
        previousStock: currentStock,
        newStock: newStock,
        unit: currentData.unit,
        reason: 'Manual stock adjustment',
        userId,
        userName,
        tenantId
      });
    }
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw new Error('Failed to update inventory item');
  }
};

// Delete inventory item
export const deleteInventoryItem = async (
  tenantId: string,
  itemId: string
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/inventory`, itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw new Error('Failed to delete inventory item');
  }
};

// Update stock quantity (common operation)
export const updateStockQuantity = async (
  tenantId: string,
  itemId: string,
  newQuantity: number,
  operation: 'set' | 'add' | 'subtract' = 'set',
  reason?: string,
  userId?: string,
  userName?: string
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/inventory`, itemId);
    const now = Timestamp.now();
    
    // Get current item data for movement logging
    const currentDoc = await getDoc(itemRef);
    if (!currentDoc.exists()) {
      throw new Error('Item not found');
    }
    
    const currentData = currentDoc.data();
    const currentStock = currentData.currentStock || 0;
    let updatedStock: number;
    let movementType: 'add' | 'subtract' | 'adjustment';
    let actualQuantityChange: number;
    
    if (operation === 'set') {
      updatedStock = newQuantity;
      actualQuantityChange = newQuantity - currentStock;
      movementType = actualQuantityChange >= 0 ? 'add' : 'subtract';
    } else if (operation === 'add') {
      updatedStock = currentStock + newQuantity;
      actualQuantityChange = newQuantity;
      movementType = 'add';
    } else { // subtract
      updatedStock = Math.max(0, currentStock - newQuantity);
      actualQuantityChange = -(currentStock - updatedStock); // negative for subtract
      movementType = 'subtract';
    }
    
    // Update the item
    await updateDoc(itemRef, {
      currentStock: updatedStock,
      status: calculateStatus(updatedStock, currentData.minStock),
      lastUpdated: now,
      updatedAt: now
    });
    
    // Log the movement if there was actually a change
    if (actualQuantityChange !== 0) {
      await logInventoryMovement({
        itemId,
        itemName: currentData.name,
        movementType,
        quantity: Math.abs(actualQuantityChange),
        previousStock: currentStock,
        newStock: updatedStock,
        unit: currentData.unit,
        reason: reason || `Stock ${operation === 'set' ? 'adjusted' : operation === 'add' ? 'increased' : 'decreased'}`,
        userId,
        userName,
        tenantId
      });
    }
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    throw new Error('Failed to update stock quantity');
  }
};

// Get low stock items
export const getLowStockItems = async (tenantId: string): Promise<InventoryItem[]> => {
  try {
    const items = await getInventoryItems(tenantId);
    return items.filter(item => item.status === 'low' || item.status === 'critical' || item.status === 'out');
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw new Error('Failed to fetch low stock items');
  }
};

// Search inventory items
export const searchInventoryItems = async (
  tenantId: string,
  searchTerm: string
): Promise<InventoryItem[]> => {
  try {
    const items = await getInventoryItems(tenantId);
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerSearchTerm) ||
      item.category.toLowerCase().includes(lowerSearchTerm) ||
      (item.supplier && item.supplier.toLowerCase().includes(lowerSearchTerm))
    );
  } catch (error) {
    console.error('Error searching inventory items:', error);
    throw new Error('Failed to search inventory items');
  }
};

// Update inventory from purchase order delivery
export const updateInventoryFromDelivery = async (
  tenantId: string,
  deliveryItems: Array<{
    itemName: string;
    quantityReceived: number;
    unit: string;
    unitPrice?: number;
  }>,
  userId?: string,
  userName?: string
): Promise<{
  success: boolean;
  updatedItems: string[];
  notFoundItems: string[];
  unitMismatches: Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>;
}> => {
  try {
    const result = {
      success: true,
      updatedItems: [] as string[],
      notFoundItems: [] as string[],
      unitMismatches: [] as Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>
    };

    // Get all current inventory items
    const inventoryItems = await getInventoryItems(tenantId);
    
    for (const deliveryItem of deliveryItems) {
      if (deliveryItem.quantityReceived <= 0) continue;
      
      // Find matching inventory item (case-insensitive search)
      const matchingItem = inventoryItems.find(item => 
        item.name.toLowerCase().trim() === deliveryItem.itemName.toLowerCase().trim()
      );
      
      if (!matchingItem) {
        result.notFoundItems.push(deliveryItem.itemName);
        continue;
      }
      
      // Check unit compatibility (optional - log mismatch but still update)
      if (matchingItem.unit.toLowerCase() !== deliveryItem.unit.toLowerCase()) {
        result.unitMismatches.push({
          itemName: deliveryItem.itemName,
          expectedUnit: matchingItem.unit,
          receivedUnit: deliveryItem.unit
        });
      }
      
      // Instead of using updateInventoryItem, we'll log a specific receiving movement
      const newStock = matchingItem.currentStock + deliveryItem.quantityReceived;
      const updates: Partial<InventoryItem> = {
        currentStock: newStock,
        status: calculateStatus(newStock, matchingItem.minStock)
      };
      
      // Update cost per unit if provided and current cost is not set
      if (deliveryItem.unitPrice && (!matchingItem.costPerUnit || matchingItem.costPerUnit === 0)) {
        updates.costPerUnit = deliveryItem.unitPrice;
      }
      
      // Update the inventory item directly
      const itemRef = doc(db, `tenants/${tenantId}/inventory`, matchingItem.id);
      const now = Timestamp.now();
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: now,
        lastUpdated: now
      });
      
      // Log the receiving movement
      await logInventoryMovement({
        itemId: matchingItem.id,
        itemName: matchingItem.name,
        movementType: 'receiving',
        quantity: deliveryItem.quantityReceived,
        previousStock: matchingItem.currentStock,
        newStock: newStock,
        unit: matchingItem.unit,
        reason: 'Purchase order delivery received',
        userId,
        userName,
        tenantId
      });
      
      result.updatedItems.push(matchingItem.name);
    }
    
    return result;
  } catch (error) {
    console.error('Error updating inventory from delivery:', error);
    throw new Error('Failed to update inventory from delivery');
  }
};

// Find inventory item by name (helper function)
export const findInventoryItemByName = async (
  tenantId: string,
  itemName: string
): Promise<InventoryItem | null> => {
  try {
    const items = await getInventoryItems(tenantId);
    return items.find(item => 
      item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    ) || null;
  } catch (error) {
    console.error('Error finding inventory item by name:', error);
    return null;
  }
};

// Log inventory movement
export const logInventoryMovement = async (
  movement: CreateInventoryMovement
): Promise<string> => {
  try {
    const movementsRef = getInventoryMovementsCollection(movement.tenantId);
    const now = Timestamp.now();
    
    // Filter out undefined values to prevent Firebase errors
    const cleanMovement = Object.fromEntries(
      Object.entries(movement).filter(([_, value]) => value !== undefined)
    );
    
    const docRef = await addDoc(movementsRef, {
      ...cleanMovement,
      timestamp: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error logging inventory movement:', error);
    throw new Error('Failed to log inventory movement');
  }
};

// Get inventory movements for an item
export const getInventoryMovements = async (
  tenantId: string,
  itemId?: string,
  limit: number = 50
): Promise<InventoryMovement[]> => {
  try {
    const movementsRef = getInventoryMovementsCollection(tenantId);
    let q;
    
    if (itemId) {
      // Use where clause only, then sort in memory to avoid composite index requirement
      q = query(
        movementsRef,
        where('itemId', '==', itemId)
      );
    } else {
      q = query(
        movementsRef,
        orderBy('timestamp', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    let movements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryMovement[];
    
    // Sort in memory if we queried by itemId
    if (itemId) {
      movements = movements.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date();
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date();
        return bTime.getTime() - aTime.getTime(); // desc order
      });
    }
    
    // Apply limit
    return movements.slice(0, limit);
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    throw new Error('Failed to fetch inventory movements');
  }
};

// Get recent inventory movements (for dashboard)
export const getRecentInventoryMovements = async (
  tenantId: string,
  hours: number = 24
): Promise<InventoryMovement[]> => {
  try {
    const movementsRef = getInventoryMovementsCollection(tenantId);
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    const q = query(
      movementsRef,
      where('timestamp', '>=', Timestamp.fromDate(hoursAgo)),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryMovement[];
  } catch (error) {
    console.error('Error fetching recent movements:', error);
    throw new Error('Failed to fetch recent movements');
  }
};
