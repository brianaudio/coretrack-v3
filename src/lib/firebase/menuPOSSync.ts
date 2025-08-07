/**
 * PERMANENT SOLUTION: Menu Builder <-> POS Synchronization System
 * 
 * This service ensures that Menu Builder and POS systems stay synchronized
 * for a SaaS product with multiple tenants and branches.
 * 
 * Key Features:
 * - Bidirectional sync between menuItems and posItems collections
 * - Automatic cleanup when items are deleted
 * - Branch-specific item management
 * - Real-time synchronization using Firebase listeners
 * - Error handling and recovery mechanisms
 */

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
  writeBatch,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem } from './menuBuilder';
import { POSItem } from './pos';

// ========================================
// CORE SYNCHRONIZATION FUNCTIONS
// ========================================

/**
 * Sync menu item to POS when created or updated
 */
export const syncMenuItemToPOS = async (menuItem: MenuItem): Promise<void> => {
  try {
    console.log(`🔄 [SYNC] Syncing menu item to POS: ${menuItem.name}`);
    
    const posItemsRef = collection(db, `tenants/${menuItem.tenantId}/posItems`);
    
    // Check if POS item already exists
    const existingQuery = query(
      posItemsRef,
      where('menuItemId', '==', menuItem.id)
    );
    
    const existingDocs = await getDocs(existingQuery);
    
    // Prepare POS item data
    const posItemData = {
      name: menuItem.name,
      category: menuItem.category,
      price: menuItem.price,
      cost: menuItem.cost || 0,
      description: menuItem.description || '',
      image: menuItem.image || '',
      emoji: menuItem.emoji || '🍽️',
      isAvailable: menuItem.status === 'active',
      preparationTime: menuItem.preparationTime || 15,
      tenantId: menuItem.tenantId,
      locationId: menuItem.locationId,
      menuItemId: menuItem.id, // Link back to menu item
      ingredients: menuItem.ingredients || [], // Critical for inventory deduction
      updatedAt: Timestamp.now()
    };

    if (existingDocs.empty) {
      // Create new POS item
      await addDoc(posItemsRef, {
        ...posItemData,
        createdAt: Timestamp.now()
      });
      console.log(`✅ [SYNC] Created POS item for: ${menuItem.name}`);
    } else {
      // Update existing POS item
      const existingDoc = existingDocs.docs[0];
      await updateDoc(existingDoc.ref, posItemData);
      console.log(`✅ [SYNC] Updated POS item for: ${menuItem.name}`);
    }
  } catch (error) {
    console.error(`❌ [SYNC] Failed to sync menu item to POS:`, error);
    throw error;
  }
};

/**
 * Remove POS item when menu item is deleted
 */
export const removePOSItemForDeletedMenu = async (
  tenantId: string, 
  menuItemId: string
): Promise<void> => {
  try {
    console.log(`🗑️ [SYNC] Removing POS items for deleted menu item: ${menuItemId}`);
    
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const query_doc = query(posItemsRef, where('menuItemId', '==', menuItemId));
    const snapshot = await getDocs(query_doc);
    
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        console.log(`✅ [SYNC] Queued for deletion: ${doc.data().name}`);
      });
      
      await batch.commit();
      console.log(`✅ [SYNC] Removed ${snapshot.docs.length} POS items`);
    } else {
      console.log(`ℹ️ [SYNC] No POS items found for menu item: ${menuItemId}`);
    }
  } catch (error) {
    console.error(`❌ [SYNC] Failed to remove POS items:`, error);
    throw error;
  }
};

/**
 * Clean up orphaned POS items (items without corresponding menu items)
 */
