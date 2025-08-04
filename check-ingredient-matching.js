const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBEPcIJG0QjYAE_wR6WKRNjvdoggU8_96A',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1079006808397',
  appId: '1:1079006808397:web:7db82ac8fe2c4a87c96e3b',
  measurementId: 'G-FQCGZKMHPE'
};

async function checkIngredientMatching() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🔍 CHECKING INGREDIENT NAME MATCHING');
    console.log('=' .repeat(50));
    
    // Get Coke Float 16 oz menu item
    const menuRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuRef);
    
    let cokeFloat = null;
    menuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name === 'Coke Float 16 oz') {
        cokeFloat = { id: doc.id, ...data };
      }
    });
    
    if (!cokeFloat) {
      console.log('❌ Coke Float 16 oz not found in menu');
      return;
    }
    
    console.log('🍽️ Coke Float 16 oz menu item:');
    console.log(`   Name: ${cokeFloat.name}`);
    console.log(`   Price: $${cokeFloat.price}`);
    console.log(`   Ingredients (${cokeFloat.ingredients?.length || 0}):`);
    
    if (cokeFloat.ingredients && cokeFloat.ingredients.length > 0) {
      for (const ing of cokeFloat.ingredients) {
        console.log(`     - Looking for: "${ing.inventoryItemName}" (ID: ${ing.inventoryItemId})`);
        
        // Check if this ID exists in inventory
        try {
          const invDoc = await getDoc(doc(db, `tenants/${TENANT_ID}/inventory`, ing.inventoryItemId));
          if (invDoc.exists()) {
            const invData = invDoc.data();
            console.log(`       ✅ Found in inventory: "${invData.name}" (Stock: ${invData.currentStock})`);
            
            if (ing.inventoryItemName !== invData.name) {
              console.log(`       ⚠️  NAME MISMATCH! Menu expects "${ing.inventoryItemName}" but inventory has "${invData.name}"`);
            } else {
              console.log(`       ✅ Names match perfectly!`);
            }
          } else {
            console.log(`       ❌ NOT FOUND in inventory!`);
          }
        } catch (error) {
          console.log(`       ❌ Error checking inventory: ${error.message}`);
        }
      }
    } else {
      console.log('     ❌ NO INGREDIENTS CONFIGURED!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkIngredientMatching().then(() => process.exit(0));
