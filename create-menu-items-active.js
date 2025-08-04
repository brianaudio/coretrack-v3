const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '893699470433',
  appId: '1:893699470433:web:a5dcf242201b75c7eea620'
};

async function createMenuItemsForActiveTenant() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    const locationId = 'location_BLbvD7gDm0xGTW5E7dXA';
    
    console.log(`☕ Creating menu items for tenant: ${tenantId}, location: ${locationId}`);
    
    const menuItems = [
      {
        name: 'Iced Coffee',
        price: 120,
        category: 'beverages',
        description: 'Refreshing iced coffee',
        isAvailable: true,
        ingredients: [],
      },
      {
        name: 'Hot Latte',
        price: 150,
        category: 'beverages',
        description: 'Creamy hot latte',
        isAvailable: true,
        ingredients: [],
      },
      {
        name: 'Cappuccino',
        price: 130,
        category: 'beverages',
        description: 'Rich cappuccino with foam',
        isAvailable: true,
        ingredients: [],
      }
    ];
    
    const menuItemsRef = collection(db, 'tenants', tenantId, 'locations', locationId, 'menuItems');
    
    for (const item of menuItems) {
      const menuItemDoc = await addDoc(menuItemsRef, {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Menu item "${item.name}" created with ID: ${menuItemDoc.id}`);
    }
    
    console.log('🎉 Menu items created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createMenuItemsForActiveTenant();
