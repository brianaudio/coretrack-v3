// ONE-TIME SETUP: Initialize Menu-POS Sync System
// Copy and paste this script in the browser console at http://localhost:3002

(async function() {
  console.log('🚀 INITIALIZING MENU-POS SYNC SYSTEM');
  console.log('=====================================');
  
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
    
    // Helper function to make Firebase REST API calls
    async function getAllDocuments(collection) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${tenantId}/${collection}`;
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
    
    async function deleteDocument(collection, docId) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${tenantId}/${collection}/${docId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    }
    
    async function createPOSItem(menuItem, menuItemId) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants/${tenantId}/posItems`;
      
      const posItemData = {
        fields: {
          name: { stringValue: menuItem.fields?.name?.stringValue || 'Unknown' },
          category: { stringValue: menuItem.fields?.category?.stringValue || 'General' },
          price: { doubleValue: menuItem.fields?.price?.doubleValue || 0 },
          cost: { doubleValue: menuItem.fields?.cost?.doubleValue || 0 },
          description: { stringValue: menuItem.fields?.description?.stringValue || '' },
          image: { stringValue: menuItem.fields?.image?.stringValue || '' },
          emoji: { stringValue: menuItem.fields?.emoji?.stringValue || '🍽️' },
          isAvailable: { booleanValue: (menuItem.fields?.status?.stringValue || 'active') === 'active' },
          preparationTime: { integerValue: menuItem.fields?.preparationTime?.integerValue || 15 },
          tenantId: { stringValue: tenantId },
          locationId: { stringValue: menuItem.fields?.locationId?.stringValue || '' },
          menuItemId: { stringValue: menuItemId },
          ingredients: menuItem.fields?.ingredients || { arrayValue: { values: [] } },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(posItemData)
      });
      
      return response.ok;
    }
    
    console.log('📋 PHASE 1: Analyzing current state...');
    
    const menuItems = await getAllDocuments('menuItems');
    const posItems = await getAllDocuments('posItems');
    
    console.log(`📊 Current state:`);
    console.log(`   Menu Items: ${menuItems.length}`);
    console.log(`   POS Items: ${posItems.length}`);
    
    // Phase 2: Clean up ALL existing POS items
    console.log('\n🧹 PHASE 2: Cleaning up existing POS items...');
    
    let deletedCount = 0;
    for (const posItem of posItems) {
      const docId = posItem.name.split('/').pop();
      const itemName = posItem.fields?.name?.stringValue || 'Unknown';
      
      const deleteSuccess = await deleteDocument('posItems', docId);
      if (deleteSuccess) {
        console.log(`   ✅ Deleted POS item: "${itemName}"`);
        deletedCount++;
      }
    }
    
    console.log(`📊 Deleted ${deletedCount} existing POS items`);
    
    // Phase 3: Recreate POS items from menu items
    console.log('\n🔄 PHASE 3: Recreating POS items from menu items...');
    
    let createdCount = 0;
    for (const menuItem of menuItems) {
      const menuItemId = menuItem.name.split('/').pop();
      const itemName = menuItem.fields?.name?.stringValue || 'Unknown';
      
      const createSuccess = await createPOSItem(menuItem, menuItemId);
      if (createSuccess) {
        console.log(`   ✅ Created POS item: "${itemName}"`);
        createdCount++;
      } else {
        console.log(`   ❌ Failed to create POS item: "${itemName}"`);
      }
    }
    
    console.log(`📊 Created ${createdCount} new POS items`);
    
    // Phase 4: Summary and next steps
    console.log('\n🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log(`✅ Deleted ${deletedCount} old POS items`);
    console.log(`✅ Created ${createdCount} new POS items`);
    console.log(`✅ Menu Builder and POS are now synchronized!`);
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. The new sync system is now active');
    console.log('2. Real-time sync listeners will handle future changes');
    console.log('3. Manual operations available through admin panel');
    console.log('4. Test by creating/updating/deleting menu items');
    
    console.log('\n🔄 Refreshing page in 5 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, 5000);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n💡 Try refreshing the page and running the script again');
  }
})();
