/**
 * Manual Menu Price Sync Fix
 * This will manually sync your menu prices with current inventory costs
 */

console.log('🔧 Manual Menu Price Sync Fix');
console.log('============================\n');

// Function to manually sync menu prices
async function manualMenuPriceSync() {
  try {
    console.log('🔧 Starting manual menu price sync...');
    
    // Get current user and tenant
    const auth = firebase.auth();
    const db = firebase.firestore();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    const tenantId = user.uid;
    console.log('🏢 Tenant ID:', tenantId);
    
    // Get all menu items
    const menuSnapshot = await db.collection('tenants').doc(tenantId).collection('menuItems').get();
    console.log(`📋 Found ${menuSnapshot.size} menu items`);
    
    // Get all inventory items
    const inventorySnapshot = await db.collection('tenants').doc(tenantId).collection('inventory').get();
    console.log(`📦 Found ${inventorySnapshot.size} inventory items`);
    
    // Build inventory lookup
    const inventory = {};
    inventorySnapshot.forEach(doc => {
      inventory[doc.id] = { id: doc.id, ...doc.data() };
    });
    
    console.log('\n📦 Inventory Items:');
    Object.values(inventory).forEach(item => {
      console.log(`   ${item.name}: ₱${item.costPerUnit}/unit (ID: ${item.id})`);
    });
    
    // Process each menu item
    for (const menuDoc of menuSnapshot.docs) {
      const menuItem = { id: menuDoc.id, ...menuDoc.data() };
      console.log(`\n🍽️ Processing: ${menuItem.name}`);
      console.log(`   Current price: ₱${menuItem.price}`);
      console.log(`   Current cost: ₱${menuItem.cost}`);
      
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) {
        console.log('   ⚠️ No ingredients found');
        continue;
      }
      
      let newTotalCost = 0;
      let updatedIngredients = [];
      let hasChanges = false;
      
      // Process each ingredient
      for (let i = 0; i < menuItem.ingredients.length; i++) {
        const ingredient = menuItem.ingredients[i];
        console.log(`\n   Ingredient ${i + 1}:`);
        console.log(`      Original data:`, ingredient);
        
        // Try to find the inventory item
        const inventoryItemId = ingredient.id || ingredient.inventoryItemId;
        console.log(`      Looking for inventory ID: ${inventoryItemId}`);
        
        const inventoryItem = inventory[inventoryItemId];
        
        if (!inventoryItem) {
          console.log(`      ❌ Inventory item not found!`);
          console.log(`      Available IDs: ${Object.keys(inventory).join(', ')}`);
          
          // Try to find by name
          const foundByName = Object.values(inventory).find(inv => 
            inv.name.toLowerCase() === (ingredient.inventoryItemName || ingredient.name || '').toLowerCase()
          );
          
          if (foundByName) {
            console.log(`      🔧 Found by name: ${foundByName.name} (${foundByName.id})`);
            
            // Update the ingredient with correct ID
            const updatedIngredient = {
              ...ingredient,
              inventoryItemId: foundByName.id,
              inventoryItemName: foundByName.name,
              unit: foundByName.unit,
              cost: (foundByName.costPerUnit || 0) * (ingredient.quantity || 0)
            };
            
            updatedIngredients.push(updatedIngredient);
            newTotalCost += updatedIngredient.cost;
            hasChanges = true;
            
            console.log(`      ✅ Fixed ingredient linking`);
            console.log(`      New cost: ₱${updatedIngredient.cost.toFixed(2)}`);
          } else {
            console.log(`      ❌ Could not link ingredient`);
            updatedIngredients.push(ingredient);
            newTotalCost += ingredient.cost || 0;
          }
        } else {
          console.log(`      ✅ Found inventory item: ${inventoryItem.name}`);
          console.log(`      Inventory cost per unit: ₱${inventoryItem.costPerUnit}`);
          console.log(`      Ingredient quantity: ${ingredient.quantity}`);
          
          const newCost = (inventoryItem.costPerUnit || 0) * (ingredient.quantity || 0);
          console.log(`      Calculated cost: ₱${newCost.toFixed(2)}`);
          
          if (Math.abs((ingredient.cost || 0) - newCost) > 0.01) {
            console.log(`      🔧 Cost needs update: ₱${ingredient.cost} → ₱${newCost.toFixed(2)}`);
            hasChanges = true;
          }
          
          const updatedIngredient = {
            ...ingredient,
            inventoryItemId: inventoryItem.id,
            inventoryItemName: inventoryItem.name,
            unit: inventoryItem.unit,
            cost: newCost
          };
          
          updatedIngredients.push(updatedIngredient);
          newTotalCost += newCost;
        }
      }
      
      console.log(`\n   📊 Summary for ${menuItem.name}:`);
      console.log(`      Old total cost: ₱${(menuItem.cost || 0).toFixed(2)}`);
      console.log(`      New total cost: ₱${newTotalCost.toFixed(2)}`);
      console.log(`      Needs update: ${hasChanges}`);
      
      // Update the menu item if there are changes
      if (hasChanges) {
        try {
          const updateData = {
            ingredients: updatedIngredients,
            cost: newTotalCost,
            updatedAt: firebase.firestore.Timestamp.now()
          };
          
          await db.collection('tenants').doc(tenantId).collection('menuItems').doc(menuItem.id).update(updateData);
          
          console.log(`      ✅ Updated successfully!`);
          console.log(`      New cost: ₱${newTotalCost.toFixed(2)}`);
        } catch (error) {
          console.error(`      ❌ Failed to update:`, error);
        }
      } else {
        console.log(`      ℹ️ No changes needed`);
      }
    }
    
    console.log('\n🎉 Manual menu price sync completed!');
    console.log('\n🔄 Refresh your Menu Builder to see the changes');
    
  } catch (error) {
    console.error('❌ Error in manual sync:', error);
  }
}

// Check if Firebase is available
if (typeof firebase !== 'undefined') {
  console.log('✅ Firebase available, running manual sync...');
  manualMenuPriceSync();
} else {
  console.log('❌ Firebase not available');
  console.log('\nTo run manual sync:');
  console.log('1. Make sure you are on a page with Firebase loaded');
  console.log('2. Copy and paste this entire script');
  console.log('3. The sync will run automatically');
}
