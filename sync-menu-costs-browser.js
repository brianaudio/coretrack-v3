// IMMEDIATE MENU COST SYNC FIX - Run in browser console
// This will update ALL menu items with current inventory prices RIGHT NOW

const syncAllMenuCostsNow = async () => {
  console.log('🔧 IMMEDIATE FIX: Updating ALL menu costs with current inventory prices...');
  
  try {
    // Access Firebase from the current page
    const { db } = window;
    if (!db) {
      console.error('❌ Firebase not available. Make sure you are on the CoreTrack app page.');
      return;
    }
    
    // Get current user and tenant
    const auth = window.auth || firebase.auth();
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ Not authenticated. Please log in first.');
      return;
    }
    
    const tenantId = user.uid; // or however you get tenant ID
    console.log(`🏢 Tenant: ${tenantId}`);
    
    // Import Firestore functions
    const { collection, getDocs, writeBatch, doc, Timestamp } = window.firebase?.firestore || window;
    
    // Get ALL inventory items
    console.log('📦 Loading inventory items...');
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    console.log(`📦 Found ${inventorySnapshot.docs.length} inventory items`);
    
    // Build inventory map
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, {
        costPerUnit: data.costPerUnit || 0,
        name: data.name,
        unit: data.unit || 'unit'
      });
      console.log(`   📦 ${data.name}: ₱${data.costPerUnit || 0}/${data.unit || 'unit'} (ID: ${doc.id})`);
    });
    
    // Get ALL menu items
    console.log('\n📋 Loading menu items...');
    const menuRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuSnapshot = await getDocs(menuRef);
    
    console.log(`📋 Found ${menuSnapshot.docs.length} menu items`);
    
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    // Process each menu item
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      const menuName = menuData.name;
      
      console.log(`\n🔍 "${menuName}"`);
      
      if (!menuData.ingredients || menuData.ingredients.length === 0) {
        console.log(`   ⏭️  No ingredients - skipping`);
        continue;
      }
      
      console.log(`   📋 ${menuData.ingredients.length} ingredients`);
      
      let hasUpdates = false;
      let newTotalCost = 0;
      
      // Update each ingredient
      const updatedIngredients = menuData.ingredients.map((ingredient, idx) => {
        const ingredientName = ingredient.inventoryItemName || ingredient.name || 'Unknown';
        const inventoryId = ingredient.inventoryItemId || ingredient.id; // Check both fields
        const quantity = ingredient.quantity || 0;
        
        console.log(`     ${idx + 1}. ${ingredientName} (ID: ${inventoryId}, Qty: ${quantity})`);
        
        if (!inventoryId) {
          console.log(`        ❌ No inventory ID`);
          newTotalCost += ingredient.cost || 0;
          return ingredient;
        }
        
        const currentInventory = inventoryMap.get(inventoryId);
        
        if (currentInventory) {
          const newUnitCost = currentInventory.costPerUnit;
          const newIngredientCost = newUnitCost * quantity;
          const oldIngredientCost = ingredient.cost || 0;
          
          console.log(`        OLD cost: ₱${oldIngredientCost.toFixed(4)} (₱${(ingredient.costPerUnit || 0).toFixed(4)}/unit)`);
          console.log(`        NEW cost: ₱${newIngredientCost.toFixed(4)} (₱${newUnitCost.toFixed(4)}/unit)`);
          
          if (Math.abs(oldIngredientCost - newIngredientCost) > 0.001) {
            console.log(`        🔥 COST CHANGED!`);
            hasUpdates = true;
          }
          
          newTotalCost += newIngredientCost;
          
          return {
            ...ingredient,
            cost: newIngredientCost,
            costPerUnit: newUnitCost,
            inventoryItemName: currentInventory.name,
            unit: currentInventory.unit
          };
        } else {
          console.log(`        ❌ Inventory item not found`);
          newTotalCost += ingredient.cost || 0;
          return ingredient;
        }
      });
      
      const oldMenuCost = menuData.cost || 0;
      console.log(`   💰 Total: ₱${oldMenuCost.toFixed(2)} → ₱${newTotalCost.toFixed(2)}`);
      
      if (hasUpdates || Math.abs(oldMenuCost - newTotalCost) > 0.001) {
        console.log(`   ✅ UPDATING MENU ITEM`);
        
        batch.update(doc(db, 'tenants', tenantId, 'menuItems', menuDoc.id), {
          ingredients: updatedIngredients,
          cost: newTotalCost,
          lastCostUpdate: Timestamp.now(),
          lastCostUpdateReason: 'Immediate menu cost sync fix'
        });
        
        updatedCount++;
      } else {
        console.log(`   ⏭️  No changes needed`);
      }
    }
    
    // Commit all updates
    if (updatedCount > 0) {
      console.log(`\n🔥 COMMITTING ${updatedCount} updates...`);
      await batch.commit();
      console.log(`✅ SUCCESS: Updated ${updatedCount} menu items!`);
      console.log('\n🎉 DONE: All menu costs are now synchronized with current inventory prices!');
      console.log('\n💡 Refresh the Menu Builder page to see the updated costs.');
    } else {
      console.log(`\n⚠️  No updates needed - all menu costs are already synchronized`);
    }
    
  } catch (error) {
    console.error('❌ Error updating menu costs:', error);
  }
};

// Make available globally
window.syncAllMenuCostsNow = syncAllMenuCostsNow;

console.log('✅ Function loaded: syncAllMenuCostsNow()');
console.log('📋 Run: syncAllMenuCostsNow() to fix all menu costs immediately');
