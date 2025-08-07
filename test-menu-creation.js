// MENU CREATION TEST - Check if menu items are being saved
// Copy and paste this script in browser console at http://localhost:3002

(async function() {
  console.log('🧪 MENU CREATION TEST');
  console.log('======================');
  
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
    
    console.log('🔍 Checking menu items in correct collection...');
    const menuItems = await getAllDocuments(`tenants/${tenantId}/menuItems`);
    console.log(`📋 Found ${menuItems.length} menu items in tenants/${tenantId}/menuItems`);
    
    if (menuItems.length > 0) {
      console.log('✅ Menu items found:');
      menuItems.forEach((item, index) => {
        const name = item.fields?.name?.stringValue || 'Unknown';
        const price = item.fields?.price?.doubleValue || item.fields?.price?.integerValue || 0;
        const status = item.fields?.status?.stringValue || 'unknown';
        const createdAt = item.fields?.createdAt?.timestampValue || 'unknown';
        
        console.log(`   ${index + 1}. "${name}" - ₱${price} (${status}) - Created: ${createdAt}`);
      });
    } else {
      console.log('❌ No menu items found in the correct collection');
      
      // Check if items exist in wrong collection (old path)
      console.log('🔍 Checking old collection path...');
      const oldMenuItems = await getAllDocuments('menuItems');
      console.log(`📋 Found ${oldMenuItems.length} menu items in old path (menuItems)`);
      
      if (oldMenuItems.length > 0) {
        console.log('⚠️ Found menu items in old collection path - they need to be migrated!');
        oldMenuItems.forEach((item, index) => {
          const name = item.fields?.name?.stringValue || 'Unknown';
          const price = item.fields?.price?.doubleValue || item.fields?.price?.integerValue || 0;
          console.log(`   ${index + 1}. "${name}" - ₱${price} (in wrong location)`);
        });
      }
    }
    
    console.log('🔍 Checking POS items...');
    const posItems = await getAllDocuments(`tenants/${tenantId}/posItems`);
    console.log(`🛒 Found ${posItems.length} POS items in tenants/${tenantId}/posItems`);
    
    if (posItems.length > 0) {
      console.log('✅ POS items found:');
      posItems.forEach((item, index) => {
        const name = item.fields?.name?.stringValue || 'Unknown';
        const price = item.fields?.price?.doubleValue || item.fields?.price?.integerValue || 0;
        const menuItemId = item.fields?.menuItemId?.stringValue || 'no-id';
        
        console.log(`   ${index + 1}. "${name}" - ₱${price} (menuItemId: ${menuItemId})`);
      });
    } else {
      console.log('❌ No POS items found');
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Menu Items: ${menuItems.length}`);
    console.log(`   POS Items: ${posItems.length}`);
    console.log(`   Sync Status: ${menuItems.length === posItems.length ? '✅ In sync' : '❌ Out of sync'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
