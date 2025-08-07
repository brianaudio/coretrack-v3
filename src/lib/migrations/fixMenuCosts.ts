/**
 * One-time migration to fix menu item costs
 * This will automatically calculate and save cost data for all existing menu items
 */

import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export async function fixAllMenuCosts(tenantId: string): Promise<void> {
  console.log('🔧 Starting menu cost migration for tenant:', tenantId);
  
  try {
    // Get all menu items
    const menuSnapshot = await getDocs(collection(db, 'tenants', tenantId, 'menuItems'));
    console.log(`📋 Found ${menuSnapshot.size} menu items to fix`);
    
    // Get all inventory items
    const inventorySnapshot = await getDocs(collection(db, 'tenants', tenantId, 'inventory'));
    console.log(`📦 Found ${inventorySnapshot.size} inventory items`);
    
    // Build inventory lookup
    const inventory: Record<string, any> = {};
    inventorySnapshot.forEach(doc => {
      inventory[doc.id] = { id: doc.id, ...doc.data() };
    });
    
    // Batch update for better performance
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    // Process each menu item
    for (const menuDoc of menuSnapshot.docs) {
      const menuItem = { id: menuDoc.id, ...menuDoc.data() } as any;
      
      // Skip if already has cost data
      if (menuItem.cost && menuItem.cost > 0) {
        console.log(`✓ ${menuItem.name} already has cost: ₱${menuItem.cost}`);
        continue;
      }
      
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) {
        console.log(`⚠️ ${menuItem.name} has no ingredients, skipping`);
        continue;
      }
      
      let newTotalCost = 0;
      let updatedIngredients = [];
      let hasValidIngredients = false;
      
      // Calculate cost for each ingredient
      for (const ingredient of menuItem.ingredients) {
        const inventoryItemId = ingredient.id || ingredient.inventoryItemId;
        const inventoryItem = inventory[inventoryItemId];
        
        if (inventoryItem) {
          const cost = (inventoryItem.costPerUnit || 0) * (ingredient.quantity || 0);
          
          updatedIngredients.push({
            ...ingredient,
            inventoryItemId: inventoryItem.id,
            inventoryItemName: inventoryItem.name,
            unit: inventoryItem.unit,
            cost: cost
          });
          
          newTotalCost += cost;
          hasValidIngredients = true;
        } else {
          // Try to find by name
          const foundByName = Object.values(inventory).find((inv: any) => 
            inv.name.toLowerCase() === (ingredient.inventoryItemName || ingredient.name || '').toLowerCase()
          );
          
          if (foundByName) {
            const cost = (foundByName.costPerUnit || 0) * (ingredient.quantity || 0);
            
            updatedIngredients.push({
              ...ingredient,
              inventoryItemId: foundByName.id,
              inventoryItemName: foundByName.name,
              unit: foundByName.unit,
              cost: cost
            });
            
            newTotalCost += cost;
            hasValidIngredients = true;
          } else {
            // Keep original ingredient unchanged
            updatedIngredients.push({
              ...ingredient,
              cost: ingredient.cost || 0
            });
            newTotalCost += ingredient.cost || 0;
          }
        }
      }
      
      if (hasValidIngredients) {
        // Add to batch update
        const menuDocRef = doc(db, 'tenants', tenantId, 'menuItems', menuItem.id);
        batch.update(menuDocRef, {
          ingredients: updatedIngredients,
          cost: newTotalCost,
          updatedAt: new Date()
        });
        
        updatedCount++;
        console.log(`🔧 Fixed ${menuItem.name}: ₱${newTotalCost.toFixed(2)}`);
      }
    }
    
    // Execute batch update
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updatedCount} menu items`);
    } else {
      console.log('ℹ️ No menu items needed updating');
    }
    
    console.log('🎉 Menu cost migration completed!');
    
  } catch (error) {
    console.error('❌ Error during menu cost migration:', error);
    throw error;
  }
}
