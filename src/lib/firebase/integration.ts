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
  writeBatch,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, MenuIngredient } from './menuBuilder';
import { POSItem, CreatePOSItem } from './pos';
import { InventoryItem } from './inventory';

/**
 * Integration Service - Connects MenuBuilder, POS, and Inventory
 * 
 * Key Features:
 * 1. Sync menu items to POS when created/updated
 * 2. Deduct ingredient inventory when sales occur
 * 3. Update item availability based on ingredient stock
 * 4. Track cost calculations and profit margins
 */

// ========================================
// MENU BUILDER → POS SYNC
// ========================================

/**
 * Sync a menu item to POS system
 */
export const syncMenuItemToPOS = async (menuItem: MenuItem): Promise<void> => {
  try {
    const posItem: CreatePOSItem = {
      name: menuItem.name,
      category: menuItem.category,
      price: menuItem.price,
      cost: calculateItemCost(menuItem.ingredients),
      description: menuItem.description,
      image: menuItem.image || getDefaultEmoji(menuItem.category),
      isAvailable: menuItem.status === 'active',
      preparationTime: menuItem.preparationTime,
      tenantId: menuItem.tenantId
    };

    // Check if POS item already exists
    const posItemsRef = collection(db, `tenants/${menuItem.tenantId}/posItems`);
    const existingQuery = query(
      posItemsRef, 
      where('name', '==', menuItem.name),
      where('category', '==', menuItem.category)
    );
    
    const existingDocs = await getDocs(existingQuery);
    
    if (existingDocs.empty) {
      // Create new POS item
      const docRef = await addDoc(posItemsRef, {
        ...posItem,
        menuItemId: menuItem.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log(`✅ POS: Created "${menuItem.name}" (${docRef.id})`);
    } else {
      // Update existing POS item
      const existingDoc = existingDocs.docs[0];
      await updateDoc(existingDoc.ref, {
        ...posItem,
        menuItemId: menuItem.id,
        updatedAt: Timestamp.now()
      });
      console.log(`✅ POS: Updated "${menuItem.name}" (${existingDoc.id})`);
    }
  } catch (error) {
    console.error(`❌ POS Sync Error for "${menuItem.name}":`, error);
    throw error;
  }
};

/**
 * Sync all menu items to POS
 */
export const syncAllMenuItemsToPOS = async (tenantId: string): Promise<void> => {
  try {
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuItemsSnap = await getDocs(menuItemsRef);
    
    const syncPromises = menuItemsSnap.docs.map(doc => {
      const menuItem = { id: doc.id, ...doc.data() } as MenuItem;
      return syncMenuItemToPOS(menuItem);
    });
    
    await Promise.all(syncPromises);
  } catch (error) {
    console.error('Error syncing all menu items to POS:', error);
    throw error;
  }
};

/**
 * Remove POS item when menu item is deleted
 */
export const removePOSItem = async (tenantId: string, menuItemId: string): Promise<void> => {
  try {
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const query_doc = query(posItemsRef, where('menuItemId', '==', menuItemId));
    const snapshot = await getDocs(query_doc);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error removing POS item:', error);
    throw error;
  }
};

// ========================================
// POS SALES → INVENTORY DEDUCTION
// ========================================

/**
 * Process inventory deductions after a sale
 */
export const processInventoryDeduction = async (
  tenantId: string,
  orderItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
  }>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    for (const orderItem of orderItems) {
      // Get the menu item to find its ingredients
      const menuItem = await getMenuItemByPOSItemId(tenantId, orderItem.itemId);
      
      if (menuItem && menuItem.ingredients) {
        // Deduct each ingredient from inventory
        for (const ingredient of menuItem.ingredients) {
          const totalQuantityUsed = ingredient.quantity * orderItem.quantity;
          await deductInventoryQuantity(
            batch,
            tenantId,
            ingredient.inventoryItemId,
            totalQuantityUsed
          );
        }
      }
    }
    
    await batch.commit();
    
    // After deducting inventory, check item availability
    await updateItemAvailability(tenantId);
  } catch (error) {
    console.error('Error processing inventory deduction:', error);
    throw error;
  }
};

/**
 * Get menu item by POS item ID
 */
