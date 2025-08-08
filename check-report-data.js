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

async function checkReportData() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Checking data for business reports...');
    
    // Check orders
    const ordersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    const ordersQuery = query(ordersRef, where('locationId', '==', LOCATION_ID));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    console.log(`📋 Orders: ${ordersSnapshot.size}`);
    if (ordersSnapshot.size > 0) {
      const recentOrders = ordersSnapshot.docs.slice(0, 3);
      recentOrders.forEach(doc => {
        const data = doc.data();
        console.log(`  - Order ${doc.id}: ₱${data.total || 0} (${data.status || 'unknown'}) - ${data.paymentMethod || 'unknown'}`);
      });
    }
    
    // Check inventory
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventoryQuery = query(inventoryRef, where('locationId', '==', LOCATION_ID));
    const inventorySnapshot = await getDocs(inventoryQuery);
    
    console.log(`\n📦 Inventory Items: ${inventorySnapshot.size}`);
    if (inventorySnapshot.size > 0) {
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const value = (data.currentStock || 0) * (data.price || data.costPerUnit || 0);
        console.log(`  - ${data.name}: ${data.currentStock || 0} ${data.unit} (₱${value.toFixed(2)} value)`);
      });
    }
    
    // Check expenses
    const expensesRef = collection(db, `tenants/${TENANT_ID}/expenses`);
    const expensesQuery = query(expensesRef, where('locationId', '==', LOCATION_ID));
    const expensesSnapshot = await getDocs(expensesQuery);
    
    console.log(`\n💰 Expenses: ${expensesSnapshot.size}`);
    if (expensesSnapshot.size > 0) {
      expensesSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.description || 'Unknown'}: ₱${data.amount || 0} (${data.paymentMethod || data.method || 'unknown'})`);
      });
    }
    
    // Check shifts
    const shiftsRef = collection(db, `tenants/${TENANT_ID}/shifts`);
    const shiftsQuery = query(shiftsRef, where('locationId', '==', LOCATION_ID));
    const shiftsSnapshot = await getDocs(shiftsQuery);
    
    console.log(`\n⏰ Shifts: ${shiftsSnapshot.size}`);
    if (shiftsSnapshot.size > 0) {
      shiftsSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`  - Shift ${doc.id}: ${data.status || 'unknown'} (${data.employeeName || 'Unknown Employee'})`);
      });
    }
    
    // Check movements
    const movementsRef = collection(db, `tenants/${TENANT_ID}/inventoryMovements`);
    const movementsQuery = query(movementsRef, where('locationId', '==', LOCATION_ID));
    const movementsSnapshot = await getDocs(movementsQuery);
    
    console.log(`\n📊 Inventory Movements: ${movementsSnapshot.size}`);
    
    const totalInventoryValue = inventorySnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + ((data.currentStock || 0) * (data.price || data.costPerUnit || 0));
    }, 0);
    
    console.log(`\n📈 REPORT SUMMARY:`);
    console.log(`✅ Total Inventory Value: ₱${totalInventoryValue.toLocaleString()}`);
    console.log(`✅ Orders Available: ${ordersSnapshot.size > 0 ? 'Yes' : 'No'}`);
    console.log(`✅ Inventory Items: ${inventorySnapshot.size}`);
    console.log(`✅ Stock Movements: ${movementsSnapshot.size}`);
    console.log(`✅ Expenses: ${expensesSnapshot.size}`);
    console.log(`✅ Shifts: ${shiftsSnapshot.size}`);
    
    console.log(`\n🎯 REPORTS STATUS:`);
    console.log(`• Cash Flow Report: ${ordersSnapshot.size > 0 ? '✅ Should show data' : '⚠️ Need orders'}`);
    console.log(`• Inventory Summary: ${inventorySnapshot.size > 0 ? '✅ Should show data' : '⚠️ Need inventory'}`);
    console.log(`• Shift Performance: ${shiftsSnapshot.size > 0 ? '✅ Should show data' : '⚠️ Need shifts'}`);
    console.log(`• Stock Movement: ${movementsSnapshot.size > 0 ? '✅ Should show data' : '⚠️ Need movements'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkReportData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
