const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

async function debugMenuItemIngredients() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🔍 Debugging Menu Item Ingredients...\n');
    
    // Check menu items and their ingredients
    const menuItemsRef = collection(db, 'tenants', tenantId, 'menuItems');
    const menuSnapshot = await getDocs(menuItemsRef);
    
    console.log(`📋 Found ${menuSnapshot.size} menu items:\n`);
    
    menuSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`📦 Menu Item: ${data.name} (ID: ${docSnap.id})`);
      console.log(`   - Location ID: ${data.locationId || 'UNDEFINED'}`);
      console.log(`   - Is Addon Only: ${data.isAddonOnly || false}`);
      console.log(`   - Price: $${data.price || 'UNDEFINED'}`);
      
      if (data.ingredients && data.ingredients.length > 0) {
        console.log(`   - Ingredients (${data.ingredients.length}):`);
        data.ingredients.forEach((ingredient, index) => {
          console.log(`     ${index + 1}. ${ingredient.name || 'UNNAMED'}`);
          console.log(`        - Quantity: ${ingredient.quantity || 'UNDEFINED'}`);
          console.log(`        - Unit: ${ingredient.unit || 'UNDEFINED'}`);
          console.log(`        - Inventory Item ID: ${ingredient.inventoryItemId || 'UNDEFINED'}`);
        });
      } else {
        console.log(`   - No ingredients configured`);
      }
      console.log('');
    });
    
    // Also check add-ons
    const addonsRef = collection(db, 'tenants', tenantId, 'addons');
    const addonsSnapshot = await getDocs(addonsRef);
    
    console.log(`🔗 Found ${addonsSnapshot.size} add-ons:\n`);
    
    addonsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`🧩 Add-on: ${data.name} (ID: ${docSnap.id})`);
      console.log(`   - Price: $${data.price || 'UNDEFINED'}`);
      console.log(`   - Category: ${data.category || 'UNDEFINED'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMenuItemIngredients();
