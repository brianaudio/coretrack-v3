import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * CRITICAL: Update menu item ingredient unit prices after purchase order delivery
 * This must run synchronously after inventory costPerUnit changes
 */
export const updateAllMenuItemCosts = async (tenantId: string, locationId: string) => {
  try {
    console.log(`🚨 CRITICAL: Auto-updating menu item costs for location: ${locationId}...`);
    
    // 1. Get ALL inventory items for this location with current costs
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventoryQuery = query(inventoryRef, where('locationId', '==', locationId));
    const inventorySnapshot = await getDocs(inventoryQuery);
    
    console.log(`📦 STEP 1: Found ${inventorySnapshot.docs.length} inventory items`);
    
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const costPerUnit = data.costPerUnit || 0;
      inventoryMap.set(doc.id, {
        costPerUnit,
        name: data.name,
        unit: data.unit || 'unit'
      });
      console.log(`   📦 ${data.name}: ₱${costPerUnit}/${data.unit || 'unit'} (ID: ${doc.id})`);
    });
    
    // 2. Get ALL menu items for this location
    const menuRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuQuery = query(menuRef, where('locationId', '==', locationId));
    const menuSnapshot = await getDocs(menuQuery);
    
    console.log(`📋 STEP 2: Found ${menuSnapshot.docs.length} menu items for location`);
    
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    // 3. Process each menu item
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      const menuName = menuData.name;
      
      console.log(`\n🔍 PROCESSING: "${menuName}"`);
      
      if (!menuData.ingredients || menuData.ingredients.length === 0) {
        console.log(`   ❌ SKIP: "${menuName}" has no ingredients - menu cost sync requires ingredients to be added in Menu Builder`);
        console.log(`   💡 FIX: Edit this menu item in Menu Builder and add inventory ingredients`);
        continue;
      }
      
      console.log(`   📋 Has ${menuData.ingredients.length} ingredients`);
      
      let hasUpdates = false;
      let newTotalCost = 0;
      
      // 4. Update each ingredient's cost
      const updatedIngredients = menuData.ingredients.map((ingredient: any, idx: number) => {
        console.log(`     ${idx + 1}. RAW INGREDIENT DATA:`, JSON.stringify(ingredient, null, 2));
        
        const ingredientName = ingredient.inventoryItemName || ingredient.name || 'Unknown';
        const inventoryId = ingredient.inventoryItemId || ingredient.id; // Check both field names!
        const quantity = ingredient.quantity || 0;
        
        console.log(`     ${idx + 1}. "${ingredientName}" (ID: ${inventoryId}, Qty: ${quantity})`);
        console.log(`        Available fields: ${Object.keys(ingredient).join(', ')}`);
        
        // Validate ingredient has proper ID
        if (!inventoryId) {
          console.log(`        ❌ MISSING inventoryItemId - This ingredient cannot be synced!`);
          console.log(`        💡 FIX: Edit "${menuName}" in Menu Builder and select proper inventory items`);
          newTotalCost += ingredient.cost || 0;
          return ingredient;
        }
        
        // Find current inventory data
        const currentInventory = inventoryMap.get(inventoryId);
        
        if (currentInventory) {
          const newUnitCost = currentInventory.costPerUnit;
          const newIngredientCost = newUnitCost * quantity;
          const oldIngredientCost = ingredient.cost || 0;
          
          console.log(`        OLD unit cost: ₱${(ingredient.costPerUnit || 0).toFixed(4)}`);
          console.log(`        NEW unit cost: ₱${newUnitCost.toFixed(4)}`);
          console.log(`        OLD total cost: ₱${oldIngredientCost.toFixed(4)}`);
          console.log(`        NEW total cost: ₱${newIngredientCost.toFixed(4)}`);
          
          // Check if there's a meaningful change
          if (Math.abs(oldIngredientCost - newIngredientCost) > 0.001 || 
              Math.abs((ingredient.costPerUnit || 0) - newUnitCost) > 0.001) {
            console.log(`        🔥 COST CHANGED - UPDATING!`);
            hasUpdates = true;
          }
          
          newTotalCost += newIngredientCost;
          
          return {
            ...ingredient,
            cost: newIngredientCost,
            costPerUnit: newUnitCost,
            // Ensure we have the latest inventory reference
            inventoryItemName: currentInventory.name,
            unit: currentInventory.unit
          };
        } else {
          console.log(`        ❌ NO INVENTORY MATCH for ID: ${inventoryId}`);
          newTotalCost += ingredient.cost || 0;
          return ingredient;
        }
      });
      
      const oldMenuCost = menuData.cost || 0;
      console.log(`   💰 Menu cost: ₱${oldMenuCost.toFixed(2)} → ₱${newTotalCost.toFixed(2)}`);
      
      if (hasUpdates || Math.abs(oldMenuCost - newTotalCost) > 0.001) {
        console.log(`   ✅ UPDATING MENU ITEM: "${menuName}"`);
        
        batch.update(doc(db, 'tenants', tenantId, 'menuItems', menuDoc.id), {
          ingredients: updatedIngredients,
          cost: newTotalCost,
          lastCostUpdate: Timestamp.now(),
          lastCostUpdateReason: 'Purchase order delivery - inventory cost change'
        });
        
        updatedCount++;
      } else {
        console.log(`   ⏭️ NO CHANGES needed for "${menuName}"`);
      }
    }
    
    // 5. Commit all updates
    if (updatedCount > 0) {
      console.log(`\n🔥 COMMITTING ${updatedCount} menu item updates...`);
      await batch.commit();
      console.log(`✅ SUCCESS: Updated ${updatedCount} menu items with new ingredient costs`);
      
      // Trigger real-time sync update event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('menuCostsUpdated', {
          detail: { 
            updatedCount,
            locationId,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(event);
        console.log(`📢 Dispatched menuCostsUpdated event`);
      }
    } else {
      console.log(`\n⚠️ NO MENU ITEMS UPDATED`);
      console.log(`\n🎯 SOLUTION: To enable automatic menu cost sync after purchase orders:`);
      console.log(`   1. Go to Menu Builder`);
      console.log(`   2. Edit your menu items`);
      console.log(`   3. Add inventory ingredients using the "Add Ingredient" button`);
      console.log(`   4. Select proper inventory items and quantities`);
      console.log(`   5. Save the menu items`);
      console.log(`\n💡 Once menu items have ingredients, costs will auto-update when purchase orders are delivered!`);
    }
    
    return updatedCount;
    
  } catch (error) {
    console.error('🚨 CRITICAL ERROR in menu cost sync:', error);
    throw error;
  }
};

