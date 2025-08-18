const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up credentials)
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixMenuItemsIssue() {
  try {
    console.log('🔍 Investigating menu items issue...');
    
    // Get all tenants to check their menu items
    const tenantsSnapshot = await db.collection('tenants').get();
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      console.log(`\n🏢 Checking tenant: ${tenantId}`);
      
      // Get menu items for this tenant
      const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
      const menuSnapshot = await menuItemsRef.get();
      
      console.log(`📋 Found ${menuSnapshot.size} menu items`);
      
      if (menuSnapshot.empty) {
        console.log('❌ No menu items found for this tenant');
        continue;
      }
      
      // Check each menu item's locationId
      const updates = [];
      menuSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name}: locationId = ${data.locationId || 'MISSING'}`);
        
        // If locationId is missing or doesn't follow the pattern, fix it
        if (!data.locationId || data.locationId === 'main') {
          updates.push({
            id: doc.id,
            data: {
              ...data,
              locationId: 'location_main' // Fix the locationId format
            }
          });
        }
      });
      
      // Apply updates
      if (updates.length > 0) {
        console.log(`🔧 Updating ${updates.length} menu items with correct locationId...`);
        
        const batch = db.batch();
        updates.forEach(update => {
          const docRef = menuItemsRef.doc(update.id);
          batch.update(docRef, { locationId: update.data.locationId });
        });
        
        await batch.commit();
        console.log('✅ Updated menu items successfully');
      }
    }
    
    console.log('\n🎉 Menu items issue investigation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMenuItemsIssue();
