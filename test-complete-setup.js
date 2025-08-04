const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '893699470433',
  appId: '1:893699470433:web:a5dcf242201b75c7eea620'
};

async function testCompleteSetup() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // Active tenant from console logs
    const locationId = 'location_BLbvD7gDm0xGTW5E7dXA'; // Location from console logs
    
    console.log('🧪 TESTING COMPLETE SETUP');
    console.log('========================\n');
    
    // Test 1: Check add-ons
    console.log('1️⃣ Checking add-ons...');
    const addonsRef = collection(db, 'tenants', tenantId, 'addons');
    const addonsSnapshot = await getDocs(addonsRef);
    
    const addons = [];
    addonsSnapshot.forEach(doc => {
      const data = doc.data();
      addons.push({ id: doc.id, ...data });
      console.log(`   ✅ ${data.name} - $${data.price/100} (Inventory: ${data.inventoryItemId})`);
    });
    
    // Test 2: Check inventory items
    console.log('\n2️⃣ Checking inventory items...');
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    const inventoryItems = {};
    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      inventoryItems[doc.id] = data;
      console.log(`   ✅ ${data.name} - ${data.quantity} ${data.unit}`);
    });
    
    // Test 3: Check menu items
    console.log('\n3️⃣ Checking menu items...');
    const menuRef = collection(db, 'tenants', tenantId, 'locations', locationId, 'menuItems');
    const menuSnapshot = await getDocs(menuRef);
    
    menuSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   ✅ ${data.name} - $${data.price/100} (${data.category})`);
    });
    
    // Test 4: Verify add-on to inventory linking
    console.log('\n4️⃣ Verifying add-on to inventory linking...');
    let allLinked = true;
    
    addons.forEach(addon => {
      if (addon.inventoryItemId && inventoryItems[addon.inventoryItemId]) {
        console.log(`   ✅ ${addon.name} → ${inventoryItems[addon.inventoryItemId].name}`);
      } else {
        console.log(`   ❌ ${addon.name} → NOT LINKED`);
        allLinked = false;
      }
    });
    
    console.log('\n🎯 SUMMARY');
    console.log('===========');
    console.log(`Add-ons: ${addons.length}`);
    console.log(`Inventory items: ${Object.keys(inventoryItems).length}`);
    console.log(`Menu items: ${menuSnapshot.size}`);
    console.log(`All linked: ${allLinked ? '✅ YES' : '❌ NO'}`);
    
    if (addons.length > 0 && Object.keys(inventoryItems).length > 0 && menuSnapshot.size > 0 && allLinked) {
      console.log('\n🎉 SYSTEM READY FOR TESTING!');
      console.log('You can now:');
      console.log('1. Go to Menu Builder → Add-ons tab to see the add-ons');
      console.log('2. Go to POS Enhanced to add menu items with add-ons');
      console.log('3. Process payments to test inventory deduction');
    } else {
      console.log('\n⚠️ Setup incomplete. Please check the issues above.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCompleteSetup();
