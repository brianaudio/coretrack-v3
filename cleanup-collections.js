const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function cleanupUnnecessaryCollections() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🧹 CLEANING UP UNNECESSARY COLLECTIONS');
    console.log('=' .repeat(50));
    
    // Clean up branches collection (since we use locations now)
    console.log('🗑️ Cleaning branches collection...');
    const branchesRef = collection(db, `tenants/${TENANT_ID}/branches`);
    const branchesSnapshot = await getDocs(branchesRef);
    
    if (branchesSnapshot.size > 0) {
      console.log(`Found ${branchesSnapshot.size} entries in branches collection:`);
      
      for (const doc of branchesSnapshot.docs) {
        const data = doc.data();
        console.log(`  Deleting: ${data.name || doc.id}`);
        await deleteDoc(doc.ref);
      }
      
      console.log('✅ Cleaned up branches collection');
    } else {
      console.log('✅ Branches collection already clean');
    }
    
    // List what collections we keep
    console.log('\n📋 COLLECTIONS KEPT:');
    console.log('✅ locations - for branch management');
    console.log('✅ menuItems - for menu builder');
    console.log('✅ posItems - for POS system');
    console.log('✅ inventory - for inventory tracking');
    console.log('✅ posOrders - for order history');
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('Your app now uses a clean, streamlined data structure.');
    console.log('\n🔄 Test your app:');
    console.log('1. Refresh the page');
    console.log('2. Switch to "Creamy Frost" branch');
    console.log('3. Check POS - you should see 8 menu items');
    console.log('4. Check Menu Builder - you should see the same items');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanupUnnecessaryCollections().then(() => process.exit(0));
