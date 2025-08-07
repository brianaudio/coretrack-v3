/**
 * Debug Inventory Deduction Issue - Browser Console Version
 * Run this in the browser console on your app to diagnose inventory deduction problems
 */

console.log('🔍 DEBUG: Inventory Auto-Deduction Issue');
console.log('=========================================\n');

(async function debugInventoryDeduction() {
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.log('❌ Firebase not available. Make sure you\'re on the app page.');
      return;
    }

    const db = firebase.firestore();
    const auth = firebase.auth();
    const user = auth.currentUser;

    if (!user) {
      console.log('❌ No user logged in');
      return;
    }

    const tenantId = user.uid;
    console.log('🏢 Tenant ID:', tenantId);

    // 1. Check menu items and their ingredients
    console.log('\n📋 CHECKING MENU ITEMS AND INGREDIENTS:');
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const menuSnapshot = await menuItemsRef.orderBy('createdAt', 'desc').limit(5).get();

    if (menuSnapshot.empty) {
      console.log('❌ No menu items found');
      return;
    }

    menuSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.name}`);
      console.log(`   Category: ${data.category}`);
      console.log(`   Price: ₱${data.price}`);
      console.log(`   Ingredients: ${data.ingredients?.length || 0}`);
      
      if (data.ingredients && data.ingredients.length > 0) {
        data.ingredients.forEach((ing, i) => {
          console.log(`     ${i + 1}. ${ing.inventoryItemName || ing.name || 'Unknown'}`);
          console.log(`        - Quantity: ${ing.quantity || 0} ${ing.unit || 'units'}`);
          console.log(`        - Inventory ID: ${ing.inventoryItemId || 'Missing!'}`);
        });
      } else {
        console.log('     ⚠️ NO INGREDIENTS FOUND!');
      }
    });

    // 2. Check POS items and their ingredients
    console.log('\n🛒 CHECKING POS ITEMS AND INGREDIENTS:');
    const posItemsRef = db.collection('tenants').doc(tenantId).collection('posItems');
    const posSnapshot = await posItemsRef.orderBy('createdAt', 'desc').limit(5).get();

    if (posSnapshot.empty) {
      console.log('❌ No POS items found');
      return;
    }

    posSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.name}`);
      console.log(`   Available: ${data.isAvailable !== false ? 'Yes' : 'No'}`);
      console.log(`   Menu Item ID: ${data.menuItemId || 'Missing!'}`);
      console.log(`   Ingredients: ${data.ingredients?.length || 0}`);
      
      if (data.ingredients && data.ingredients.length > 0) {
        data.ingredients.forEach((ing, i) => {
          console.log(`     ${i + 1}. ${ing.inventoryItemName || ing.name || 'Unknown'}`);
          console.log(`        - Quantity: ${ing.quantity || 0} ${ing.unit || 'units'}`);
          console.log(`        - Inventory ID: ${ing.inventoryItemId || 'Missing!'}`);
        });
      } else {
        console.log('     ⚠️ NO INGREDIENTS SYNCED TO POS!');
      }
    });

    // 3. Check recent orders and if they triggered deductions
    console.log('\n📦 CHECKING RECENT ORDERS:');
    const ordersRef = db.collection('tenants').doc(tenantId).collection('orders');
    const ordersSnapshot = await ordersRef.orderBy('completedAt', 'desc').limit(3).get();

    if (ordersSnapshot.empty) {
      console.log('❌ No orders found');
    } else {
      ordersSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. Order ${doc.id}`);
        console.log(`   Total: ₱${data.total}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Items: ${data.items?.length || 0}`);
        console.log(`   Completed: ${data.completedAt ? new Date(data.completedAt.seconds * 1000).toLocaleString() : 'Not completed'}`);
        
        if (data.items && data.items.length > 0) {
          data.items.forEach((item, i) => {
            console.log(`     ${i + 1}. ${item.name} (x${item.quantity})`);
            console.log(`        - Item ID: ${item.itemId}`);
          });
        }
      });
    }

    // 4. Check inventory levels before and after sales
    console.log('\n📊 CHECKING INVENTORY LEVELS:');
    const inventoryRef = db.collection('tenants').doc(tenantId).collection('inventory');
    const inventorySnapshot = await inventoryRef.orderBy('updatedAt', 'desc').limit(10).get();

    if (inventorySnapshot.empty) {
      console.log('❌ No inventory items found');
    } else {
      console.log(`Found ${inventorySnapshot.size} inventory items:`);
      inventorySnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. ${data.name}`);
        console.log(`   Current Stock: ${data.currentStock || 0} ${data.unit || 'units'}`);
        console.log(`   Cost Per Unit: ₱${data.costPerUnit || 0}`);
        console.log(`   Last Updated: ${data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleString() : 'Unknown'}`);
      });
    }

    console.log('\n🔧 DIAGNOSIS CHECKLIST:');
    console.log('========================');
    console.log('✅ = Good | ❌ = Problem | ⚠️ = Check Required');
    console.log('1. Menu items have ingredients with valid inventoryItemId');
    console.log('2. POS items have ingredients synced from menu items');
    console.log('3. Orders are being created with correct item IDs');
    console.log('4. Inventory deduction function is being called during order completion');
    
    console.log('\n💡 COMMON SOLUTIONS:');
    console.log('- If POS items missing ingredients: Menu → POS sync issue');
    console.log('- If orders missing item IDs: POS order creation issue');
    console.log('- If no inventory updates: Deduction function not running');
    console.log('- If ingredients missing inventoryItemId: Menu creation issue');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
})();

console.log('\n📱 To run this debug script:');
console.log('1. Open your app in the browser');
console.log('2. Go to MenuBuilder or POS page');
console.log('3. Open browser console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Press Enter to run');
console.log('6. Try making a sale and run this again to compare before/after');
