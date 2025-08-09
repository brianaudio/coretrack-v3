// Test script to verify wastage tracker inventory loading
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

// Firebase config (using the same as in the app)
const firebaseConfig = {
  apiKey: "AIzaSyC9LUgCEVtLqixnCqv-i8vvPNyMlYRdCIE",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "991534336560",
  appId: "1:991534336560:web:0c0e36e38dc9d1a1e20b48"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to get branch location ID (same as in app)
function getBranchLocationId(branchId) {
  if (!branchId || branchId === 'main') return 'main'
  return `branch_${branchId}`
}

async function testInventoryLoading() {
  try {
    console.log('🔍 Testing inventory loading for wastage tracker...\n');
    
    // Test with your tenant ID (replace with actual if different)
    const tenantId = 'test-tenant-001';
    const branchId = 'main'; // or your specific branch ID
    const locationId = getBranchLocationId(branchId);
    
    console.log(`📋 Tenant ID: ${tenantId}`);
    console.log(`🏢 Branch ID: ${branchId}`);
    console.log(`📍 Location ID: ${locationId}\n`);
    
    // Query inventory items (same as in the app)
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const q = query(
      inventoryRef, 
      where('locationId', '==', locationId), 
      orderBy('name')
    );
    
    const snapshot = await getDocs(q);
    
    console.log(`📦 Found ${snapshot.docs.length} inventory items:`);
    
    if (snapshot.docs.length === 0) {
      console.log('❌ No inventory items found!');
      console.log('   This could be why the dropdown is empty.');
      console.log('   Check if:');
      console.log('   1. The tenant ID is correct');
      console.log('   2. The location ID format is correct');
      console.log('   3. Inventory items exist in Firestore');
      return;
    }
    
    // Display items with stock info
    snapshot.docs.forEach((doc, index) => {
      const item = doc.data();
      const stockStatus = item.currentStock > 0 ? '✅ In Stock' : '❌ Out of Stock';
      console.log(`${index + 1}. ${item.name} - ${stockStatus} (${item.currentStock} ${item.unit})`);
    });
    
    // Filter items with stock (like in WastageTracker)
    const itemsWithStock = snapshot.docs.filter(doc => {
      const item = doc.data();
      return (item.currentStock || 0) > 0;
    });
    
    console.log(`\n🎯 Items available for wastage tracking: ${itemsWithStock.length}`);
    
    if (itemsWithStock.length === 0) {
      console.log('❌ No items with stock available!');
      console.log('   This is why the wastage dropdown is empty.');
      console.log('   Add stock to inventory items to see them in the dropdown.');
    } else {
      console.log('✅ Items should appear in wastage dropdown!');
      itemsWithStock.forEach((doc, index) => {
        const item = doc.data();
        console.log(`   ${index + 1}. ${item.name} (${item.currentStock} ${item.unit})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing inventory loading:', error);
    console.log('   Check your Firebase configuration and network connection.');
  }
}

// Run the test
testInventoryLoading();
