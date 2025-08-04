const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Firebase configuration - Same as main app
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // Active tenant

async function checkRecentOrders() {
  try {
    console.log('🔍 CHECKING RECENT POS ORDERS');
    console.log('=' .repeat(50));
    
    // Get recent orders
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(5));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    console.log(`Found ${ordersSnapshot.docs.length} recent orders:`);
    
    ordersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      
      console.log(`\n${index + 1}. Order ${data.orderNumber || doc.id}:`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Total: $${data.total}`);
      console.log(`   Created: ${createdAt.toLocaleString()}`);
      console.log(`   Items (${data.items.length}):`);
      
      data.items.forEach(item => {
        console.log(`     - ${item.name} x${item.quantity} ($${item.total})`);
      });
    });
    
    // Check inventory transactions
    console.log('\n🔍 CHECKING RECENT INVENTORY TRANSACTIONS');
    console.log('-'.repeat(50));
    
    const transactionsRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    const transactionsQuery = query(transactionsRef, orderBy('createdAt', 'desc'), limit(10));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    console.log(`Found ${transactionsSnapshot.docs.length} recent transactions:`);
    
    transactionsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      
      console.log(`${index + 1}. ${data.itemName}: ${data.quantityChange > 0 ? '+' : ''}${data.quantityChange} (${data.type})`);
      console.log(`   Reason: ${data.reason}`);
      console.log(`   ${data.previousStock} → ${data.newQuantity}`);
      console.log(`   Time: ${createdAt.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkRecentOrders();
