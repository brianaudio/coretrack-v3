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
import { InventoryItem, logInventoryMovement } from './inventory';

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
    // Create base POS item object, filtering out undefined values
    const posItemData: any = {
      name: menuItem.name,
      category: menuItem.category,
      price: menuItem.price,
      cost: calculateItemCost(menuItem.ingredients),
      description: menuItem.description,
      image: menuItem.image || getDefaultEmoji(menuItem.category),
      emoji: menuItem.emoji || getDefaultEmoji(menuItem.category), // Use default if undefined
      isAvailable: menuItem.status === 'active',
      preparationTime: menuItem.preparationTime || 0, // Default to 0 if undefined
      tenantId: menuItem.tenantId,
      // 🔥 CRITICAL FIX: Sync ingredients to POS for inventory deduction
      ingredients: menuItem.ingredients || []
    };

    // Only add locationId if it's defined
    if (menuItem.locationId) {
      posItemData.locationId = menuItem.locationId;
    }

    const posItem = posItemData as CreatePOSItem;

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
    } else {
      // Update existing POS item
      const existingDoc = existingDocs.docs[0];
      const updateData = {
        ...posItem,
        menuItemId: menuItem.id,
        updatedAt: Timestamp.now()
      };
      await updateDoc(existingDoc.ref, updateData);
    }
  } catch (error) {
    console.error('POS sync error:', error);
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
 * Enhanced to handle multiple items using same ingredients correctly
 */
export const processInventoryDeduction = async (
  tenantId: string,
  orderItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
  }>
): Promise<void> => {
  console.log('🚨 INVENTORY DEDUCTION FUNCTION CALLED! 🚨');
  console.log('🚨 Tenant ID:', tenantId);
  console.log('🚨 Order Items:', orderItems);
  
  try {
    console.log('🔄 Processing inventory deduction for', orderItems.length, 'items')
    
    const batch = writeBatch(db);
    let deductionsMade = 0;
    
    // 🎯 CRITICAL FIX: Accumulate deductions by inventory item ID
    const deductionMap = new Map<string, {
      totalDeduction: number;
      itemName: string;
      transactions: Array<{
        orderItemName: string;
        quantity: number;
        deduction: number;
      }>;
    }>();
    
    // Step 1: Collect all deductions and accumulate by inventory item
    for (const orderItem of orderItems) {
      console.log(`📦 Processing: ${orderItem.name} (x${orderItem.quantity})`)
      console.log(`🔍 Looking for POS item ID: ${orderItem.itemId}`)
      
      // PRIORITIZE ingredient-based deduction (proper restaurant inventory)
      console.log(`🔍 [INVENTORY DEDUCTION] Looking for menu item with ingredients: ${orderItem.name}`)
      const menuItem = await getMenuItemByPOSItemId(tenantId, orderItem.itemId);
      
      console.log(`🔍 [INVENTORY DEDUCTION] getMenuItemByPOSItemId returned:`, {
        found: !!menuItem,
        name: menuItem?.name,
        ingredientCount: menuItem?.ingredients?.length || 0,
        ingredients: menuItem?.ingredients?.map(ing => `${ing.inventoryItemName} (${ing.quantity} ${ing.unit})`) || []
      });
      
      if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
        console.log(`✅ [INVENTORY DEDUCTION] Found menu item with ${menuItem.ingredients.length} ingredients:`, menuItem.name)
        
        // Collect each ingredient deduction
        for (const ingredient of menuItem.ingredients) {
          const totalQuantityUsed = ingredient.quantity * orderItem.quantity;
          console.log(`  � [INVENTORY DEDUCTION] Ingredient: ${ingredient.inventoryItemName} needs ${totalQuantityUsed} ${ingredient.unit} (${ingredient.quantity} × ${orderItem.quantity})`)
          
          // Accumulate deduction for this inventory item
          const inventoryItemId = ingredient.inventoryItemId;
          const existing = deductionMap.get(inventoryItemId) || {
            totalDeduction: 0,
            itemName: ingredient.inventoryItemName,
            transactions: []
          };
          
          existing.totalDeduction += totalQuantityUsed;
          existing.transactions.push({
            orderItemName: orderItem.name,
            quantity: orderItem.quantity,
            deduction: totalQuantityUsed
          });
          
          deductionMap.set(inventoryItemId, existing);
          console.log(`  ✅ [INVENTORY DEDUCTION] Accumulated ${existing.totalDeduction} total for ${ingredient.inventoryItemName}`)
        }
        deductionsMade++;
        console.log(`✅ Ingredient-based deduction collected for: ${orderItem.name}`)
      } else {
        // Fallback: Try direct inventory deduction only if no ingredients found
        console.log(`⚠️ [INVENTORY DEDUCTION] No ingredients found, trying direct inventory deduction for: ${orderItem.name}`)
        const directDeduction = await deductInventoryByName(batch, tenantId, orderItem.name, orderItem.quantity);
        
        if (directDeduction) {
          deductionsMade++;
          console.log(`✅ Direct deduction successful for: ${orderItem.name}`)
        } else {
          // Create inventory item automatically if it doesn't exist
          const created = await autoCreateInventoryItem(batch, tenantId, orderItem.name, orderItem.quantity);
          if (created) {
            deductionsMade++;
          }
        }
      }
    }
    
    // Step 2: Apply accumulated deductions to inventory items
    console.log('📊 [INVENTORY DEDUCTION] Applying accumulated deductions...')
    console.log(`📊 [INVENTORY DEDUCTION] Total unique inventory items to update: ${deductionMap.size}`)
    
    // Process all deductions synchronously to avoid batch issues
    for (const [inventoryItemId, deductionData] of Array.from(deductionMap.entries())) {
      console.log(`🎯 [INVENTORY DEDUCTION] Processing inventory item: ${deductionData.itemName}`)
      console.log(`   Total deduction: ${deductionData.totalDeduction}`)
      console.log(`   From transactions:`, deductionData.transactions.map((t: any) => `${t.orderItemName} (${t.deduction})`).join(', '))
      
      await deductInventoryQuantityAccumulated(
        batch,
        tenantId,
        inventoryItemId,
        deductionData.totalDeduction,
        deductionData.itemName,
        deductionData.transactions
      );
    }
    
    if (deductionsMade > 0 || deductionMap.size > 0) {
      console.log(`💾 Committing ${deductionsMade} ingredient-based deductions and ${deductionMap.size} inventory updates...`)
      await batch.commit();
      console.log(`✅ Inventory deduction completed successfully`)
      
      // Log final summary
      console.log('📋 [INVENTORY DEDUCTION] Final Summary:')
      for (const [inventoryItemId, deductionData] of Array.from(deductionMap.entries())) {
        console.log(`   - ${deductionData.itemName}: -${deductionData.totalDeduction}`)
      }
      
      // After deducting inventory, check item availability
      await updateItemAvailability(tenantId);
    } else {
      console.log('⚠️ No inventory deductions were made')
    }
  } catch (error) {
    console.error('❌ Error processing inventory deduction:', error);
    // Don't throw - let the sale complete even if inventory deduction fails
  }
};

