const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, updateDoc, addDoc, query, where, serverTimestamp } = require('firebase/firestore');

// Firebase configuration - Same as main app
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // Active tenant

async function forceResyncMenuToPOS() {
  try {
    console.log('🔄 FORCE RE-SYNCING MENU ITEMS TO POS ITEMS');
    console.log('=============================================');
    
    // Get all menu items
    const menuSnapshot = await getDocs(
      collection(db, 'tenants', tenantId, 'menuItems')
    );
    
    console.log(`📋 Found ${menuSnapshot.docs.length} menu items to sync`);
    
    for (const menuDoc of menuSnapshot.docs) {
      const menuItem = { id: menuDoc.id, ...menuDoc.data() };
      
      console.log(`\n🔄 Syncing: ${menuItem.name}`);
      console.log(`   Ingredients: ${menuItem.ingredients?.length || 0}`);
      
      // Prepare POS item data with ingredients
      const posItemData = {
        name: menuItem.name,
        description: menuItem.description || '',
        price: menuItem.price || 0,
        category: menuItem.category || 'Uncategorized',
        isAvailable: menuItem.isAvailable !== false,
        menuItemId: menuItem.id,
        ingredients: menuItem.ingredients || [], // KEY: Include ingredients
        lastUpdated: serverTimestamp(),
        syncedAt: serverTimestamp()
      };
      
      // Check if POS item already exists
      const posSnapshot = await getDocs(
        query(
          collection(db, 'tenants', tenantId, 'posItems'),
          where('menuItemId', '==', menuItem.id)
        )
      );
      
      if (!posSnapshot.empty) {
        // Update existing POS item
        const posDocId = posSnapshot.docs[0].id;
        await updateDoc(
          doc(db, 'tenants', tenantId, 'posItems', posDocId),
          posItemData
        );
        
        console.log(`   ✅ Updated POS item (${posDocId})`);
        console.log(`   📦 Ingredients synced: ${(menuItem.ingredients || []).length}`);
      } else {
        // Create new POS item
        const posDocRef = await addDoc(
          collection(db, 'tenants', tenantId, 'posItems'),
          posItemData
        );
        
        console.log(`   ✅ Created POS item (${posDocRef.id})`);
        console.log(`   📦 Ingredients synced: ${(menuItem.ingredients || []).length}`);
      }
      
      // Show ingredients being synced
      if (menuItem.ingredients && menuItem.ingredients.length > 0) {
        console.log(`   📋 Ingredients:`);
        menuItem.ingredients.forEach(ing => {
          console.log(`      - ${ing.inventoryName}: ${ing.quantity} ${ing.unit}`);
        });
      } else {
        console.log(`   ⚠️  No ingredients configured for this item`);
      }
    }
    
    console.log('\n🎉 FORCE RE-SYNC COMPLETED!');
    console.log('All menu items have been synced to POS items with ingredients.');
    console.log('Inventory deduction should now work properly.');
    
  } catch (error) {
    console.error('❌ Error during force re-sync:', error);
  } finally {
    process.exit(0);
  }
}

forceResyncMenuToPOS();
