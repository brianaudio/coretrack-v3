/**
 * Complete Menu Price Sync Test
 * 
 * This script helps you test the entire menu price synchronization flow
 * to ensure it's working correctly after purchase order deliveries.
 */

console.log('🧪 Complete Menu Price Sync Test');
console.log('=================================\n');

console.log('📋 Testing Steps:');
console.log('');
console.log('1. **Create Test Data**');
console.log('   - Add an inventory item (e.g., "Chicken Breast")');
console.log('   - Add a menu item that uses this ingredient');
console.log('   - Note the current cost and menu price');
console.log('');
console.log('2. **Create Purchase Order**');
console.log('   - Create a purchase order for the ingredient');
console.log('   - Use a DIFFERENT unit price (higher or lower)');
console.log('   - Example: Current cost ₱120/kg, use ₱150/kg in PO');
console.log('');
console.log('3. **Deliver Purchase Order**');
console.log('   - Go to Purchase Orders module');
console.log('   - Mark the order as delivered');
console.log('   - Watch the browser console for messages');
console.log('');
console.log('4. **Verify Results**');
console.log('   - Check inventory cost was updated');
console.log('   - Check menu item price was adjusted');
console.log('   - Look for console messages about price updates');
console.log('');

console.log('🔍 Browser Console Check:');
console.log('');
console.log('Copy and paste this code in your browser console WHILE delivering the purchase order:\n');

console.log(`
// Real-time Menu Price Sync Monitor
(function() {
  console.log('🔍 Starting Menu Price Sync Monitor...');
  
  // Override console.log to catch our messages
  const originalLog = console.log;
  console.log = function(...args) {
    if (args.some(arg => typeof arg === 'string' && (
      arg.includes('📊 Price Update') ||
      arg.includes('📋 Menu Price Update') ||
      arg.includes('💰 Found affected ingredient') ||
      arg.includes('processMenuPriceUpdatesAfterDelivery')
    ))) {
      originalLog('🎯 MENU SYNC:', ...args);
    }
    originalLog.apply(console, arguments);
  };
  
  console.log('✅ Monitor active! Deliver your purchase order now.');
  console.log('Look for messages starting with "🎯 MENU SYNC:"');
})();
`);

console.log('\n📊 Expected Console Messages:');
console.log('');
console.log('When delivering a purchase order, you should see:');
console.log('');
console.log('✅ "📊 Price Update for [Ingredient Name]:"');
console.log('   - Shows old cost vs new weighted average cost');
console.log('');
console.log('✅ "📋 Menu Price Update Summary:"');
console.log('   - Shows how many menu items were updated');
console.log('');
console.log('✅ "💰 Found affected ingredient: [Name] in [Menu Item]"');
console.log('   - Shows which menu items are affected');
console.log('');

console.log('❌ Common Issues to Watch For:');
console.log('');
console.log('1. **No menu sync messages**: Menu items might not be linked to inventory');
console.log('2. **"Inventory item not found"**: Ingredient IDs don\'t match');
console.log('3. **"No menu items found"**: Menu items collection might be empty');
console.log('4. **JavaScript errors**: Function import or execution issues');
console.log('');

console.log('🛠️ Manual Verification Script:');
console.log('');
console.log('Run this in your browser console AFTER delivery to check data:\n');

console.log(`
// Manual Data Verification
(async function() {
  const db = window.db || firebase.firestore();
  const auth = window.auth || firebase.auth();
  const tenantId = auth.currentUser?.uid;
  
  if (!tenantId) {
    console.error('❌ No user logged in');
    return;
  }
  
  console.log('🔍 Checking data after delivery...');
  
  // Check recent inventory movements
  const movementsQuery = db.collection('tenants').doc(tenantId)
    .collection('inventoryMovements')
    .where('movementType', '==', 'receiving')
    .orderBy('timestamp', 'desc')
    .limit(5);
  const movementsSnapshot = await movementsQuery.get();
  
  console.log('\\n📦 Recent Deliveries:');
  movementsSnapshot.forEach(doc => {
    const movement = doc.data();
    const date = new Date(movement.timestamp.seconds * 1000);
    console.log(\`- \${movement.itemName}: +\${movement.quantity} \${movement.unit}\`);
    console.log(\`  \${date.toLocaleString()}\`);
    console.log(\`  Reason: \${movement.reason}\`);
    
    if (movement.reason.includes('Price updated')) {
      console.log('  ✅ Price was updated during this delivery');
    }
  });
  
  // Check menu items with recent updates
  const menuQuery = db.collection('tenants').doc(tenantId)
    .collection('menuItems')
    .orderBy('updatedAt', 'desc')
    .limit(10);
  const menuSnapshot = await menuQuery.get();
  
  console.log('\\n🍽️ Recently Updated Menu Items:');
  menuSnapshot.forEach(doc => {
    const item = doc.data();
    const date = new Date(item.updatedAt.seconds * 1000);
    console.log(\`- \${item.name}: ₱\${(item.price || 0).toFixed(2)}\`);
    console.log(\`  Updated: \${date.toLocaleString()}\`);
    
    if (item.ingredients && item.ingredients.length > 0) {
      console.log(\`  Ingredients: \${item.ingredients.length} items\`);
      item.ingredients.forEach(ing => {
        console.log(\`    • ID: \${ing.id}, Qty: \${ing.quantity} \${ing.unit}\`);
      });
    } else {
      console.log('  ⚠️ No ingredients linked');
    }
  });
  
  console.log('\\n✅ Verification complete!');
})();
`);

console.log('\n🎯 Success Criteria:');
console.log('');
console.log('The menu price sync is working correctly if you see:');
console.log('✅ Inventory cost updates with weighted averages');
console.log('✅ Menu price update summary messages in console');
console.log('✅ Menu item prices actually change in the interface');
console.log('✅ No JavaScript errors during delivery');
console.log('');
console.log('📞 If you still don\'t see menu price updates:');
console.log('1. Run both scripts above and share the console output');
console.log('2. Check that your menu items have ingredients properly linked');
console.log('3. Verify the ingredient names/IDs match between menu and inventory');
console.log('4. Make sure you\'re using different unit prices in the purchase order');