/**
 * Deduct inventory by matching item name (fallback method)
 */
const deductInventoryByName = async (
  batch: any,
  tenantId: string,
  itemName: string,
  quantitySold: number
): Promise<boolean> => {
  try {
    console.log(`🔍 [INVENTORY DEDUCTION] Searching for inventory item by name: "${itemName}"`);
    
    // Find inventory item by name (case-insensitive)
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventoryQuery = query(inventoryRef);
    const inventorySnapshot = await getDocs(inventoryQuery);
    
    console.log(`📋 [INVENTORY DEDUCTION] Found ${inventorySnapshot.docs.length} inventory items to search through`);
    
    // List all inventory items for debugging
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - "${data.name}" (Stock: ${data.currentStock})`);
    });
    
    // Find matching inventory item (try exact match first, then flexible matching)
    let matchingItem = inventorySnapshot.docs.find(doc => {
      const data = doc.data();
      const exactMatch = data.name?.toLowerCase() === itemName.toLowerCase();
      if (exactMatch) {
        console.log(`🎯 [INVENTORY DEDUCTION] Found exact match: "${data.name}" for "${itemName}"`);
      }
      return exactMatch;
    });
    
    // If no exact match, try partial matching
    if (!matchingItem) {
      console.log(`🔍 [INVENTORY DEDUCTION] No exact match found, trying partial matching...`);
      matchingItem = inventorySnapshot.docs.find(doc => {
        const data = doc.data();
        const itemNameLower = itemName.toLowerCase();
        const dataNameLower = data.name?.toLowerCase() || '';
        
        // Try various matching strategies
        const partialMatch = dataNameLower.includes(itemNameLower) || 
                           itemNameLower.includes(dataNameLower) ||
                           dataNameLower.replace(/\s+/g, '') === itemNameLower.replace(/\s+/g, '');
        
        if (partialMatch) {
          console.log(`🎯 [INVENTORY DEDUCTION] Found partial match: "${data.name}" for "${itemName}"`);
        }
        return partialMatch;
      });
    }
    
    if (matchingItem) {
      const inventoryData = matchingItem.data();
      const currentStock = inventoryData.currentStock || 0;
      const newStock = Math.max(0, currentStock - quantitySold);
      
      console.log(`📉 [INVENTORY DEDUCTION] Deducting ${quantitySold} from "${inventoryData.name}": ${currentStock} → ${newStock}`);
      
      // Update the inventory item
      const inventoryItemRef = doc(db, `tenants/${tenantId}/inventory`, matchingItem.id);
      batch.update(inventoryItemRef, {
        currentStock: newStock,
        lastUpdated: Timestamp.now(),
        status: newStock === 0 ? 'out' : 
                newStock <= (inventoryData.minStock * 0.25) ? 'critical' : 
                newStock <= inventoryData.minStock ? 'low' : 'good'
      });
      
      // Log the transaction
      const transactionRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
      batch.set(doc(transactionRef), {
        inventoryItemId: matchingItem.id,
        type: 'sale',
        quantityChange: -quantitySold,
        newQuantity: newStock,
        reason: 'POS Sale - Name Match',
        timestamp: Timestamp.now(),
        itemName: itemName,
        matchedItemName: inventoryData.name
      });
      
      console.log(`✅ [INVENTORY DEDUCTION] Successfully prepared batch update for "${itemName}" → "${inventoryData.name}"`);
      return true;
    } else {
      console.log(`❌ [INVENTORY DEDUCTION] No matching inventory item found for: "${itemName}"`);
      console.log(`💡 [INVENTORY DEDUCTION] Available inventory items:`);
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`    - "${data.name}"`);
      });
      
      // Auto-create missing inventory item if enabled
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏗️ [INVENTORY DEDUCTION] Auto-creating inventory item for "${itemName}"`);
        
        try {
          // Create a basic inventory item
          const newInventoryRef = doc(collection(db, `tenants/${tenantId}/inventory`));
          batch.set(newInventoryRef, {
            name: itemName,
            description: `Auto-created for POS item: ${itemName}`,
            sku: `AUTO-${Date.now()}`,
            category: 'Auto-Created',
            currentStock: Math.max(0, 100 - quantitySold), // Start with 100, then deduct
            unit: 'piece',
            costPerUnit: 0,
            price: 0,
            minStock: 5,
            maxStock: 1000,
            supplier: 'Auto-Created',
            locationId: `location_default`,
            status: 'good',
            lastUpdated: Timestamp.now(),
            tenantId: tenantId,
            autoCreated: true
          });
          
          // Log the transaction
          const transactionRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
          batch.set(doc(transactionRef), {
            inventoryItemId: newInventoryRef.id,
            type: 'sale',
            quantityChange: -quantitySold,
            newQuantity: Math.max(0, 100 - quantitySold),
            reason: 'POS Sale - Auto-Created Item',
            timestamp: Timestamp.now(),
            itemName: itemName
          });
          
          console.log(`✅ [INVENTORY DEDUCTION] Auto-created inventory item for "${itemName}"`);
          return true;
        } catch (autoCreateError) {
          console.error(`❌ [INVENTORY DEDUCTION] Failed to auto-create inventory item:`, autoCreateError);
        }
      }
      
      console.log(`💡 [INVENTORY DEDUCTION] Consider creating an inventory item named "${itemName}" or linking this POS item to a menu item with ingredients`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [INVENTORY DEDUCTION] Error deducting inventory for ${itemName}:`, error);
    return false;
  }
};

/**
 * Auto-create inventory item when it doesn't exist
 */
const autoCreateInventoryItem = async (
  batch: any,
  tenantId: string,
  itemName: string,
  quantitySold: number
): Promise<boolean> => {
  try {
    console.log(`🏗️ [INVENTORY DEDUCTION] Auto-creating inventory item for "${itemName}"`);
    
    // Create a basic inventory item
    const newInventoryRef = doc(collection(db, `tenants/${tenantId}/inventory`));
    batch.set(newInventoryRef, {
      name: itemName,
      description: `Auto-created for POS item: ${itemName}`,
      sku: `AUTO-${Date.now()}`,
      category: 'Auto-Created',
      currentStock: Math.max(0, 1000 - quantitySold), // Start with 1000, then deduct
      unit: 'piece',
      costPerUnit: 0,
      price: 0,
      minStock: 5,
      maxStock: 10000,
      supplier: 'Auto-Created',
      locationId: `location_default`,
      status: 'good',
      lastUpdated: Timestamp.now(),
      tenantId: tenantId,
      autoCreated: true
    });
    
    // Log the transaction
    const transactionRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    batch.set(doc(transactionRef), {
      inventoryItemId: newInventoryRef.id,
      type: 'sale',
      quantityChange: -quantitySold,
      newQuantity: Math.max(0, 1000 - quantitySold),
      reason: 'POS Sale - Auto-Created Item',
      timestamp: Timestamp.now(),
      itemName: itemName
    });
    
    console.log(`✅ [INVENTORY DEDUCTION] Auto-created inventory item for "${itemName}" with 1000 starting units`);
    return true;
  } catch (error) {
    console.error(`❌ [INVENTORY DEDUCTION] Failed to auto-create inventory item:`, error);
    return false;
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
    console.log(`🔍 Looking for POS item with ingredients: ${posItemId}`);
    
    // Get the POS item to check if it has ingredients directly
    const posItemDoc = await getDoc(doc(db, `tenants/${tenantId}/posItems`, posItemId));
    
    if (!posItemDoc.exists()) {
      console.log(`❌ POS item not found: ${posItemId}`);
      return null;
    }
    
    const posItemData = posItemDoc.data();
    console.log(`📋 POS item data:`, { 
      name: posItemData.name, 
      category: posItemData.category, 
      hasIngredients: !!posItemData.ingredients,
      ingredientCount: posItemData.ingredients?.length || 0
    });
    
    // Check if POS item has ingredients directly (new format)
    if (posItemData.ingredients && posItemData.ingredients.length > 0) {
      console.log(`✅ Found POS item with ${posItemData.ingredients.length} ingredients stored directly`);
      
      // Convert POS item to MenuItem format for compatibility
      const menuItem: MenuItem = {
        id: posItemId,
        name: posItemData.name,
        description: posItemData.description || '',
        category: posItemData.category || 'Uncategorized',
        price: posItemData.price || 0,
        cost: posItemData.cost || 0,
        ingredients: posItemData.ingredients.map((ing: any) => ({
          inventoryItemId: ing.inventoryItemId,
          inventoryItemName: ing.inventoryItemName || 'Unknown',
          quantity: ing.quantity || 1,
          unit: ing.unit || 'piece',
          cost: 0 // Will be calculated from inventory
        })),
        preparationTime: posItemData.preparationTime || 15,
        calories: 0,
        allergens: [],
        image: posItemData.image || undefined,
        status: 'active' as const,
        isPopular: false,
        displayOrder: 0,
        tenantId: tenantId,
        locationId: `location_default`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      console.log(`✅ Converted POS item to MenuItem format with ingredients:`, 
        menuItem.ingredients.map(ing => `${ing.inventoryItemName} (${ing.quantity} ${ing.unit})`));
      
      return menuItem;
    }
    
    // Fallback: Try to find separate menu item (old format)
    const menuItemId = posItemData.menuItemId;
    
    if (!menuItemId) {
      console.log(`⚠️ No ingredients in POS item and no menuItemId found, trying to find by name and category`);
      
      // Try to find by name and category in menuItems collection
      const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
      const menuQuery = query(
        menuItemsRef,
        where('name', '==', posItemData.name),
        where('category', '==', posItemData.category)
      );
      
      const menuSnapshot = await getDocs(menuQuery);
      if (!menuSnapshot.empty) {
        const menuDoc = menuSnapshot.docs[0];
        const menuItem = { id: menuDoc.id, ...menuDoc.data() } as MenuItem;
        console.log(`✅ Found menu item by name/category match:`, { 
          id: menuItem.id, 
          name: menuItem.name, 
          ingredientCount: menuItem.ingredients?.length || 0 
        });
        return menuItem;
      }
      
      console.log(`❌ No menu item found with name: ${posItemData.name}, category: ${posItemData.category}`);
      return null;
    }
    
    // Get menu item by ID (old format)
    const menuItemDoc = await getDoc(doc(db, `tenants/${tenantId}/menuItems`, menuItemId));
    
    if (!menuItemDoc.exists()) {
      console.log(`❌ Menu item not found with ID: ${menuItemId}`);
      return null;
    }

    const menuItem = { id: menuItemDoc.id, ...menuItemDoc.data() } as MenuItem;
    console.log(`✅ Found menu item by ID:`, { 
      id: menuItem.id, 
      name: menuItem.name, 
      ingredientCount: menuItem.ingredients?.length || 0 
    });
    
    return menuItem;
  } catch (error) {
    console.error('Error getting menu item by POS item ID:', error);
    return null;
  }
};

/**
 * Deduct quantity from inventory item (old single-use version)
 */
const deductInventoryQuantity = async (
  batch: any,
  tenantId: string,
  inventoryItemId: string,
  quantityToDeduct: number
): Promise<void> => {
  try {
    console.log(`  🔍 [INVENTORY DEDUCTION] Attempting to deduct ${quantityToDeduct} from inventory item: ${inventoryItemId}`)
    
    const inventoryItemRef = doc(db, `tenants/${tenantId}/inventory`, inventoryItemId);
    const inventoryItemDoc = await getDoc(inventoryItemRef);
    
    if (!inventoryItemDoc.exists()) {
      console.log(`  ❌ [INVENTORY DEDUCTION] Inventory item not found: ${inventoryItemId}`)
      return;
    }
    
    const inventoryItem = inventoryItemDoc.data() as InventoryItem;
    const currentStock = inventoryItem.currentStock || 0;
    const newQuantity = Math.max(0, currentStock - quantityToDeduct);
    
    console.log(`  📊 [INVENTORY DEDUCTION] ${inventoryItem.name}: ${currentStock} → ${newQuantity} (deducted: ${quantityToDeduct})`)
    
    batch.update(inventoryItemRef, {
      currentStock: newQuantity,
      updatedAt: Timestamp.now()
    });
    
    // Log the transaction
    const transactionRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    batch.set(doc(transactionRef), {
      inventoryItemId,
      itemName: inventoryItem.name,
      type: 'sale',
      quantityChange: -quantityToDeduct,
      previousStock: currentStock,
      newQuantity,
      reason: 'POS Sale - Ingredient Deduction',
      createdAt: Timestamp.now(),
      tenantId
    });
    
    console.log(`  ✅ [INVENTORY DEDUCTION] Successfully queued deduction for: ${inventoryItem.name}`)
  } catch (error) {
    console.error('  ❌ [INVENTORY DEDUCTION] Error deducting inventory quantity:', error);
    throw error;
  }
};

/**
 * Deduct accumulated quantity from inventory item (fixes batch update issue)
 */
const deductInventoryQuantityAccumulated = async (
  batch: any,
  tenantId: string,
  inventoryItemId: string,
  totalQuantityToDeduct: number,
  itemName: string,
  transactions: Array<{
    orderItemName: string;
    quantity: number;
    deduction: number;
  }>
): Promise<void> => {
  try {
    console.log(`  🎯 [INVENTORY DEDUCTION] Applying accumulated deduction of ${totalQuantityToDeduct} to: ${itemName}`)
    
    const inventoryItemRef = doc(db, `tenants/${tenantId}/inventory`, inventoryItemId);
    const inventoryItemDoc = await getDoc(inventoryItemRef);
    
    if (!inventoryItemDoc.exists()) {
      console.log(`  ❌ [INVENTORY DEDUCTION] Inventory item not found: ${inventoryItemId}`)
      return;
    }
    
    const inventoryItem = inventoryItemDoc.data() as InventoryItem;
    const currentStock = inventoryItem.currentStock || 0;
    const newQuantity = Math.max(0, currentStock - totalQuantityToDeduct);
    
    console.log(`  📊 [INVENTORY DEDUCTION] ${inventoryItem.name}: ${currentStock} → ${newQuantity} (accumulated deduction: ${totalQuantityToDeduct})`)
    
    batch.update(inventoryItemRef, {
      currentStock: newQuantity,
      updatedAt: Timestamp.now()
    });
    
    // Log a single consolidated transaction
    const transactionRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    batch.set(doc(transactionRef), {
      inventoryItemId,
      itemName: inventoryItem.name,
      type: 'sale',
      quantityChange: -totalQuantityToDeduct,
      previousStock: currentStock,
      newQuantity,
      reason: `POS Sale - Consolidated deduction from ${transactions.length} items: ${transactions.map(t => `${t.orderItemName}(${t.deduction})`).join(', ')}`,
      createdAt: Timestamp.now(),
      tenantId,
      metadata: {
        consolidatedDeduction: true,
        sourceTransactions: transactions
      }
    });

    // 🔥 CRITICAL FIX: Also log to inventoryMovements for the Recent Movements tab
    await logInventoryMovement({
      tenantId,
      itemId: inventoryItemId,
      itemName: inventoryItem.name,
      movementType: 'subtract',
      quantity: -totalQuantityToDeduct,
      previousStock: currentStock,
      newStock: newQuantity,
      unit: inventoryItem.unit || 'piece',
      locationId: 'default', // TODO: Use actual branch location ID
      reason: `POS Sale - ${transactions.map(t => t.orderItemName).join(', ')}`,
      userId: 'system', // Will be replaced with actual user in a future update
      userName: 'POS System'
    });
    
    console.log(`  ✅ [INVENTORY DEDUCTION] Successfully queued accumulated deduction for: ${inventoryItem.name}`)
  } catch (error) {
    console.error('  ❌ [INVENTORY DEDUCTION] Error deducting accumulated inventory quantity:', error);
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
 * Debug function to check inventory deduction setup
 */
export const debugInventoryDeductionSetup = async (tenantId: string): Promise<void> => {
  try {
    console.log('🔍 Debugging inventory deduction setup...');
    
    // Check POS items
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    console.log(`📋 Found ${posSnapshot.docs.length} POS items`);
    
    // Check menu items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    console.log(`🍽️ Found ${menuSnapshot.docs.length} menu items`);
    
    // Check inventory items
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    console.log(`📦 Found ${inventorySnapshot.docs.length} inventory items`);
    
    // Check linking between POS and menu items
    let linkedCount = 0;
    let unlinkedCount = 0;
    
    for (const posDoc of posSnapshot.docs) {
      const posData = posDoc.data();
      if (posData.menuItemId) {
        linkedCount++;
      } else {
        unlinkedCount++;
        console.log(`⚠️ Unlinked POS item: ${posData.name}`);
      }
    }
    
    console.log(`🔗 POS items linked to menu: ${linkedCount}/${posSnapshot.docs.length}`);
    console.log(`❌ Unlinked POS items: ${unlinkedCount}`);
    
    // Check menu items with ingredients
    let menuItemsWithIngredients = 0;
    let menuItemsWithoutIngredients = 0;
    
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      if (menuData.ingredients && menuData.ingredients.length > 0) {
        menuItemsWithIngredients++;
        console.log(`✅ Menu item "${menuData.name}" has ${menuData.ingredients.length} ingredients`);
      } else {
        menuItemsWithoutIngredients++;
        console.log(`⚠️ Menu item "${menuData.name}" has no ingredients`);
      }
    }
    
    console.log(`🧾 Menu items with ingredients: ${menuItemsWithIngredients}/${menuSnapshot.docs.length}`);
    console.log(`❌ Menu items without ingredients: ${menuItemsWithoutIngredients}`);
    
    console.log('🔍 Inventory deduction setup debug complete');
  } catch (error) {
    console.error('❌ Error debugging inventory deduction setup:', error);
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
