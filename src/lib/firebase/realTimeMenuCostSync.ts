import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem } from './inventory';
import { MenuItem } from './menuBuilder';

/**
 * IMMEDIATE FIX: Force sync all menu costs with current inventory prices
 */
export const forceSyncAllMenuCosts = async (tenantId: string, locationId: string) => {
  console.log('🔧 FORCE SYNC: Updating ALL menu costs with current inventory prices...');
  
  try {
    // Get ALL inventory items for this location
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventoryQuery = query(inventoryRef, where('locationId', '==', locationId));
    const inventorySnapshot = await getDocs(inventoryQuery);
    
    console.log(`📦 Found ${inventorySnapshot.docs.length} inventory items`);
    
    // Build inventory map
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, {
        costPerUnit: data.costPerUnit || 0,
        name: data.name,
        unit: data.unit || 'unit'
      });
      console.log(`   📦 ${data.name}: ₱${data.costPerUnit || 0}/${data.unit || 'unit'} (ID: ${doc.id})`);
    });
    
    // Get ALL menu items for this location
    const menuRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuQuery = query(menuRef, where('locationId', '==', locationId));
    const menuSnapshot = await getDocs(menuQuery);
    
    console.log(`📋 Found ${menuSnapshot.docs.length} menu items`);
    
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    // Process each menu item
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      const menuName = menuData.name;
      
      console.log(`\n🔍 "${menuName}"`);
      
      if (!menuData.ingredients || menuData.ingredients.length === 0) {
        console.log(`   ⏭️  No ingredients - skipping`);
        continue;
      }
      
      console.log(`   📋 ${menuData.ingredients.length} ingredients`);
      
      let hasUpdates = false;
      let newTotalCost = 0;
      
      // Update each ingredient
      const updatedIngredients = menuData.ingredients.map((ingredient: any, idx: number) => {
        const ingredientName = ingredient.inventoryItemName || ingredient.name || 'Unknown';
        const inventoryId = ingredient.inventoryItemId || ingredient.id; // Check both fields
        const quantity = ingredient.quantity || 0;
        
        console.log(`     ${idx + 1}. ${ingredientName} (ID: ${inventoryId}, Qty: ${quantity})`);
        
        if (!inventoryId) {
          console.log(`        ❌ No inventory ID`);
          newTotalCost += ingredient.cost || 0;
          return ingredient;
        }
        
        const currentInventory = inventoryMap.get(inventoryId);
        
        if (currentInventory) {
          const newUnitCost = currentInventory.costPerUnit;
          const newIngredientCost = newUnitCost * quantity;
          const oldIngredientCost = ingredient.cost || 0;
          
          console.log(`        OLD cost: ₱${oldIngredientCost.toFixed(4)} (₱${(ingredient.costPerUnit || 0).toFixed(4)}/unit)`);
          console.log(`        NEW cost: ₱${newIngredientCost.toFixed(4)} (₱${newUnitCost.toFixed(4)}/unit)`);
          
          if (Math.abs(oldIngredientCost - newIngredientCost) > 0.001) {
            console.log(`        🔥 COST CHANGED!`);
            hasUpdates = true;
          }
          
          newTotalCost += newIngredientCost;
          
          return {
            ...ingredient,
            cost: newIngredientCost,
            costPerUnit: newUnitCost,
            inventoryItemName: currentInventory.name,
            unit: currentInventory.unit
          };
        } else {
          console.log(`        ❌ Inventory item not found`);
          newTotalCost += ingredient.cost || 0;
          return ingredient;
        }
      });
      
      const oldMenuCost = menuData.cost || 0;
      console.log(`   💰 Total: ₱${oldMenuCost.toFixed(2)} → ₱${newTotalCost.toFixed(2)}`);
      
      if (hasUpdates || Math.abs(oldMenuCost - newTotalCost) > 0.001) {
        console.log(`   ✅ UPDATING MENU ITEM`);
        
        batch.update(doc(db, 'tenants', tenantId, 'menuItems', menuDoc.id), {
          ingredients: updatedIngredients,
          cost: newTotalCost,
          lastCostUpdate: Timestamp.now(),
          lastCostUpdateReason: 'Force sync all menu costs'
        });
        
        updatedCount++;
      } else {
        console.log(`   ⏭️  No changes needed`);
      }
    }
    
    // Commit all updates
    if (updatedCount > 0) {
      console.log(`\n🔥 COMMITTING ${updatedCount} updates...`);
      await batch.commit();
      console.log(`✅ SUCCESS: Updated ${updatedCount} menu items!`);
      console.log('\n🎉 DONE: All menu costs are now synchronized with current inventory prices!');
      
      // Trigger UI update
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('menuCostsUpdated', {
          detail: { 
            updatedCount,
            locationId,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(event);
      }
      
      return updatedCount;
    } else {
      console.log(`\n⚠️  No updates needed - all menu costs are already synchronized`);
      return 0;
    }
    
  } catch (error) {
    console.error('❌ Error in force sync:', error);
    throw error;
  }
};

