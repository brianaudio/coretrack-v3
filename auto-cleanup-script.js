// Auto-execute cleanup script for port 3002
// This script will automatically run the cleanup when the page loads

(function() {
  console.log('🔥 AUTO-CLEANUP SCRIPT LOADED FOR PORT 3002');
  console.log('============================================================');
  
  // Wait for Firebase to load
  function waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.firebase?.firestore) {
          console.log('✅ Firebase detected, starting cleanup...');
          resolve();
        } else {
          console.log('⏳ Waiting for Firebase to load...');
          setTimeout(checkFirebase, 1000);
        }
      };
      checkFirebase();
    });
  }
  
  async function executeCleanup() {
    try {
      await waitForFirebase();
      
      const db = window.firebase.firestore();
      const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
      const rogueIds = ['BLbvD7gDm0xGTW5E7dXA', 'sUfUsvYKlcLeWzxyGaLi'];
      
      console.log('🎯 Targeting rogue branches:', rogueIds);
      
      let totalDeleted = 0;
      
      for (const branchId of rogueIds) {
        console.log(`\n🔍 Processing branch: ${branchId}`);
        
        try {
          // Check if location exists
          const locationDoc = await db.collection('locations').doc(branchId).get();
          
          if (locationDoc.exists) {
            const locationData = locationDoc.data();
            console.log(`📍 Found rogue location: "${locationData.name}"`);
            
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
            console.log(`   ✅ Deleted rogue location: "${locationData.name}"`);
            totalDeleted++;
            
          } else {
            console.log(`⚠️ Rogue location ${branchId} not found (may already be deleted)`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${branchId}:`, error);
        }
      }
      
      console.log('\n🎉 AUTO-CLEANUP COMPLETE!');
      console.log(`📊 Results:`);
      console.log(`   - Deleted ${totalDeleted} rogue branches`);
      console.log(`   - Cleaned up associated menu and POS items`);
      console.log(`   - Only properly managed locations should remain`);
      
      // Check what remains
      const remainingLocations = await db.collection('locations')
        .where('tenantId', '==', tenantId)
        .get();
      
      console.log(`\n📍 Remaining locations: ${remainingLocations.size}`);
      remainingLocations.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. "${data.name}" (ID: ${doc.id})`);
      });
      
      if (totalDeleted > 0) {
        console.log('\n🔄 Refreshing page to update UI...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.log('\n✅ No rogue data found - system is clean!');
      }
      
    } catch (error) {
      console.error('❌ Auto-cleanup failed:', error);
    }
  }
  
  // Start cleanup after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeCleanup);
  } else {
    executeCleanup();
  }
  
})();
