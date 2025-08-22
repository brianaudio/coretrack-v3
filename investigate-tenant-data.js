const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyApoMm_87pMuFcHqims4cIgGGQN2WT-Sss',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.appspot.com',
  messagingSenderId: '1046857746444',
  appId: '1:1046857746444:web:d96b45c7234567890123ab'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function investigateData() {
  const tenantId = 'gJPRV0nFGiULXAW9nciyGad686z2';
  console.log('🔍 Investigating data for tenant:', tenantId);
  
  try {
    // Check orders collection
    const ordersRef = collection(db, `tenants/${tenantId}/orders`);
    const ordersSnapshot = await getDocs(ordersRef);
    console.log('📦 Orders found:', ordersSnapshot.size);
    
    // Check expenses collection  
    const expensesRef = collection(db, `tenants/${tenantId}/expenses`);
    const expensesSnapshot = await getDocs(expensesRef);
    console.log('💰 Expenses found:', expensesSnapshot.size);
    
    // Check inventory collection
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    console.log('📋 Inventory items found:', inventorySnapshot.size);
    
    // Check menu items collection
    const menuRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuRef);
    console.log('🍽️ Menu items found:', menuSnapshot.size);
    
    // Check if tenant has branches/locations
    const branchesRef = collection(db, `tenants/${tenantId}/branches`);
    const branchesSnapshot = await getDocs(branchesRef);
    console.log('🏪 Branches found:', branchesSnapshot.size);
    
    if (branchesSnapshot.size > 0) {
      console.log('\n📍 Branch locations:');
      branchesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('  -', doc.id, ':', data.name || 'No name');
      });
    }
    
    // Check for alternative collection names
    console.log('\n🔍 Checking alternative collection names...');
    
    const posOrdersRef = collection(db, `tenants/${tenantId}/posOrders`);
    const posOrdersSnapshot = await getDocs(posOrdersRef);
    console.log('🛒 POS Orders found:', posOrdersSnapshot.size);
    
    const itemsRef = collection(db, `tenants/${tenantId}/items`);
    const itemsSnapshot = await getDocs(itemsRef);
    console.log('📦 Items found:', itemsSnapshot.size);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

investigateData();
