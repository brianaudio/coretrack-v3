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

async function checkInventoryAfterSale() {
  try {
    console.log('📦 INVENTORY LEVELS AFTER SALE');
    console.log('=' .repeat(50));
    
    // Check current inventory
    const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
    
    console.log('📊 BEFORE vs AFTER Comparison:');
    console.log('(Expected changes based on your sale)');
    console.log();
    
    // Sort items by name for consistent display
    const items = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    // Previous levels (before sale)
    const beforeLevels = {
      'Cups 16 oz': 985,
      'Cups 22 oz': 991,
      'Dome Lids': 983,
      'Straw': 983
    };
    
    items.forEach((item, index) => {
      const before = beforeLevels[item.name];
      const after = item.currentStock;
      const change = before - after;
      
      let status = '';
      if (change > 0) {
        status = `✅ DECREASED by ${change}`;
      } else if (change < 0) {
        status = `⚠️ INCREASED by ${Math.abs(change)}`;
      } else {
        status = `➖ NO CHANGE`;
      }
      
      console.log(`${index + 1}. ${item.name}:`);
      console.log(`   Before: ${before} → After: ${after} (${status})`);
    });
    
    // Check recent orders
    console.log('\n🔍 RECENT ORDERS:');
    console.log('-'.repeat(30));
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(3));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    ordersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      
      console.log(`${index + 1}. Order ${data.orderNumber || doc.id}:`);
      console.log(`   Items: ${data.items.map(i => `${i.name} x${i.quantity}`).join(', ')}`);
      console.log(`   Time: ${createdAt.toLocaleString()}`);
      console.log(`   Status: ${data.status}`);
    });
    
    // Check recent inventory transactions
    console.log('\n🔍 RECENT INVENTORY TRANSACTIONS:');
    console.log('-'.repeat(40));
    const transactionsRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    const transactionsQuery = query(transactionsRef, orderBy('createdAt', 'desc'), limit(5));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    if (transactionsSnapshot.docs.length > 0) {
      transactionsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        
        console.log(`${index + 1}. ${data.itemName}: ${data.quantityChange > 0 ? '+' : ''}${data.quantityChange}`);
        console.log(`   ${data.previousStock} → ${data.newQuantity} (${data.type})`);
        console.log(`   Reason: ${data.reason}`);
        console.log(`   Time: ${createdAt.toLocaleString()}`);
        console.log();
      });
    } else {
      console.log('❌ No recent inventory transactions found!');
    }
    
    console.log('🎯 ANALYSIS:');
    console.log('-'.repeat(20));
    
    // Check if ingredient-based deduction worked
    const cupsChanged = beforeLevels['Cups 16 oz'] !== items.find(i => i.name === 'Cups 16 oz')?.currentStock;
    const lidsChanged = beforeLevels['Dome Lids'] !== items.find(i => i.name === 'Dome Lids')?.currentStock;
    const strawsChanged = beforeLevels['Straw'] !== items.find(i => i.name === 'Straw')?.currentStock;
    
    if (cupsChanged || lidsChanged || strawsChanged) {
      console.log('✅ SUCCESS: Ingredient-based deduction is working!');
      console.log('   Raw ingredients were deducted from inventory.');
    } else {
      console.log('❌ ISSUE: No ingredients were deducted.');
      console.log('   Check if the sale was processed correctly.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkInventoryAfterSale();
