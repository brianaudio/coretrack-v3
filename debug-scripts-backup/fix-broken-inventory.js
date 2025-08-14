const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

// Helper function to calculate status
const calculateStatus = (currentStock, minStock) => {
  if (currentStock === 0) return 'out-of-stock';
  if (currentStock <= minStock) return 'low-stock';
  if (currentStock <= minStock * 2) return 'warning';
  return 'good';
};

async function fixBrokenInventoryItems() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    const locationId = 'location_BLbvD7gDm0xGTW5E7dXA'; // Using the location from working items
    const now = Timestamp.now();
    
    // Items that need fixing with their default values
    const itemsToFix = [
      {
        id: 'KynV05VZeFdhlAsdORny',
        name: 'Extra Shot',
        unit: 'ml',
        defaultStock: 200,
        minStock: 50
      },
      {
        id: 'O3NRjfMAwVUMgMMaDw1O',
        name: 'Vanilla Syrup',
        unit: 'ml',
        defaultStock: 100,
        minStock: 25
      },
      {
        id: 'jPtmhhMeUuFrILndeRXn',
        name: 'Whipped Cream',
        unit: 'ml',
        defaultStock: 50,
        minStock: 15
      },
      {
        id: 'skC0CB9s2fdXskMQZMAu',
        name: 'Choco Syrup',
        unit: 'ml',
        defaultStock: 100,
        minStock: 25
      }
    ];
    
    console.log('🔧 Fixing broken inventory items...');
    
    for (const item of itemsToFix) {
      const itemRef = doc(db, 'tenants', tenantId, 'inventory', item.id);
      
      const updateData = {
        name: item.name,
        currentStock: item.defaultStock,
        unit: item.unit,
        minStock: item.minStock,
        status: calculateStatus(item.defaultStock, item.minStock),
        tenantId: tenantId,
        locationId: locationId,
        updatedAt: now,
        lastUpdated: now,
        // Add missing fields if they don't exist
        createdAt: now
      };
      
      await updateDoc(itemRef, updateData);
      console.log(`✅ Fixed: ${item.name} (${item.id})`);
      console.log(`   - Stock: ${item.defaultStock} ${item.unit}`);
      console.log(`   - Min Stock: ${item.minStock} ${item.unit}`);
      console.log(`   - Status: ${calculateStatus(item.defaultStock, item.minStock)}`);
    }
    
    console.log('\n🎉 All inventory items have been fixed!');
    
  } catch (error) {
    console.error('Error fixing inventory items:', error);
  }
}

fixBrokenInventoryItems();
