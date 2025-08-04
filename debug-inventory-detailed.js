const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

async function debugInventoryDetails() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // This tenant has both add-ons and inventory
    
    console.log(`\n🔍 Debugging tenant: ${tenantId}`);
    
    // Check inventory in detail
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    console.log(`\n📦 Inventory Items (${inventorySnapshot.size}):`);
    inventorySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`\n  📋 Item ID: ${docSnap.id}`);
      console.log(`     Name: ${data.name || 'UNDEFINED'}`);
      console.log(`     Current Stock: ${data.currentStock || 'UNDEFINED'}`);
      console.log(`     Unit: ${data.unit || 'UNDEFINED'}`);
      console.log(`     Status: ${data.status || 'UNDEFINED'}`);
      console.log(`     Min Stock: ${data.minStock || 'UNDEFINED'}`);
      console.log(`     Tenant ID: ${data.tenantId || 'UNDEFINED'}`);
      console.log(`     Location ID: ${data.locationId || 'UNDEFINED'}`);
    });
    
    // Check add-ons in detail
    const addonsRef = collection(db, 'tenants', tenantId, 'addons');
    const addonsSnapshot = await getDocs(addonsRef);
    
    console.log(`\n🔗 Add-ons (${addonsSnapshot.size}):`);
    addonsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`\n  📋 Add-on ID: ${docSnap.id}`);
      console.log(`     Name: ${data.name || 'UNDEFINED'}`);
      console.log(`     Price: ${data.price || 'UNDEFINED'}`);
      console.log(`     Category: ${data.category || 'UNDEFINED'}`);
      console.log(`     Required: ${data.required || 'false'}`);
    });
    
    // Try to find matching items
    console.log(`\n🔍 Looking for matches between add-ons and inventory:`);
    const addonNames = [];
    addonsSnapshot.forEach(docSnap => {
      addonNames.push(docSnap.data().name);
    });
    
    const inventoryNames = [];
    inventorySnapshot.forEach(docSnap => {
      inventoryNames.push(docSnap.data().name);
    });
    
    addonNames.forEach(addonName => {
      const match = inventoryNames.find(invName => 
        invName.toLowerCase().trim() === addonName.toLowerCase().trim()
      );
      if (match) {
        console.log(`  ✅ Match found: "${addonName}" <-> "${match}"`);
      } else {
        console.log(`  ❌ No match for add-on: "${addonName}"`);
        console.log(`     Available inventory: ${inventoryNames.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugInventoryDetails();
