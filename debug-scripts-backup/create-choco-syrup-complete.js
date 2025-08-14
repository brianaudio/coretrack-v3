const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

async function createChocoSyrupAddon() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'tenant-demo'; // Change this to your current tenant
    
    console.log('🍫 Creating Choco Syrup inventory item...');
    
    // Create inventory item first
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventoryDoc = await addDoc(inventoryRef, {
      name: 'Choco Syrup',
      quantity: 100,
      unit: 'ml',
      category: 'syrups',
      reorderLevel: 10,
      price: 0.50,
      supplier: 'Syrup Co.',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Inventory item created with ID: ${inventoryDoc.id}`);
    
    // Create add-on linked to inventory item
    console.log('🔗 Creating Choco Syrup add-on...');
    const addonsRef = collection(db, 'tenants', tenantId, 'addons');
    const addonDoc = await addDoc(addonsRef, {
      name: 'Choco Syrup',
      price: 15,
      category: 'syrups',
      inventoryItemId: inventoryDoc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });
    
    console.log(`✅ Add-on created with ID: ${addonDoc.id}`);
    console.log('🎉 Choco Syrup add-on and inventory item created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createChocoSyrupAddon();
