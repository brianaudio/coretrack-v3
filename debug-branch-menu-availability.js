const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

// Branch ID mapping - these should match your actual branch IDs
const BRANCHES = {
  'SMS': 'wPfXsD2vhkwJhYJr8nxC',        // SMS branch
  'DMMMSU': '4W7eenWfYtfP0sPyeflr'      // DMMMSU branch
};

async function debugBranchMenuAvailability() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 DEBUGGING BRANCH MENU AVAILABILITY');
    console.log('=' .repeat(60));
    
    // Helper function to get location ID for branch
    const getBranchLocationId = (branchId) => `location_${branchId}`;
    
    for (const [branchName, branchId] of Object.entries(BRANCHES)) {
      const locationId = getBranchLocationId(branchId);
      
      console.log(`\n🏪 CHECKING ${branchName} BRANCH:`);
      console.log(`   Branch ID: ${branchId}`);
      console.log(`   Location ID: ${locationId}`);
      console.log('   ' + '-'.repeat(40));
      
      // 1. Check Menu Items for this branch
      console.log('   📋 MENU ITEMS:');
      const menuItemsRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
      const menuSnapshot = await getDocs(menuItemsRef);
      
      let branchMenuItems = [];
      let totalMenuItems = menuSnapshot.size;
      
      menuSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId === locationId) {
          branchMenuItems.push({
            id: doc.id,
            name: data.name,
            category: data.category,
            status: data.status,
            locationId: data.locationId
          });
        }
      });
      
      console.log(`   Found ${branchMenuItems.length} menu items (out of ${totalMenuItems} total)`);
      
      if (branchMenuItems.length > 0) {
        console.log('   Items:');
        branchMenuItems.forEach(item => {
          console.log(`     - ${item.name} (${item.category}) [${item.status}]`);
        });
      } else {
        console.log('   ❌ NO MENU ITEMS found for this branch!');
      }
      
      // 2. Check POS Items for this branch
      console.log(`\n   🛒 POS ITEMS:`);
      const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
      const posSnapshot = await getDocs(posItemsRef);
      
      let branchPOSItems = [];
      let totalPOSItems = posSnapshot.size;
      
      posSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId === locationId) {
          branchPOSItems.push({
            id: doc.id,
            name: data.name,
            category: data.category,
            isAvailable: data.isAvailable,
            locationId: data.locationId
          });
        }
      });
      
      console.log(`   Found ${branchPOSItems.length} POS items (out of ${totalPOSItems} total)`);
      
      if (branchPOSItems.length > 0) {
        console.log('   Available POS Items:');
        branchPOSItems
          .filter(item => item.isAvailable)
          .forEach(item => {
            console.log(`     ✅ ${item.name} (${item.category})`);
          });
          
        const unavailableItems = branchPOSItems.filter(item => !item.isAvailable);
        if (unavailableItems.length > 0) {
          console.log('   Unavailable POS Items:');
          unavailableItems.forEach(item => {
            console.log(`     ❌ ${item.name} (${item.category})`);
          });
        }
      } else {
        console.log('   ❌ NO POS ITEMS found for this branch!');
      }
      
      // 3. Summary for this branch
      console.log(`\n   📊 ${branchName} SUMMARY:`);
      console.log(`     Menu Items: ${branchMenuItems.length}`);
      console.log(`     POS Items: ${branchPOSItems.length}`);
      console.log(`     Available POS Items: ${branchPOSItems.filter(item => item.isAvailable).length}`);
      
      if (branchMenuItems.length > 0 && branchPOSItems.length === 0) {
        console.log(`     🚨 ISSUE: Menu items exist but NO POS items! Sync needed.`);
      } else if (branchMenuItems.length === 0 && branchPOSItems.length > 0) {
        console.log(`     🚨 ISSUE: POS items exist but NO menu items! Data inconsistency.`);
      } else if (branchMenuItems.length === 0 && branchPOSItems.length === 0) {
        console.log(`     ⚠️ EMPTY: No menu or POS items for this branch.`);
      } else {
        console.log(`     ✅ OK: Both menu and POS items exist.`);
      }
    }
    
    // 4. Check for items without locationId
    console.log(`\n🔍 CHECKING FOR ITEMS WITHOUT LOCATION ID:`);
    
    const menuItemsRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const allMenuSnapshot = await getDocs(menuItemsRef);
    
    let itemsWithoutLocation = [];
    allMenuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId) {
        itemsWithoutLocation.push({
          id: doc.id,
          name: data.name,
          category: data.category
        });
      }
    });
    
    if (itemsWithoutLocation.length > 0) {
      console.log(`Found ${itemsWithoutLocation.length} menu items WITHOUT locationId:`);
      itemsWithoutLocation.forEach(item => {
        console.log(`  - ${item.name} (${item.category})`);
      });
      console.log('\n💡 These items won\'t show up in any branch POS!');
    } else {
      console.log('✅ All menu items have locationId assigned.');
    }
    
    // 5. Check POS items without locationId
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const allPOSSnapshot = await getDocs(posItemsRef);
    
    let posItemsWithoutLocation = [];
    allPOSSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId) {
        posItemsWithoutLocation.push({
          id: doc.id,
          name: data.name,
          category: data.category
        });
      }
    });
    
    if (posItemsWithoutLocation.length > 0) {
      console.log(`\nFound ${posItemsWithoutLocation.length} POS items WITHOUT locationId:`);
      posItemsWithoutLocation.forEach(item => {
        console.log(`  - ${item.name} (${item.category})`);
      });
      console.log('\n💡 These items won\'t show up in any branch POS!');
    } else {
      console.log('\n✅ All POS items have locationId assigned.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugBranchMenuAvailability().then(() => process.exit(0));
