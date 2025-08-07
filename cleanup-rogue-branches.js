const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'coretrack-c4f9b'
  });
}

const db = admin.firestore();

async function cleanupRogueBranches() {
  console.log('🧹 CLEANING UP ROGUE BRANCH DATA');
  console.log('============================================================');
  
  try {
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    // Find the rogue branches to delete
    const rogueBranchNames = ['Creamy Frost', 'creamy frost 2'];
    const rogueBranchIds = ['BLbvD7gDm0xGTW5E7dXA', 'sUfUsvYKlcLeWzxyGaLi'];
    
    console.log('🔍 Searching for rogue branches in locations collection...');
    
    // Get all locations for this tenant
    const locationsSnapshot = await db.collection('locations')
      .where('tenantId', '==', tenantId)
      .get();
    
    console.log(`📍 Found ${locationsSnapshot.size} total locations`);
    
    let deletedCount = 0;
    
    for (const doc of locationsSnapshot.docs) {
      const data = doc.data();
      const isRogue = rogueBranchNames.includes(data.name) || rogueBranchIds.includes(doc.id);
      
      if (isRogue) {
        console.log(`❌ Deleting rogue branch: "${data.name}" (ID: ${doc.id})`);
        
        // First, check if there are any menu items or POS items linked to this location
        const menuItemsSnapshot = await db.collection('menuItems')
          .where('tenantId', '==', tenantId)
          .where('locationId', '==', `location_${doc.id}`)
          .get();
          
        const posItemsSnapshot = await db.collection('posItems')
          .where('tenantId', '==', tenantId)
          .where('locationId', '==', `location_${doc.id}`)
          .get();
        
        console.log(`   - Menu items to clean: ${menuItemsSnapshot.size}`);
        console.log(`   - POS items to clean: ${posItemsSnapshot.size}`);
        
        // Delete associated menu items
        for (const menuDoc of menuItemsSnapshot.docs) {
          await menuDoc.ref.delete();
          console.log(`   ✅ Deleted menu item: ${menuDoc.data().name}`);
        }
        
        // Delete associated POS items
        for (const posDoc of posItemsSnapshot.docs) {
          await posDoc.ref.delete();
          console.log(`   ✅ Deleted POS item: ${posDoc.data().name}`);
        }
        
        // Finally delete the location
        await doc.ref.delete();
        console.log(`   ✅ Deleted location: "${data.name}"`);
        deletedCount++;
      } else {
        console.log(`✅ Keeping valid location: "${data.name}" (ID: ${doc.id})`);
      }
    }
    
    console.log('\n🔍 Checking what remains...');
    
    // Check what's left
    const remainingLocations = await db.collection('locations')
      .where('tenantId', '==', tenantId)
      .get();
    
    console.log(`📍 Remaining locations: ${remainingLocations.size}`);
    remainingLocations.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. "${data.name}" (ID: ${doc.id})`);
    });
    
    // Check remaining menu items
    const remainingMenuItems = await db.collection('menuItems')
      .where('tenantId', '==', tenantId)
      .get();
    
    console.log(`🍽️ Remaining menu items: ${remainingMenuItems.size}`);
    
    // Check remaining POS items
    const remainingPosItems = await db.collection('posItems')
      .where('tenantId', '==', tenantId)
      .get();
    
    console.log(`🛒 Remaining POS items: ${remainingPosItems.size}`);
    
    console.log(`\n🎉 CLEANUP COMPLETE!`);
    console.log(`   - Deleted ${deletedCount} rogue branches`);
    console.log(`   - Remaining locations: ${remainingLocations.size}`);
    console.log(`\n💡 Only properly managed locations from Location Management should remain.`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupRogueBranches();
