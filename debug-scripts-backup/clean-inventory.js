const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBEPcIJG0QjYAE_wR6WKRNjvdoggU8_96A',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1079006808397',
  appId: '1:1079006808397:web:7db82ac8fe2c4a87c96e3b',
  measurementId: 'G-FQCGZKMHPE'
};

async function cleanInventoryCenter() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🧹 CLEANING INVENTORY CENTER');
    console.log('=' .repeat(40));
    
    // Items that should REMAIN (actual ingredients)
    const validIngredients = [
      'Cups 22 oz',
      'Straw', 
      'Dome Lids',
      'Cups 16 oz'
    ];
    
    const invRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const invSnapshot = await getDocs(invRef);
    
    console.log(`Found ${invSnapshot.size} inventory items total`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const docSnap of invSnapshot.docs) {
      const data = docSnap.data();
      const itemName = data.name;
      
      if (validIngredients.includes(itemName)) {
        console.log(`✅ KEEPING: ${itemName} (valid ingredient)`);
        keptCount++;
      } else {
        console.log(`❌ DELETING: ${itemName} (finished product, should not be in inventory)`);
        await deleteDoc(doc(db, `tenants/${TENANT_ID}/inventory`, docSnap.id));
        deletedCount++;
      }
    }
    
    console.log(`\n🎯 CLEANUP COMPLETE:`);
    console.log(`   ✅ Kept ${keptCount} valid ingredients`);
    console.log(`   ❌ Deleted ${deletedCount} finished products`);
    console.log(`\n💡 Your Inventory Center now only contains actual ingredients!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

cleanInventoryCenter();
