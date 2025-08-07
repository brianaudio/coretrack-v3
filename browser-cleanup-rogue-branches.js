// Simple client-side script to clean up rogue branches
// Run this in the browser console when logged in to the app

console.log('🧹 CLEANING UP ROGUE BRANCH DATA');
console.log('============================================================');

// Import Firebase from the global scope (assuming it's loaded in the app)
const { collection, query, where, getDocs, deleteDoc, doc } = window.firebase.firestore || {};

if (!window.firebase || !window.firebase.firestore) {
  console.error('❌ Firebase not available. Run this in your app with Firebase loaded.');
} else {
  async function cleanupRogueBranches() {
    try {
      const db = window.firebase.firestore();
      const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
      
      // Find the rogue branches to delete
      const rogueBranchNames = ['Creamy Frost', 'creamy frost 2'];
      const rogueBranchIds = ['BLbvD7gDm0xGTW5E7dXA', 'sUfUsvYKlcLeWzxyGaLi'];
      
      console.log('🔍 Searching for rogue branches in locations collection...');
      
      // Get all locations for this tenant
      const locationsQuery = query(
        collection(db, 'locations'),
        where('tenantId', '==', tenantId)
      );
      const locationsSnapshot = await getDocs(locationsQuery);
      
      console.log(`📍 Found ${locationsSnapshot.size} total locations`);
      
      let deletedCount = 0;
      
      for (const docSnapshot of locationsSnapshot.docs) {
        const data = docSnapshot.data();
        const isRogue = rogueBranchNames.includes(data.name) || rogueBranchIds.includes(docSnapshot.id);
        
        if (isRogue) {
          console.log(`❌ Deleting rogue branch: "${data.name}" (ID: ${docSnapshot.id})`);
          
          // Delete associated menu items
          const menuItemsQuery = query(
            collection(db, 'menuItems'),
            where('tenantId', '==', tenantId),
            where('locationId', '==', `location_${docSnapshot.id}`)
          );
          const menuItemsSnapshot = await getDocs(menuItemsQuery);
          
          console.log(`   - Menu items to clean: ${menuItemsSnapshot.size}`);
          for (const menuDoc of menuItemsSnapshot.docs) {
            await deleteDoc(menuDoc.ref);
            console.log(`   ✅ Deleted menu item: ${menuDoc.data().name}`);
          }
          
          // Delete associated POS items
          const posItemsQuery = query(
            collection(db, 'posItems'),
            where('tenantId', '==', tenantId),
            where('locationId', '==', `location_${docSnapshot.id}`)
          );
          const posItemsSnapshot = await getDocs(posItemsQuery);
          
          console.log(`   - POS items to clean: ${posItemsSnapshot.size}`);
          for (const posDoc of posItemsSnapshot.docs) {
            await deleteDoc(posDoc.ref);
            console.log(`   ✅ Deleted POS item: ${posDoc.data().name}`);
          }
          
          // Finally delete the location
          await deleteDoc(docSnapshot.ref);
          console.log(`   ✅ Deleted location: "${data.name}"`);
          deletedCount++;
        } else {
          console.log(`✅ Keeping valid location: "${data.name}" (ID: ${docSnapshot.id})`);
        }
      }
      
      console.log(`\n🎉 CLEANUP COMPLETE! Deleted ${deletedCount} rogue branches`);
      console.log('💡 Refresh the page to see the changes.');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
  
  // Run the cleanup
  cleanupRogueBranches();
}
