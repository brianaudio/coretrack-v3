// Quick check script - add your Firebase config and run this
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit, where } = require('firebase/firestore');

// TO USE THIS SCRIPT:
// 1. Add your Firebase config below
// 2. Replace TENANT_ID with your actual tenant ID
// 3. Run: node check-purchase-inventory.js

const firebaseConfig = {
  // Add your Firebase config here
};

const TENANT_ID = 'active-tenant-123'; // Replace with your tenant ID

async function quickCheck() {
  console.log('🔍 QUICK PURCHASE ORDER & INVENTORY CHECK');
  console.log('=========================================\n');
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Check recent purchase orders
    console.log('📋 Recent Purchase Orders:');
    const ordersRef = collection(db, `tenants/${TENANT_ID}/purchaseOrders`);
    const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(3));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    if (ordersSnapshot.empty) {
      console.log('   ❌ No purchase orders found');
    } else {
      ordersSnapshot.docs.forEach((doc, index) => {
        const order = doc.data();
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Created: ${order.createdAt?.toDate?.() || order.createdAt}`);
        console.log(`      Items: ${order.items?.length || 0}`);
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, i) => {
            console.log(`         ${i + 1}. ${item.itemName} - ${item.quantity} ${item.unit} @ ₱${item.unitPrice}`);
            console.log(`            Received: ${item.quantityReceived || 0}`);
          });
        }
        console.log('');
      });
    }
    
    // Check inventory items
    console.log('📦 Inventory Items:');
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventoryQuery = query(inventoryRef, limit(10));
    const inventorySnapshot = await getDocs(inventoryQuery);
    
    if (inventorySnapshot.empty) {
      console.log('   ❌ No inventory items found');
    } else {
      console.log(`   Found ${inventorySnapshot.size} items:`);
      inventorySnapshot.docs.forEach((doc, index) => {
        const item = doc.data();
        console.log(`   ${index + 1}. ${item.name}`);
        console.log(`      Stock: ${item.currentStock} ${item.unit}`);
        console.log(`      Cost: ₱${item.costPerUnit || 0} per ${item.unit}`);
        console.log(`      Updated: ${item.lastUpdated?.toDate?.() || item.lastUpdated || 'Unknown'}`);
        console.log('');
      });
    }
    
    // Check recent movements
    console.log('📊 Recent Stock Movements:');
    const movementsRef = collection(db, `tenants/${TENANT_ID}/stockMovements`);
    const movementsQuery = query(movementsRef, orderBy('timestamp', 'desc'), limit(5));
    const movementsSnapshot = await getDocs(movementsQuery);
    
    if (movementsSnapshot.empty) {
      console.log('   ❌ No stock movements found');
    } else {
      movementsSnapshot.docs.forEach((doc, index) => {
        const movement = doc.data();
        console.log(`   ${index + 1}. ${movement.itemName} - ${movement.movementType}`);
        console.log(`      Quantity: ${movement.quantity} ${movement.unit || ''}`);
        console.log(`      Reason: ${movement.reason}`);
        console.log(`      Time: ${movement.timestamp?.toDate?.() || movement.timestamp}`);
        console.log('');
      });
    }
    
    console.log('✅ Check complete! Share this output for debugging.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Common issues:');
    console.log('1. Firebase config not set correctly');
    console.log('2. Tenant ID not correct');
    console.log('3. Collections might have different names');
    console.log('4. Firestore rules might be blocking access');
  }
}

// Only run if Firebase config is provided
if (firebaseConfig.projectId) {
  quickCheck();
} else {
  console.log('⚠️ Please add your Firebase config to this script and set the TENANT_ID');
  console.log('');
  console.log('Example config:');
  console.log(`const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};`);
}
