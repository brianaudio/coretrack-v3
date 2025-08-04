const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '893699470433',
  appId: '1:893699470433:web:a5dcf242201b75c7eea620'
};

async function debugInventoryIssue() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    
    console.log('🔍 DEBUGGING INVENTORY ISSUE');
    console.log('=============================\n');
    
    // 1. Get all add-ons
    console.log('1️⃣ Checking add-ons...');
    const addonsRef = collection(db, 'tenants', tenantId, 'addons');
    const addonsSnapshot = await getDocs(addonsRef);
    
    const addons = [];
    addonsSnapshot.forEach(doc => {
      const data = doc.data();
      addons.push({ id: doc.id, ...data });
      console.log(`   📝 Add-on: ${data.name} → Inventory ID: ${data.inventoryItemId}`);
    });
    
    // 2. Check if those inventory IDs actually exist
    console.log('\n2️⃣ Verifying inventory item existence...');
    for (const addon of addons) {
      const inventoryDocRef = doc(db, 'tenants', tenantId, 'inventory', addon.inventoryItemId);
      const inventoryDoc = await getDoc(inventoryDocRef);
      
      if (inventoryDoc.exists()) {
        const data = inventoryDoc.data();
        console.log(`   ✅ ${addon.name} → FOUND: ${data.name} (Qty: ${data.quantity})`);
      } else {
        console.log(`   ❌ ${addon.name} → NOT FOUND: ${addon.inventoryItemId}`);
      }
    }
    
    // 3. List all inventory items
    console.log('\n3️⃣ All inventory items in tenant...');
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   📦 ${doc.id} → ${data.name} (${data.quantity} ${data.unit})`);
    });
    
    // 4. Check specifically for "Choco Syrup" by name
    console.log('\n4️⃣ Looking for "Choco Syrup" by name...');
    let chocoFound = false;
    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toLowerCase().includes('choco')) {
        console.log(`   🍫 FOUND: ${doc.id} → ${data.name}`);
        chocoFound = true;
      }
    });
    
    if (!chocoFound) {
      console.log('   ❌ NO inventory items with "choco" in the name');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugInventoryIssue();
