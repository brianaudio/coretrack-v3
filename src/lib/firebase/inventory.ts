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
import { validateBranchAccess, requireBranchAccess } from '../security/branchAccess';

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
  locationId: string; // For separate inventory per branch
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
  locationId: string; // For separate inventory per branch
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
  locationId: string; // For separate inventory per branch
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
  locationId: string; // For separate inventory per branch
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

// Get all inventory items for a tenant and location (SECURE VERSION)
export const getInventoryItems = async (
  tenantId: string, 
  locationId: string,
  userId?: string
): Promise<InventoryItem[]> => {
  try {
    // Validate branch access if userId provided
    if (userId) {
      await requireBranchAccess(userId, tenantId, locationId, 'view');
    }
    
    const inventoryRef = getInventoryCollection(tenantId);
    // Use Firebase server-side filtering for security
    const q = query(
      inventoryRef, 
      where('locationId', '==', locationId), 
      orderBy('name')
    );
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

// Get all inventory items for a tenant across all locations
export const getAllInventoryItems = async (tenantId: string): Promise<InventoryItem[]> => {
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

// Listen to real-time inventory updates for a specific location (SECURE VERSION)
export const subscribeToInventoryItems = (
  tenantId: string, 
  locationId: string,
  callback: (items: InventoryItem[]) => void,
  userId?: string
) => {
  // Note: Real-time validation needs to be handled at component level
  // since onSnapshot doesn't support async validation
  
  const inventoryRef = getInventoryCollection(tenantId);
  // Use Firebase server-side filtering for security
  const q = query(
    inventoryRef, 
    where('locationId', '==', locationId), 
    orderBy('name')
  );
  
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
        tenantId: item.tenantId,
        locationId: item.locationId
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
      console.error(`Inventory item not found: tenantId=${tenantId}, itemId=${itemId}`);
      throw new Error(`Item not found: ${itemId} in tenant ${tenantId}`);
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
        tenantId,
        locationId: currentData.locationId
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
      console.error(`Inventory item not found: tenantId=${tenantId}, itemId=${itemId}`);
      throw new Error(`Item not found: ${itemId} in tenant ${tenantId}`);
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
        tenantId,
        locationId: currentData.locationId
      });
    }
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    console.error(`Details: tenantId=${tenantId}, itemId=${itemId}, operation=${operation}, newQuantity=${newQuantity}`);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update stock quantity for item ${itemId}: ${errorMessage}`);
  }
};

// Get low stock items
export const getLowStockItems = async (tenantId: string): Promise<InventoryItem[]> => {
  try {
    const items = await getAllInventoryItems(tenantId);
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
    const items = await getAllInventoryItems(tenantId);
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
  updatedIngredientIds?: string[];
  menuPriceUpdates?: {
    autoUpdated: number;
    flaggedForReview: number;
    manualReviewRequired: number;
  };
}> => {
  try {
    const result = {
      success: true,
      updatedItems: [] as string[],
      notFoundItems: [] as string[],
      unitMismatches: [] as Array<{ itemName: string; expectedUnit: string; receivedUnit: string }>,
      updatedIngredientIds: [] as string[],
      menuPriceUpdates: undefined as {
        autoUpdated: number;
        flaggedForReview: number;
        manualReviewRequired: number;
      } | undefined
    };

    // Get all current inventory items
    const inventoryItems = await getAllInventoryItems(tenantId);
    
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
      
      // Check unit compatibility and handle mismatches
      if (matchingItem.unit.toLowerCase() !== deliveryItem.unit.toLowerCase()) {
        result.unitMismatches.push({
          itemName: deliveryItem.itemName,
          expectedUnit: matchingItem.unit,
          receivedUnit: deliveryItem.unit
        });
        
        // For now, skip updating items with unit mismatches to avoid confusion
        // The user will need to resolve the unit mismatch first
        console.warn(`Unit mismatch for ${deliveryItem.itemName}: expected ${matchingItem.unit}, received ${deliveryItem.unit}. Skipping inventory update.`);
        continue;
      }
      
      // Handle cost per unit updates with weighted average method
      let newCostPerUnit = matchingItem.costPerUnit;
      
      if (deliveryItem.unitPrice && deliveryItem.unitPrice > 0) {
        if (!matchingItem.costPerUnit || matchingItem.costPerUnit === 0) {
          // No existing cost - use the new price
          newCostPerUnit = deliveryItem.unitPrice;
        } else {
          // Calculate weighted average cost
          const existingValue = matchingItem.currentStock * matchingItem.costPerUnit;
          const newValue = deliveryItem.quantityReceived * deliveryItem.unitPrice;
          const totalQuantity = matchingItem.currentStock + deliveryItem.quantityReceived;
          
          if (totalQuantity > 0) {
            newCostPerUnit = (existingValue + newValue) / totalQuantity;
            console.log(`📊 Price Update for ${matchingItem.name}:`);
            console.log(`   - Existing: ${matchingItem.currentStock} units @ ₱${matchingItem.costPerUnit.toFixed(2)} = ₱${existingValue.toFixed(2)}`);
            console.log(`   - New: ${deliveryItem.quantityReceived} units @ ₱${deliveryItem.unitPrice.toFixed(2)} = ₱${newValue.toFixed(2)}`);
            console.log(`   - Weighted Average: ₱${newCostPerUnit.toFixed(2)} per unit`);
          }
        }
      }
      
      // Instead of using updateInventoryItem, we'll log a specific receiving movement
      const newStock = matchingItem.currentStock + deliveryItem.quantityReceived;
      const updates: Partial<InventoryItem> = {
        currentStock: newStock,
        status: calculateStatus(newStock, matchingItem.minStock)
      };
      
      // Update cost per unit with the calculated weighted average
      if (newCostPerUnit !== matchingItem.costPerUnit) {
        updates.costPerUnit = newCostPerUnit;
      }
      
      // Update the inventory item directly
      const itemRef = doc(db, `tenants/${tenantId}/inventory`, matchingItem.id);
      const now = Timestamp.now();
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: now,
        lastUpdated: now
      });
      
      // Log the receiving movement with cost information
      const movementReason = newCostPerUnit !== matchingItem.costPerUnit 
        ? `Purchase order delivery received - Price updated from ₱${(matchingItem.costPerUnit || 0).toFixed(2)} to ₱${(newCostPerUnit || 0).toFixed(2)} (weighted average)`
        : 'Purchase order delivery received';
        
      await logInventoryMovement({
        itemId: matchingItem.id,
        itemName: matchingItem.name,
        movementType: 'receiving',
        quantity: deliveryItem.quantityReceived,
        previousStock: matchingItem.currentStock,
        newStock: newStock,
        unit: matchingItem.unit,
        reason: movementReason,
        userId,
        userName,
        tenantId,
        locationId: matchingItem.locationId
      });
      
      result.updatedItems.push(matchingItem.name);
      
      // Track ingredients that had cost changes for menu price synchronization
      if (newCostPerUnit !== matchingItem.costPerUnit) {
        result.updatedIngredientIds.push(matchingItem.id);
      }
    }
    
    // Process menu price updates if any ingredient costs changed
    if (result.updatedIngredientIds && result.updatedIngredientIds.length > 0) {
      try {
        const { processMenuPriceUpdatesAfterDelivery } = await import('./menuPriceSync');
        const menuUpdateResult = await processMenuPriceUpdatesAfterDelivery(tenantId, result.updatedIngredientIds);
        
        console.log('📋 Menu Price Update Summary:');
        console.log(`   - Auto-updated: ${menuUpdateResult.autoUpdated} items`);
        console.log(`   - Flagged for review: ${menuUpdateResult.flaggedForReview} items`);
        console.log(`   - Manual review required: ${menuUpdateResult.manualReviewRequired} items`);
        
        result.menuPriceUpdates = menuUpdateResult;
      } catch (error) {
        console.error('Error processing menu price updates:', error);
        // Don't fail the inventory update if menu sync fails
      }
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
    const items = await getAllInventoryItems(tenantId);
    return items.find(item => 
      item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    ) || null;
  } catch (error) {
    console.error('Error finding inventory item by name:', error);
    return null;
  }
};

// Resolve unit mismatch by updating inventory item unit
export const resolveUnitMismatch = async (
  tenantId: string,
  itemName: string,
  newUnit: string,
  deliveryQuantity: number,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Find the inventory item
    const inventoryItem = await findInventoryItemByName(tenantId, itemName);
    
    if (!inventoryItem) {
      return { success: false, message: 'Inventory item not found' };
    }
    
    // Update the inventory item with new unit and add the delivery quantity
    const newStock = inventoryItem.currentStock + deliveryQuantity;
    const itemRef = doc(db, `tenants/${tenantId}/inventory`, inventoryItem.id);
    const now = Timestamp.now();
    
    await updateDoc(itemRef, {
      unit: newUnit,
      currentStock: newStock,
      status: calculateStatus(newStock, inventoryItem.minStock),
      updatedAt: now,
      lastUpdated: now
    });
    
    // Log the movement with unit change
    await logInventoryMovement({
      itemId: inventoryItem.id,
      itemName: inventoryItem.name,
      movementType: 'receiving',
      quantity: deliveryQuantity,
      previousStock: inventoryItem.currentStock,
      newStock: newStock,
      unit: newUnit,
      reason: `Purchase order delivery received (unit changed from ${inventoryItem.unit} to ${newUnit})`,
      userId,
      userName,
      tenantId,
      locationId: inventoryItem.locationId
    });
    
    return { 
      success: true, 
      message: `Successfully updated ${itemName} unit from "${inventoryItem.unit}" to "${newUnit}" and added ${deliveryQuantity} to inventory.` 
    };
  } catch (error) {
    console.error('Error resolving unit mismatch:', error);
    return { success: false, message: 'Failed to resolve unit mismatch' };
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
  hours: number = 24,
  locationId?: string
): Promise<InventoryMovement[]> => {
  try {
    const movementsRef = getInventoryMovementsCollection(tenantId);
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    let q;
    if (locationId) {
      // Try composite query first, fallback to simple query if index not ready
      try {
        q = query(
          movementsRef,
          where('timestamp', '>=', Timestamp.fromDate(hoursAgo)),
          where('locationId', '==', locationId),
          orderBy('timestamp', 'desc')
        );
      } catch (indexError) {
        console.warn('Composite index not ready, using fallback query:', indexError);
        // Fallback: Simple timestamp query, filter locationId client-side
        q = query(
          movementsRef,
          where('timestamp', '>=', Timestamp.fromDate(hoursAgo)),
          orderBy('timestamp', 'desc')
        );
      }
    } else {
      // Original query without location filtering (for compatibility)
      q = query(
        movementsRef,
        where('timestamp', '>=', Timestamp.fromDate(hoursAgo)),
        orderBy('timestamp', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    let movements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryMovement[];
    
    // Client-side filter by locationId if composite query failed
    if (locationId) {
      movements = movements.filter(movement => movement.locationId === locationId);
    }
    
    return movements;
  } catch (error) {
    console.error('Error fetching recent movements:', error);
    
    // Final fallback: Get all recent movements without location filter
    try {
      const movementsRef = getInventoryMovementsCollection(tenantId);
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);
      
      const fallbackQuery = query(
        movementsRef,
        where('timestamp', '>=', Timestamp.fromDate(hoursAgo)),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(fallbackQuery);
      let movements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryMovement[];
      
      // Filter by locationId client-side
      if (locationId) {
        movements = movements.filter(movement => movement.locationId === locationId);
      }
      
      return movements;
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      throw new Error('Failed to fetch recent movements');
    }
  }
};
