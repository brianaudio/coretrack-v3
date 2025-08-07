/**
 * Debug Menu Price Sync Issue
 * 
 * This script helps diagnose why the menu price synchronization isn't working
 * after purchase order deliveries.
 */

// To run this script:
// 1. Open VS Code terminal
// 2. Run: node debug-menu-price-sync-issue.js
// 3. Follow the prompts to check your data

console.log('🔍 Menu Price Sync Diagnostic Tool');
console.log('===================================\n');

console.log('To check your purchase order and inventory data:');
console.log('');
console.log('1. Open your browser\'s Developer Tools (F12)');
console.log('2. Go to your CoreTrack application');
console.log('3. Open the Console tab');
console.log('4. Copy and paste this code:\n');

console.log(`
// Diagnostic Code - Paste this in your browser console
(async function() {
  console.log('🔍 Checking Firebase Data...');
  
  // Get Firebase instances from your app
  const db = window.db || firebase.firestore();
  const auth = window.auth || firebase.auth();
  
  if (!auth.currentUser) {
    console.error('❌ No user logged in');
    return;
  }
  
  const tenantId = auth.currentUser.uid; // Adjust if your tenant ID is different
  console.log('🏢 Tenant ID:', tenantId);
  
  // Check recent purchase orders
  console.log('\\n📦 Recent Purchase Orders:');
  const ordersQuery = db.collection('tenants').doc(tenantId).collection('purchaseOrders')
    .orderBy('createdAt', 'desc').limit(5);
  const ordersSnapshot = await ordersQuery.get();
  
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    console.log(\`- Order \${order.orderNumber} (\${order.status})\`);
    if (order.items) {
      order.items.forEach(item => {
        console.log(\`  • \${item.itemName}: \${item.quantity} \${item.unit} @ ₱\${(item.unitPrice || 0).toFixed(2)}\`);
        if (item.quantityReceived) {
          console.log(\`    Received: \${item.quantityReceived}\`);
        }
      });
    }
  });
  
  // Check inventory items with recent cost changes
  console.log('\\n📋 Inventory Items (Recent Updates):');
  const inventoryQuery = db.collection('tenants').doc(tenantId).collection('inventory')
    .orderBy('updatedAt', 'desc').limit(10);
  const inventorySnapshot = await inventoryQuery.get();
  
  inventorySnapshot.forEach(doc => {
    const item = doc.data();
    console.log(\`- \${item.name}: \${item.currentStock} \${item.unit} @ ₱\${(item.costPerUnit || 0).toFixed(2)}\`);
    if (item.updatedAt) {
      const date = new Date(item.updatedAt.seconds * 1000);
      console.log(\`  Updated: \${date.toLocaleString()}\`);
    }
  });
  
  // Check menu items
  console.log('\\n🍽️ Menu Items:');
  const menuQuery = db.collection('tenants').doc(tenantId).collection('menuItems').limit(10);
  const menuSnapshot = await menuQuery.get();
  
  menuSnapshot.forEach(doc => {
    const item = doc.data();
    console.log(\`- \${item.name}: ₱\${(item.price || 0).toFixed(2)}\`);
    if (item.ingredients && item.ingredients.length > 0) {
      console.log(\`  Ingredients: \${item.ingredients.map(ing => ing.name).join(', ')}\`);
    }
    if (item.updatedAt) {
      const date = new Date(item.updatedAt.seconds * 1000);
      console.log(\`  Updated: \${date.toLocaleString()}\`);
    }
  });
  
  // Check inventory movements for delivery activities
  console.log('\\n📊 Recent Inventory Movements (Deliveries):');
  const movementsQuery = db.collection('tenants').doc(tenantId).collection('inventoryMovements')
    .where('movementType', '==', 'receiving')
    .orderBy('timestamp', 'desc').limit(10);
  const movementsSnapshot = await movementsQuery.get();
  
  movementsSnapshot.forEach(doc => {
    const movement = doc.data();
    const date = new Date(movement.timestamp.seconds * 1000);
    console.log(\`- \${movement.itemName}: +\${movement.quantity} \${movement.unit}\`);
    console.log(\`  \${date.toLocaleString()} - \${movement.reason}\`);
  });
  
  console.log('\\n✅ Data check complete!');
  console.log('\\nLook for:');
  console.log('1. Purchase orders with status "delivered"');
  console.log('2. Inventory items with recent price updates');
  console.log('3. Menu items with recent price changes');
  console.log('4. Inventory movements showing "Purchase order delivery received"');
})();
`);

console.log('\n5. After running the code, look for:');
console.log('   - Purchase orders marked as "delivered"');
console.log('   - Inventory items with updated costs');
console.log('   - Menu items with recent price changes');
console.log('   - Console messages about menu price updates');
console.log('');
console.log('📋 What to check:');
console.log('');
console.log('1. Are your purchase orders being delivered successfully?');
console.log('2. Are inventory costs being updated with weighted averages?');
console.log('3. Are menu items getting price updates?');
console.log('4. Are there any error messages in the console?');
console.log('');
console.log('If you see errors or missing data, please share the console output!');