const getMenuItemByPOSItemId = async (
  tenantId: string, 
  posItemId: string
): Promise<MenuItem | null> => {
  try {
    console.log(`🔍 Looking for menu item with POS item ID: ${posItemId}`);
    
    // First get the POS item to find the menu item ID
    const posItemDoc = await getDoc(doc(db, `tenants/${tenantId}/posItems`, posItemId));
    
    if (!posItemDoc.exists()) {
      console.log(`❌ POS item not found: ${posItemId}`);
      return null;
    }
    
    const posItemData = posItemDoc.data();
    console.log(`📋 POS item data:`, posItemData);
    const menuItemId = posItemData.menuItemId;
    
    if (!menuItemId) {
      console.log(`🔗 No direct menu item ID link, searching by name and category...`);
      // If no direct link, try to find by name and category
      const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
      const menuQuery = query(
        menuItemsRef,
        where('name', '==', posItemData.name),
        where('category', '==', posItemData.category)
      );
      
      const menuSnapshot = await getDocs(menuQuery);
      if (!menuSnapshot.empty) {
        const menuDoc = menuSnapshot.docs[0];
        console.log(`✅ Found menu item by name/category:`, menuDoc.id);
        return { id: menuDoc.id, ...menuDoc.data() } as MenuItem;
      }
      
      console.log(`❌ No menu item found by name "${posItemData.name}" and category "${posItemData.category}"`);
      return null;
    }
    
    console.log(`🔗 Direct menu item ID found: ${menuItemId}`);
    // Get menu item by ID
    const menuItemDoc = await getDoc(doc(db, `tenants/${tenantId}/menuItems`, menuItemId));
    
    if (!menuItemDoc.exists()) {
      console.log(`❌ Menu item not found with ID: ${menuItemId}`);
      return null;
    }
    
    console.log(`✅ Menu item found:`, menuItemDoc.id);
    return { id: menuItemDoc.id, ...menuItemDoc.data() } as MenuItem;
  } catch (error) {
    console.error('Error getting menu item by POS item ID:', error);
    return null;
  }
};

/**
 * Deduct quantity from inventory item
 */
const deductInventoryQuantity = async (
  batch: any,
  tenantId: string,
  inventoryItemId: string,
  quantityToDeduct: number
): Promise<void> => {
  try {
    const inventoryItemRef = doc(db, `tenants/${tenantId}/inventory`, inventoryItemId);
    const inventoryItemDoc = await getDoc(inventoryItemRef);
    
    if (!inventoryItemDoc.exists()) {
      console.warn(`Inventory item ${inventoryItemId} not found`);
      return;
    }
    
    const inventoryItem = inventoryItemDoc.data() as InventoryItem;
    const newQuantity = Math.max(0, inventoryItem.currentStock - quantityToDeduct);
    
    batch.update(inventoryItemRef, {
      currentStock: newQuantity,
      updatedAt: Timestamp.now()
    });
    
    // Log the transaction
    const transactionRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    batch.set(doc(transactionRef), {
      inventoryItemId,
      type: 'sale',
      quantityChange: -quantityToDeduct,
      newQuantity,
      reason: 'POS Sale',
      createdAt: Timestamp.now(),
      tenantId
    });
  } catch (error) {
    console.error('Error deducting inventory quantity:', error);
    throw error;
  }
};

// ========================================
// AVAILABILITY MANAGEMENT
// ========================================

/**
 * Update item availability based on ingredient stock
 */
