// Detailed diagnostic for menu price sync issue
console.log('🔍 DETAILED DIAGNOSTIC - Menu Price Sync Issue');

// Get current tenant and branch IDs
const tenantId = currentTenantId;
const branchId = currentBranchId;

console.log('📍 Current context:', { tenantId, branchId });

// 1. Check inventory items
console.log('\n📦 INVENTORY ITEMS:');
const inventoryRef = firebase.firestore().collection('tenants').doc(tenantId).collection('inventory');
const inventorySnapshot = await inventoryRef.get();

const inventoryMap = new Map();
inventorySnapshot.docs.forEach(doc => {
  const data = doc.data();
  inventoryMap.set(doc.id, data);
  console.log(`  ${data.name} (ID: ${doc.id}):`, {
    cost: data.cost,
    price: data.price, 
    costPerUnit: data.costPerUnit
  });
});

// 2. Check menu items with ingredients
console.log('\n🍽️ MENU ITEMS WITH INGREDIENTS:');
const menuRef = firebase.firestore().collection('tenants').doc(tenantId).collection('menuItems');
const menuSnapshot = await menuRef.get();

let menuItemsWithIngredients = 0;
let totalIngredients = 0;
let linkedIngredients = 0;

menuSnapshot.docs.forEach(doc => {
  const data = doc.data();
  console.log(`\n📋 Menu Item: ${data.name} (ID: ${doc.id})`);
  
  if (data.ingredients && data.ingredients.length > 0) {
    menuItemsWithIngredients++;
    console.log(`  Ingredients (${data.ingredients.length}):`);
    
    data.ingredients.forEach((ing, index) => {
      totalIngredients++;
      const inventoryItem = inventoryMap.get(ing.inventoryItemId);
      const isLinked = !!inventoryItem;
      if (isLinked) linkedIngredients++;
      
      console.log(`    ${index + 1}. ${ing.inventoryItemName || ing.name}`);
      console.log(`       - inventoryItemId: ${ing.inventoryItemId}`);
      console.log(`       - quantity: ${ing.quantity}`);
      console.log(`       - current cost: ${ing.cost}`);
      console.log(`       - current costPerUnit: ${ing.costPerUnit || 'not set'}`);
      console.log(`       - linked to inventory: ${isLinked ? '✅' : '❌'}`);
      
      if (isLinked) {
        const invCost = inventoryItem.cost || inventoryItem.price || inventoryItem.costPerUnit || 0;
        const expectedCost = invCost * ing.quantity;
        console.log(`       - inventory cost: ${invCost}`);
        console.log(`       - expected total cost: ${expectedCost}`);
        console.log(`       - needs update: ${ing.cost !== expectedCost ? '✅ YES' : '❌ NO'}`);
      }
    });
    
    console.log(`  Total menu item cost: ${data.cost || 'not set'}`);
  } else {
    console.log('  ❌ No ingredients found');
  }
});

console.log('\n📊 SUMMARY:');
console.log(`  Menu items with ingredients: ${menuItemsWithIngredients}`);
console.log(`  Total ingredients: ${totalIngredients}`);
console.log(`  Linked ingredients: ${linkedIngredients}`);
console.log(`  Unlinked ingredients: ${totalIngredients - linkedIngredients}`);

// 3. Test the sync function manually
console.log('\n🔧 TESTING SYNC FUNCTION:');
try {
  // Manually recreate the sync logic to see what happens
  let updatedCount = 0;
  const batch = firebase.firestore().batch();
  
  menuSnapshot.docs.forEach(menuDoc => {
    const menuData = menuDoc.data();
    if (!menuData.ingredients || menuData.ingredients.length === 0) return;
    
    let hasUpdates = false;
    let totalCost = 0;
    
    console.log(`\n🔍 Processing: ${menuData.name}`);
    
    const updatedIngredients = menuData.ingredients.map((ingredient) => {
      const inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
      if (inventoryItem) {
        const inventoryCost = inventoryItem.cost || inventoryItem.price || inventoryItem.costPerUnit || 0;
        const newCost = inventoryCost * ingredient.quantity;
        totalCost += newCost;
        
        console.log(`  Ingredient: ${ingredient.inventoryItemName}`);
        console.log(`    Current cost: ${ingredient.cost}`);
        console.log(`    New cost: ${newCost}`);
        console.log(`    Needs update: ${ingredient.cost !== newCost}`);
        
        if (ingredient.cost !== newCost) {
          hasUpdates = true;
          return {
            ...ingredient,
            cost: newCost,
            costPerUnit: inventoryCost
          };
        }
      } else {
        console.log(`  ❌ Ingredient ${ingredient.inventoryItemName} not found in inventory`);
        totalCost += ingredient.cost || 0;
      }
      return ingredient;
    });
    
    if (hasUpdates) {
      console.log(`  ✅ Will update ${menuData.name} with new cost: ${totalCost}`);
      updatedCount++;
    } else {
      console.log(`  ℹ️ No updates needed for ${menuData.name}`);
    }
  });
  
  console.log(`\n📊 SYNC RESULT: ${updatedCount} items would be updated`);
  
} catch (error) {
  console.error('❌ Error in sync test:', error);
}

console.log('\n✅ DIAGNOSTIC COMPLETE');