/**
 * Main trigger function called after purchase order delivery
 */
export const triggerMenuPriceSync = async (tenantId: string, locationId: string) => {
  console.log(`\n🚀 TRIGGERING MENU PRICE SYNC...`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Location: ${locationId}`);
  
  // Store sync start in localStorage
  localStorage.setItem('lastMenuSyncDebug', JSON.stringify({
    timestamp: new Date().toISOString(),
    tenantId,
    locationId,
    step: 'sync_started'
  }));
  
  const result = await updateAllMenuItemCosts(tenantId, locationId);
  
  // Store sync result in localStorage
  localStorage.setItem('lastMenuSyncDebug', JSON.stringify({
    timestamp: new Date().toISOString(),
    tenantId,
    locationId,
    step: 'sync_completed',
    result
  }));
  
  if (result > 0) {
    console.log(`🎉 MENU SYNC COMPLETE: ${result} items updated`);
  } else {
    console.log(`⚠️ MENU SYNC COMPLETE: No items updated - check ingredients setup`);
  }
  
  return result;
};

/**
 * Debug function to check last purchase order delivery and menu sync
 */
export const checkLastDeliveryDebug = () => {
  const poDebug = localStorage.getItem('lastPODeliveryDebug');
  const menuDebug = localStorage.getItem('lastMenuSyncDebug');
  
  console.log('\n🔍 LAST PURCHASE ORDER DELIVERY DEBUG:');
  if (poDebug) {
    console.log(JSON.parse(poDebug));
  } else {
    console.log('❌ No purchase order delivery debug found');
  }
  
  console.log('\n🔍 LAST MENU SYNC DEBUG:');
  if (menuDebug) {
    console.log(JSON.parse(menuDebug));
  } else {
    console.log('❌ No menu sync debug found');
  }
  
  return { poDebug: poDebug ? JSON.parse(poDebug) : null, menuDebug: menuDebug ? JSON.parse(menuDebug) : null };
};

// Make debug function globally available
if (typeof window !== 'undefined') {
  (window as any).checkLastDeliveryDebug = checkLastDeliveryDebug;
  console.log('🛠️ Debug function available: checkLastDeliveryDebug()');
}
