// Quick inventory deduction test
// Copy and paste this in your browser console after loading the POS page

console.log('🔧 QUICK INVENTORY DEDUCTION TEST');
console.log('================================');

// Function to test the flow
window.quickInventoryTest = async () => {
  try {
    console.log('📝 Step 1: Getting user profile...');
    
    // Get tenant ID from auth context or localStorage
    let tenantId = null;
    
    // Try to get from localStorage first
    try {
      const stored = localStorage.getItem('coretrack_user_profile');
      if (stored) {
        const profile = JSON.parse(stored);
        tenantId = profile.tenantId;
        console.log('✅ Found tenant ID in localStorage:', tenantId);
      }
    } catch (e) {
      console.log('⚠️ No profile in localStorage');
    }
    
    if (!tenantId) {
      console.error('❌ No tenant ID found. Please make sure you\'re logged in.');
      return;
    }
    
    console.log('📝 Step 2: Checking Firebase connection...');
    const { db } = await import('/src/lib/firebase.js');
    const { collection, getDocs } = await import('firebase/firestore');
    
    console.log('📝 Step 3: Checking existing inventory...');
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    console.log(`📦 Found ${inventorySnapshot.size} inventory items:`);
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   • ${data.name}: ${data.currentStock || 0} ${data.unit || 'units'}`);
    });
    
    console.log('📝 Step 4: Checking recent POS orders...');
    const ordersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const ordersSnapshot = await getDocs(ordersRef);
    
    console.log(`📋 Found ${ordersSnapshot.size} POS orders`);
    if (ordersSnapshot.size > 0) {
      const recentOrder = ordersSnapshot.docs[0].data();
      console.log('   Most recent order:', {
        items: recentOrder.items?.map(i => `${i.name} (x${i.quantity})`),
        status: recentOrder.status,
        createdAt: recentOrder.createdAt?.toDate?.()
      });
    }
    
    console.log('📝 Step 5: Checking inventory transactions...');
    const transactionsRef = collection(db, `tenants/${tenantId}/inventoryTransactions`);
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    console.log(`📊 Found ${transactionsSnapshot.size} inventory transactions`);
    if (transactionsSnapshot.size > 0) {
      console.log('   Recent transactions:');
      transactionsSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   • ${data.itemName || 'Unknown'}: ${data.quantityChange || 0} (${data.type || 'unknown'})`);
      });
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Make a test sale in the POS system');
    console.log('2. Watch the console for inventory deduction logs');
    console.log('3. Run this test again to see if inventory changed');
    
    return {
      tenantId,
      inventoryItems: inventorySnapshot.size,
      posOrders: ordersSnapshot.size,
      transactions: transactionsSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('💡 Make sure you\'re on the POS page and logged in');
  }
};

console.log('🚀 Run: quickInventoryTest()');
console.log('Then make a test sale and run it again!');
