/**
 * Test Inventory Deduction - Simulate a sale to test the deduction system
 * Run this in browser console to test if inventory deduction is working
 */

console.log('🧪 TEST: Inventory Deduction System');
console.log('===================================\n');

(async function testInventoryDeduction() {
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

    // 1. Find a POS item to test with
    console.log('\n🔍 FINDING POS ITEM FOR TEST:');
    const posItemsRef = db.collection('tenants').doc(tenantId).collection('posItems');
    const posSnapshot = await posItemsRef.limit(1).get();

    if (posSnapshot.empty) {
      console.log('❌ No POS items found for testing');
      return;
    }

    const testPosItem = posSnapshot.docs[0];
    const testItemData = testPosItem.data();
    
    console.log(`🎯 Testing with POS item: ${testItemData.name}`);
    console.log(`   Has ingredients: ${testItemData.ingredients?.length || 0}`);
    console.log(`   Item ID: ${testPosItem.id}`);

    if (!testItemData.ingredients || testItemData.ingredients.length === 0) {
      console.log('⚠️ This item has no ingredients - deduction will use fallback method');
    } else {
      console.log('✅ This item has ingredients - should use ingredient-based deduction');
      testItemData.ingredients.forEach((ing, i) => {
        console.log(`   ${i + 1}. ${ing.inventoryItemName}: ${ing.quantity} ${ing.unit} (ID: ${ing.inventoryItemId})`);
      });
    }

    // 2. Check inventory levels BEFORE test
    console.log('\n📊 INVENTORY LEVELS BEFORE TEST:');
    if (testItemData.ingredients && testItemData.ingredients.length > 0) {
      for (const ingredient of testItemData.ingredients) {
        const inventoryRef = db.collection('tenants').doc(tenantId).collection('inventory').doc(ingredient.inventoryItemId);
        const inventoryDoc = await inventoryRef.get();
        
        if (inventoryDoc.exists()) {
          const inventoryData = inventoryDoc.data();
          console.log(`   ${inventoryData.name}: ${inventoryData.currentStock} ${inventoryData.unit}`);
        } else {
          console.log(`   ❌ Inventory item not found: ${ingredient.inventoryItemId}`);
        }
      }
    }

    // 3. Simulate the inventory deduction function call
    console.log('\n🧪 SIMULATING INVENTORY DEDUCTION:');
    console.log('This would be called by the POS system when an order is completed...');
    
    const testOrderItems = [{
      itemId: testPosItem.id,
      name: testItemData.name,
      quantity: 1
    }];

    console.log('Test order items:', testOrderItems);
    
    // We can't actually call the processInventoryDeduction function from here
    // because it's not exposed globally, but we can trace what would happen
    
    console.log('\n📝 DEDUCTION TRACE:');
    console.log('1. Order completed with items:', testOrderItems.map(i => i.name));
    console.log('2. processInventoryDeduction() would be called');
    console.log('3. getMenuItemByPOSItemId() would find the POS item');
    
    if (testItemData.ingredients && testItemData.ingredients.length > 0) {
      console.log('4. Ingredient-based deduction would be used:');
      testItemData.ingredients.forEach((ing, i) => {
        const totalUsed = ing.quantity * 1; // quantity of 1 for test
        console.log(`   - Deduct ${totalUsed} ${ing.unit} of ${ing.inventoryItemName}`);
      });
    } else {
      console.log('4. Fallback deduction by name would be used');
      console.log(`   - Look for inventory item named "${testItemData.name}"`);
    }

    console.log('\n💡 TO ACTUALLY TEST:');
    console.log('1. Go to the POS page');
    console.log('2. Add this item to cart:', testItemData.name);
    console.log('3. Complete the sale');
    console.log('4. Check if inventory levels decreased');
    console.log('5. Run this script again to compare before/after levels');

    console.log('\n🔧 IF DEDUCTION NOT WORKING:');
    console.log('1. Check browser console for errors during sale completion');
    console.log('2. Verify POS items have ingredients synced from menu items');
    console.log('3. Ensure inventory items exist with correct IDs');
    console.log('4. Check that processInventoryDeduction is being called');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
})();

console.log('\n📱 To run this test:');
console.log('1. Open your app in the browser');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste this entire script');
console.log('4. Press Enter to run');
console.log('5. Make a sale and run again to see if levels changed');
