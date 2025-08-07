/**
 * Menu-Inventory Linking Diagnostic
 * This will check your menu item's ingredients and their linked inventory items
 */

console.log('🔍 Menu-Inventory Linking Diagnostic');
console.log('====================================\n');

// Function to check menu ingredients and their inventory links
async function checkMenuIngredientLinks() {
  try {
    // This should work with your existing debug setup
    console.log('🔍 Starting menu-inventory link analysis...\n');
    
    // Try to access your existing functions first
    if (typeof checkMenuIngredients === 'function') {
      console.log('📋 Running existing checkMenuIngredients function:');
      checkMenuIngredients();
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    if (typeof checkInventoryStatus === 'function') {
      console.log('📦 Running existing checkInventoryStatus function:');
      checkInventoryStatus();
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Manual inspection script
    console.log('🔬 Manual Menu-Inventory Analysis:');
    
    // Get Firebase instances (try multiple methods)
    let db, auth;
    
    if (typeof firebase !== 'undefined') {
      db = firebase.firestore();
      auth = firebase.auth();
    } else {
      console.log('❌ Firebase not accessible directly. Please use your existing debug functions above.');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user logged in');
      return;
    }
    
    const tenantId = user.uid;
    console.log('🏢 Tenant ID:', tenantId);
    
    // Get menu items
    const menuSnapshot = await db.collection('tenants').doc(tenantId).collection('menuItems').get();
    console.log(`📋 Found ${menuSnapshot.size} menu items\n`);
    
    // Get inventory items
    const inventorySnapshot = await db.collection('tenants').doc(tenantId).collection('inventory').get();
    console.log(`📦 Found ${inventorySnapshot.size} inventory items\n`);
    
    // Build inventory lookup
    const inventoryLookup = {};
    inventorySnapshot.forEach(doc => {
      inventoryLookup[doc.id] = { id: doc.id, ...doc.data() };
    });
    
    console.log('📊 Inventory Items:');
    Object.values(inventoryLookup).forEach(item => {
      console.log(`   📦 ${item.name} (ID: ${item.id})`);
      console.log(`      - Cost per unit: ₱${(item.costPerUnit || 0).toFixed(2)}`);
      console.log(`      - Unit: ${item.unit}`);
      console.log(`      - Quantity: ${item.quantity || 0}`);
    });
    console.log('');
    
    // Analyze each menu item
    menuSnapshot.forEach((doc, index) => {
      const menuItem = { id: doc.id, ...doc.data() };
      console.log(`🍽️ Menu Item #${index + 1}: ${menuItem.name}`);
      console.log(`   💰 Menu Price: ₱${(menuItem.price || 0).toFixed(2)}`);
      console.log(`   💵 Menu Cost: ₱${(menuItem.cost || 0).toFixed(2)}`);
      
      if (menuItem.ingredients && Array.isArray(menuItem.ingredients)) {
        console.log(`   🧪 Ingredients (${menuItem.ingredients.length} total):`);
        
        let totalCalculatedCost = 0;
        
        menuItem.ingredients.forEach((ingredient, ingIndex) => {
          console.log(`\n      [Ingredient #${ingIndex + 1}]`);
          console.log(`         - Structure: ${JSON.stringify(ingredient, null, 8)}`);
          
          // Check for ID fields
          const ingredientId = ingredient.id || ingredient.inventoryItemId;
          console.log(`         - ID (ingredient.id): ${ingredient.id || 'MISSING'}`);
          console.log(`         - ID (ingredient.inventoryItemId): ${ingredient.inventoryItemId || 'MISSING'}`);
          console.log(`         - Final ID used: ${ingredientId || 'NONE'}`);
          
          // Check ingredient details
          console.log(`         - Name: ${ingredient.inventoryItemName || ingredient.name || 'MISSING'}`);
          console.log(`         - Quantity needed: ${ingredient.quantity || 0}`);
          console.log(`         - Unit: ${ingredient.unit || 'MISSING'}`);
          console.log(`         - Stored cost: ₱${(ingredient.cost || 0).toFixed(2)}`);
          
          // Look up in inventory
          if (ingredientId && inventoryLookup[ingredientId]) {
            const inventoryItem = inventoryLookup[ingredientId];
            console.log(`         ✅ FOUND in inventory:`);
            console.log(`            - Inventory name: ${inventoryItem.name}`);
            console.log(`            - Inventory cost per unit: ₱${(inventoryItem.costPerUnit || 0).toFixed(2)}`);
            console.log(`            - Inventory unit: ${inventoryItem.unit}`);
            
            // Calculate actual cost
            const actualCost = (inventoryItem.costPerUnit || 0) * (ingredient.quantity || 0);
            console.log(`            - CALCULATED cost: ₱${actualCost.toFixed(2)} (${inventoryItem.costPerUnit} × ${ingredient.quantity})`);
            
            totalCalculatedCost += actualCost;
            
            // Check if costs match
            if (Math.abs((ingredient.cost || 0) - actualCost) > 0.01) {
              console.log(`            ⚠️  COST MISMATCH! Stored: ₱${(ingredient.cost || 0).toFixed(2)}, Should be: ₱${actualCost.toFixed(2)}`);
            } else {
              console.log(`            ✅ Cost matches!`);
            }
          } else if (ingredientId) {
            console.log(`         ❌ NOT FOUND in inventory (ID: ${ingredientId})`);
            console.log(`         🔍 Available inventory IDs: ${Object.keys(inventoryLookup).join(', ')}`);
          } else {
            console.log(`         ❌ NO ID FIELD - Cannot link to inventory!`);
          }
        });
        
        console.log(`\n   📊 SUMMARY:`);
        console.log(`      - Stored menu cost: ₱${(menuItem.cost || 0).toFixed(2)}`);
        console.log(`      - Calculated total cost: ₱${totalCalculatedCost.toFixed(2)}`);
        
        if (Math.abs((menuItem.cost || 0) - totalCalculatedCost) > 0.01) {
          console.log(`      ⚠️  MENU COST MISMATCH!`);
          console.log(`      💡 Menu should cost: ₱${totalCalculatedCost.toFixed(2)}`);
        } else {
          console.log(`      ✅ Menu cost is correct!`);
        }
        
      } else {
        console.log(`   ❌ No ingredients found!`);
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
    });
    
    console.log('🎯 DIAGNOSIS COMPLETE!');
    console.log('\n📋 Key Things to Check:');
    console.log('1. Do menu ingredients have proper ID fields?');
    console.log('2. Do the IDs match actual inventory items?');
    console.log('3. Are the costs calculated correctly?');
    console.log('4. Is the menu price sync function looking for the right ID field?');
    
  } catch (error) {
    console.error('❌ Error in diagnostic:', error);
  }
}

// Run the diagnostic
checkMenuIngredientLinks();

// Also provide a simpler version
console.log('\n🔧 Quick Manual Check:');
console.log('1. Run: checkMenuIngredients()');
console.log('2. Run: checkInventoryStatus()');
console.log('3. Compare the ingredient IDs with inventory IDs');
console.log('4. Check if ingredient costs match inventory costs');
