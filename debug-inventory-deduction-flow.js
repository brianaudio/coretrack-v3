// Debug script to test inventory deduction flow
// Run this in browser console after making a sale to see what's happening

console.log('🔧 INVENTORY DEDUCTION DEBUG SCRIPT');
console.log('='.repeat(50));

// Test 1: Check if the integration function exists
console.log('1️⃣ Testing if processInventoryDeduction function exists...');
try {
  // This should be accessible in the browser if imported correctly
  console.log('✅ Integration functions should be available');
} catch (error) {
  console.error('❌ Integration function not available:', error);
}

// Test 2: Check Firebase connection
console.log('\n2️⃣ Testing Firebase connection...');
const testFirebaseConnection = async () => {
  try {
    const { db } = await import('./src/lib/firebase.js');
    console.log('✅ Firebase connection available');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

// Test 3: Monitor POS order creation
console.log('\n3️⃣ To test inventory deduction:');
console.log('   🛒 Add items to POS cart');
console.log('   💳 Complete a payment');
console.log('   👀 Watch browser console for these logs:');
console.log('     • "🚨 INVENTORY DEDUCTION FUNCTION CALLED! 🚨"');
console.log('     • "🔄 Processing inventory deduction for X items"');
console.log('     • "📦 Processing: [Item Name] (xQuantity)"');

// Test 4: Check order status
console.log('\n4️⃣ After making a sale, check:');
console.log('   📊 Firebase Console: tenants/{tenantId}/posOrders');
console.log('   📦 Firebase Console: tenants/{tenantId}/inventory');
console.log('   📋 Firebase Console: tenants/{tenantId}/inventoryTransactions');

// Test 5: Manual test function
window.testInventoryDeduction = async () => {
  console.log('\n🧪 MANUAL INVENTORY TEST');
  console.log('='.repeat(30));
  
  try {
    // Get current user's tenant ID
    const profile = JSON.parse(localStorage.getItem('coretrack_user_profile') || '{}');
    const tenantId = profile.tenantId;
    
    if (!tenantId) {
      console.error('❌ No tenant ID found. Please log in first.');
      return;
    }
    
    console.log('🎯 Tenant ID:', tenantId);
    
    // Check if there are any inventory items
    const { db } = await import('./src/lib/firebase.js');
    const { collection, getDocs } = await import('firebase/firestore');
    
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const snapshot = await getDocs(inventoryRef);
    
    console.log('📦 Found', snapshot.size, 'inventory items:');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   • ${data.name}: ${data.currentStock} ${data.unit}`);
    });
    
    if (snapshot.size === 0) {
      console.log('⚠️ No inventory items found. This might be why deduction isn\'t working.');
      console.log('💡 Try adding some inventory items first.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

console.log('\n🚀 QUICK TESTS:');
console.log('   Run: testInventoryDeduction()');
console.log('   Then: Make a test sale and watch console');

console.log('\n💡 TROUBLESHOOTING STEPS:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Console tab');
console.log('3. Run: testInventoryDeduction()');
console.log('4. Make a test sale in POS');
console.log('5. Look for inventory deduction logs');

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log('• Sale completes successfully');
console.log('• Console shows "INVENTORY DEDUCTION FUNCTION CALLED"');
console.log('• Inventory quantities decrease');
console.log('• Transaction records created');
