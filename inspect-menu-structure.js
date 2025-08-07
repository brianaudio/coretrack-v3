/**
 * Inspect Actual Menu Items in Firebase
 * 
 * This script will show exactly how your menu items are structured
 * and help identify the issue with menu price sync
 */

console.log('🔍 Menu Item Structure Inspector');
console.log('================================\n');

console.log('Run this in your browser console to inspect your actual menu items:\n');

console.log(`
// Menu Item Structure Inspector
(async function() {
  console.log('🔍 Inspecting actual menu items in Firebase...');
  
  const db = window.db || firebase.firestore();
  const auth = window.auth || firebase.auth();
  const tenantId = auth.currentUser?.uid;
  
  if (!tenantId) {
    console.error('❌ No user logged in');
    return;
  }
  
  console.log('🏢 Tenant ID:', tenantId);
  
  // Get menu items
  const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
  const menuSnapshot = await menuItemsRef.get();
  
  console.log(\`\\n📋 Found \${menuSnapshot.size} menu items\`);
  
  if (menuSnapshot.empty) {
    console.log('❌ No menu items found!');
    return;
  }
  
  // Inspect each menu item
  menuSnapshot.forEach((doc, index) => {
    const data = doc.data();
    console.log(\`\\n📦 Menu Item #\${index + 1}: \${data.name} (ID: \${doc.id})\`);
    console.log('   📊 Basic Info:');
    console.log(\`      - Name: \${data.name}\`);
    console.log(\`      - Price: ₱\${(data.price || 0).toFixed(2)}\`);
    console.log(\`      - Category: \${data.category}\`);
    console.log(\`      - Status: \${data.status || 'undefined'}\`);
    
    console.log('   🧪 Ingredients Analysis:');
    if (data.ingredients && Array.isArray(data.ingredients)) {
      console.log(\`      - Has ingredients: YES (\${data.ingredients.length} items)\`);
      
      data.ingredients.forEach((ing, ingIndex) => {
        console.log(\`      [Ingredient #\${ingIndex + 1}]\`);
        console.log(\`         - Structure keys: \${Object.keys(ing).join(', ')}\`);
        
        // Check for both id and inventoryItemId
        const ingredientId = ing.id || ing.inventoryItemId;
        const ingredientName = ing.name || ing.inventoryItemName;
        
        console.log(\`         - ID field: \${ing.id ? 'ing.id = ' + ing.id : 'MISSING'}\`);
        console.log(\`         - inventoryItemId field: \${ing.inventoryItemId ? 'ing.inventoryItemId = ' + ing.inventoryItemId : 'MISSING'}\`);
        console.log(\`         - Name: \${ingredientName || 'MISSING'}\`);
        console.log(\`         - Quantity: \${ing.quantity || 'MISSING'}\`);
        console.log(\`         - Unit: \${ing.unit || 'MISSING'}\`);
        console.log(\`         - Cost: \${ing.cost || 'MISSING'}\`);
        
        if (!ingredientId) {
          console.log(\`         ❌ NO INGREDIENT ID - This is the problem!\`);
        } else {
          console.log(\`         ✅ Ingredient ID found: \${ingredientId}\`);
        }
      });
    } else {
      console.log('      - Has ingredients: NO');
      console.log('      ❌ This menu item has no ingredients to sync prices with!');
    }
    
    console.log('   🏗️ Full Data Structure:');
    console.log('      Available fields:', Object.keys(data).join(', '));
    
    // Show the actual ingredient data for debugging
    if (data.ingredients && data.ingredients.length > 0) {
      console.log('   🔬 Raw ingredient data:');
      console.log(JSON.stringify(data.ingredients, null, 2));
    }
  });
  
  console.log('\\n📊 Summary Analysis:');
  
  const menuItems = [];
  menuSnapshot.forEach(doc => {
    menuItems.push({ id: doc.id, ...doc.data() });
  });
  
  const itemsWithIngredients = menuItems.filter(item => 
    item.ingredients && Array.isArray(item.ingredients) && item.ingredients.length > 0
  );
  
  const itemsWithValidIngredients = menuItems.filter(item => 
    item.ingredients && Array.isArray(item.ingredients) && 
    item.ingredients.some(ing => ing.id || ing.inventoryItemId)
  );
  
  console.log(\`- Total menu items: \${menuItems.length}\`);
  console.log(\`- Items with ingredients: \${itemsWithIngredients.length}\`);
  console.log(\`- Items with valid ingredient IDs: \${itemsWithValidIngredients.length}\`);
  
  if (itemsWithValidIngredients.length === 0) {
    console.log('\\n❌ PROBLEM FOUND: No menu items have valid ingredient IDs!');
    console.log('\\nThis is why menu price sync is not working.');
    console.log('\\nSolutions:');
    console.log('1. Check how ingredients are being saved in Menu Builder');
    console.log('2. Ensure ingredients have either "id" or "inventoryItemId" field');
    console.log('3. Verify the ingredient selection process in the UI');
  } else {
    console.log(\`\\n✅ Found \${itemsWithValidIngredients.length} menu items with valid ingredients for price sync\`);
  }
  
  console.log('\\n🔧 Next Steps:');
  console.log('1. Check how ingredients are being saved in your Menu Builder');
  console.log('2. Look at the ingredient selection process in the UI');
  console.log('3. Verify that ingredient IDs are properly linked');
})();
`);

console.log('\n🎯 What to Look For:');
console.log('');
console.log('1. **Ingredient Structure**: Each ingredient should have either:');
console.log('   - `id` field pointing to inventory item');
console.log('   - `inventoryItemId` field pointing to inventory item');
console.log('');
console.log('2. **Missing Fields**: Look for ingredients with:');
console.log('   - No ID fields at all');
console.log('   - Empty or undefined ID values');
console.log('   - Misnamed fields');
console.log('');
console.log('3. **Data Integrity**: Check if:');
console.log('   - Menu items actually have ingredients');
console.log('   - Ingredient quantities and units are present');
console.log('   - Ingredient costs are calculated');
console.log('');

console.log('📋 Expected Ingredient Structure:');
console.log('');
console.log('✅ **Good Structure**:');
console.log('```json');
console.log('{');
console.log('  "id": "abc123" OR "inventoryItemId": "abc123",');
console.log('  "name": "Chicken Breast" OR "inventoryItemName": "Chicken Breast",');
console.log('  "quantity": 0.5,');
console.log('  "unit": "kg",');
console.log('  "cost": 60.0');
console.log('}');
console.log('```');
console.log('');
console.log('❌ **Bad Structure**:');
console.log('```json');
console.log('{');
console.log('  "name": "Chicken Breast",  // Missing ID field!');
console.log('  "quantity": 0.5,');
console.log('  "unit": "kg"');
console.log('}');
console.log('```');

console.log('\nRun the inspector script above to see exactly what\'s in your menu items!');