export const updateItemAvailability = async (tenantId: string): Promise<void> => {
  try {
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuItemsSnap = await getDocs(menuItemsRef);
    
    const batch = writeBatch(db);
    
    for (const menuDoc of menuItemsSnap.docs) {
      const menuItem = { id: menuDoc.id, ...menuDoc.data() } as MenuItem;
      
      if (menuItem.ingredients && menuItem.ingredients.length > 0) {
        const isAvailable = await checkIngredientAvailability(tenantId, menuItem.ingredients);
        
        // Update menu item status
        const newStatus = isAvailable ? 'active' : 'out_of_stock';
        if (menuItem.status !== newStatus) {
          batch.update(menuDoc.ref, {
            status: newStatus,
            updatedAt: Timestamp.now()
          });
          
          // Also update corresponding POS item
          const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
          const posQuery = query(posItemsRef, where('menuItemId', '==', menuItem.id));
          const posSnapshot = await getDocs(posQuery);
          
          posSnapshot.docs.forEach(posDoc => {
            batch.update(posDoc.ref, {
              isAvailable,
              updatedAt: Timestamp.now()
            });
          });
        }
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error updating item availability:', error);
    throw error;
  }
};

/**
 * Check if all ingredients are available for a menu item
 */
const checkIngredientAvailability = async (
  tenantId: string,
  ingredients: MenuIngredient[]
): Promise<boolean> => {
  try {
    for (const ingredient of ingredients) {
      const inventoryItemDoc = await getDoc(
        doc(db, `tenants/${tenantId}/inventory`, ingredient.inventoryItemId)
      );
      
      if (!inventoryItemDoc.exists()) {
        return false;
      }
      
      const inventoryItem = inventoryItemDoc.data() as InventoryItem;
      
      // Check if there's enough stock
      if (inventoryItem.currentStock < ingredient.quantity) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking ingredient availability:', error);
    return false;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate total cost of menu item based on ingredients
 */
const calculateItemCost = (ingredients: MenuIngredient[]): number => {
  return ingredients.reduce((total, ingredient) => {
    return total + (ingredient.cost * ingredient.quantity);
  }, 0);
};

/**
 * Get default emoji based on category
 */
const getDefaultEmoji = (category: string): string => {
  const categoryEmojis: { [key: string]: string } = {
    'appetizer': '🥗',
    'main': '🍽️',
    'dessert': '🍰',
    'beverage': '🥤',
    'pizza': '🍕',
    'burger': '🍔',
    'pasta': '🍝',
    'salad': '🥗',
    'soup': '🍲',
    'seafood': '🐟',
    'chicken': '🍗',
    'beef': '🥩',
    'vegetarian': '🥬',
    'breakfast': '🍳',
    'lunch': '🍽️',
    'dinner': '🍽️',
    'snack': '🍿',
    'coffee': '☕',
    'tea': '🍵',
    'juice': '🧃',
    'cocktail': '🍹',
    'beer': '🍺',
    'wine': '🍷'
  };
  
  return categoryEmojis[category.toLowerCase()] || '🍽️';
};

/**
 * Get items that will be affected by low inventory
 */
export const getAffectedMenuItems = async (
  tenantId: string,
  inventoryItemId: string
): Promise<MenuItem[]> => {
  try {
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuItemsSnap = await getDocs(menuItemsRef);
    
    const affectedItems: MenuItem[] = [];
    
    for (const doc of menuItemsSnap.docs) {
      const menuItem = { id: doc.id, ...doc.data() } as MenuItem;
      
      if (menuItem.ingredients?.some(ing => ing.inventoryItemId === inventoryItemId)) {
        affectedItems.push(menuItem);
      }
    }
    
    return affectedItems;
  } catch (error) {
    console.error('Error getting affected menu items:', error);
    return [];
  }
};

/**
 * Sync specific menu item when it's updated
 */
export const handleMenuItemUpdate = async (menuItem: MenuItem): Promise<void> => {
  try {
    // Sync to POS
    await syncMenuItemToPOS(menuItem);
    
    // Update availability based on ingredients
    await updateItemAvailability(menuItem.tenantId);
  } catch (error) {
    console.error('Error handling menu item update:', error);
    throw error;
  }
};

/**
 * Handle menu item deletion
 */
export const handleMenuItemDeletion = async (
  tenantId: string,
  menuItemId: string
): Promise<void> => {
  try {
    // Remove from POS
    await removePOSItem(tenantId, menuItemId);
  } catch (error) {
    console.error('Error handling menu item deletion:', error);
    throw error;
  }
};

/**
 * Restore inventory quantities when voiding an order
 */
export const restoreInventoryFromVoid = async (
  tenantId: string,
  orderItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
  }>
): Promise<void> => {
  try {
    console.log('🔄 Restoring inventory from voided order...');
    
    const batch = writeBatch(db);
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    
    for (const orderItem of orderItems) {
      // Get the menu item to find its ingredients using the correct method
      const menuItem = await getMenuItemByPOSItemId(tenantId, orderItem.itemId);
      
      if (menuItem) {
        if (menuItem.ingredients && menuItem.ingredients.length > 0) {
          console.log(`📦 Restoring ingredients for: ${orderItem.name} (${orderItem.quantity}x)`);
          
          // Restore each ingredient quantity
          for (const ingredient of menuItem.ingredients) {
            const inventoryQuery = query(
              inventoryRef,
              where('name', '==', ingredient.inventoryItemName)
            );
            const inventorySnapshot = await getDocs(inventoryQuery);
            
            if (!inventorySnapshot.empty) {
              const inventoryDoc = inventorySnapshot.docs[0];
              const inventoryItem = inventoryDoc.data() as InventoryItem;
              
              const restoreAmount = ingredient.quantity * orderItem.quantity;
              const newQuantity = inventoryItem.currentStock + restoreAmount;
              
              console.log(`  ↗️ Restoring ${ingredient.inventoryItemName}: +${restoreAmount} (${inventoryItem.currentStock} → ${newQuantity})`);
              
              batch.update(inventoryDoc.ref, {
                currentStock: newQuantity,
                updatedAt: Timestamp.now()
              });
            } else {
              console.warn(`⚠️ Inventory item not found: ${ingredient.inventoryItemName}`);
            }
          }
        }
      } else {
        console.warn(`⚠️ Menu item not found for POS item: ${orderItem.itemId}`);
      }
    }
    
    await batch.commit();
    console.log('✅ Inventory restoration completed');
  } catch (error) {
    console.error('❌ Error restoring inventory from void:', error);
    throw new Error('Failed to restore inventory from void');
  }
};
