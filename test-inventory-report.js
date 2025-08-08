const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'inventory-system-latest'
  });
}

const db = admin.firestore();

async function testInventoryReportData() {
  console.log('🔍 Testing Inventory Report Data Structure...\n');
  
  try {
    // Get inventory data
    const inventorySnapshot = await db.collection('inventory').get();
    const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📦 Found ${inventory.length} inventory items:\n`);
    
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    inventory.forEach(item => {
      const currentStock = item.currentStock || item.quantity || 0;
      const price = item.price || item.cost || item.unitPrice || item.sellPrice || 0;
      const itemValue = currentStock * price;
      totalValue += itemValue;
      
      // Check stock levels
      const reorderPoint = item.reorderPoint || item.minStock || item.lowStockThreshold || 5;
      if (currentStock === 0) {
        outOfStockCount++;
      } else if (currentStock <= reorderPoint) {
        lowStockCount++;
      }
      
      console.log(`📋 ${item.name}:`);
      console.log(`   • Current Stock: ${currentStock} ${item.unit || ''}`);
      console.log(`   • Unit Price: ₱${price.toFixed(2)}`);
      console.log(`   • Total Value: ₱${itemValue.toFixed(2)}`);
      console.log(`   • Reorder Point: ${reorderPoint}`);
      console.log(`   • Status: ${currentStock === 0 ? '❌ Out of Stock' : currentStock <= reorderPoint ? '⚠️ Low Stock' : '✅ In Stock'}`);
      console.log('');
    });
    
    console.log('📊 SUMMARY:');
    console.log(`   • Total Items: ${inventory.length}`);
    console.log(`   • Total Inventory Value: ₱${totalValue.toFixed(2)}`);
    console.log(`   • Low Stock Items: ${lowStockCount}`);
    console.log(`   • Out of Stock Items: ${outOfStockCount}`);
    
    // Test field mapping logic
    console.log('\n🔧 Field Mapping Test:');
    inventory.forEach(item => {
      const hasCurrentStock = item.currentStock !== undefined;
      const hasQuantity = item.quantity !== undefined;
      const currentStock = item.currentStock || item.quantity || 0;
      
      console.log(`${item.name}: currentStock=${item.currentStock}, quantity=${item.quantity}, using=${currentStock} (currentStock exists: ${hasCurrentStock}, quantity exists: ${hasQuantity})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing inventory data:', error);
  }
}

testInventoryReportData();
