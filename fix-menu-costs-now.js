const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAWNIqvFvPJKPpFznMYWZQhpPKxOX3hPvQ",
  authDomain: "coretrack-inventory.firebaseapp.com", 
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.appspot.com",
  messagingSenderId: "397827924491",
  appId: "1:397827924491:web:4e94e6b47ca1896ace3ded",
  measurementId: "G-0J67SGYMK7"
};

async function fixAllMenuCostsNow() {
  try {
    console.log('🔧 IMMEDIATE FIX: Updating ALL menu costs with current inventory prices...');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get tenant (assuming single tenant)
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    if (tenantsSnapshot.empty) {
      console.log('❌ No tenants found');
      return;
    }
    
    const tenantId = tenantsSnapshot.docs[0].id;
    console.log(`🏢 Tenant: ${tenantId}`);
    
    // Get ALL inventory items
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
    const menuRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuSnapshot = await getDocs(menuRef);
    
    console.log(`\n📋 Found ${menuSnapshot.docs.length} menu items`);
    
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
            console.log(`        🔥 UPDATED!`);
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
          lastCostUpdate: new Date(),
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
    } else {
      console.log(`\n⚠️  No updates needed`);
    }
    
    console.log('\n🎉 DONE: All menu costs are now synchronized with current inventory prices!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAllMenuCostsNow();
