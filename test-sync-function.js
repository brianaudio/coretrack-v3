// TEST SYNC FUNCTION - Test if manual sync works
// This helps isolate if the issue is with the sync function itself
// Copy and paste this script in browser console at http://localhost:3002

(async function() {
  console.log('🧪 TESTING SYNC FUNCTION');
  console.log('========================');
  
  // Test creating a sample menu item and syncing it
  const testMenuItem = {
    id: 'test-item-' + Date.now(),
    name: 'Test Menu Item',
    description: 'Test description',
    category: 'Test Category',
    price: 10.99,
    cost: 5.00,
    ingredients: [],
    preparationTime: 15,
    calories: 200,
    allergens: [],
    status: 'active',
    isPopular: false,
    displayOrder: 1,
    tenantId: 'halYcRuDyldZNDp9H1mgtqwDpZh2',
    emoji: '🧪',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('🔍 Test menu item data:', testMenuItem);
  
  // Try to access the sync function via the global scope if available
  // This won't work directly but helps us understand the issue
  console.log('⚠️ Note: This test requires the sync function to be available in browser context');
  console.log('📋 The actual sync happens server-side during menu item creation');
  console.log('');
  console.log('🎯 RECOMMENDED ACTIONS:');
  console.log('1. Run the diagnostic script: debug-menu-creation.js');
  console.log('2. Check browser console when creating a menu item');
  console.log('3. Look for sync error messages');
  console.log('4. If items exist in menuItems but not posItems, run: manual-sync-menu-to-pos.js');
  
})();