/**
 * Real-Time Menu Cost Synchronization Service
 * Automatically updates menu item costs when inventory prices change
 */

interface InventoryPriceMap {
  [inventoryItemId: string]: {
    costPerUnit: number;
    name: string;
    unit: string;
  };
}

interface MenuItemCostUpdate {
  menuItemId: string;
  oldCost: number;
  newCost: number;
  affectedIngredients: string[];
}

class RealTimeMenuCostSync {
  private tenantId: string;
  private locationId: string;
  private inventoryListener: (() => void) | null = null;
  private currentInventoryPrices: InventoryPriceMap = {};
  private menuItemsCache: MenuItem[] = [];
  private isActive = false;

  constructor(tenantId: string, locationId: string) {
    this.tenantId = tenantId;
    this.locationId = locationId;
  }

  /**
   * Start real-time synchronization
   */
  public async startSync(): Promise<void> {
    if (this.isActive) {
      console.log('🔄 Real-time menu cost sync already active');
      return;
    }

    console.log('🚀 Starting real-time menu cost synchronization...');
    this.isActive = true;
    
    // 🔥 IMMEDIATE FIX: Force sync all menu costs first
    console.log('🚀 [IMMEDIATE FIX] Running force sync of all menu costs...');
    try {
      const updatedCount = await forceSyncAllMenuCosts(this.tenantId, this.locationId);
      console.log(`✅ [IMMEDIATE FIX] Force sync completed: ${updatedCount} menu items updated`);
    } catch (error) {
      console.error('❌ [IMMEDIATE FIX] Force sync failed:', error);
    }
    
    this.setupInventoryListener();
    this.loadMenuItems();
    
    // Make force sync available globally
    if (typeof window !== 'undefined') {
      (window as any).forceSyncMenuCosts = () => forceSyncAllMenuCosts(this.tenantId, this.locationId);
      console.log('🌍 Global function available: forceSyncMenuCosts()');
    }
  }

  /**
   * Stop real-time synchronization
   */
  public stopSync(): void {
    if (this.inventoryListener) {
      this.inventoryListener();
      this.inventoryListener = null;
    }
    this.isActive = false;
    console.log('⏹️ Real-time menu cost sync stopped');
  }

  /**
   * Setup real-time listener for inventory price changes
   */
  private setupInventoryListener(): void {
    const inventoryRef = collection(db, `tenants/${this.tenantId}/inventory`);
    const inventoryQuery = query(
      inventoryRef,
      where('locationId', '==', this.locationId)
    );

    this.inventoryListener = onSnapshot(inventoryQuery, (snapshot) => {
      console.log('📦 Inventory price change detected, processing updates...');
      
      const previousPrices = { ...this.currentInventoryPrices };
      const newPrices: InventoryPriceMap = {};

      // Build new price map
      snapshot.docs.forEach(doc => {
        const data = doc.data() as InventoryItem;
        newPrices[doc.id] = {
          costPerUnit: data.costPerUnit || 0,
          name: data.name,
          unit: data.unit
        };
      });

      // Check for price changes
      const changedItems = this.detectPriceChanges(previousPrices, newPrices);
      
      if (changedItems.length > 0) {
        console.log(`💰 Detected ${changedItems.length} inventory price changes`);
        this.currentInventoryPrices = newPrices;
        this.updateAffectedMenuItems(changedItems);
      } else {
        // Still update the cache for new items
        this.currentInventoryPrices = newPrices;
      }
    }, (error) => {
      console.error('❌ Error in inventory listener:', error);
    });
  }

