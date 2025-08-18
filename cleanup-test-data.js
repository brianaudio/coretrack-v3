const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC6oGC0LZhJhhtw4qVYDkaBfn72cXFb2l0",
  authDomain: "coretrack-inventory-v3.firebaseapp.com",
  projectId: "coretrack-inventory-v3",
  storageBucket: "coretrack-inventory-v3.firebasestorage.app",
  messagingSenderId: "779718005742",
  appId: "1:779718005742:web:4c0b8ba2f18d8e12ee6e47",
  measurementId: "G-6T30YWD95N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeTestData() {
  console.log('🗑️ Removing test data (coffee items)...\n');
  
  const TENANT_ID = 'gJPRV0nFGiULXAW9nciyGad686z2'; // From the logs

  try {
    // 1. Remove test orders containing "coffee" or "TEST"
    console.log('1. Checking orders for test data...');
    const ordersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    const ordersSnapshot = await getDocs(ordersRef);
    
    let deletedOrders = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      const orderNumber = orderData.orderNumber || '';
      const items = orderData.items || [];
      
      // Check if this is test data
      const isTestOrder = orderNumber.includes('TEST') || 
                         items.some(item => item.name.toLowerCase().includes('coffee'));
      
      if (isTestOrder) {
        console.log(`   🗑️ Deleting test order: ${orderNumber} (${items.map(i => i.name).join(', ')})`);
        await deleteDoc(doc(db, `tenants/${TENANT_ID}/orders`, orderDoc.id));
        deletedOrders++;
      }
    }
    
    console.log(`   ✅ Deleted ${deletedOrders} test orders\n`);

    // 2. Remove test inventory items containing "coffee" or "test"
    console.log('2. Checking inventory for test items...');
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    let deletedInventory = 0;
    
    for (const invDoc of inventorySnapshot.docs) {
      const invData = invDoc.data();
      const name = invData.name || '';
      
      // Check if this is test data
      const isTestItem = name.toLowerCase().includes('coffee') || 
                        name.toLowerCase().includes('test');
      
      if (isTestItem) {
        console.log(`   🗑️ Deleting test inventory: ${name}`);
        await deleteDoc(doc(db, `tenants/${TENANT_ID}/inventory`, invDoc.id));
        deletedInventory++;
      }
    }
    
    console.log(`   ✅ Deleted ${deletedInventory} test inventory items\n`);

    // 3. Remove test menu items containing "coffee" or "test"
    console.log('3. Checking menu items for test data...');
    const menuRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuRef);
    
    let deletedMenu = 0;
    
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      const name = menuData.name || '';
      
      // Check if this is test data
      const isTestItem = name.toLowerCase().includes('coffee') || 
                        name.toLowerCase().includes('test');
      
      if (isTestItem) {
        console.log(`   🗑️ Deleting test menu item: ${name}`);
        await deleteDoc(doc(db, `tenants/${TENANT_ID}/menuItems`, menuDoc.id));
        deletedMenu++;
      }
    }
    
    console.log(`   ✅ Deleted ${deletedMenu} test menu items\n`);

    // 4. Remove test POS items containing "coffee" or "test"
    console.log('4. Checking POS items for test data...');
    const posRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posSnapshot = await getDocs(posRef);
    
    let deletedPOS = 0;
    
    for (const posDoc of posSnapshot.docs) {
      const posData = posDoc.data();
      const name = posData.name || '';
      
      // Check if this is test data
      const isTestItem = name.toLowerCase().includes('coffee') || 
                        name.toLowerCase().includes('test');
      
      if (isTestItem) {
        console.log(`   🗑️ Deleting test POS item: ${name}`);
        await deleteDoc(doc(db, `tenants/${TENANT_ID}/posItems`, posDoc.id));
        deletedPOS++;
      }
    }
    
    console.log(`   ✅ Deleted ${deletedPOS} test POS items\n`);

    console.log('🎉 Test data cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Orders deleted: ${deletedOrders}`);
    console.log(`   - Inventory items deleted: ${deletedInventory}`);
    console.log(`   - Menu items deleted: ${deletedMenu}`);
    console.log(`   - POS items deleted: ${deletedPOS}`);
    
  } catch (error) {
    console.error('❌ Error removing test data:', error);
  }
}

removeTestData();
