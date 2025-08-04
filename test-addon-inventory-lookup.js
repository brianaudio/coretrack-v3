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

// Simulate the findInventoryItemByName function
async function findInventoryItemByName(tenantId, itemName) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    const items = [];
    inventorySnapshot.forEach(doc => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return items.find(item => 
      item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
    ) || null;
  } catch (error) {
    console.error('Error finding inventory item by name:', error);
    return null;
  }
}

async function testAddonInventoryLookup() {
  try {
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    // Test add-ons that should have matching inventory
    const testAddons = [
      'Whipped Cream',
      'Extra Shot',
      'Vanilla Syrup',
      'Choco Syrup'
    ];
    
    console.log('🧪 Testing addon inventory lookup...\n');
    
    for (const addonName of testAddons) {
      console.log(`🔍 Looking for: "${addonName}"`);
      
      const inventoryItem = await findInventoryItemByName(tenantId, addonName);
      
      if (inventoryItem) {
        console.log(`✅ Found inventory item:`);
        console.log(`   - ID: ${inventoryItem.id}`);
        console.log(`   - Name: ${inventoryItem.name}`);
        console.log(`   - Current Stock: ${inventoryItem.currentStock} ${inventoryItem.unit}`);
        console.log(`   - Status: ${inventoryItem.status}`);
        console.log(`   - Min Stock: ${inventoryItem.minStock}`);
        console.log(`   - Tenant ID: ${inventoryItem.tenantId}`);
        console.log(`   - Location ID: ${inventoryItem.locationId}`);
      } else {
        console.log(`❌ No inventory item found for "${addonName}"`);
      }
      console.log('');
    }
    
    // Test a non-existent addon
    console.log(`🔍 Testing non-existent addon: "Non-existent Item"`);
    const nonExistentItem = await findInventoryItemByName(tenantId, 'Non-existent Item');
    if (nonExistentItem) {
      console.log(`❌ ERROR: Found item that shouldn't exist!`);
    } else {
      console.log(`✅ Correctly returned null for non-existent item`);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testAddonInventoryLookup();