  /**
   * Load menu items for this location
   */
  private async loadMenuItems(): Promise<void> {
    try {
      const menuItemsRef = collection(db, `tenants/${this.tenantId}/menuItems`);
      const menuQuery = query(
        menuItemsRef,
        where('locationId', '==', this.locationId)
      );

      const snapshot = await getDocs(menuQuery);
      this.menuItemsCache = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];

      console.log(`📋 Loaded ${this.menuItemsCache.length} menu items for cost sync`);
      
      // Debug: Log each menu item structure
      console.log('🔍 MENU ITEMS ANALYSIS:');
      this.menuItemsCache.forEach((item, index) => {
        console.log(`📋 Menu Item ${index + 1}: "${item.name}"`);
        console.log(`   - Has ingredients: ${!!item.ingredients}`);
        console.log(`   - Ingredients count: ${item.ingredients?.length || 0}`);
        console.log(`   - Current cost: ₱${item.cost || 0}`);
        
        if (!item.ingredients || item.ingredients.length === 0) {
          console.log(`   ⚠️  WARNING: "${item.name}" has NO INGREDIENTS - automation will skip this item`);
          console.log(`   💡 SOLUTION: Add ingredients in MenuBuilder > Edit "${item.name}" > Add Ingredient`);
        } else {
          console.log(`   ✅ Has ${item.ingredients.length} ingredients:`);
          item.ingredients.forEach((ing, i) => {
            console.log(`      ${i + 1}. ${ing.inventoryItemName} (ID: ${ing.inventoryItemId}) - ${ing.quantity} ${ing.unit}`);
          });
        }
        console.log(''); // Empty line for readability
      });
      
      const itemsWithoutIngredients = this.menuItemsCache.filter(item => !item.ingredients || item.ingredients.length === 0);
      
      if (itemsWithoutIngredients.length > 0) {
        console.log('🚨 CRITICAL ISSUE FOUND:');
        console.log(`📊 ${itemsWithoutIngredients.length} out of ${this.menuItemsCache.length} menu items have NO INGREDIENTS`);
        console.log('🔧 SOLUTION: Add ingredients to these menu items:');
        itemsWithoutIngredients.forEach(item => {
          console.log(`   - "${item.name}"`);
        });
        console.log('');
        console.log('📋 HOW TO FIX:');
        console.log('1. Go to MenuBuilder');
        console.log('2. Click on menu item to edit');
        console.log('3. Scroll to Ingredients section');
        console.log('4. Click "Add Ingredient" button');
        console.log('5. Select inventory item and set quantity');
        console.log('6. Save the menu item');
        console.log('');
      } else {
        console.log('✅ All menu items have ingredients - automation ready!');
      }
    } catch (error) {
      console.error('❌ Error loading menu items:', error);
    }
  }

  /**
   * Detect which inventory items had price changes
   */
  private detectPriceChanges(
    previousPrices: InventoryPriceMap, 
    newPrices: InventoryPriceMap
  ): string[] {
    const changedItems: string[] = [];

    Object.keys(newPrices).forEach(itemId => {
      const oldPrice = previousPrices[itemId]?.costPerUnit || 0;
      const newPrice = newPrices[itemId]?.costPerUnit || 0;

      // Check if price changed (with small tolerance for floating point)
      if (Math.abs(oldPrice - newPrice) > 0.001) {
        changedItems.push(itemId);
        console.log(`📈 Price change: ${newPrices[itemId].name} ₱${oldPrice.toFixed(2)} → ₱${newPrice.toFixed(2)}`);
      }
    });

    return changedItems;
  }

  /**
   * Update menu items affected by inventory price changes
   */
  private async updateAffectedMenuItems(changedInventoryIds: string[]): Promise<void> {
    const updates: MenuItemCostUpdate[] = [];

    console.log(`🔍 Analyzing ${this.menuItemsCache.length} menu items for cost updates`);
    console.log(`📋 Changed inventory IDs:`, changedInventoryIds);

    // Find menu items that use the changed ingredients
    for (const menuItem of this.menuItemsCache) {
      console.log(`🔍 Checking menu item: ${menuItem.name}`);
      console.log(`📋 Has ingredients:`, !!menuItem.ingredients);
      console.log(`📋 Ingredients count:`, menuItem.ingredients?.length || 0);
      
      if (menuItem.ingredients?.length > 0) {
        console.log(`📋 Ingredients:`, menuItem.ingredients.map(ing => ({
          name: ing.inventoryItemName,
          id: ing.inventoryItemId,
          quantity: ing.quantity
        })));
      }

      if (!menuItem.ingredients || menuItem.ingredients.length === 0) {
        console.log(`⏭️ Skipping ${menuItem.name}: No ingredients defined`);
        continue;
      }

      const affectedIngredients = menuItem.ingredients.filter(ingredient => {
        const ingredientId = ingredient.inventoryItemId;
        return changedInventoryIds.includes(ingredientId);
      });

      console.log(`🎯 ${menuItem.name}: Found ${affectedIngredients.length} affected ingredients`);

      if (affectedIngredients.length === 0) {
        console.log(`⏭️ Skipping ${menuItem.name}: No affected ingredients`);
        continue;
      }

      // Calculate new cost
      const oldCost = menuItem.cost || 0;
      const newCost = this.calculateMenuItemCost(menuItem);

      console.log(`💰 ${menuItem.name}: Cost ₱${oldCost.toFixed(2)} → ₱${newCost.toFixed(2)}`);

      if (Math.abs(oldCost - newCost) > 0.001) {
        console.log(`✅ ${menuItem.name}: Cost changed, adding to update queue`);
        updates.push({
          menuItemId: menuItem.id!,
          oldCost,
          newCost,
          affectedIngredients: affectedIngredients.map(ing => ing.inventoryItemName || 'Unknown')
        });
      } else {
        console.log(`⏭️ ${menuItem.name}: Cost unchanged, skipping`);
      }
    }

    console.log(`📊 FINAL RESULT: ${updates.length} menu items need cost updates`);

    if (updates.length > 0) {
      console.log(`🔄 Updating ${updates.length} menu items with new costs`);
      await this.applyMenuItemUpdates(updates);
    } else {
      console.log(`⏸️ No menu items need cost updates`);
    }
  }

  /**
   * Calculate current cost of a menu item using latest inventory prices
   */
  private calculateMenuItemCost(menuItem: MenuItem): number {
    let totalCost = 0;

    if (!menuItem.ingredients) return 0;

    for (const ingredient of menuItem.ingredients) {
      const ingredientId = ingredient.inventoryItemId;
      const inventoryItem = this.currentInventoryPrices[ingredientId];

      if (inventoryItem) {
        const cost = inventoryItem.costPerUnit * (ingredient.quantity || 0);
        totalCost += cost;
      } else {
        // Use existing cost if inventory item not found
        totalCost += ingredient.cost || 0;
      }
    }

    return totalCost;
  }

  /**
   * Apply menu item cost updates to Firebase
   */
  private async applyMenuItemUpdates(updates: MenuItemCostUpdate[]): Promise<void> {
    try {
      const batchPromises = updates.map(async (update) => {
        const menuItemRef = doc(db, `tenants/${this.tenantId}/menuItems`, update.menuItemId);
        
        // Find the menu item to update its ingredients with new costs
        const menuItem = this.menuItemsCache.find(item => item.id === update.menuItemId);
        if (!menuItem) return;

        // Update ingredient costs
        const updatedIngredients = menuItem.ingredients?.map(ingredient => {
          const ingredientId = ingredient.inventoryItemId;
          const inventoryItem = this.currentInventoryPrices[ingredientId];

          if (inventoryItem) {
            return {
              ...ingredient,
              cost: inventoryItem.costPerUnit * (ingredient.quantity || 0)
            };
          }

          return ingredient;
        }) || [];

        await updateDoc(menuItemRef, {
          cost: update.newCost,
          ingredients: updatedIngredients,
          updatedAt: Timestamp.now(),
          lastCostSync: {
            previousCost: update.oldCost,
            newCost: update.newCost,
            syncedAt: Timestamp.now(),
            affectedIngredients: update.affectedIngredients,
            syncType: 'automatic-realtime'
          }
        });

        console.log(`✅ Updated ${menuItem.name}: ₱${update.oldCost.toFixed(2)} → ₱${update.newCost.toFixed(2)}`);
      });

      await Promise.all(batchPromises);
      
      // Update cache with new costs
      updates.forEach(update => {
        const menuItem = this.menuItemsCache.find(item => item.id === update.menuItemId);
        if (menuItem) {
          menuItem.cost = update.newCost;
        }
      });

      // Emit event for UI components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('menuCostsUpdated', {
          detail: { updates, timestamp: new Date() }
        }));
      }

    } catch (error) {
      console.error('❌ Error applying menu item updates:', error);
    }
  }

  /**
   * Force refresh all menu item costs
   */
  public async forceRefreshAllCosts(): Promise<void> {
    console.log('🔄 Force refreshing all menu item costs...');
    
    const updates: MenuItemCostUpdate[] = [];

    for (const menuItem of this.menuItemsCache) {
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) continue;

      const oldCost = menuItem.cost || 0;
      const newCost = this.calculateMenuItemCost(menuItem);

      if (Math.abs(oldCost - newCost) > 0.001) {
        updates.push({
          menuItemId: menuItem.id!,
          oldCost,
          newCost,
          affectedIngredients: menuItem.ingredients.map(ing => ing.inventoryItemName || 'Unknown')
        });
      }
    }

    if (updates.length > 0) {
      await this.applyMenuItemUpdates(updates);
    }

    console.log(`✅ Force refresh completed: ${updates.length} menu items updated`);
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): { active: boolean; menuItemsCount: number; inventoryItemsCount: number } {
    return {
      active: this.isActive,
      menuItemsCount: this.menuItemsCache.length,
      inventoryItemsCount: Object.keys(this.currentInventoryPrices).length
    };
  }
}

