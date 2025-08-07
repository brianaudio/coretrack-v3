// Direct Firebase web delete script
// Instructions:
// 1. Open your app at localhost:3000
// 2. Login to your account 
// 3. Open browser developer tools (F12)
// 4. Paste this entire script in the console
// 5. Press Enter to run

async function deleteRogueBranches() {
  console.log('🧹 STARTING ROGUE BRANCH CLEANUP');
  console.log('============================================================');
  
  try {
    // Check if Firebase is available
    if (!window.firebase?.firestore) {
      console.error('❌ Firebase not loaded. Make sure you are on the app page.');
      return;
    }
    
    const db = window.firebase.firestore();
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    // Target the specific rogue branches
    const rogueIds = ['BLbvD7gDm0xGTW5E7dXA', 'sUfUsvYKlcLeWzxyGaLi'];
    
    console.log('🎯 Targeting rogue branches:', rogueIds);
    
    for (const branchId of rogueIds) {
      console.log(`\n🔍 Processing branch: ${branchId}`);
      
      try {
        // Check if location exists
        const locationDoc = await db.collection('locations').doc(branchId).get();
        
        if (locationDoc.exists) {
          const locationData = locationDoc.data();
          console.log(`📍 Found location: "${locationData.name}"`);
          
          // Delete menu items for this location
          const menuItems = await db.collection('menuItems')
            .where('tenantId', '==', tenantId)
            .where('locationId', '==', `location_${branchId}`)
            .get();
          
          console.log(`🍽️ Deleting ${menuItems.size} menu items...`);
          for (const doc of menuItems.docs) {
            await doc.ref.delete();
            console.log(`   ✅ Deleted menu item: ${doc.data().name}`);
          }
          
          // Delete POS items for this location
          const posItems = await db.collection('posItems')
            .where('tenantId', '==', tenantId)
            .where('locationId', '==', `location_${branchId}`)
            .get();
          
          console.log(`🛒 Deleting ${posItems.size} POS items...`);
          for (const doc of posItems.docs) {
            await doc.ref.delete();
            console.log(`   ✅ Deleted POS item: ${doc.data().name}`);
          }
          
          // Delete the location itself
          await db.collection('locations').doc(branchId).delete();
          console.log(`   ✅ Deleted location: "${locationData.name}"`);
          
        } else {
          console.log(`⚠️ Location ${branchId} not found (may already be deleted)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${branchId}:`, error);
      }
    }
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('📋 Summary:');
    console.log('   - Removed rogue "Creamy Frost" branch');
    console.log('   - Removed rogue "creamy frost 2" branch');
    console.log('   - Cleaned up associated menu and POS items');
    console.log('\n🔄 Please refresh the page to see changes.');
    
    // Force a page refresh after 2 seconds
    setTimeout(() => {
      console.log('🔄 Auto-refreshing page...');
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
deleteRogueBranches();
