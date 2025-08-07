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

async function analyzeAndIdentifyCorrectBranches() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 ANALYZING CURRENT SYSTEM STATE');
    console.log('=' .repeat(60));
    
    // 1. Check what branches are actually available in BranchContext
    console.log('🏪 CHECKING LOCATIONS COLLECTION:');
    const locationsRef = collection(db, 'locations');
    const locationsQuery = query(locationsRef, where('tenantId', '==', TENANT_ID));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    const validBranches = [];
    console.log(`Found ${locationsSnapshot.size} locations for your tenant:`);
    
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - Name: "${data.name}"`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Status: ${data.status || 'unknown'}`);
      console.log(`    Manager: ${data.manager || 'unknown'}`);
      console.log(`    Expected locationId: location_${doc.id}`);
      console.log('');
      
      validBranches.push({
        id: doc.id,
        name: data.name,
        status: data.status,
        manager: data.manager,
        locationId: `location_${doc.id}`
      });
    });
    
    // 2. Check current menu items and their locationIds
    console.log('📋 CURRENT MENU ITEMS:');
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
    
    // 3. Check current POS items and their locationIds
    console.log('\n🛒 CURRENT POS ITEMS:');
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
    
    // 4. Analysis and recommendations
    console.log('\n📊 ANALYSIS:');
    console.log('Valid branch locationIds should be:');
    validBranches.forEach(branch => {
      console.log(`  - ${branch.name}: "${branch.locationId}"`);
    });
    
    console.log('\nCurrent menu item locationIds:');
    Array.from(menuLocationIds).forEach(id => {
      const isValid = validBranches.some(branch => branch.locationId === id);
      console.log(`  - "${id}" ${isValid ? '✅' : '❌'}`);
    });
    
    console.log('\nCurrent POS item locationIds:');
    Array.from(posLocationIds).forEach(id => {
      const isValid = validBranches.some(branch => branch.locationId === id);
      console.log(`  - "${id}" ${isValid ? '✅' : '❌'}`);
    });
    
    // 5. Identify what needs to be done
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    
    const invalidMenuLocationIds = Array.from(menuLocationIds).filter(id => 
      !validBranches.some(branch => branch.locationId === id) && id !== 'NO_LOCATION_ID'
    );
    
    const invalidPosLocationIds = Array.from(posLocationIds).filter(id => 
      !validBranches.some(branch => branch.locationId === id) && id !== 'NO_LOCATION_ID'
    );
    
    if (invalidMenuLocationIds.length > 0) {
      console.log('❌ Invalid menu item locationIds found:');
      invalidMenuLocationIds.forEach(id => console.log(`  - "${id}"`));
    }
    
    if (invalidPosLocationIds.length > 0) {
      console.log('❌ Invalid POS item locationIds found:');
      invalidPosLocationIds.forEach(id => console.log(`  - "${id}"`));
    }
    
    if (validBranches.length > 0) {
      console.log('\n💡 SUGGESTION:');
      console.log('We should assign menu items to one of your valid branches:');
      validBranches.forEach((branch, index) => {
        console.log(`  ${index + 1}. ${branch.name} → ${branch.locationId}`);
      });
      
      // Pick the first active branch or main branch
      const targetBranch = validBranches.find(b => b.status === 'active') || validBranches[0];
      
      if (targetBranch) {
        console.log(`\n🎯 RECOMMENDED TARGET: ${targetBranch.name}`);
        console.log(`   locationId: ${targetBranch.locationId}`);
        console.log('\n   This will make menu items appear in this branch.');
      }
    }
    
    return { validBranches, menuLocationIds: Array.from(menuLocationIds), posLocationIds: Array.from(posLocationIds) };

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeAndIdentifyCorrectBranches().then(() => process.exit(0));
