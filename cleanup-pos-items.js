// POS ITEMS CLEANUP - Remove orphaned POS items
// Copy and paste this script in browser console at http://localhost:3002

(async function() {
  console.log('🧹 POS ITEMS CLEANUP');
  console.log('====================');
  
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
    
    // Function to delete a document
    async function deleteDocument(collection, docId) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    }
    
    console.log('🔍 Fetching current menu items...');
    const menuItems = await getAllDocuments(`tenants/${tenantId}/menuItems`);
    console.log(`📋 Found ${menuItems.length} menu items`);
    
    console.log('🔍 Fetching current POS items...');
    const posItems = await getAllDocuments(`tenants/${tenantId}/posItems`);
    console.log(`🛒 Found ${posItems.length} POS items`);
    
    if (menuItems.length === 0) {
      console.log('🎯 No menu items found - this confirms menu was deleted from Menu Builder');
      console.log('💡 Will clean up ALL POS items since menu is empty');
      
      let deletedCount = 0;
      for (const posItem of posItems) {
        const docId = posItem.name.split('/').pop();
        const itemName = posItem.fields?.name?.stringValue || 'Unknown';
        
        const deleteSuccess = await deleteDocument(`tenants/${tenantId}/posItems`, docId);
        if (deleteSuccess) {
          console.log(`   ✅ Deleted POS item: "${itemName}"`);
          deletedCount++;
        } else {
          console.log(`   ❌ Failed to delete: "${itemName}"`);
        }
      }
      
      console.log(`\n🎉 CLEANUP COMPLETE!`);
      console.log(`📊 Deleted ${deletedCount} POS items`);
      
    } else {
      // If there are menu items, only delete orphaned POS items
      console.log('🔍 Checking for orphaned POS items...');
      
      const validMenuItemIds = new Set();
      menuItems.forEach(item => {
        const docId = item.name.split('/').pop();
        validMenuItemIds.add(docId);
      });
      
      let deletedCount = 0;
      for (const posItem of posItems) {
        const docId = posItem.name.split('/').pop();
        const menuItemId = posItem.fields?.menuItemId?.stringValue;
        const itemName = posItem.fields?.name?.stringValue || 'Unknown';
        
        if (!menuItemId || !validMenuItemIds.has(menuItemId)) {
          const deleteSuccess = await deleteDocument(`tenants/${tenantId}/posItems`, docId);
          if (deleteSuccess) {
            console.log(`   ✅ Deleted orphaned POS item: "${itemName}"`);
            deletedCount++;
          }
        }
      }
      
      console.log(`\n🎉 CLEANUP COMPLETE!`);
      console.log(`📊 Deleted ${deletedCount} orphaned POS items`);
    }
    
    if (posItems.length > 0) {
      console.log('\n🔄 Refreshing POS page in 3 seconds...');
      setTimeout(() => {
        // Try to refresh POS page or current page
        if (window.location.pathname.includes('/pos')) {
          window.location.reload();
        } else {
          window.location.href = '/pos';
        }
      }, 3000);
    } else {
      console.log('\n✅ POS is already clean!');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
})();
