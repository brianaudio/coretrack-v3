// Quick diagnostic to check current menu items structure
console.log('🔍 MENU DIAGNOSTIC: Checking ingredients structure...');

// This will run in browser console
const checkMenuItems = () => {
  // Get menu items from the current page
  const menuItemCards = document.querySelectorAll('[data-testid="menu-item"]');
  console.log(`Found ${menuItemCards.length} menu items on page`);
  
  // Or check if we can access the React state
  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    console.log('React internals available - could access component state');
  }
  
  // Alternative: Check if we have menu data in localStorage or sessionStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('menu')) {
      console.log(`Found localStorage key: ${key}`);
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(value)) {
          console.log(`${key} contains ${value.length} items`);
          if (value.length > 0 && value[0].ingredients !== undefined) {
            console.log('Sample ingredients:', value[0].ingredients);
          }
        }
      } catch (e) {
        // Not JSON
      }
    }
  }
};

// Global function for browser console
window.checkMenuItems = checkMenuItems;

console.log('✅ Run: checkMenuItems() in browser console to diagnose');
