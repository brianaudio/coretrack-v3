const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA5f3OZqJHWZMb4S-klY8W8iM6yZGQXDR8",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "21796909415",
  appId: "1:21796909415:web:b6b34c2db0dd8e7c3a3cd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function quickLocationCheck() {
  try {
    console.log('🏬 Quick Location Check...\n');

    // Get locations directly
    const locationsSnapshot = await getDocs(collection(db, 'locations'));
    console.log(`📊 Total locations found: ${locationsSnapshot.docs.length}`);

    locationsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.name}`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - Tenant: ${data.tenantId}`);
      console.log(`   - Type: ${data.type}`);
      console.log(`   - Status: ${data.status}`);
      console.log(`   - Address: ${data.address?.street || 'No address'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickLocationCheck();
