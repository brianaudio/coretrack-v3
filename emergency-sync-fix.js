// EMERGENCY SYNC FIX - Force sync missing menu items to POS immediately
// This addresses the collection path issue and forces a complete sync
// Copy and paste this script in browser console at http://localhost:3002

(async function() {
  console.log('🚨 EMERGENCY SYNC FIX');
  console.log('=====================');
  
  try {
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    const projectId = 'inventory-system-latest';
    
    // Get auth token
    const user = JSON.parse(localStorage.getItem('firebase:authUser:AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0:[DEFAULT]') || '{}');
    if (!user.stsTokenManager?.accessToken) {
      console.error('❌ No auth token found. Please make sure you are logged in.');
      return;
    }
    
    const authToken = user.stsTokenManager.accessToken;
    console.log('✅ Found auth token');
    
    // Function to get all documents from a collection
    async function getAllDocuments(collection) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch ${collection}:`, response.status);
        return [];
      }
      
      const result = await response.json();
      return result.documents || [];
    }
    
    // Function to create a document
    async function createDocument(collection, data) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: data
        })
      });
      return response.ok;
    }
    
    // Use correct tenant-specific paths
    const menuItemsPath = `tenants/${tenantId}/menuItems`;
    const posItemsPath = `tenants/${tenantId}/posItems`;
    
    console.log('🔍 Fetching menu items from correct path...');
    const menuItems = await getAllDocuments(menuItemsPath);
    console.log(`📋 Found ${menuItems.length} menu items in ${menuItemsPath}`);
    
    console.log('🔍 Fetching POS items from correct path...');
    const posItems = await getAllDocuments(posItemsPath);
    console.log(`🛒 Found ${posItems.length} POS items in ${posItemsPath}`);
    
    if (menuItems.length === 0) {
      console.log('⚠️ No menu items found. Please create a menu item first.');
      return;
    }
    
    // Check what's missing
    const existingPosMenuIds = new Set();
    posItems.forEach(item => {
      const menuItemId = item.fields?.menuItemId?.stringValue;
      if (menuItemId) {
        existingPosMenuIds.add(menuItemId);
      }
    });
    
    let syncedCount = 0;
    
    console.log('\\n🔄 Force syncing missing menu items to POS...');
    
    for (const menuItem of menuItems) {
      const menuItemId = menuItem.name.split('/').pop();
      const name = menuItem.fields?.name?.stringValue || 'Unknown';
      
      if (existingPosMenuIds.has(menuItemId)) {
        console.log(`   ⏭️ "${name}" already in POS`);
        continue;
      }
      
      console.log(`   🔄 Syncing "${name}" to POS...`);
      
      // Create POS item
      const posItemData = {
        menuItemId: { stringValue: menuItemId },
        name: { stringValue: name },
        price: { doubleValue: parseFloat(menuItem.fields?.price?.doubleValue || 0) },
        category: { stringValue: menuItem.fields?.category?.stringValue || 'Uncategorized' },
        description: { stringValue: menuItem.fields?.description?.stringValue || '' },
        image: { stringValue: menuItem.fields?.image?.stringValue || '' },
        emoji: { stringValue: menuItem.fields?.emoji?.stringValue || '🍽️' },
        isAvailable: { booleanValue: true },
        status: { stringValue: menuItem.fields?.status?.stringValue || 'active' },
        preparationTime: { integerValue: menuItem.fields?.preparationTime?.integerValue || 15 },
        tenantId: { stringValue: tenantId },
        locationId: { stringValue: menuItem.fields?.locationId?.stringValue || '' },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
        
        // Include ingredients for inventory deduction
        ingredients: {
          arrayValue: {
            values: (menuItem.fields?.ingredients?.arrayValue?.values || []).map(ing => ({
              mapValue: {
                fields: {
                  inventoryItemId: { stringValue: ing.mapValue?.fields?.inventoryItemId?.stringValue || '' },
                  inventoryItemName: { stringValue: ing.mapValue?.fields?.inventoryItemName?.stringValue || '' },
                  quantity: { doubleValue: ing.mapValue?.fields?.quantity?.doubleValue || 1 },
                  unit: { stringValue: ing.mapValue?.fields?.unit?.stringValue || 'pcs' },
                  cost: { doubleValue: ing.mapValue?.fields?.cost?.doubleValue || 0 }
                }
              }
            }))
          }
        }
      };
      
      const success = await createDocument(posItemsPath, posItemData);
      if (success) {
        console.log(`   ✅ Successfully synced "${name}" to POS`);
        syncedCount++;
      } else {
        console.log(`   ❌ Failed to sync "${name}"`);
      }
    }
    
    console.log(`\\n🎉 EMERGENCY SYNC COMPLETE!`);
    console.log(`📊 Synced ${syncedCount} menu items to POS`);
    
    if (syncedCount > 0) {
      console.log('\\n🔄 Refreshing pages in 3 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      console.log('\\n✅ All menu items were already in POS!');
    }
    
  } catch (error) {
    console.error('❌ Emergency sync failed:', error);
  }
})();
