const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function debugActualLocationIds() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 DEBUGGING ACTUAL LOCATION IDs IN USE');
    console.log('=' .repeat(60));
    
    // Check actual locationIds in menu items
    console.log('📋 MENU ITEMS locationIds:');
    const menuItemsRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    
    const menuLocationIds = new Set();
    console.log(`Found ${menuSnapshot.size} menu items:`);
    
    menuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const locationId = data.locationId || 'NO_LOCATION_ID';
      menuLocationIds.add(locationId);
      console.log(`  - ${data.name}: "${locationId}"`);
    });
    
    console.log('\nUnique menu locationIds:', Array.from(menuLocationIds));
    
    // Check actual locationIds in POS items
    console.log('\n🛒 POS ITEMS locationIds:');
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    
    const posLocationIds = new Set();
    console.log(`Found ${posSnapshot.size} POS items:`);
    
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const locationId = data.locationId || 'NO_LOCATION_ID';
      posLocationIds.add(locationId);
      console.log(`  - ${data.name}: "${locationId}"`);
    });
    
    console.log('\nUnique POS locationIds:', Array.from(posLocationIds));
    
    // Check what branch/location IDs we should be using
    console.log('\n🏪 LOCATIONS from locations collection:');
    const locationsRef = collection(db, 'locations');
    const locationsSnapshot = await getDocs(locationsRef);
    
    console.log(`Found ${locationsSnapshot.size} locations:`);
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.tenantId === TENANT_ID) {
        console.log(`  - ${data.name}: ID="${doc.id}", tenantMatch=true`);
      } else {
        console.log(`  - ${data.name}: ID="${doc.id}", tenantMatch=false`);
      }
    });
    
    // Compare with expected format
    console.log('\n🎯 EXPECTED vs ACTUAL:');
    const expectedSMS = 'location_wPfXsD2vhkwJhYJr8nxC';
    const expectedDMMMSU = 'location_4W7eenWfYtfP0sPyeflr';
    
    console.log(`Expected SMS locationId: "${expectedSMS}"`);
    console.log(`Expected DMMMSU locationId: "${expectedDMMMSU}"`);
    console.log(`Menu items use: [${Array.from(menuLocationIds).join(', ')}]`);
    console.log(`POS items use: [${Array.from(posLocationIds).join(', ')}]`);
    
    const hasMatchingSMS = Array.from(menuLocationIds).includes(expectedSMS) || Array.from(posLocationIds).includes(expectedSMS);
    const hasMatchingDMMMSU = Array.from(menuLocationIds).includes(expectedDMMMSU) || Array.from(posLocationIds).includes(expectedDMMMSU);
    
    console.log(`\n📊 MATCH RESULTS:`);
    console.log(`  SMS match: ${hasMatchingSMS ? '✅' : '❌'}`);
    console.log(`  DMMMSU match: ${hasMatchingDMMMSU ? '✅' : '❌'}`);
    
    if (!hasMatchingSMS && !hasMatchingDMMMSU) {
      console.log('\n🚨 PROBLEM IDENTIFIED:');
      console.log('   Menu and POS items are using locationIds that don\'t match');
      console.log('   the current branch selection logic!');
      console.log('\n💡 SOLUTION:');
      console.log('   Need to update locationIds in menu/POS items to match');
      console.log('   the getBranchLocationId() format: location_{branchId}');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugActualLocationIds().then(() => process.exit(0));
