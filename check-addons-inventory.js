const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

async function checkData() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Checking add-ons...');
    const addonsRef = collection(db, 'tenants', 'tenant-demo', 'addons');
    const addonsSnapshot = await getDocs(addonsRef);
    
    if (addonsSnapshot.empty) {
      console.log('❌ No add-ons found');
    } else {
      addonsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('✅ Add-on:', { 
          id: doc.id, 
          name: data.name, 
          price: data.price,
          category: data.category,
          inventoryItemId: data.inventoryItemId 
        });
      });
    }
    
    console.log('\n🔍 Checking inventory items...');
    const inventoryRef = collection(db, 'tenants', 'tenant-demo', 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    if (inventorySnapshot.empty) {
      console.log('❌ No inventory items found');
    } else {
      inventorySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('✅ Inventory item:', { 
          id: doc.id, 
          name: data.name, 
          quantity: data.quantity,
          unit: data.unit 
        });
      });
    }
    
    console.log('\n🔍 Checking if "Choco Syrup" exists in inventory...');
    const chocoQuery = query(inventoryRef, where('name', '==', 'Choco Syrup'));
    const chocoSnapshot = await getDocs(chocoQuery);
    
    if (chocoSnapshot.empty) {
      console.log('❌ "Choco Syrup" not found in inventory');
    } else {
      chocoSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('✅ Found "Choco Syrup":', { 
          id: doc.id, 
          name: data.name, 
          quantity: data.quantity 
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
