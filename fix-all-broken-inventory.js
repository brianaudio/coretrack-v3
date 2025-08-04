const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyC2oJSdPoSMiS-Yj4nOJIdRwI4vVqOWpH4',
  authDomain: 'inventory-system-latest.firebaseapp.com',
  projectId: 'inventory-system-latest',
  storageBucket: 'inventory-system-latest.firebasestorage.app',
  messagingSenderId: '1084866842308',
  appId: '1:1084866842308:web:53e6e88de9e2c44a92ec78'
};

// Helper function to calculate status
const calculateStatus = (currentStock, minStock) => {
  if (currentStock === 0) return 'out-of-stock';
  if (currentStock <= minStock) return 'low-stock';
  if (currentStock <= minStock * 2) return 'warning';
  return 'good';
};

async function checkAndFixAllBrokenInventory() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Checking all tenants for broken inventory items...\n');
    
    const tenantsRef = collection(db, 'tenants');
    const tenantsSnapshot = await getDocs(tenantsRef);
    
    let totalBrokenItems = 0;
    let totalFixedItems = 0;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      console.log(`📁 Checking tenant: ${tenantId}`);
      
      const inventoryRef = collection(db, 'tenants', tenantId, 'inventory');
      const inventorySnapshot = await getDocs(inventoryRef);
      
      const brokenItems = [];
      let workingLocationId = null;
      
      // First pass: identify broken items and find a working locationId
      inventorySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const isbroken = (
          data.currentStock === undefined ||
          data.tenantId === undefined ||
          data.locationId === undefined ||
          data.status === undefined ||
          data.minStock === undefined
        );
        
        if (isbroken) {
          brokenItems.push({
            id: docSnap.id,
            data: data
          });
        } else if (data.locationId) {
          workingLocationId = data.locationId; // Use this as template
        }
      });
      
      if (brokenItems.length > 0) {
        console.log(`   ❌ Found ${brokenItems.length} broken inventory items`);
        totalBrokenItems += brokenItems.length;
        
        if (!workingLocationId) {
          workingLocationId = `location_${tenantId.slice(0, 20)}`; // Generate fallback
          console.log(`   ⚠️ No working locationId found, using fallback: ${workingLocationId}`);
        }
        
        // Fix broken items
        for (const brokenItem of brokenItems) {
          const now = Timestamp.now();
          const currentStock = brokenItem.data.currentStock || 100; // Default stock
          const minStock = brokenItem.data.minStock || 25; // Default min stock
          
          const updateData = {
            currentStock: currentStock,
            minStock: minStock,
            status: calculateStatus(currentStock, minStock),
            tenantId: tenantId,
            locationId: workingLocationId,
            updatedAt: now,
            lastUpdated: now
          };
          
          // Add missing fields if they don't exist
          if (!brokenItem.data.createdAt) {
            updateData.createdAt = now;
          }
          if (!brokenItem.data.unit) {
            updateData.unit = 'piece'; // Default unit
          }
          
          const itemRef = doc(db, 'tenants', tenantId, 'inventory', brokenItem.id);
          await updateDoc(itemRef, updateData);
          
          console.log(`     ✅ Fixed: ${brokenItem.data.name || 'Unknown Item'} (${brokenItem.id})`);
          totalFixedItems++;
        }
      } else {
        console.log(`   ✅ All inventory items are properly structured`);
      }
      
      console.log('');
    }
    
    console.log(`🎉 SUMMARY:`);
    console.log(`   - Total broken items found: ${totalBrokenItems}`);
    console.log(`   - Total items fixed: ${totalFixedItems}`);
    
    if (totalBrokenItems === 0) {
      console.log(`   🎯 All inventory data is properly structured!`);
    } else {
      console.log(`   🔧 All broken inventory items have been fixed!`);
    }
    
  } catch (error) {
    console.error('Error checking/fixing inventory:', error);
  }
}

checkAndFixAllBrokenInventory();
