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

async function checkAllTenants() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Checking all tenants...');
    const tenantsRef = collection(db, 'tenants');
    const tenantsSnapshot = await getDocs(tenantsRef);
    
    if (tenantsSnapshot.empty) {
      console.log('❌ No tenants found');
      return;
    }
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      console.log(`\n📁 Tenant: ${tenantId}`);
      
      // Check add-ons
      const addonsRef = collection(db, 'tenants', tenantId, 'addons');
      const addonsSnapshot = await getDocs(addonsRef);
      
      console.log(`  🔗 Add-ons (${addonsSnapshot.size}):`);
      addonsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`    ✅ ${data.name} - $${data.price} (ID: ${doc.id})`);
      });
      
      // Check inventory
      const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
      const inventorySnapshot = await getDocs(inventoryRef);
      
      console.log(`  📦 Inventory (${inventorySnapshot.size}):`);
      inventorySnapshot.forEach(doc => {
        const data = doc.data();
        const quantity = data.currentStock !== undefined ? data.currentStock : 'UNDEFINED';
        const unit = data.unit || 'UNDEFINED';
        console.log(`    ✅ ${data.name} - ${quantity} ${unit} (ID: ${doc.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllTenants();
