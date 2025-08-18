// Quick database test to see what's in our collections
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

// Firebase config (you'll need to update this with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

async function testDatabase() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Test tenant structure - replace with your actual tenant ID
    const TENANT_ID = "your-tenant-id-here";
    
    console.log('🔍 Testing database collections...');
    
    // Test orders
    const ordersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    const ordersSnapshot = await getDocs(query(ordersRef, limit(5)));
    console.log('📦 Orders found:', ordersSnapshot.size);
    ordersSnapshot.forEach(doc => {
      console.log('Order:', doc.id, doc.data());
    });
    
    // Test expenses
    const expensesRef = collection(db, `tenants/${TENANT_ID}/expenses`);
    const expensesSnapshot = await getDocs(query(expensesRef, limit(5)));
    console.log('💰 Expenses found:', expensesSnapshot.size);
    expensesSnapshot.forEach(doc => {
      console.log('Expense:', doc.id, doc.data());
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
  }
}

// Uncomment to run: testDatabase();
console.log('📋 Database test script ready. Update firebase config and tenant ID, then uncomment the call to testDatabase()');
