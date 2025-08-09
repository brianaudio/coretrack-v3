// Simple Firebase client check
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC9LUgCEVtLqixnCqv-i8vvPNyMlYRdCIE",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "991534336560",
  appId: "1:991534336560:web:0c0e36e38dc9d1a1e20b48"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findTenants() {
  try {
    console.log('🔍 Searching for tenants...\n');
    
    const tenantsRef = collection(db, 'tenants');
    const snapshot = await getDocs(query(tenantsRef, limit(10)));
    
    console.log(`Found ${snapshot.docs.length} tenants:`);
    
    for (const doc of snapshot.docs) {
      console.log(`\n📋 Tenant: ${doc.id}`);
      const data = doc.data();
      if (data.name) console.log(`   Name: ${data.name}`);
      
      // Check for inventory
      try {
        const inventoryRef = collection(db, `tenants/${doc.id}/inventory`);
        const invSnapshot = await getDocs(query(inventoryRef, limit(3)));
        console.log(`   📦 Inventory items: ${invSnapshot.docs.length}`);
        
        if (invSnapshot.docs.length > 0) {
          invSnapshot.docs.forEach(invDoc => {
            const item = invDoc.data();
            console.log(`      - ${item.name} (Stock: ${item.currentStock}, Location: ${item.locationId})`);
          });
        }
      } catch (invError) {
        console.log(`   ❌ No inventory access`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTenants();
