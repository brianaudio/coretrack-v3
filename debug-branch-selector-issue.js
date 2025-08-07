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

async function debugBranchSelectorIssue() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 DEBUGGING BRANCH SELECTOR ISSUE');
    console.log('=' .repeat(60));
    
    // 1. Check what the BranchContext should be loading
    console.log('🏪 CHECKING LOCATIONS (what BranchContext loads):');
    const locationsRef = collection(db, 'locations');
    const locationsQuery = query(locationsRef, where('tenantId', '==', TENANT_ID));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    console.log(`Found ${locationsSnapshot.size} locations for tenant ${TENANT_ID}:`);
    
    if (locationsSnapshot.size === 0) {
      console.log('❌ NO LOCATIONS FOUND! This is why branch selector is empty.');
      console.log('💡 The BranchContext loads from locations collection.');
      return;
    }
    
    locationsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. Location "${data.name || 'Unnamed'}":`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   TenantId: ${data.tenantId}`);
      console.log(`   Status: ${data.status || 'unknown'}`);
      console.log(`   Manager: ${data.manager || 'unknown'}`);
      console.log(`   IsMain: ${data.isMain || false}`);
      console.log(`   Icon: ${data.icon || 'none'}`);
      console.log(`   Expected in branch selector: ✅`);
    });
    
    // 2. Check if there are any other locations interfering
    console.log('\n🔍 CHECKING ALL LOCATIONS (potential interference):');
    const allLocationsRef = collection(db, 'locations');
    const allLocationsSnapshot = await getDocs(allLocationsRef);
    
    console.log(`\nTotal locations in database: ${allLocationsSnapshot.size}`);
    
    let yourCount = 0;
    let otherCount = 0;
    
    allLocationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.tenantId === TENANT_ID) {
        yourCount++;
      } else {
        otherCount++;
        console.log(`  Other tenant: "${data.name || 'Unnamed'}" (tenant: ${data.tenantId || 'unknown'})`);
      }
    });
    
    console.log(`\nYour locations: ${yourCount}`);
    console.log(`Other tenants: ${otherCount}`);
    
    // 3. Check user profile to see what branch should be selected
    console.log('\n👤 CHECKING USER PROFILE:');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let userProfile = null;
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.tenantId === TENANT_ID) {
        userProfile = { id: doc.id, ...data };
        console.log(`Found user profile: ${data.email || doc.id}`);
        console.log(`  Selected Branch ID: ${data.selectedBranchId || 'none'}`);
        console.log(`  Tenant ID: ${data.tenantId}`);
      }
    });
    
    if (!userProfile) {
      console.log('❌ No user profile found with your tenant ID');
    }
    
    // 4. Verify menu items are properly assigned
    console.log('\n📋 CHECKING MENU ITEMS:');
    const menuItemsRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    
    const locationAssignments = {};
    menuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const locationId = data.locationId || 'NO_LOCATION_ID';
      if (!locationAssignments[locationId]) {
        locationAssignments[locationId] = 0;
      }
      locationAssignments[locationId]++;
    });
    
    console.log('Menu items by location:');
    Object.entries(locationAssignments).forEach(([locationId, count]) => {
      console.log(`  ${locationId}: ${count} items`);
    });
    
    // 5. Provide diagnosis
    console.log('\n🔬 DIAGNOSIS:');
    
    if (locationsSnapshot.size === 0) {
      console.log('❌ ISSUE: No locations found for your tenant');
      console.log('💡 SOLUTION: The locations were likely deleted during cleanup');
      console.log('   Need to recreate locations in the locations collection');
    } else if (locationsSnapshot.size === 1) {
      console.log('⚠️ ISSUE: Only 1 location found');
      console.log('💡 This should work, but branch selector might not show dropdown');
    } else {
      console.log('✅ Locations look good, issue might be elsewhere');
      console.log('💡 Check browser console for JavaScript errors');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugBranchSelectorIssue().then(() => process.exit(0));
