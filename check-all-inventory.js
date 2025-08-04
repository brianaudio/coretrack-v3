const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function checkAllInventory() {
  try {
    const snapshot = await db.collection('tenants/C7riCIXn20bY11dUrRGKGZgC4uG3/inventory').get();
    console.log('📋 ALL INVENTORY ITEMS:');
    console.log('========================');
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. "${data.name}"`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Stock: ${data.currentStock}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Min Stock: ${data.minStock || 'N/A'}`);
      console.log('   ---');
    });
    
    console.log('\n🔍 LOOKING FOR ITEMS WITH 1000 STOCK:');
    const items1000 = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.currentStock === 1000) {
        items1000.push({ id: doc.id, name: data.name, stock: data.currentStock });
      }
    });
    
    if (items1000.length > 0) {
      console.log('Found items with 1000 stock:');
      items1000.forEach(item => {
        console.log(`  - "${item.name}" (ID: ${item.id}) - Stock: ${item.stock}`);
      });
    } else {
      console.log('No items found with 1000 stock.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkAllInventory();
