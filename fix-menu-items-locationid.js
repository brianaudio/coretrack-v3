/**
 * Fix Menu Items LocationId - Run this in browser console
 * This will update existing menu items to have the correct locationId format
 */

console.log('🔧 FIXING MENU ITEMS LOCATION ID');
console.log('===================================\n');

(async function fixMenuItemsLocationId() {
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.log('❌ Firebase not available. Make sure you\'re on the app page.');
      return;
    }

    const db = firebase.firestore();
    const auth = firebase.auth();
    const user = auth.currentUser;

    if (!user) {
      console.log('❌ No user logged in');
      return;
    }

    const tenantId = user.uid;
    console.log('🏢 Tenant ID:', tenantId);

    // Get current branch
    const selectedBranch = localStorage.getItem('selectedBranch') || 'main';
    const correctLocationId = `location_${selectedBranch}`;
    console.log('🏪 Current branch:', selectedBranch);
    console.log('✅ Correct locationId format:', correctLocationId);

    // Get all menu items
    console.log('\n📋 FIXING MENU ITEMS:');
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const snapshot = await menuItemsRef.get();

    if (snapshot.empty) {
      console.log('❌ No menu items found');
      return;
    }

    console.log(`Found ${snapshot.size} menu items`);

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const currentLocationId = data.locationId;
      
      console.log(`\n📝 ${data.name}:`);
      console.log(`   Current locationId: ${currentLocationId || 'MISSING'}`);
      
      // Fix if locationId is missing, wrong format, or doesn't match current branch
      if (!currentLocationId || 
          currentLocationId === selectedBranch || 
          currentLocationId === 'main' ||
          !currentLocationId.startsWith('location_')) {
        
        console.log(`   🔧 Updating to: ${correctLocationId}`);
        batch.update(doc.ref, { 
          locationId: correctLocationId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        updatedCount++;
      } else {
        console.log(`   ✅ Already correct`);
      }
    });

    if (updatedCount > 0) {
      console.log(`\n🚀 Applying ${updatedCount} updates...`);
      await batch.commit();
      console.log('✅ Successfully updated menu items!');
      
      // Also update POS items to match
      console.log('\n🛒 FIXING POS ITEMS:');
      const posItemsRef = db.collection('tenants').doc(tenantId).collection('posItems');
      const posSnapshot = await posItemsRef.get();
      
      if (!posSnapshot.empty) {
        const posBatch = db.batch();
        let posUpdatedCount = 0;
        
        posSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.locationId || data.locationId !== correctLocationId) {
            posBatch.update(doc.ref, { 
              locationId: correctLocationId,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            posUpdatedCount++;
          }
        });
        
        if (posUpdatedCount > 0) {
          await posBatch.commit();
          console.log(`✅ Updated ${posUpdatedCount} POS items`);
        }
      }
      
      console.log('\n🎉 ALL FIXES COMPLETE!');
      console.log('📋 Please refresh the MenuBuilder page to see your menu items.');
      
    } else {
      console.log('\n✅ All menu items already have correct locationId format');
    }

  } catch (error) {
    console.error('❌ Error fixing menu items:', error);
  }
})();

console.log('\n📱 To run this fix:');
console.log('1. Make sure you\'re on your app page');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste this entire script');
console.log('4. Press Enter to run');
console.log('5. Refresh the MenuBuilder page after it completes');
