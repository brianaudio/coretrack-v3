const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Use production Firebase config directly
const firebaseConfig = {
  apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "930028194991",
  appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkProductionData() {
  console.log('🔍 Checking production Firebase project: coretrack-inventory');
  
  try {
    // Check collections that should exist
    const collections = ['tenants', 'locations', 'users', 'menuItems', 'inventory'];
    
    for (const collectionName of collections) {
      try {
        const q = query(collection(db, collectionName), limit(1));
        const snapshot = await getDocs(q);
        console.log(`✅ ${collectionName}: ${snapshot.size} documents found`);
        
        if (snapshot.size > 0) {
          snapshot.docs.forEach(doc => {
            console.log(`   Sample ID: ${doc.id}`);
            const data = doc.data();
            if (data.name) console.log(`   Name: ${data.name}`);
            if (data.tenantId) console.log(`   Tenant: ${data.tenantId}`);
          });
        }
      } catch (error) {
        console.log(`❌ ${collectionName}: Permission denied or doesn't exist`);
      }
    }

    // Check auth state
    console.log('\n🔐 Auth state:', auth.currentUser ? 'Authenticated' : 'Not authenticated');
    
  } catch (error) {
    console.error('Error checking data:', error.message);
  }
}

checkProductionData().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
});
