/**
 * Debug Menu Items - Check why menu items aren't showing up
 * Run this in the browser console on your app
 */

console.log('🔍 DEBUG: Menu Items Not Showing Up');
console.log('=====================================\n');

(async function debugMenuItems() {
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

    // Check recent menu items
    console.log('\n📋 CHECKING MENU ITEMS IN DATABASE:');
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const menuSnapshot = await menuItemsRef.orderBy('createdAt', 'desc').limit(10).get();

    console.log(`Found ${menuSnapshot.size} menu items in database:`);
    
    if (menuSnapshot.empty) {
      console.log('❌ No menu items found in database!');
      console.log('\n🔧 Possible Solutions:');
      console.log('1. Try creating a menu item again');
      console.log('2. Check if you\'re logged in to the correct account');
      console.log('3. Check browser console for errors during creation');
      return;
    }

    menuSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Price: ₱${data.price || 0}`);
      console.log(`   Category: ${data.category || 'None'}`);
      console.log(`   Status: ${data.status || 'Unknown'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}`);
      console.log(`   Location ID: ${data.locationId || 'None'}`);
      console.log(`   Ingredients: ${data.ingredients?.length || 0}`);
    });

    // Check POS items
    console.log('\n🛒 CHECKING POS ITEMS IN DATABASE:');
    const posItemsRef = db.collection('tenants').doc(tenantId).collection('posItems');
    const posSnapshot = await posItemsRef.orderBy('createdAt', 'desc').limit(10).get();

    console.log(`Found ${posSnapshot.size} POS items in database:`);
    
    if (posSnapshot.empty) {
      console.log('❌ No POS items found!');
      console.log('\n🔧 This means menu items aren\'t syncing to POS');
      console.log('📋 Solution: Menu items should auto-sync to POS when created');
    } else {
      posSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. ${data.name}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Price: ₱${data.price || 0}`);
        console.log(`   Available: ${data.isAvailable !== false ? 'Yes' : 'No'}`);
        console.log(`   Menu Item ID: ${data.menuItemId || 'None'}`);
        console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}`);
      });
    }

    // Check current branch/location context
    console.log('\n🏪 CHECKING BRANCH/LOCATION CONTEXT:');
    
    // Try to get branch context from localStorage or sessionStorage
    const selectedBranch = localStorage.getItem('selectedBranch') || sessionStorage.getItem('selectedBranch');
    console.log('Selected Branch (storage):', selectedBranch);

    // Check locations
    const locationsRef = db.collection('tenants').doc(tenantId).collection('locations');
    const locationsSnapshot = await locationsRef.get();
    console.log(`Found ${locationsSnapshot.size} locations:`);
    
    locationsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} (ID: ${doc.id})`);
    });

    // Check categories
    console.log('\n📂 CHECKING CATEGORIES:');
    const categoriesRef = db.collection('tenants').doc(tenantId).collection('categories');
    const categoriesSnapshot = await categoriesRef.get();
    console.log(`Found ${categoriesSnapshot.size} categories:`);
    
    categoriesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} (ID: ${doc.id})`);
    });

    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check if menu items have the correct locationId');
    console.log('2. Verify the selected branch matches the menu item\'s locationId');
    console.log('3. Check if menu items are active (status: "active")');
    console.log('4. Verify POS sync is working (menu items should create POS items)');
    console.log('5. Check for JavaScript errors in console during creation');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
})();

console.log('\n📱 To run this debug script:');
console.log('1. Open your app in the browser');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste this entire script');
console.log('4. Press Enter to run');
