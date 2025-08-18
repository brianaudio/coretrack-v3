const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

// Firebase configuration - Same as main app
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // Active tenant

async function cleanInventory() {
  try {
    console.log('🧹 CLEANING INVENTORY - REMOVING FINISHED PRODUCTS');
    console.log('=' .repeat(60));
    
    const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
    
    // Define what should be INGREDIENTS (keep) vs FINISHED PRODUCTS (remove)
    const finishedProducts = [
      'Chicken Tenders',
      'Coke Float 16 oz',
      'Coke Float 22 oz',
      'Mirinda Float 16 oz',
      'Root Beer Float 16 oz',
      'Root Beer Float 22 oz',
      'Regular Fries',
      'Fries Medium'
    ];
    
    const ingredients = [
      'Cups 16 oz',
      'Cups 22 oz', 
      'Dome Lids',
      'Straw',
      'Cups'
    ];
    
    console.log('📋 Current inventory analysis:');
    
    let toDelete = [];
    let toKeep = [];
    
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = data.name;
      
      if (finishedProducts.includes(name)) {
        toDelete.push({ id: doc.id, name, stock: data.currentStock });
        console.log(`  ❌ REMOVE: ${name} (${data.currentStock} ${data.unit}) - This is a menu item`);
      } else if (ingredients.some(ing => name.includes(ing))) {
        toKeep.push({ id: doc.id, name, stock: data.currentStock });
        console.log(`  ✅ KEEP: ${name} (${data.currentStock} ${data.unit}) - This is an ingredient`);
      } else {
        console.log(`  ❓ UNKNOWN: ${name} (${data.currentStock} ${data.unit}) - Please review manually`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  🗑️  Items to delete: ${toDelete.length}`);
    console.log(`  ✅ Items to keep: ${toKeep.length}`);
    
    if (toDelete.length > 0) {
      console.log('\n🗑️  Deleting finished products from inventory:');
      for (const item of toDelete) {
        await deleteDoc(doc(db, `tenants/${tenantId}/inventory`, item.id));
        console.log(`    ✅ Deleted: ${item.name}`);
      }
    }
    
    console.log('\n🎉 INVENTORY CLEANUP COMPLETE!');
    console.log('\n✅ Your inventory should now contain only RAW INGREDIENTS:');
    toKeep.forEach(item => {
      console.log(`  - ${item.name}: ${item.stock}`);
    });
    
    console.log('\n💡 Now when you make a sale:');
    console.log('  - "Coke Float 16 oz" will deduct ingredients (Cups) from inventory');
    console.log('  - NOT the finished product itself');
    console.log('  - This is the correct restaurant inventory behavior!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

cleanInventory();
