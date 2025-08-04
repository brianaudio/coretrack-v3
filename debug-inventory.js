const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function checkInventory() {
  try {
    const snapshot = await db.collection('tenants/C7riCIXn20bY11dUrRGKGZgC4uG3/inventory').get();
    console.log('📋 Current Inventory Items:');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name}: Stock ${data.currentStock}`);
    });
    
    console.log('\n📋 POS Items:');
    const posSnapshot = await db.collection('tenants/C7riCIXn20bY11dUrRGKGZgC4uG3/posItems').get();
    posSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name}: $${data.price}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkInventory();
