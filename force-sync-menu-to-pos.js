const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, addDoc, updateDoc, query, where, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBEPcIJG0QjYAE_wR6WKRNjvdoggU8_96A',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1079006808397',
  appId: '1:1079006808397:web:7db82ac8fe2c4a87c96e3b',
  measurementId: 'G-FQCGZKMHPE'
};

async function forceSyncMenuToPOS() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🔄 FORCE SYNCING MENU ITEMS TO POS');
    console.log('=' .repeat(50));
    
    // Get all menu items
    const menuRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuRef);
    
    console.log(`Found ${menuSnapshot.size} menu items to sync:`);
    
    for (const menuDoc of menuSnapshot.docs) {
      const menuData = menuDoc.data();
      console.log(`\nSyncing: ${menuData.name}`);
      console.log(`  Ingredients: ${menuData.ingredients?.length || 0}`);
      
      if (menuData.ingredients && menuData.ingredients.length > 0) {
        menuData.ingredients.forEach(ing => {
          console.log(`    - ${ing.inventoryItemName}: ${ing.quantity} ${ing.unit}`);
        });
      }
      
      // Create POS item with ingredients
      const posItemData = {
        name: menuData.name,
        category: menuData.category,
        price: menuData.price,
        cost: menuData.cost || 0,
        description: menuData.description || '',
        isAvailable: menuData.status === 'active',
        preparationTime: menuData.preparationTime || 0,
        tenantId: TENANT_ID,
        ingredients: menuData.ingredients || [], // CRITICAL: Include ingredients
        menuItemId: menuDoc.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Check if POS item already exists
      const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
      const existingQuery = query(
        posItemsRef, 
        where('name', '==', menuData.name),
        where('category', '==', menuData.category)
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        // Create new POS item
        const docRef = await addDoc(posItemsRef, posItemData);
        console.log(`  ✅ Created POS item: ${docRef.id}`);
      } else {
        // Update existing POS item
        const existingDoc = existingDocs.docs[0];
        await updateDoc(existingDoc.ref, {
          ...posItemData,
          updatedAt: Timestamp.now()
        });
        console.log(`  ✅ Updated POS item: ${existingDoc.id}`);
      }
    }
    
    console.log('\n🎉 All menu items synced to POS with ingredients!');
    console.log('💡 Now try making a sale - inventory should deduct properly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

forceSyncMenuToPOS().then(() => process.exit(0));