// Global instance manager
const syncInstances = new Map<string, RealTimeMenuCostSync>();

/**
 * Get or create real-time sync instance for a location
 */
export const getRealTimeMenuCostSync = (tenantId: string, locationId: string): RealTimeMenuCostSync => {
  const key = `${tenantId}:${locationId}`;
  
  if (!syncInstances.has(key)) {
    syncInstances.set(key, new RealTimeMenuCostSync(tenantId, locationId));
  }

  return syncInstances.get(key)!;
};

/**
 * Start real-time menu cost synchronization for a location
 */
export const startRealTimeMenuCostSync = async (tenantId: string, locationId: string): Promise<void> => {
  const syncInstance = getRealTimeMenuCostSync(tenantId, locationId);
  await syncInstance.startSync();
};

/**
 * Stop real-time menu cost synchronization for a location
 */
export const stopRealTimeMenuCostSync = (tenantId: string, locationId: string): void => {
  const key = `${tenantId}:${locationId}`;
  const syncInstance = syncInstances.get(key);
  
  if (syncInstance) {
    syncInstance.stopSync();
    syncInstances.delete(key);
  }
};

/**
 * Force refresh all menu costs for a location
 */
export const forceRefreshMenuCosts = async (tenantId: string, locationId: string): Promise<void> => {
  const syncInstance = getRealTimeMenuCostSync(tenantId, locationId);
  await syncInstance.forceRefreshAllCosts();
};

/**
 * Force immediate sync of all menu costs for a tenant/location
 */
export const forceMenuCostSync = async (tenantId: string, locationId: string): Promise<number> => {
  return await forceSyncAllMenuCosts(tenantId, locationId);
};

export default RealTimeMenuCostSync;
