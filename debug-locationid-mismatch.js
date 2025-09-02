const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, getDocs, where } = require('firebase/firestore');

// Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyB7Cj-QBzx-_9TqDfLUofgPFBxU6YGZK-Y",
  authDomain: "coretrack-dev-v3.firebaseapp.com",
  projectId: "coretrack-dev-v3",
  storageBucket: "coretrack-dev-v3.firebasestorage.app",
  messagingSenderId: "925554433689",
  appId: "1:925554433689:web:6a04ac88866e92b4c41e32",
  measurementId: "G-DJ9NXY7WEF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugLocationIdMismatch() {
  console.log('🔍 Debugging LocationId Mismatch...\n');
  
  // Get tenantId from a recent console log pattern
  const tenantId = 'GGh6vPdP3BjDGGjWNxGT';
  const expectedLocationId = 'location_6cwvuakzskihbthdyv5e';
  
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Expected Location ID: ${expectedLocationId}\n`);
  
  try {
    // 1. Check menu items collection
    console.log('📋 CHECKING MENU ITEMS:');
    const menuRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuRef);
    
    console.log(`Total menu items: ${menuSnapshot.docs.length}`);
    
    if (menuSnapshot.docs.length > 0) {
      const firstMenuItem = menuSnapshot.docs[0].data();
      console.log('First menu item data structure:', {
        id: menuSnapshot.docs[0].id,
        locationId: firstMenuItem.locationId,
        name: firstMenuItem.name,
        hasLocationId: 'locationId' in firstMenuItem,
        allKeys: Object.keys(firstMenuItem)
      });
      
      // Check unique locationIds in menu items
      const locationIds = new Set();
      menuSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId) {
          locationIds.add(data.locationId);
        }
      });
      console.log('Unique locationIds in menu items:', Array.from(locationIds));
    }
    
    // 2. Check inventory items collection
    console.log('\n📦 CHECKING INVENTORY ITEMS:');
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    console.log(`Total inventory items: ${inventorySnapshot.docs.length}`);
    
    if (inventorySnapshot.docs.length > 0) {
      const firstInventoryItem = inventorySnapshot.docs[0].data();
      console.log('First inventory item data structure:', {
        id: inventorySnapshot.docs[0].id,
        locationId: firstInventoryItem.locationId,
        name: firstInventoryItem.name,
        hasLocationId: 'locationId' in firstInventoryItem,
        allKeys: Object.keys(firstInventoryItem)
      });
      
      // Check unique locationIds in inventory
      const inventoryLocationIds = new Set();
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId) {
          inventoryLocationIds.add(data.locationId);
        }
      });
      console.log('Unique locationIds in inventory:', Array.from(inventoryLocationIds));
    }
    
    // 3. Check categories collection
    console.log('\n🏷️ CHECKING CATEGORIES:');
    const categoriesRef = collection(db, `tenants/${tenantId}/categories`);
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    console.log(`Total categories: ${categoriesSnapshot.docs.length}`);
    
    if (categoriesSnapshot.docs.length > 0) {
      const firstCategory = categoriesSnapshot.docs[0].data();
      console.log('First category data structure:', {
        id: categoriesSnapshot.docs[0].id,
        locationId: firstCategory.locationId,
        name: firstCategory.name,
        hasLocationId: 'locationId' in firstCategory,
        allKeys: Object.keys(firstCategory)
      });
      
      // Check unique locationIds in categories
      const categoryLocationIds = new Set();
      categoriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId) {
          categoryLocationIds.add(data.locationId);
        }
      });
      console.log('Unique locationIds in categories:', Array.from(categoryLocationIds));
    }
    
    // 4. Test specific query that's failing
    console.log('\n🎯 TESTING FAILING QUERY:');
    const testQuery = query(
      menuRef,
      where('locationId', '==', expectedLocationId)
    );
    const testSnapshot = await getDocs(testQuery);
    console.log(`Menu items with locationId '${expectedLocationId}': ${testSnapshot.docs.length}`);
    
    // 5. Check if there are items without locationId
    console.log('\n❓ CHECKING FOR ITEMS WITHOUT LOCATIONID:');
    let menuWithoutLocation = 0;
    let inventoryWithoutLocation = 0;
    let categoriesWithoutLocation = 0;
    
    menuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId) {
        menuWithoutLocation++;
      }
    });
    
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId) {
        inventoryWithoutLocation++;
      }
    });
    
    categoriesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId) {
        categoriesWithoutLocation++;
      }
    });
    
    console.log(`Menu items without locationId: ${menuWithoutLocation}`);
    console.log(`Inventory items without locationId: ${inventoryWithoutLocation}`);
    console.log(`Categories without locationId: ${categoriesWithoutLocation}`);
    
  } catch (error) {
    console.error('Error debugging locationId mismatch:', error);
  }
}

debugLocationIdMismatch().then(() => {
  console.log('\n✅ Debug complete!');
  process.exit(0);
}).catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});
