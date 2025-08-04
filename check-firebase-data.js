const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-admin-key.json'); // You'll need this file

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cfc-inventory-v3-default-rtdb.firebaseio.com"
  });
} catch (error) {
  console.log('Firebase admin already initialized or error:', error.message);
}

const db = admin.firestore();

async function checkFirebaseData() {
  console.log('🔍 Checking Firebase data...');
  
  try {
    // Check main collections
    const collections = ['tenants', 'userProfiles', 'inventory', 'menuItems', 'branches', 'locations'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).limit(5).get();
      console.log(`📊 ${collectionName}: ${snapshot.size} documents found`);
      
      if (snapshot.size > 0) {
        snapshot.docs.forEach(doc => {
          console.log(`  - ID: ${doc.id}`);
          const data = doc.data();
          console.log(`    Keys: ${Object.keys(data).join(', ')}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

checkFirebaseData();
