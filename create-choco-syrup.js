// Create the Choco Syrup add-on directly in Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createChocoSyrupAddon() {
  try {
    const tenantId = "halYcRuDyldZNDp9H1mgtqwDpZh2";
    const locationId = "location_BLbvD7gDm0xGTW5E7dXA";
    
    // Create Choco Syrup as Menu Builder add-on
    const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, 'choco-syrup-addon');
    
    const chocoSyrupData = {
      name: "Choco Syrup",
      description: "Rich chocolate syrup add-on",
      category: "Syrup",
      price: 5.00,
      cost: 0.89, // Based on your profit calculation
      ingredients: [
        {
          inventoryItemId: "dome-lids-id", // You mentioned Dome Lids
          inventoryItemName: "Dome Lids",
          quantity: 1,
          unit: "units",
          cost: 0.89
        }
      ],
      preparationTime: 1,
      calories: 50,
      allergens: [],
      emoji: "🍫",
      status: "active",
      isPopular: false,
      displayOrder: 100,
      tenantId: tenantId,
      locationId: locationId,
      
      // 🎯 Add-on specific fields
      isAddonOnly: true,
      addonType: "extra",
      isRequired: false,
      maxQuantity: 5,
      applicableItems: [], // Can apply to any item
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(menuItemRef, chocoSyrupData);
    
    console.log('✅ Created Choco Syrup add-on successfully!');
    console.log('📊 Details:');
    console.log(`   - Name: ${chocoSyrupData.name}`);
    console.log(`   - Price: ₱${chocoSyrupData.price}`);
    console.log(`   - Category: ${chocoSyrupData.category}`);
    console.log(`   - isAddonOnly: ${chocoSyrupData.isAddonOnly}`);
    console.log(`   - addonType: ${chocoSyrupData.addonType}`);
    console.log('');
    console.log('🔄 Refresh your POS to see the Choco Syrup add-on!');
    
  } catch (error) {
    console.error('❌ Error creating Choco Syrup add-on:', error);
  }
}

createChocoSyrupAddon();
