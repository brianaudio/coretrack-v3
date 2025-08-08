const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
const LOCATION_ID = 'location_VhbmQwJkKA3FPZR1UqLj';

async function createSampleInventory() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🏗️ Creating sample inventory items...');
    
    // Check existing inventory first
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const existingQuery = query(inventoryRef, where('locationId', '==', LOCATION_ID));
    const existingSnapshot = await getDocs(existingQuery);
    
    console.log(`📦 Found ${existingSnapshot.size} existing inventory items`);
    
    if (existingSnapshot.size > 0) {
      console.log('Existing items:');
      existingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.name}: ${data.currentStock || 0} ${data.unit} (${data.status || 'unknown'})`);
      });
      console.log('\n✅ Inventory already exists. Reports should now show data!');
      return;
    }
    
    // Sample inventory items with realistic data
    const sampleItems = [
      {
        name: 'Coffee Beans - Arabica',
        category: 'Coffee',
        currentStock: 25,
        minStock: 5,
        maxStock: 50,
        unit: 'kg',
        price: 450.00,
        costPerUnit: 450.00,
        supplier: 'Local Coffee Farm',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        isPerishable: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'good'
      },
      {
        name: 'Milk - Fresh',
        category: 'Dairy',
        currentStock: 15,
        minStock: 3,
        maxStock: 30,
        unit: 'liters',
        price: 85.00,
        costPerUnit: 85.00,
        supplier: 'Dairy Co.',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        isPerishable: true,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'good'
      },
      {
        name: 'Sugar - White',
        category: 'Sweeteners',
        currentStock: 8,
        minStock: 10,
        maxStock: 25,
        unit: 'kg',
        price: 65.00,
        costPerUnit: 65.00,
        supplier: 'Sugar Mills Inc.',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        isPerishable: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'low'
      },
      {
        name: 'Disposable Cups - 12oz',
        category: 'Supplies',
        currentStock: 250,
        minStock: 50,
        maxStock: 500,
        unit: 'pieces',
        price: 2.50,
        costPerUnit: 2.50,
        supplier: 'Package Solutions',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        isPerishable: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'good'
      },
      {
        name: 'Chocolate Syrup',
        category: 'Syrups',
        currentStock: 3,
        minStock: 5,
        maxStock: 15,
        unit: 'bottles',
        price: 125.00,
        costPerUnit: 125.00,
        supplier: 'Flavor House',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        isPerishable: true,
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'low'
      },
      {
        name: 'Napkins',
        category: 'Supplies',
        currentStock: 0,
        minStock: 20,
        maxStock: 100,
        unit: 'packs',
        price: 45.00,
        costPerUnit: 45.00,
        supplier: 'Paper Products Co.',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        isPerishable: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        status: 'out'
      }
    ];
    
    console.log('📝 Adding inventory items...');
    for (const item of sampleItems) {
      const docRef = await addDoc(inventoryRef, item);
      console.log(`✅ Added: ${item.name} (${item.currentStock} ${item.unit}) - ID: ${docRef.id}`);
    }
    
    console.log('\n🎉 Sample inventory created successfully!');
    console.log('\nInventory Summary:');
    console.log('• Coffee Beans: 25 kg (Good stock) - ₱11,250 value');
    console.log('• Milk: 15 liters (Good stock) - ₱1,275 value');
    console.log('• Sugar: 8 kg (⚠️ Low stock) - ₱520 value');
    console.log('• Cups: 250 pieces (Good stock) - ₱625 value');
    console.log('• Chocolate Syrup: 3 bottles (⚠️ Low stock) - ₱375 value');
    console.log('• Napkins: 0 packs (❌ Out of stock) - ₱0 value');
    console.log('\nTotal Inventory Value: ₱14,045');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSampleInventory().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
