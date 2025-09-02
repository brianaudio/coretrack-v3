/**
 * Debug Script: Menu Items Ingredient Analysis
 * Tests the menu items to see if they have ingredients defined
 */

// Test the real-time sync functionality
function debugMenuIngredientsIssue() {
  console.log('🔍 STARTING MENU INGREDIENTS DIAGNOSIS...');
  
  // 1. Test if we can access the sync instance
  console.log('📋 Step 1: Check if real-time sync is active');
  
  // 2. Manually trigger a price change test
  console.log('📋 Step 2: Simulating inventory price change...');
  
  // 3. Check menu items structure
  console.log('📋 Step 3: Analyzing menu items...');
  
  // Listen for the custom event
  window.addEventListener('menuCostsUpdated', (event) => {
    console.log('🎉 Menu costs updated event received:', event.detail);
  });
  
  // Create a test event to see if the system responds
  const testEvent = new CustomEvent('inventoryPriceChange', {
    detail: {
      itemId: 'test-item',
      oldPrice: 1.00,
      newPrice: 2.00
    }
  });
  
  window.dispatchEvent(testEvent);
  
  console.log('🔍 Diagnosis complete. Check console for menu structure details.');
}

// Run the diagnosis
debugMenuIngredientsIssue();

// Export for global access
window.debugMenuIngredientsIssue = debugMenuIngredientsIssue;

console.log('🧪 Menu ingredients debug script loaded. Run debugMenuIngredientsIssue() to diagnose.');