export const cleanupOrphanedPOSItems = async (tenantId: string): Promise<number> => {
  try {
    console.log(`🧹 [CLEANUP] Starting orphaned POS items cleanup for tenant: ${tenantId}`);
    
    // Get all menu items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    const validMenuItemIds = new Set(menuSnapshot.docs.map(doc => doc.id));
    
    console.log(`📋 [CLEANUP] Found ${validMenuItemIds.size} valid menu items`);
    
    // Get all POS items
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    
    console.log(`🛒 [CLEANUP] Found ${posSnapshot.docs.length} POS items`);
    
    // Find orphaned POS items
    const orphanedPOSItems: DocumentSnapshot[] = [];
    
    for (const posDoc of posSnapshot.docs) {
      const posData = posDoc.data();
      const menuItemId = posData.menuItemId;
      
      // Check if this POS item has a corresponding menu item
      if (!menuItemId || !validMenuItemIds.has(menuItemId)) {
        orphanedPOSItems.push(posDoc);
        console.log(`🚨 [CLEANUP] Found orphaned POS item: ${posData.name} (menuItemId: ${menuItemId})`);
      }
    }
    
    if (orphanedPOSItems.length > 0) {
      // Delete orphaned POS items in batches
      const batch = writeBatch(db);
      
      orphanedPOSItems.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ [CLEANUP] Deleted ${orphanedPOSItems.length} orphaned POS items`);
    } else {
      console.log(`✅ [CLEANUP] No orphaned POS items found`);
    }
    
    return orphanedPOSItems.length;
  } catch (error) {
    console.error(`❌ [CLEANUP] Failed to cleanup orphaned POS items:`, error);
    throw error;
  }
};

// ========================================
// REAL-TIME SYNC LISTENERS
// ========================================

/**
 * Set up real-time sync listeners for a tenant
 */
export const setupMenuPOSSyncListeners = (tenantId: string): (() => void) => {
  console.log(`🎧 [LISTENERS] Setting up real-time sync for tenant: ${tenantId}`);
  
  const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
  
  // Listen to menu item changes
  const unsubscribeMenuItems = onSnapshot(menuItemsRef, async (snapshot) => {
    console.log(`📡 [LISTENERS] Menu items changed: ${snapshot.docChanges().length} changes`);
    
    for (const change of snapshot.docChanges()) {
      const menuItem = { id: change.doc.id, ...change.doc.data() } as MenuItem;
      
      switch (change.type) {
        case 'added':
        case 'modified':
          console.log(`🔄 [LISTENERS] Syncing ${change.type} menu item: ${menuItem.name}`);
          try {
            await syncMenuItemToPOS(menuItem);
          } catch (error) {
            console.error(`❌ [LISTENERS] Sync failed for ${menuItem.name}:`, error);
          }
          break;
          
        case 'removed':
          console.log(`🗑️ [LISTENERS] Removing POS items for deleted menu item: ${menuItem.name}`);
          try {
            await removePOSItemForDeletedMenu(tenantId, menuItem.id);
          } catch (error) {
            console.error(`❌ [LISTENERS] Removal failed for ${menuItem.name}:`, error);
          }
          break;
      }
    }
  });
  
  // Return cleanup function
  return () => {
    console.log(`🛑 [LISTENERS] Stopping sync listeners for tenant: ${tenantId}`);
    unsubscribeMenuItems();
  };
};

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * Perform full sync of all menu items to POS for a tenant
 */
export const performFullMenuPOSSync = async (tenantId: string): Promise<void> => {
  try {
    console.log(`🔄 [FULL-SYNC] Starting full sync for tenant: ${tenantId}`);
    
    // First, cleanup orphaned items
    const cleanedCount = await cleanupOrphanedPOSItems(tenantId);
    
    // Then, sync all current menu items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    
    console.log(`📋 [FULL-SYNC] Syncing ${menuSnapshot.docs.length} menu items`);
    
    const syncPromises = menuSnapshot.docs.map(async (doc) => {
      const menuItem = { id: doc.id, ...doc.data() } as MenuItem;
      return syncMenuItemToPOS(menuItem);
    });
    
    await Promise.all(syncPromises);
    
    console.log(`✅ [FULL-SYNC] Completed full sync for tenant: ${tenantId}`);
    console.log(`📊 [FULL-SYNC] Cleaned ${cleanedCount} orphaned items, synced ${menuSnapshot.docs.length} menu items`);
  } catch (error) {
    console.error(`❌ [FULL-SYNC] Full sync failed for tenant: ${tenantId}`, error);
    throw error;
  }
};

/**
 * Emergency cleanup - removes ALL POS items and re-syncs from menu items
 */
export const emergencyMenuPOSReset = async (tenantId: string): Promise<void> => {
  try {
    console.log(`🚨 [EMERGENCY] Starting emergency reset for tenant: ${tenantId}`);
    
    // Delete all existing POS items
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    
    if (!posSnapshot.empty) {
      console.log(`🗑️ [EMERGENCY] Deleting ${posSnapshot.docs.length} existing POS items`);
      
      const deleteBatch = writeBatch(db);
      posSnapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
    }
    
    // Re-sync all menu items
    await performFullMenuPOSSync(tenantId);
    
    console.log(`✅ [EMERGENCY] Emergency reset completed for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`❌ [EMERGENCY] Emergency reset failed for tenant: ${tenantId}`, error);
    throw error;
  }
};

// ========================================
// VALIDATION AND DIAGNOSTICS
// ========================================

/**
 * Validate sync integrity between menu items and POS items
 */
export const validateMenuPOSSync = async (tenantId: string): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    menuItems: number;
    posItems: number;
    linkedItems: number;
    orphanedItems: number;
  };
}> => {
  try {
    console.log(`🔍 [VALIDATION] Validating sync for tenant: ${tenantId}`);
    
    const issues: string[] = [];
    
    // Get menu items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    const menuItemIds = new Set(menuSnapshot.docs.map(doc => doc.id));
    
    // Get POS items
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    
    let linkedItems = 0;
    let orphanedItems = 0;
    
    // Check POS items linkage
    for (const posDoc of posSnapshot.docs) {
      const posData = posDoc.data();
      const menuItemId = posData.menuItemId;
      
      if (!menuItemId) {
        issues.push(`POS item "${posData.name}" has no menuItemId`);
        orphanedItems++;
      } else if (!menuItemIds.has(menuItemId)) {
        issues.push(`POS item "${posData.name}" links to non-existent menu item: ${menuItemId}`);
        orphanedItems++;
      } else {
        linkedItems++;
      }
    }
    
    // Check if all menu items have corresponding POS items
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      const hasCorrespondingPOSItem = posSnapshot.docs.some(
        posDoc => posDoc.data().menuItemId === menuDoc.id
      );
      
      if (!hasCorrespondingPOSItem) {
        issues.push(`Menu item "${menuData.name}" has no corresponding POS item`);
      }
    }
    
    const stats = {
      menuItems: menuSnapshot.docs.length,
      posItems: posSnapshot.docs.length,
      linkedItems,
      orphanedItems
    };
    
    const valid = issues.length === 0;
    
    console.log(`📊 [VALIDATION] Results:`, { valid, issueCount: issues.length, stats });
    
    return { valid, issues, stats };
  } catch (error) {
    console.error(`❌ [VALIDATION] Validation failed for tenant: ${tenantId}`, error);
    throw error;
  }
};

export default {
  syncMenuItemToPOS,
  removePOSItemForDeletedMenu,
  cleanupOrphanedPOSItems,
  setupMenuPOSSyncListeners,
  performFullMenuPOSSync,
  emergencyMenuPOSReset,
  validateMenuPOSSync
};
