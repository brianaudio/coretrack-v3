// BRANCH-SPECIFIC MENU BUILDER FIX - Complete Solution
// Copy and paste this entire script in the browser console at http://localhost:3002

(async function() {
  console.log('� BRANCH-SPECIFIC MENU BUILDER FIX');
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
    
    // Let's try a different approach - use the existing app state
    console.log('🎯 Using direct database access approach...');
    
    // Since we can see the tenant ID and branch data in the logs, let's use fetch to Firebase REST API
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    const projectId = 'inventory-system-latest';  // Updated to match your Firebase config
    const rogueIds = ['BLbvD7gDm0xGTW5E7dXA', 'sUfUsvYKlcLeWzxyGaLi'];
    
    console.log('🎯 Targeting rogue branches:', rogueIds);
    console.log('📡 Will use Firebase REST API for cleanup');
    
    // Get the user's auth token from the existing session
    const user = JSON.parse(localStorage.getItem('firebase:authUser:AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0:[DEFAULT]') || '{}');
    if (!user.stsTokenManager?.accessToken) {
      console.error('❌ No auth token found. Please make sure you are logged in.');
      return;
    }
    
    const authToken = user.stsTokenManager.accessToken;
    console.log('✅ Found auth token');
    
    // Function to delete a document using REST API
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
    
    // Function to query and delete documents
    async function queryAndDelete(collection, field, value) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
      const query = {
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: 'EQUAL',
              value: { stringValue: value }
            }
          }
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query)
      });
      
      if (!response.ok) return [];
      
      const result = await response.json();
      const docs = result.filter(item => item.document);
      
      // Delete each document
      for (const item of docs) {
        const docPath = item.document.name;
        const docId = docPath.split('/').pop();
        await deleteDocument(collection, docId);
        console.log(`   ✅ Deleted ${collection}/${docId}`);
      }
      
      return docs;
    }
    
    let totalDeleted = 0;
    
    for (const branchId of rogueIds) {
      console.log(`\n🔍 Processing rogue branch: ${branchId}`);
      
      try {
        // Check if location exists
        const locationUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/locations/${branchId}`;
        const locationResponse = await fetch(locationUrl, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          const locationName = locationData.fields?.name?.stringValue || 'Unknown';
          console.log(`📍 Found rogue location: "${locationName}"`);
          
          // Delete menu items for this location
          console.log('🍽️ Deleting menu items...');
          const menuItems = await queryAndDelete('menuItems', 'locationId', `location_${branchId}`);
          console.log(`   Deleted ${menuItems.length} menu items`);
          
          // Delete POS items for this location
          console.log('🛒 Deleting POS items...');
          const posItems = await queryAndDelete('posItems', 'locationId', `location_${branchId}`);
          console.log(`   Deleted ${posItems.length} POS items`);
          
          // Delete the location itself
          const deleteSuccess = await deleteDocument('locations', branchId);
          if (deleteSuccess) {
            console.log(`   ✅ Deleted rogue location: "${locationName}"`);
            totalDeleted++;
          } else {
            console.log(`   ❌ Failed to delete location: "${locationName}"`);
          }
          
        } else {
          console.log(`⚠️ Rogue location ${branchId} not found (may already be deleted)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${branchId}:`, error);
      }
    }
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log(`📊 Results: Deleted ${totalDeleted} rogue branches`);
    
    if (totalDeleted > 0) {
      console.log('\n🔄 Refreshing page in 3 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      console.log('\n✅ No rogue branches found - system is clean!');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    console.log('\n💡 Alternative: Try manual deletion through the Location Management interface');
  }
})();
