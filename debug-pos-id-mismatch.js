const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function debugPOSItemIDs() {
  try {
    console.log('🔍 DEBUGGING POS ITEM ID MISMATCH');
    console.log('=' .repeat(50));
    
    // Check POS items IDs vs what the app is trying to access
    const posSnapshot = await getDocs(collection(db, `tenants/${tenantId}/posItems`));
    
    console.log('📋 CURRENT POS ITEMS IN DATABASE:');
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  🆔 ${data.name}: ${doc.id}`);
    });
    
    console.log('\n❌ PROBLEM: POS App is trying to access:');
    console.log('  - Chicken Tenders: OTA0xQOsq4kionAwnn4Q (NOT FOUND)');
    console.log('  - Coke Float 16 oz: VppZJHwvqye2fuG988KR (NOT FOUND)');
    
    console.log('\n✅ ACTUAL IDs that should be used:');
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name === 'Chicken Tenders') {
        console.log(`  - Chicken Tenders: ${doc.id} ✅`);
      }
      if (data.name === 'Coke Float 16 oz') {
        console.log(`  - Coke Float 16 oz: ${doc.id} ✅`);
      }
    });
    
    console.log('\n🔍 LIKELY CAUSE: POS is caching old item IDs or using stale data');
    console.log('💡 SOLUTION: Clear POS cache, refresh data, or check data loading logic');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugPOSItemIDs();
