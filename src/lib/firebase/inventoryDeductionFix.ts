/**
 * Enhanced Inventory Deduction System
 * This ensures ingredients are properly synced and deducted
 */

import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  writeBatch,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export const ensureIngredientsSync = async (tenantId: string) => {
  try {
    console.log('🔧 Ensuring ingredients are synced from menu items to POS items...');
    
    // Get all menu items with ingredients
    const menuItemsRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuSnapshot = await getDocs(menuItemsRef);
    
    const batch = writeBatch(db);
    let fixedCount = 0;
    
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      
      if (menuData.ingredients && menuData.ingredients.length > 0) {
        // Find corresponding POS item
        const posItemsRef = collection(db, 'tenants', tenantId, 'posItems');
        const posQuery = query(
          posItemsRef,
          where('name', '==', menuData.name),
          where('category', '==', menuData.category)
        );
        
        const posSnapshot = await getDocs(posQuery);
        
        if (!posSnapshot.empty) {
          const posDoc = posSnapshot.docs[0];
          const posData = posDoc.data();
          
          // Check if POS item is missing ingredients
          if (!posData.ingredients || posData.ingredients.length === 0) {
            console.log(`🔧 Syncing ${menuData.ingredients.length} ingredients to POS item: ${menuData.name}`);
            
            batch.update(posDoc.ref, {
              ingredients: menuData.ingredients,
              updatedAt: Timestamp.now()
            });
            fixedCount++;
          }
        }
      }
    }
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ Synced ingredients to ${fixedCount} POS items`);
    } else {
      console.log('✅ All POS items already have ingredients synced');
    }
    
    return fixedCount;
  } catch (error) {
    console.error('❌ Error ensuring ingredients sync:', error);
    throw error;
  }
};

export const validateInventoryDeductionSetup = async (tenantId: string) => {
  try {
    console.log('🔍 Validating inventory deduction setup...');
    
    const issues = [];
    
    // 1. Check menu items have ingredients with valid inventory IDs
    const menuItemsRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuSnapshot = await getDocs(menuItemsRef);
    
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      
      if (!menuData.ingredients || menuData.ingredients.length === 0) {
        issues.push(`Menu item "${menuData.name}" has no ingredients`);
      } else {
        for (const ingredient of menuData.ingredients) {
          if (!ingredient.inventoryItemId) {
            issues.push(`Ingredient "${ingredient.inventoryItemName}" in "${menuData.name}" has no inventoryItemId`);
          }
        }
      }
    }
    
    // 2. Check POS items have ingredients synced
    const posItemsRef = collection(db, 'tenants', tenantId, 'posItems');
    const posSnapshot = await getDocs(posItemsRef);
    
    for (const posDoc of posSnapshot.docs) {
      const posData = posDoc.data();
      
      if (!posData.ingredients || posData.ingredients.length === 0) {
        issues.push(`POS item "${posData.name}" has no ingredients synced`);
      }
    }
    
    // 3. Check inventory items exist
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    if (inventorySnapshot.empty) {
      issues.push('No inventory items found');
    }
    
    console.log(`🔍 Validation complete. Found ${issues.length} issues.`);
    
    if (issues.length > 0) {
      console.log('❌ Issues found:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ No issues found - inventory deduction should work correctly');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('❌ Error validating setup:', error);
    return {
      isValid: false,
      issues: ['Validation failed: ' + (error instanceof Error ? error.message : String(error))]
    };
  }
};

export const fixInventoryDeductionIssues = async (tenantId: string) => {
  try {
    console.log('🔧 Auto-fixing inventory deduction issues...');
    
    // 1. Ensure ingredients are synced
    const syncedCount = await ensureIngredientsSync(tenantId);
    
    // 2. Validate setup
    const validation = await validateInventoryDeductionSetup(tenantId);
    
    return {
      syncedCount,
      validation,
      isFixed: validation.isValid
    };
  } catch (error) {
    console.error('❌ Error fixing issues:', error);
    throw error;
  }
};
