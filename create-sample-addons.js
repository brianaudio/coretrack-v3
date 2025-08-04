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

async function createSampleAddons() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'tenant-demo';
    
    const addonsToCreate = [
      {
        name: 'Whipped Cream',
        inventoryData: {
          name: 'Whipped Cream',
          quantity: 50,
          unit: 'ml',
          category: 'toppings',
          reorderLevel: 5,
          price: 0.75,
          supplier: 'Dairy Co.'
        },
        addonData: {
          name: 'Whipped Cream',
          price: 20,
          category: 'toppings'
        }
      },
      {
        name: 'Extra Shot',
        inventoryData: {
          name: 'Extra Shot',
          quantity: 200,
          unit: 'ml',
          category: 'coffee',
          reorderLevel: 20,
          price: 0.30,
          supplier: 'Coffee Beans Co.'
        },
        addonData: {
          name: 'Extra Shot',
          price: 25,
          category: 'coffee'
        }
      },
      {
        name: 'Vanilla Syrup',
        inventoryData: {
          name: 'Vanilla Syrup',
          quantity: 100,
          unit: 'ml',
          category: 'syrups',
          reorderLevel: 10,
          price: 0.50,
          supplier: 'Syrup Co.'
        },
        addonData: {
          name: 'Vanilla Syrup',
          price: 15,
          category: 'syrups'
        }
      }
    ];
    
    for (const item of addonsToCreate) {
      console.log(`🍯 Creating ${item.name}...`);
      
      // Create inventory item
      const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
      const inventoryDoc = await addDoc(inventoryRef, {
        ...item.inventoryData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create add-on
      const addonsRef = collection(db, 'tenants', tenantId, 'addons');
      const addonDoc = await addDoc(addonsRef, {
        ...item.addonData,
        inventoryItemId: inventoryDoc.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      });
      
      console.log(`✅ ${item.name} created (Inventory: ${inventoryDoc.id}, Add-on: ${addonDoc.id})`);
    }
    
    console.log('🎉 All sample add-ons created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSampleAddons();
