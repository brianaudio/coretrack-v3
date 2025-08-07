console.log('🔍 Checking inventory costPerUnit values...');

// Check current inventory items
const inventoryRef = firebase.firestore().collection('tenants').doc(currentTenantId).collection('inventory');
const inventorySnapshot = await inventoryRef.get();

console.log('📦 Inventory items with cost data:');
inventorySnapshot.docs.forEach(doc => {
  const data = doc.data();
  console.log(`${data.name}:`, {
    id: doc.id,
    costPerUnit: data.costPerUnit,
    unitPrice: data.unitPrice,
    cost: data.cost,
    price: data.price
  });
});

// Check menu items to see what cost data they have
const menuRef = firebase.firestore().collection('tenants').doc(currentTenantId).collection('menuItems');
const menuSnapshot = await menuRef.get();

console.log('📋 Menu items with ingredient costs:');
menuSnapshot.docs.forEach(doc => {
  const data = doc.data();
  if (data.ingredients && data.ingredients.length > 0) {
    console.log(`${data.name}:`, {
      ingredients: data.ingredients.map(ing => ({
        name: ing.inventoryItemName || ing.name,
        costPerUnit: ing.costPerUnit,
        cost: ing.cost,
        quantity: ing.quantity
      }))
    });
  }
});

console.log('✅ Inventory cost check complete');
