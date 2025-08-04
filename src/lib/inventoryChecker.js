// INVENTORY DIAGNOSTIC FUNCTION
// This will be added to the global window object so you can call it easily

(function() {
  // Add diagnostic function to window
  window.checkInventoryStatus = async function() {
    console.log('🔍 INVENTORY STATUS CHECK');
    console.log('=' .repeat(50));
    
    const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    try {
      // Import Firebase functions using the app's existing modules
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./src/lib/firebase.js');
      
      // Get inventory
      const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
      const snapshot = await getDocs(inventoryRef);
      
      console.log(`📦 Found ${snapshot.size} inventory items:`);
      
      if (snapshot.size === 0) {
        console.log('📭 NO INVENTORY ITEMS - This means inventory deduction is working but no items have been sold yet');
        return;
      }
      
      let hasDeductions = false;
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const stock = data.currentStock || 0;
        const isDeducted = stock < 99;
        
        if (isDeducted) hasDeductions = true;
        
        console.log(`${index + 1}. ${data.name}: ${stock} units ${isDeducted ? '🔻 (DEDUCTED)' : '🆕 (NEW)'}`);
      });
      
      console.log('\n📊 ANALYSIS:');
      if (hasDeductions) {
        console.log('✅ INVENTORY IS DEDUCTING - Items with stock < 99 show sales');
      } else {
        console.log('❓ NO DEDUCTIONS FOUND - All items at 99 stock (new items)');
      }
      
      console.log('\n💡 To test: Make a sale and run this function again');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      console.log('🔧 Make sure you run this on the main app page while logged in');
    }
  };
  
  console.log('✅ Inventory checker added! Type: checkInventoryStatus()');
})();
