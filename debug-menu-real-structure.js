// This script will be run in browser console to check REAL menu structure
console.log('🔍 REAL MENU STRUCTURE DEBUG');

// Function to check menu items in current state
const debugRealMenuStructure = async () => {
  console.log('🚀 Checking real menu structure...');
  
  // Try to access Firebase from window
  if (window.firebase || window.db) {
    console.log('✅ Firebase available');
    
    // Check if we can access current tenant
    const authUser = window.auth?.currentUser;
    if (authUser) {
      console.log('✅ Auth user available:', authUser.uid);
    }
  }
  
  // Check React component state if available
  const reactFiber = document.querySelector('[data-reactroot]')?._reactInternalFiber ||
                   document.querySelector('[data-reactroot]')?._reactInternalInstance;
  
  if (reactFiber) {
    console.log('✅ React fiber available');
  }
  
  // Check localStorage for any menu data
  console.log('\n📋 Checking localStorage for menu data...');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('menu') || key.includes('Menu'))) {
      console.log(`Found key: ${key}`);
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(data) && data.length > 0 && data[0].ingredients) {
          console.log('Sample menu item ingredients:', data[0].ingredients);
        }
      } catch (e) {
        // Not JSON
      }
    }
  }
  
  // Check if we can find menu items in the DOM
  console.log('\n🔍 Checking DOM for menu items...');
  const menuCards = document.querySelectorAll('[class*="menu"]');
  console.log(`Found ${menuCards.length} potential menu elements`);
  
  // Look for ingredient data in any form
  const ingredientElements = document.querySelectorAll('[class*="ingredient"]');
  console.log(`Found ${ingredientElements.length} potential ingredient elements`);
  
  console.log('\n💡 To get real data, we need to trigger the menu sync debug during purchase order delivery');
};

// Make available globally
window.debugRealMenuStructure = debugRealMenuStructure;

console.log('✅ Run: debugRealMenuStructure() to check current state');
