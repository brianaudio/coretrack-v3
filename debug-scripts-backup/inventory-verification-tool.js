// INVENTORY VERIFICATION TOOL - Copy and paste into browser console
// This will check your actual inventory levels RIGHT NOW

console.log('🔍 INVENTORY VERIFICATION STARTING...');
console.log('=' .repeat(60));

// Use your known tenant ID
const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

// Function to check inventory directly
async function checkInventoryNow() {
  try {
    // Try to access Firebase from your already-loaded app
    const { db } = window;
    if (!db) {
      console.error('❌ Cannot access Firebase db. Make sure you are on the CoreTrack app page.');
      return;
    }

    console.log('🔗 Accessing Firebase database...');
    
    // Import Firestore functions
    const { collection, getDocs } = await import('firebase/firestore');
    
    // Get inventory collection
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const snapshot = await getDocs(inventoryRef);
    
    console.log(`\n📦 CURRENT INVENTORY STATUS (${snapshot.size} items):`);
    console.log('=' .repeat(60));
    
    if (snapshot.size === 0) {
      console.log('📭 NO INVENTORY ITEMS FOUND');
      console.log('💡 This might mean:');
      console.log('   • No items have been sold yet');
      console.log('   • Items are in a different location');
      console.log('   • Database path is incorrect');
      return false;
    }
    
    const items = [];
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const item = {
        id: doc.id,
        name: data.name,
        stock: data.currentStock,
        unit: data.unit || 'units'
      };
      items.push(item);
      console.log(`${index + 1}. 📦 ${item.name}: ${item.stock} ${item.unit}`);
    });
    
    // Check for recently created items (auto-created items start with 99 stock)
    const autoCreatedItems = items.filter(item => item.stock === 99);
    const deductedItems = items.filter(item => item.stock < 99 && item.stock > 0);
    
    console.log(`\n🆕 AUTO-CREATED ITEMS (${autoCreatedItems.length}):`);
    autoCreatedItems.forEach(item => {
      console.log(`   • ${item.name}: ${item.stock} (new item, never sold)`);
    });
    
    console.log(`\n📉 ITEMS WITH DEDUCTIONS (${deductedItems.length}):`);
    deductedItems.forEach(item => {
      const deducted = 99 - item.stock;
      console.log(`   • ${item.name}: ${item.stock} (${deducted} sold)`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking inventory:', error);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure you are on the CoreTrack app page');
    console.log('2. Make sure you are logged in');
    console.log('3. Try refreshing the page first');
    return false;
  }
}

// Function to check recent orders
async function checkRecentOrders() {
  try {
    const { db } = window;
    const { collection, getDocs, orderBy, query, limit } = await import('firebase/firestore');
    
    const ordersRef = collection(db, `tenants/${TENANT_ID}/posOrders`);
    const snapshot = await getDocs(ordersRef);
    
    console.log(`\n🛒 RECENT ORDERS (${snapshot.size} total):`);
    console.log('=' .repeat(60));
    
    if (snapshot.size === 0) {
      console.log('📭 NO ORDERS FOUND');
      return;
    }
    
    const orders = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    
    orders.forEach((order, index) => {
      const date = new Date(order.timestamp).toLocaleString();
      console.log(`${index + 1}. 🛒 Order ${order.id.slice(-6)}: $${order.total || 0} (${date})`);
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          console.log(`    • ${item.name} x${item.quantity}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking orders:', error);
  }
}

// Run the checks
async function runFullCheck() {
  console.log('🚀 Starting comprehensive inventory check...\n');
  
  const inventoryExists = await checkInventoryNow();
  await checkRecentOrders();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 DIAGNOSIS:');
  
  if (inventoryExists) {
    console.log('✅ Inventory system is working');
    console.log('💡 If you think items are not deducting:');
    console.log('   1. Check if you are looking at the right branch/location');
    console.log('   2. Items start with 99 stock when first created');
    console.log('   3. Look for items with stock < 99 (those have been sold)');
    console.log('   4. Check the Inventory Center in your app for real-time view');
  } else {
    console.log('❌ Could not verify inventory system');
    console.log('💡 Try running this script while on the main app page');
  }
  
  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Make a test sale right now');
  console.log('2. Run this script again immediately after');
  console.log('3. Compare the stock numbers before and after');
}

// Execute the check
runFullCheck();
