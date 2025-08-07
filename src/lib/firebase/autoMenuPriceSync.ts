import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Automatically update ALL menu item costs when inventory costs change
 * This runs after purchase orders update inventory costs
 */
export const updateAllMenuItemCosts = async (tenantId: string, locationId: string) => {
  try {
    console.log('🔄 Auto-updating all menu item costs...');
    
    // Get all inventory items with current costs
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    const inventoryMap = new Map();
    
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const cost = (data as any).cost || (data as any).price || (data as any).costPerUnit || 0;
      inventoryMap.set(doc.id, {
        cost: cost,
        name: data.name
      });
      // Also map by name for fallback matching
      inventoryMap.set(data.name.toLowerCase(), {
        cost: cost,
        name: data.name,
        id: doc.id
      });
    });
    
    console.log('📦 Loaded inventory items:', inventoryMap.size);
    
    // Get all menu items
    const menuRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuSnapshot = await getDocs(menuRef);
    
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    menuSnapshot.docs.forEach(menuDoc => {
      const menuData = menuDoc.data();
      console.log(`🔍 Processing menu item: ${menuData.name}`);
      
      if (!menuData.ingredients || menuData.ingredients.length === 0) {
        console.log(`  ❌ No ingredients found`);
        return;
      }
      
      let hasUpdates = false;
      let totalCost = 0;
      
      // Update ingredient costs - be more aggressive about finding matches
      const updatedIngredients = menuData.ingredients.map((ingredient: any) => {
        console.log(`  🔍 Processing ingredient: ${ingredient.inventoryItemName || ingredient.name}`);
        
        // Try multiple ways to find the inventory item
        let inventoryItem = null;
        
        // Method 1: Direct ID match
        if (ingredient.inventoryItemId) {
          inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
          console.log(`    Method 1 (ID): ${inventoryItem ? '✅ Found' : '❌ Not found'}`);
        }
        
        // Method 2: Name match
        if (!inventoryItem && ingredient.inventoryItemName) {
          inventoryItem = inventoryMap.get(ingredient.inventoryItemName.toLowerCase());
          console.log(`    Method 2 (Name): ${inventoryItem ? '✅ Found' : '❌ Not found'}`);
        }
        
        // Method 3: Legacy name field
        if (!inventoryItem && ingredient.name) {
          inventoryItem = inventoryMap.get(ingredient.name.toLowerCase());
          console.log(`    Method 3 (Legacy): ${inventoryItem ? '✅ Found' : '❌ Not found'}`);
        }
        
        if (inventoryItem) {
          const newCost = inventoryItem.cost * (ingredient.quantity || 1);
          totalCost += newCost;
          
          console.log(`    Current cost: ${ingredient.cost}, New cost: ${newCost}`);
          
          // FORCE UPDATE - always update even if costs seem the same
          hasUpdates = true;
          return {
            ...ingredient,
            cost: newCost,
            costPerUnit: inventoryItem.cost,
            inventoryItemId: inventoryItem.id || ingredient.inventoryItemId,
            inventoryItemName: inventoryItem.name
          };
        } else {
          console.log(`    ❌ No inventory match found`);
          totalCost += ingredient.cost || 0;
          return ingredient;
        }
      });
      
      // FORCE UPDATE all menu items regardless
      if (menuData.ingredients && menuData.ingredients.length > 0) {
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        batch.update(doc(db, 'tenants', tenantId, 'menuItems', menuDoc.id), {
          ingredients: updatedIngredients,
          cost: totalCost,
          updatedAt: new Date()
        });
        updatedCount++;
        console.log(`📋 Updated ${menuData.name} - New cost: ₱${totalCost.toFixed(2)}`);
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updatedCount} menu items with new costs`);
    } else {
      console.log('ℹ️ No menu items found to update');
    }
    
    return updatedCount;
  } catch (error) {
    console.error('❌ Error updating menu item costs:', error);
    throw error;
  }
};

/**
 * Call this function whenever inventory costs change (after purchase orders)
 */
export const triggerMenuPriceSync = async (tenantId: string, locationId: string) => {
  console.log('🚀 Triggering automatic menu price sync...');
  return await updateAllMenuItemCosts(tenantId, locationId);
};
