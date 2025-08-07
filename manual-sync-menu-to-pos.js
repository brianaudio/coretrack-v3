// MANUAL SYNC SCRIPT - Force sync menu items to POS
// Copy and paste this script in browser console at http://localhost:3002

(async function() {
  console.log('🔄 MANUAL SYNC: Menu Items → POS');
  console.log('==================================');
  
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
    
    console.log('🔍 Fetching menu items...');
    const menuItemsPath = `tenants/${tenantId}/menuItems`;
    const menuItems = await getAllDocuments(menuItemsPath);
    console.log(`📋 Found ${menuItems.length} menu items`);
    
    console.log('🔍 Fetching existing POS items...');
    const posItemsPath = `tenants/${tenantId}/posItems`;
    const existingPosItems = await getAllDocuments(posItemsPath);
    console.log(`🛒 Found ${existingPosItems.length} existing POS items`);
    
    // Create a set of existing POS item menu IDs
    const existingPosMenuIds = new Set();
    existingPosItems.forEach(item => {
      const menuItemId = item.fields?.menuItemId?.stringValue;
      if (menuItemId) {
        existingPosMenuIds.add(menuItemId);
      }
    });
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    console.log('\\n🔄 Starting manual sync process...');
    
    for (const menuItem of menuItems) {
      const menuItemId = menuItem.name.split('/').pop();
      const name = menuItem.fields?.name?.stringValue || 'Unknown';
      const status = menuItem.fields?.status?.stringValue || 'active';
      
      // Skip if already exists in POS
      if (existingPosMenuIds.has(menuItemId)) {
        console.log(`   ⏭️ Skipping "${name}" - already in POS`);
        skippedCount++;
        continue;
      }
      
      // Create POS item data
      const posItemData = {
        menuItemId: { stringValue: menuItemId },
        name: { stringValue: name },
        price: { doubleValue: parseFloat(menuItem.fields?.price?.doubleValue || 0) },
        category: { stringValue: menuItem.fields?.category?.stringValue || 'Uncategorized' },
        description: { stringValue: menuItem.fields?.description?.stringValue || '' },
        image: { stringValue: menuItem.fields?.image?.stringValue || '' },
        emoji: { stringValue: menuItem.fields?.emoji?.stringValue || '' },
        status: { stringValue: status },
        isPopular: { booleanValue: menuItem.fields?.isPopular?.booleanValue || false },
        displayOrder: { integerValue: menuItem.fields?.displayOrder?.integerValue || 0 },
        calories: { integerValue: menuItem.fields?.calories?.integerValue || 0 },
        preparationTime: { integerValue: menuItem.fields?.preparationTime?.integerValue || 0 },
        allergens: { 
          arrayValue: { 
            values: (menuItem.fields?.allergens?.arrayValue?.values || []).map(v => ({ stringValue: v.stringValue }))
          }
        },
        tenantId: { stringValue: tenantId },
        locationId: { stringValue: menuItem.fields?.locationId?.stringValue || '' },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
        syncedFromMenu: { booleanValue: true }
      };
      
      const success = await createDocument(posItemsPath, posItemData);
      if (success) {
        console.log(`   ✅ Synced "${name}" to POS`);
        syncedCount++;
      } else {
        console.log(`   ❌ Failed to sync "${name}"`);
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\\n🎉 SYNC COMPLETE!`);
    console.log(`📊 Results:`);
    console.log(`   • Synced: ${syncedCount} items`);
    console.log(`   • Skipped: ${skippedCount} items (already in POS)`);
    console.log(`   • Total menu items: ${menuItems.length}`);
    
    if (syncedCount > 0) {
      console.log('\\n🔄 Refreshing pages in 3 seconds...');
      setTimeout(() => {
        // Refresh current page
        window.location.reload();
      }, 3000);
    }
    
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
  }
})();
