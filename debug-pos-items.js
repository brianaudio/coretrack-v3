const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

async function debugPOSItems() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🔍 CHECKING POS ITEMS FOR INGREDIENTS');
    console.log('=' .repeat(50));
    
    const posRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posSnapshot = await getDocs(posRef);
    
    console.log(`Found ${posSnapshot.size} POS items:`);
    
    posSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.name} (ID: ${doc.id}):`);
      console.log(`   Price: $${data.price}`);
      console.log(`   Category: ${data.category}`);
      console.log(`   Has ingredients: ${data.ingredients ? 'YES' : 'NO'}`);
      console.log(`   MenuItemId: ${data.menuItemId || 'NONE'}`);
      
      if (data.ingredients && data.ingredients.length > 0) {
        console.log(`   Ingredients (${data.ingredients.length}):`);
        data.ingredients.forEach(ing => {
          console.log(`     - ${ing.inventoryItemName}: ${ing.quantity} ${ing.unit}`);
        });
      } else {
        console.log('   ❌ NO INGREDIENTS STORED IN POS ITEM!');
        console.log('   💡 This is why inventory deduction fails!');
      }
    });
    
    if (posSnapshot.size === 0) {
      console.log('❌ NO POS ITEMS FOUND! Menu items are not syncing to POS.');
      console.log('💡 This means Menu Builder → POS sync is broken.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugPOSItems().then(() => process.exit(0));
