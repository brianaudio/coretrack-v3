// Test script to debug inventory deduction
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase config (you'll need to add your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugInventoryDeduction() {
  try {
    const tenantId = 'your-tenant-id'; // Replace with actual tenant ID
    
    console.log('🔍 Debugging inventory deduction setup...');
    
    // 1. Check if tenant exists
    console.log('1️⃣ Checking tenant:', tenantId);
    
    // 2. Check POS items
    console.log('2️⃣ Checking POS items...');
    const posItemsRef = collection(db, `tenants/${tenantId}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    console.log(`Found ${posSnapshot.docs.length} POS items`);
    
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (ID: ${doc.id})`);
    });
    
    // 3. Check inventory items
    console.log('3️⃣ Checking inventory items...');
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    console.log(`Found ${inventorySnapshot.docs.length} inventory items`);
    
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (Stock: ${data.currentStock})`);
    });
    
    // 4. Check orders
    console.log('4️⃣ Checking recent orders...');
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const ordersSnapshot = await getDocs(ordersRef);
    console.log(`Found ${ordersSnapshot.docs.length} orders`);
    
    // Show last few orders
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).slice(-3);
    
    orders.forEach(order => {
      console.log(`  - Order ${order.orderNumber}: ${order.status} (${order.items?.length || 0} items)`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugInventoryDeduction();
}

module.exports = { debugInventoryDeduction };
