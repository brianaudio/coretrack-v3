/**
 * Permanent Fix for Menu Items LocationId Issue
 * This script will be integrated into the app to auto-fix locationId mismatches
 */

import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export const fixMenuItemsLocationId = async (tenantId: string, branchId: string) => {
  try {
    console.log('🔧 Fixing menu items locationId for tenant:', tenantId, 'branch:', branchId);
    
    const correctLocationId = `location_${branchId}`;
    
    // Get all menu items for this tenant
    const menuItemsRef = collection(db, 'tenants', tenantId, 'menuItems');
    const snapshot = await getDocs(menuItemsRef);
    
    if (snapshot.empty) {
      console.log('No menu items found to fix');
      return { fixed: 0, total: 0 };
    }
    
    const batch = writeBatch(db);
    let fixedCount = 0;
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const currentLocationId = data.locationId;
      
      // Check if locationId needs fixing
      const needsFix = !currentLocationId || 
                      currentLocationId === branchId || 
                      currentLocationId === 'main' ||
                      !currentLocationId.startsWith('location_') ||
                      currentLocationId !== correctLocationId;
      
      if (needsFix) {
        console.log(`Fixing ${data.name}: ${currentLocationId} → ${correctLocationId}`);
        batch.update(docSnapshot.ref, { 
          locationId: correctLocationId,
          updatedAt: Timestamp.now()
        });
        fixedCount++;
      }
    });
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${fixedCount} menu items`);
      
      // Also fix POS items
      const posItemsRef = collection(db, 'tenants', tenantId, 'posItems');
      const posSnapshot = await getDocs(posItemsRef);
      
      if (!posSnapshot.empty) {
        const posBatch = writeBatch(db);
        let posFixedCount = 0;
        
        posSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.locationId || data.locationId !== correctLocationId) {
            posBatch.update(docSnapshot.ref, { 
              locationId: correctLocationId,
              updatedAt: Timestamp.now()
            });
            posFixedCount++;
          }
        });
        
        if (posFixedCount > 0) {
          await posBatch.commit();
          console.log(`✅ Fixed ${posFixedCount} POS items`);
        }
      }
    }
    
    return { 
      fixed: fixedCount, 
      total: snapshot.size,
      message: `Fixed ${fixedCount} out of ${snapshot.size} menu items`
    };
    
  } catch (error) {
    console.error('Error fixing menu items locationId:', error);
    throw error;
  }
};

// Auto-fix function to be called when loading menu items
export const autoFixLocationIdMismatch = async (tenantId: string, branchId: string) => {
  try {
    // Quick check if there are items with wrong locationId
    const menuItemsRef = collection(db, 'tenants', tenantId, 'menuItems');
    const snapshot = await getDocs(menuItemsRef);
    
    const correctLocationId = `location_${branchId}`;
    let needsFix = false;
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const currentLocationId = data.locationId;
      
      if (!currentLocationId || 
          currentLocationId === branchId || 
          currentLocationId === 'main' ||
          !currentLocationId.startsWith('location_') ||
          currentLocationId !== correctLocationId) {
        needsFix = true;
      }
    });
    
    if (needsFix) {
      console.log('🔧 Auto-fixing locationId mismatch...');
      await fixMenuItemsLocationId(tenantId, branchId);
      return true; // Indicates data was fixed and should be reloaded
    }
    
    return false; // No fix needed
  } catch (error) {
    console.error('Error in auto-fix:', error);
    return false;
  }
};
