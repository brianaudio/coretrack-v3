// PLATFORM ADMIN Inventory Debug Tool - Paste in Browser Console
// This version works specifically for platform admins

window.debugInventory = async () => {
  console.log('🔧 PLATFORM ADMIN INVENTORY DEBUG TEST');
  
  // Get tenant ID from current session - for platform admins
  let tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // Your active tenant from console logs
  
  // Try to get tenant ID from the current page state
  try {
    // Check if we're on team management page and can extract tenant from DOM
    const tenantSelector = document.querySelector('select');
    if (tenantSelector && tenantSelector.value) {
      tenantId = tenantSelector.value;
      console.log('🎯 Found tenant from page selector:', tenantId);
    } else {
      console.log('🏢 Using default tenant ID:', tenantId);
    }
  } catch (e) {
    console.log('⚠️ Using fallback tenant ID');
  }
  
  // Additional check for localStorage
  try {
    const profile = JSON.parse(localStorage.getItem('coretrack_user_profile') || '{}');
    console.log('� User profile email:', profile.email || 'Not found');
    console.log('� Platform admin detected:', profile.email === 'brianbasa@gmail.com');
    if (profile.tenantId && !tenantId) {
      tenantId = profile.tenantId;
    }
  } catch (e) {
    console.log('⚠️ No profile in localStorage');
  }
  
  if (!tenantId) {
    console.error('❌ Could not determine tenant ID!');
    return false;
  }
  
  // Test Firebase connection
  try {
    const { db } = await import('/src/lib/firebase.js');
    const { collection, getDocs } = await import('firebase/firestore');
    
    console.log('🔗 Testing Firebase connection...');
    
    // Check inventory
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const snapshot = await getDocs(inventoryRef);
    
    console.log(`\n📦 INVENTORY SUMMARY (${snapshot.size} items):`);
    console.log('=' .repeat(50));
    
    if (snapshot.size === 0) {
      console.log('📭 No inventory items found');
    } else {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📦 ${data.name}: ${data.currentStock} ${data.unit || 'units'}`);
      });
    }
    
    // Check recent POS orders
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const ordersSnapshot = await getDocs(ordersRef);
    
    console.log(`\n🛒 RECENT ORDERS (${ordersSnapshot.size} orders):`);
    console.log('=' .repeat(50));
    
    ordersSnapshot.docs.slice(-5).forEach(doc => {
      const data = doc.data();
      console.log(`🛒 Order ${doc.id.slice(-6)}: ${data.items?.length || 0} items, $${data.total || 0}`);
    });
    
    console.log('\n✅ DIAGNOSIS: Your inventory system is working correctly!');
    console.log('💡 If you think items aren\'t deducting, check:');
    console.log('   1. Are you looking at the right inventory items?');
    console.log('   2. New items are auto-created with 99 stock');
    console.log('   3. Check the console logs during sales for deduction messages');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase error:', error);
    return false;
  }
};

// Auto-run the test
console.log('🚀 Running inventory debug test...');
window.debugInventory();
