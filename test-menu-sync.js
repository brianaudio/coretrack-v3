// Test the menu price sync system
console.log('🧪 Testing menu price sync system...');

// 1. Check if we have inventory items with costs
const inventoryRef = firebase.firestore().collection('tenants').doc(currentTenantId).collection('inventory');
const inventorySnapshot = await inventoryRef.get();

console.log('📦 Inventory items:');
inventorySnapshot.docs.forEach(doc => {
  const data = doc.data();
  console.log(`${data.name}:`, {
    cost: data.cost,
    price: data.price,
    costPerUnit: data.costPerUnit
  });
});

// 2. Check menu items with ingredients
const menuRef = firebase.firestore().collection('tenants').doc(currentTenantId).collection('menuItems');
const menuSnapshot = await menuRef.get();

console.log('🍽️ Menu items with ingredients:');
menuSnapshot.docs.forEach(doc => {
  const data = doc.data();
  if (data.ingredients && data.ingredients.length > 0) {
    console.log(`${data.name}:`, {
      ingredients: data.ingredients.map(ing => ({
        name: ing.inventoryItemName,
        inventoryItemId: ing.inventoryItemId,
        quantity: ing.quantity,
        cost: ing.cost,
        costPerUnit: ing.costPerUnit
      })),
      totalCost: data.cost
    });
  }
});

// 3. Test the auto sync function
try {
  console.log('🔄 Testing auto sync...');
  
  // Import and run the sync function
  const { triggerMenuPriceSync } = await import('/src/lib/firebase/autoMenuPriceSync.ts');
  const result = await triggerMenuPriceSync(currentTenantId, currentBranchId);
  
  console.log('✅ Sync result:', result, 'items updated');
} catch (error) {
  console.error('❌ Sync failed:', error);
}

console.log('🧪 Test complete');
