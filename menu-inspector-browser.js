/**
 * Menu Inspector - Works with CoreTrack's Firebase setup
 * Copy and paste this into your browser console while CoreTrack is open
 */

// Menu Inspector that works with your app's Firebase instance
(async function inspectMenu() {
  console.log('🔍 CoreTrack Menu Inspector Starting...');
  
  try {
    // Try to get Firebase from window or import
    let db, auth;
    
    // Method 1: Try window.firebase (if available)
    if (typeof firebase !== 'undefined') {
      db = firebase.firestore();
      auth = firebase.auth();
    }
    // Method 2: Try to get from your app's context
    else if (window.db && window.auth) {
      db = window.db;
      auth = window.auth;
    }
    // Method 3: Try to get from React DevTools or app instance
    else {
      console.log('🔍 Looking for Firebase in React app...');
      
      // Try to find Firebase through React fiber
      const reactFiber = document.querySelector('#__next')._reactInternalInstance ||
                        document.querySelector('#__next')._reactInternals ||
                        document.querySelector('[data-reactroot]')._reactInternalInstance;
      
      if (reactFiber) {
        console.log('🔍 Found React fiber, searching for Firebase...');
      }
      
      // Fallback: Show instruction
      console.log('❌ Cannot access Firebase directly. Please run this instead:');
      console.log(`
// Alternative: Use your existing debug functions
if (typeof checkMenuIngredients === 'function') {
  checkMenuIngredients();
} else {
  console.log('❌ Debug functions not available');
}
      `);
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
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const menuSnapshot = await menuItemsRef.get();
    
    console.log(`\n📋 Found ${menuSnapshot.size} menu items`);
    
    if (menuSnapshot.empty) {
      console.log('❌ No menu items found!');
      return;
    }
    
    // Inspect each menu item
    menuSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📦 Menu Item #${index + 1}: ${data.name} (ID: ${doc.id})`);
      console.log('   📊 Basic Info:');
      console.log(`      - Name: ${data.name}`);
      console.log(`      - Price: ₱${(data.price || 0).toFixed(2)}`);
      console.log(`      - Category: ${data.category}`);
      console.log(`      - Status: ${data.status || 'undefined'}`);
      
      console.log('   🧪 Ingredients Analysis:');
      if (data.ingredients && Array.isArray(data.ingredients)) {
        console.log(`      - Has ingredients: YES (${data.ingredients.length} items)`);
        
        data.ingredients.forEach((ing, ingIndex) => {
          console.log(`      [Ingredient #${ingIndex + 1}]`);
          console.log(`         - Structure keys: ${Object.keys(ing).join(', ')}`);
          
          // Check for both id and inventoryItemId
          const ingredientId = ing.id || ing.inventoryItemId;
          const ingredientName = ing.name || ing.inventoryItemName;
          
          console.log(`         - ID field: ${ing.id ? 'ing.id = ' + ing.id : 'MISSING'}`);
          console.log(`         - inventoryItemId field: ${ing.inventoryItemId ? 'ing.inventoryItemId = ' + ing.inventoryItemId : 'MISSING'}`);
          console.log(`         - Name: ${ingredientName || 'MISSING'}`);
          console.log(`         - Quantity: ${ing.quantity || 'MISSING'}`);
          console.log(`         - Unit: ${ing.unit || 'MISSING'}`);
          console.log(`         - Cost: ${ing.cost || 'MISSING'}`);
          
          if (!ingredientId) {
            console.log(`         ❌ NO INGREDIENT ID - This is the problem!`);
          } else {
            console.log(`         ✅ Ingredient ID found: ${ingredientId}`);
          }
        });
      } else {
        console.log('      - Has ingredients: NO');
        console.log('      ❌ This menu item has no ingredients to sync prices with!');
      }
      
      // Show the actual ingredient data for debugging
      if (data.ingredients && data.ingredients.length > 0) {
        console.log('   🔬 Raw ingredient data:');
        console.log(JSON.stringify(data.ingredients, null, 2));
      }
    });
    
    console.log('\n📊 Analysis Complete!');
    
  } catch (error) {
    console.error('❌ Error inspecting menu:', error);
    console.log('\n🔧 Alternative: Try your existing debug functions');
    console.log('Type one of these in the console:');
    console.log('- checkMenuIngredients()');
    console.log('- fullDiagnostic()');
    console.log('- checkInventoryStatus()');
  }
})();
