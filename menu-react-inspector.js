/**
 * Menu Ingredient Inspector - Works with loaded CoreTrack app
 * This script accesses your menu data through the loaded React components
 */

console.log('🔍 Menu Ingredient Inspector - CoreTrack Integration');
console.log('================================================\n');

// Function to inspect menu ingredients through React DevTools
function inspectMenuIngredients() {
  try {
    console.log('🔍 Attempting to access menu data through React...');
    
    // Method 1: Try to find React Fiber nodes
    const appElement = document.querySelector('#__next') || document.querySelector('[data-reactroot]');
    if (appElement && appElement._reactInternalInstance) {
      console.log('✅ Found React app instance');
    }
    
    // Method 2: Look for loaded data in the DOM/localStorage
    const localStorage = window.localStorage;
    const sessionStorage = window.sessionStorage;
    
    console.log('🔍 Checking local storage for menu data...');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('menu') || key.includes('inventory')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          console.log(`📋 LocalStorage [${key}]:`, data);
        } catch (e) {
          console.log(`📋 LocalStorage [${key}]: ${localStorage.getItem(key)}`);
        }
      }
    });
    
    // Method 3: Access through window objects (if available)
    if (window.menuItems) {
      console.log('📋 Found window.menuItems:', window.menuItems);
    }
    
    if (window.inventoryItems) {
      console.log('📦 Found window.inventoryItems:', window.inventoryItems);
    }
    
    // Method 4: Manual database access (simplified)
    console.log('\n🔧 Manual Database Check Instructions:');
    console.log('1. Open Network tab in DevTools');
    console.log('2. Go to Menu Builder page');
    console.log('3. Look for Firebase requests');
    console.log('4. Check the response data');
    
    console.log('\n📋 Expected Menu Item Structure:');
    console.log('Menu item should have ingredients with:');
    console.log('- inventoryItemId: "some_id" (links to inventory)');
    console.log('- inventoryItemName: "ingredient name"');
    console.log('- quantity: number (amount needed)');
    console.log('- cost: number (calculated cost)');
    
    console.log('\n📦 Expected Inventory Structure:');
    console.log('Inventory item should have:');
    console.log('- id: "some_id" (matches inventoryItemId)');
    console.log('- name: "ingredient name"');
    console.log('- costPerUnit: number (current unit cost)');
    console.log('- unit: "kg/lbs/pieces"');
    
    console.log('\n🎯 Key Questions to Answer:');
    console.log('1. Does your menu ingredient have inventoryItemId field?');
    console.log('2. Does this ID match an actual inventory item ID?');
    console.log('3. Is the ingredient cost = inventory costPerUnit × quantity?');
    console.log('4. When inventory costPerUnit changes, should menu cost update?');
    
  } catch (error) {
    console.error('❌ Error inspecting menu:', error);
  }
}

// Run the inspection
inspectMenuIngredients();

// Manual inspection prompts
console.log('\n🔧 Manual Steps to Debug:');
console.log('1. Go to Menu Builder page');
console.log('2. Open the menu item for editing');
console.log('3. Look at the ingredient details');
console.log('4. Note the ingredient IDs');
console.log('5. Go to Inventory Center');
console.log('6. Find the same ingredient');
console.log('7. Note its ID and cost per unit');
console.log('8. Compare the IDs and costs');

console.log('\n📋 Quick Test:');
console.log('- Your menu shows cost: ₱0.89');
console.log('- Your inventory shows new cost per unit');
console.log('- The menu cost should = (new cost per unit) × (quantity needed)');
console.log('- If they don\'t match, there\'s a linking problem');

// Provide debug commands
console.log('\n🔧 Debug Commands Available:');
console.log('- Go to Menu Builder → Edit your menu item');
console.log('- Check the ingredient section');
console.log('- Look for the inventory item dropdown');
console.log('- Verify the selected item matches your inventory');
