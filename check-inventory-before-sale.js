const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkInventoryLevels() {
  try {
    console.log('📦 INVENTORY LEVELS BEFORE SALE');
    console.log('=' .repeat(50));
    
    const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
    
    console.log(`Found ${inventorySnapshot.docs.length} inventory items:`);
    console.log();
    
    // Sort items by name for consistent display
    const items = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.currentStock} ${item.unit} (${item.status})`);
    });
    
    console.log('\n🎯 KEY ITEMS TO WATCH:');
    console.log('- Cups 16 oz: Should decrease if "Coke Float 16 oz" sold');
    console.log('- Cups 22 oz: Should decrease if "Coke Float 22 oz" sold');
    console.log('- Dome Lids: Should decrease if floats with lids sold');
    console.log('- Straw: Should decrease if drinks with straws sold');
    console.log('- Finished products (Coke Float 16 oz, etc.): Should NOT decrease if ingredient deduction works');
    
    console.log('\n⏰ Current timestamp:', new Date().toLocaleString());
    console.log('🚀 Ready for you to make a sale!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkInventoryLevels();
