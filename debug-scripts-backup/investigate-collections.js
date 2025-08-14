const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, listCollections } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699770433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function investigateCollections() {
  try {
    console.log('🔍 INVESTIGATING FIREBASE COLLECTIONS');
    console.log('=' .repeat(50));
    
    // Check expenses again with details
    console.log('\n💸 EXPENSES INVESTIGATION:');
    const expensesRef = collection(db, `tenants/${tenantId}/expenses`);
    const expensesSnapshot = await getDocs(expensesRef);
    const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${expenses.length} expenses:`);
    expenses.forEach((exp, i) => {
      console.log(`   ${i + 1}. ID: ${exp.id}`);
      console.log(`      Description: ${exp.description}`);
      console.log(`      Amount: ₱${exp.amount.toLocaleString()}`);
      console.log(`      Date: ${exp.date ? exp.date.toDate().toLocaleDateString() : 'No date'}`);
      console.log(`      Notes: ${exp.notes || 'No notes'}`);
      console.log('');
    });
    
    // Check different possible order collection paths
    const possibleOrderPaths = [
      `tenants/${tenantId}/orders`,
      `tenants/${tenantId}/branches/main/orders`,
      `tenants/${tenantId}/pos_orders`,
      `tenants/${tenantId}/locations/main/orders`
    ];
    
    console.log('🛒 ORDERS INVESTIGATION:');
    for (const path of possibleOrderPaths) {
      try {
        console.log(`\nChecking path: ${path}`);
        const ordersRef = collection(db, path);
        const ordersSnapshot = await getDocs(ordersRef);
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`   Found ${orders.length} orders`);
        if (orders.length > 0) {
          console.log(`   Sample order:`, orders[0]);
        }
      } catch (error) {
        console.log(`   ❌ Path doesn't exist or no access: ${path}`);
      }
    }
    
    // Check branch/location structure
    console.log('\n🏢 BRANCH/LOCATION STRUCTURE:');
    try {
      const branchesRef = collection(db, `tenants/${tenantId}/branches`);
      const branchesSnapshot = await getDocs(branchesRef);
      const branches = branchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`Found ${branches.length} branches:`);
      branches.forEach(branch => {
        console.log(`   Branch ID: ${branch.id}, Name: ${branch.name || 'No name'}`);
      });
    } catch (error) {
      console.log('   ❌ Could not access branches');
    }
    
  } catch (error) {
    console.error('❌ Error investigating collections:', error);
  }
  
  process.exit(0);
}

investigateCollections();
