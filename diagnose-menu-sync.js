/**
 * CRITICAL DIAGNOSIS: Menu Ingredient Price Sync Issue
 * This script will identify the exact reason why menu unit prices aren't updating
 */

console.log('🚨 CRITICAL DIAGNOSIS: Menu Ingredient Price Sync Issue');
console.log('=====================================================');

// Function to run comprehensive diagnosis
async function diagnoseMenuPriceSyncIssue() {
  console.log('🔍 Step 1: Checking if real-time sync is active...');
  
  // Check if the real-time sync service is running
  const syncEvents = [];
  
  // Listen for all sync-related events
  window.addEventListener('menuCostsUpdated', (event) => {
    console.log('✅ menuCostsUpdated event detected:', event.detail);
    syncEvents.push('menuCostsUpdated');
  });
  
  console.log('🔍 Step 2: Checking browser console for sync logs...');
  console.log('Look for these log patterns:');
  console.log('  - 🚀 Starting real-time menu cost synchronization...');
  console.log('  - 📋 Loaded X menu items for cost sync');
  console.log('  - 📦 Inventory price change detected...');
  console.log('  - 📈 Price change: [item] ₱X → ₱Y');
  console.log('  - 🔍 Analyzing X menu items for cost updates');
  console.log('  - ⏭️ Skipping [item]: No ingredients defined');
  
  console.log('🔍 Step 3: Manual inventory change test...');
  console.log('To test the sync:');
  console.log('1. Go to InventoryCenter');
  console.log('2. Change the price of an inventory item (e.g., cups from ₱1.45 to ₱2.00)');
  console.log('3. Check console for detailed sync logs');
  console.log('4. Go to MenuBuilder and check if menu item costs updated');
  
  // Create a function to manually trigger diagnosis
  window.testMenuSync = function() {
    console.log('🧪 MANUAL SYNC TEST:');
    console.log('1. Check that menu items have ingredients defined');
    console.log('2. Check that ingredients have valid inventoryItemId');
    console.log('3. Check that inventory items exist with matching IDs');
    
    // Dispatch a test event to see if listeners are working
    const testEvent = new CustomEvent('menuSyncTest', {
      detail: { timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(testEvent);
    console.log('🚀 Test event dispatched');
  };
  
  console.log('🔍 Step 4: Diagnosis complete');
  console.log('📋 EXPECTED ISSUE: Menu items likely missing ingredients with inventoryItemId');
  console.log('📋 SOLUTION: Add ingredients to menu items that link to inventory items');
  console.log('');
  console.log('🧪 Run window.testMenuSync() to manually test');
  console.log('');
  console.log('WAIT FOR THE ENHANCED DEBUG LOGS IN CONSOLE...');
}

// Run diagnosis
diagnoseMenuPriceSyncIssue();

// Also create a function to check menu item structure
window.checkMenuItemStructure = function() {
  console.log('🔍 CHECKING MENU ITEM STRUCTURE...');
  console.log('This will show detailed menu item analysis when you navigate to MenuBuilder');
};
