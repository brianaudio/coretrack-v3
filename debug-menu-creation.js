// MENU CREATION DEBUG - Check menu creation and sync status
// Copy and paste this script in browser console at http://localhost:3002

(async function() {
  console.log('🔍 MENU CREATION DEBUG');
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
    
    // Check current menu items
    console.log('🔍 Fetching menu items from menuItems collection...');
    const menuItemsPath = `tenants/${tenantId}/menuItems`;
    const menuItems = await getAllDocuments(menuItemsPath);
    console.log(`📋 Found ${menuItems.length} menu items in menuItems collection:`);
    
    menuItems.forEach((item, index) => {
      const name = item.fields?.name?.stringValue || 'No name';
      const status = item.fields?.status?.stringValue || 'No status';
      const createdAt = item.fields?.createdAt?.timestampValue || 'No timestamp';
      const docId = item.name.split('/').pop();
      console.log(`   ${index + 1}. "${name}" (${status}) - ID: ${docId} - Created: ${createdAt}`);
    });
    
    // Check current POS items
    console.log('\\n🔍 Fetching items from posItems collection...');
    const posItemsPath = `tenants/${tenantId}/posItems`;
    const posItems = await getAllDocuments(posItemsPath);
    console.log(`🛒 Found ${posItems.length} items in posItems collection:`);
    
    posItems.forEach((item, index) => {
      const name = item.fields?.name?.stringValue || 'No name';
      const menuItemId = item.fields?.menuItemId?.stringValue || 'No menuItemId';
      const docId = item.name.split('/').pop();
      console.log(`   ${index + 1}. "${name}" - MenuID: ${menuItemId} - POS ID: ${docId}`);
    });
    
    // Check for sync issues
    console.log('\\n🔍 Checking for sync issues...');
    
    const menuItemIds = new Set();
    menuItems.forEach(item => {
      const docId = item.name.split('/').pop();
      menuItemIds.add(docId);
    });
    
    const posItemMenuIds = new Set();
    posItems.forEach(item => {
      const menuItemId = item.fields?.menuItemId?.stringValue;
      if (menuItemId) {
        posItemMenuIds.add(menuItemId);
      }
    });
    
    // Find menu items missing from POS
    const missingFromPOS = [];
    menuItemIds.forEach(id => {
      if (!posItemMenuIds.has(id)) {
        const menuItem = menuItems.find(item => item.name.split('/').pop() === id);
        const name = menuItem?.fields?.name?.stringValue || 'Unknown';
        missingFromPOS.push({ id, name });
      }
    });
    
    // Find orphaned POS items
    const orphanedPOSItems = [];
    posItems.forEach(item => {
      const menuItemId = item.fields?.menuItemId?.stringValue;
      if (menuItemId && !menuItemIds.has(menuItemId)) {
        const name = item.fields?.name?.stringValue || 'Unknown';
        orphanedPOSItems.push({ menuItemId, name });
      }
    });
    
    if (missingFromPOS.length > 0) {
      console.log(`\\n⚠️ SYNC ISSUE: ${missingFromPOS.length} menu items missing from POS:`);
      missingFromPOS.forEach((item, index) => {
        console.log(`   ${index + 1}. "${item.name}" (ID: ${item.id})`);
      });
    }
    
    if (orphanedPOSItems.length > 0) {
      console.log(`\\n⚠️ SYNC ISSUE: ${orphanedPOSItems.length} orphaned POS items:`);
      orphanedPOSItems.forEach((item, index) => {
        console.log(`   ${index + 1}. "${item.name}" (Menu ID: ${item.menuItemId})`);
      });
    }
    
    if (missingFromPOS.length === 0 && orphanedPOSItems.length === 0) {
      console.log('\\n✅ SYNC STATUS: All menu items are properly synchronized with POS');
    }
    
    // Recent activity check
    console.log('\\n🕐 Checking recent activity (last 24 hours)...');
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentMenuItems = menuItems.filter(item => {
      const createdAt = item.fields?.createdAt?.timestampValue;
      if (!createdAt) return false;
      const itemDate = new Date(createdAt);
      return itemDate > oneDayAgo;
    });
    
    console.log(`📅 Found ${recentMenuItems.length} menu items created in the last 24 hours:`);
    recentMenuItems.forEach((item, index) => {
      const name = item.fields?.name?.stringValue || 'No name';
      const createdAt = item.fields?.createdAt?.timestampValue;
      const docId = item.name.split('/').pop();
      console.log(`   ${index + 1}. "${name}" - ID: ${docId} - Created: ${new Date(createdAt).toLocaleString()}`);
    });
    
    console.log('\\n🎯 RECOMMENDATIONS:');
    if (missingFromPOS.length > 0) {
      console.log('• Run the cleanup script to sync missing menu items to POS');
    }
    if (orphanedPOSItems.length > 0) {
      console.log('• Clean up orphaned POS items that no longer have menu items');
    }
    if (recentMenuItems.length === 0) {
      console.log('• Try creating a new menu item to test the sync process');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
})();
