
// 🔍 BROWSER CONSOLE INVESTIGATION SCRIPT
// Run this in your browser console while on the app

console.log('🔍 LIVE DATA INVESTIGATION');
console.log('=========================');

// Check Purchase Orders
const checkPurchaseOrdersData = async () => {
  try {
    console.log('\n📋 CHECKING PURCHASE ORDERS...');
    
    // Get current tenant from localStorage or app state
    const tenantId = localStorage.getItem('tenantId') || 'your-tenant-id';
    console.log('Tenant ID:', tenantId);
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.log('❌ Firebase not available in console');
      return;
    }
    
    const db = firebase.firestore();
    const ordersRef = db.collection(`tenants/${tenantId}/purchaseOrders`);
    
    const snapshot = await ordersRef.limit(20).get();
    console.log(`Found ${snapshot.size} purchase orders`);
    
    const locationIds = new Set();
    const ordersWithoutLocation = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`PO ${doc.id}:`);
      console.log(`  - orderNumber: ${data.orderNumber}`);
      console.log(`  - locationId: "${data.locationId}"`);
      console.log(`  - status: ${data.status}`);
      console.log(`  - createdAt: ${data.createdAt?.toDate()}`);
      
      if (data.locationId) {
        locationIds.add(data.locationId);
      } else {
        ordersWithoutLocation.push(doc.id);
      }
    });
    
    console.log(`\n📊 LOCATION IDS FOUND: ${Array.from(locationIds).join(', ')}`);
    
    if (ordersWithoutLocation.length > 0) {
      console.log(`❌ ORDERS WITHOUT LOCATION: ${ordersWithoutLocation.length}`);
      ordersWithoutLocation.forEach(id => console.log(`  - ${id}`));
    }
    
  } catch (error) {
    console.error('Error checking purchase orders:', error);
  }
};

// Check Inventory Items
const checkInventoryData = async () => {
  try {
    console.log('\n📦 CHECKING INVENTORY ITEMS...');
    
    const tenantId = localStorage.getItem('tenantId') || 'your-tenant-id';
    const db = firebase.firestore();
    const inventoryRef = db.collection(`tenants/${tenantId}/inventory`);
    
    const snapshot = await inventoryRef.limit(20).get();
    console.log(`Found ${snapshot.size} inventory items`);
    
    const locationIds = new Set();
    const itemsWithoutLocation = [];
    const itemsByLocation = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Item ${data.name}:`);
      console.log(`  - locationId: "${data.locationId}"`);
      console.log(`  - currentStock: ${data.currentStock}`);
      console.log(`  - category: ${data.category}`);
      
      if (data.locationId) {
        locationIds.add(data.locationId);
        if (!itemsByLocation[data.locationId]) {
          itemsByLocation[data.locationId] = [];
        }
        itemsByLocation[data.locationId].push(data.name);
      } else {
        itemsWithoutLocation.push(data.name);
      }
    });
    
    console.log(`\n📊 INVENTORY LOCATION IDS: ${Array.from(locationIds).join(', ')}`);
    console.log('\n📋 ITEMS BY LOCATION:');
    Object.entries(itemsByLocation).forEach(([locationId, items]) => {
      console.log(`  ${locationId}: ${items.length} items`);
      items.forEach(item => console.log(`    - ${item}`));
    });
    
    if (itemsWithoutLocation.length > 0) {
      console.log(`❌ ITEMS WITHOUT LOCATION: ${itemsWithoutLocation.length}`);
      itemsWithoutLocation.forEach(item => console.log(`  - ${item}`));
    }
    
  } catch (error) {
    console.error('Error checking inventory:', error);
  }
};

// Check Inventory Movements
const checkMovementsData = async () => {
  try {
    console.log('\n📈 CHECKING INVENTORY MOVEMENTS...');
    
    const tenantId = localStorage.getItem('tenantId') || 'your-tenant-id';
    const db = firebase.firestore();
    const movementsRef = db.collection(`tenants/${tenantId}/inventoryMovements`);
    
    const snapshot = await movementsRef.orderBy('timestamp', 'desc').limit(10).get();
    console.log(`Found ${snapshot.size} recent movements`);
    
    const locationIds = new Set();
    const movementsWithoutLocation = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Movement ${doc.id}:`);
      console.log(`  - itemName: ${data.itemName}`);
      console.log(`  - locationId: "${data.locationId}"`);
      console.log(`  - movementType: ${data.movementType}`);
      console.log(`  - reason: ${data.reason}`);
      console.log(`  - timestamp: ${data.timestamp?.toDate()}`);
      
      if (data.locationId) {
        locationIds.add(data.locationId);
      } else {
        movementsWithoutLocation.push(doc.id);
      }
    });
    
    console.log(`\n📊 MOVEMENT LOCATION IDS: ${Array.from(locationIds).join(', ')}`);
    
    if (movementsWithoutLocation.length > 0) {
      console.log(`❌ MOVEMENTS WITHOUT LOCATION: ${movementsWithoutLocation.length}`);
    }
    
  } catch (error) {
    console.error('Error checking movements:', error);
  }
};

// Run all checks
const runAllChecks = async () => {
  await checkPurchaseOrdersData();
  await checkInventoryData();
  await checkMovementsData();
  
  console.log('\n✅ INVESTIGATION COMPLETE');
  console.log('Check the output above for any inconsistencies or missing locationId values');
};

// Auto-run
runAllChecks();
