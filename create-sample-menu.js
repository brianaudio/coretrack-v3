const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

async function createSampleMenuItem() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'tenant-demo';
    const locationId = 'main-branch'; // or whatever your location ID is
    
    console.log('☕ Creating sample coffee menu item...');
    
    // Create a menu item in the menuItems collection for the location
    const menuItemsRef = collection(db, 'tenants', tenantId, 'locations', locationId, 'menuItems');
    const menuItemDoc = await addDoc(menuItemsRef, {
      name: 'Iced Coffee',
      price: 120,
      category: 'beverages',
      description: 'Refreshing iced coffee',
      isAvailable: true,
      ingredients: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Menu item "Iced Coffee" created with ID: ${menuItemDoc.id}`);
    
    // Create another sample item
    const menuItemDoc2 = await addDoc(menuItemsRef, {
      name: 'Hot Latte',
      price: 150,
      category: 'beverages',
      description: 'Creamy hot latte',
      isAvailable: true,
      ingredients: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Menu item "Hot Latte" created with ID: ${menuItemDoc2.id}`);
    console.log('🎉 Sample menu items created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSampleMenuItem();
