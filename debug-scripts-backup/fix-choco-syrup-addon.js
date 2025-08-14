const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

async function fixChocoSyrupAddon() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🔧 Fixing Choco Syrup Menu Builder addon...');
    
    // Fix the Menu Builder addon item
    const menuItemRef = doc(db, 'tenants', tenantId, 'menuItems', 'choco-syrup-addon');
    
    const correctIngredients = [
      {
        name: 'Choco Syrup',
        quantity: 1,
        unit: 'ml',
        inventoryItemId: 'skC0CB9s2fdXskMQZMAu' // This is the correct Choco Syrup inventory ID
      }
    ];
    
    await updateDoc(menuItemRef, {
      ingredients: correctIngredients
    });
    
    console.log('✅ Updated Choco Syrup addon with correct inventory item ID');
    console.log(`   - Old: dome-lids-id (invalid)`);
    console.log(`   - New: skC0CB9s2fdXskMQZMAu (Choco Syrup inventory item)`);
    
    console.log('\n🎉 Fix completed! The addon should now work properly.');
    
  } catch (error) {
    console.error('Error fixing addon:', error);
  }
}

fixChocoSyrupAddon();
