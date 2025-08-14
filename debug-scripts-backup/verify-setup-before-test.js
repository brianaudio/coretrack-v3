/**
 * Pre-Test Setup Verification
 * 
 * Run this BEFORE creating your purchase order to verify everything is set up correctly
 */

console.log('🔍 Pre-Test Setup Verification');
console.log('==============================\n');

console.log('Before you create your purchase order, verify your setup:');
console.log('');
console.log('1. Open your browser Developer Tools (F12)');
console.log('2. Go to the Console tab');
console.log('3. Copy and paste this code:\n');

console.log(`
// Setup Verification - Run this BEFORE testing
(async function() {
  console.log('🔍 Verifying setup for menu price sync test...');
  
  const db = window.db || firebase.firestore();
  const auth = window.auth || firebase.auth();
  const tenantId = auth.currentUser?.uid;
  
  if (!tenantId) {
    console.error('❌ No user logged in');
    return;
  }
  
  console.log('🏢 Tenant ID:', tenantId);
  console.log('\\n📋 Checking current inventory...');
  
  // Check inventory items
  const inventoryQuery = db.collection('tenants').doc(tenantId)
    .collection('inventory').limit(10);
  const inventorySnapshot = await inventoryQuery.get();
  
  const inventoryMap = new Map();
  inventorySnapshot.forEach(doc => {
    const item = doc.data();
    inventoryMap.set(doc.id, item);
    console.log(\`- \${item.name} (ID: \${doc.id}): \${item.currentStock} \${item.unit} @ ₱\${(item.costPerUnit || 0).toFixed(2)}\`);
  });
  
  if (inventorySnapshot.empty) {
    console.error('❌ No inventory items found! Please add some inventory first.');
    return;
  }
  
  console.log('\\n🍽️ Checking menu items...');
  
  // Check menu items
  const menuQuery = db.collection('tenants').doc(tenantId)
    .collection('menuItems').limit(10);
  const menuSnapshot = await menuQuery.get();
  
  let hasLinkedMenuItems = false;
  let menuItemsWithIngredients = 0;
  
  menuSnapshot.forEach(doc => {
    const item = doc.data();
    console.log(\`- \${item.name}: ₱\${(item.price || 0).toFixed(2)}\`);
    
    if (item.ingredients && item.ingredients.length > 0) {
      menuItemsWithIngredients++;
      console.log(\`  Ingredients (\${item.ingredients.length}):\`);
      
      item.ingredients.forEach(ing => {
        const inventoryItem = inventoryMap.get(ing.id);
        if (inventoryItem) {
          hasLinkedMenuItems = true;
          console.log(\`    ✅ \${inventoryItem.name} - \${ing.quantity} \${ing.unit}\`);
        } else {
          console.log(\`    ❌ Unknown ingredient ID: \${ing.id}\`);
        }
      });
    } else {
      console.log('    ⚠️ No ingredients linked');
    }
  });
  
  if (menuSnapshot.empty) {
    console.error('❌ No menu items found! Please add some menu items first.');
    return;
  }
  
  console.log(\`\\n📊 Setup Summary:\`);
  console.log(\`- Inventory items: \${inventorySnapshot.size}\`);
  console.log(\`- Menu items: \${menuSnapshot.size}\`);
  console.log(\`- Menu items with ingredients: \${menuItemsWithIngredients}\`);
  console.log(\`- Properly linked ingredients: \${hasLinkedMenuItems ? 'Yes' : 'No'}\`);
  
  if (!hasLinkedMenuItems) {
    console.error('\\n❌ SETUP ISSUE: No menu items are properly linked to inventory!');
    console.log('\\nTo fix this:');
    console.log('1. Go to Menu Builder');
    console.log('2. Edit a menu item');
    console.log('3. Add ingredients from your inventory');
    console.log('4. Save the menu item');
    console.log('5. Run this verification again');
    return;
  }
  
  console.log('\\n✅ Setup looks good! You can proceed with testing.');
  console.log('\\n🧪 Next steps:');
  console.log('1. Note the current cost of an ingredient you want to test');
  console.log('2. Create a purchase order for that ingredient with a DIFFERENT unit price');
  console.log('3. Use the monitoring script while delivering the order');
  console.log('4. Verify the inventory cost and menu prices update');
})();
`);

console.log('\n🎯 What to look for:');
console.log('');
console.log('✅ **Good Setup**:');
console.log('   - Multiple inventory items with costs');
console.log('   - Menu items with ingredients properly linked');
console.log('   - Green checkmarks showing linked ingredients');
console.log('');
console.log('❌ **Setup Issues**:');
console.log('   - "No menu items are properly linked to inventory"');
console.log('   - "Unknown ingredient ID" messages');
console.log('   - Empty inventory or menu collections');
console.log('');
console.log('📝 **Recommended Test**:');
console.log('1. Pick an ingredient that appears in a menu item');
console.log('2. Note its current cost per unit');
console.log('3. Create a purchase order with a higher/lower unit price');
console.log('4. Deliver the order and watch for price updates');

console.log('\nRun this script now to verify your setup is ready for testing!');
