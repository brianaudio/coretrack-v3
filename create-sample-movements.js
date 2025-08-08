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

async function createSampleMovements() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('📊 Creating sample inventory movements...');
    
    // Check existing movements
    const movementsRef = collection(db, `tenants/${TENANT_ID}/inventoryMovements`);
    const existingQuery = query(movementsRef, where('locationId', '==', LOCATION_ID));
    const existingSnapshot = await getDocs(existingQuery);
    
    console.log(`📦 Found ${existingSnapshot.size} existing movements`);
    
    if (existingSnapshot.size > 5) {
      console.log('✅ Movements already exist. Skipping creation.');
      return;
    }
    
    // Sample movements (recent activity)
    const sampleMovements = [
      {
        itemId: 'coffee-beans-001',
        itemName: 'Coffee Beans - Arabica',
        movementType: 'receiving',
        quantity: 10,
        previousStock: 15,
        newStock: 25,
        unit: 'kg',
        reason: 'Weekly delivery from supplier',
        userId: 'admin',
        userName: 'System Admin',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
        tenantId: TENANT_ID,
        locationId: LOCATION_ID
      },
      {
        itemId: 'milk-001',
        itemName: 'Milk - Fresh',
        movementType: 'usage',
        quantity: -5,
        previousStock: 20,
        newStock: 15,
        unit: 'liters',
        reason: 'Daily coffee production',
        userId: 'barista01',
        userName: 'Jane Barista',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1 day ago
        tenantId: TENANT_ID,
        locationId: LOCATION_ID
      },
      {
        itemId: 'sugar-001',
        itemName: 'Sugar - White',
        movementType: 'usage',
        quantity: -2,
        previousStock: 10,
        newStock: 8,
        unit: 'kg',
        reason: 'Customer orders',
        userId: 'barista02',
        userName: 'Mike Barista',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
        tenantId: TENANT_ID,
        locationId: LOCATION_ID
      },
      {
        itemId: 'cups-001',
        itemName: 'Disposable Cups - 12oz',
        movementType: 'usage',
        quantity: -50,
        previousStock: 300,
        newStock: 250,
        unit: 'pieces',
        reason: 'Daily service',
        userId: 'barista01',
        userName: 'Jane Barista',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)), // 3 hours ago
        tenantId: TENANT_ID,
        locationId: LOCATION_ID
      },
      {
        itemId: 'syrup-001',
        itemName: 'Chocolate Syrup',
        movementType: 'waste',
        quantity: -2,
        previousStock: 5,
        newStock: 3,
        unit: 'bottles',
        reason: 'Expired bottles disposed',
        userId: 'manager01',
        userName: 'Store Manager',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
        tenantId: TENANT_ID,
        locationId: LOCATION_ID
      }
    ];
    
    console.log('📝 Adding inventory movements...');
    for (const movement of sampleMovements) {
      const docRef = await addDoc(movementsRef, movement);
      console.log(`✅ Added movement: ${movement.itemName} (${movement.quantity > 0 ? '+' : ''}${movement.quantity} ${movement.unit}) - ${movement.reason}`);
    }
    
    console.log('\n🎉 Sample movements created successfully!');
    console.log('\nMovement Summary:');
    console.log('• Coffee Beans: +10 kg (Receiving)');
    console.log('• Milk: -5 liters (Usage)');
    console.log('• Sugar: -2 kg (Usage)');
    console.log('• Cups: -50 pieces (Usage)');
    console.log('• Chocolate Syrup: -2 bottles (Waste)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSampleMovements().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
