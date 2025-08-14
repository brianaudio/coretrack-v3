const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhYJr8nxC4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

// Branch mapping from your branch selector
const BRANCH_MAPPING = {
  'SMS': 'wPfXsD2vhkwJhYJr8nxC',        // SMS branch ID
  'DMMMSU': '4W7eenWfYtfP0sPyeflr'      // DMMMSU branch ID  
};

async function redistributeMenuItemsToBranches() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔧 REDISTRIBUTING MENU ITEMS TO CORRECT BRANCHES');
    console.log('=' .repeat(60));
    
    // Get all menu items currently assigned to the wrong location
    const menuItemsRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    
    // Get all POS items  
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    
    console.log(`Found ${menuSnapshot.size} menu items and ${posSnapshot.size} POS items`);
    
    // Ask user which branch to assign items to
    console.log('\n📋 CURRENT MENU ITEMS:');
    const menuItems = [];
    menuSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      menuItems.push({ doc, data });
      console.log(`  ${index + 1}. ${data.name} (${data.category})`);
    });
    
    console.log('\n🎯 REDISTRIBUTION PLAN:');
    console.log('We need to assign these items to either SMS or DMMMSU branch.');
    console.log('Since you mentioned DMMMSU has menu items but POS shows empty,');
    console.log('we\'ll assign ALL items to DMMMSU branch first.');
    console.log('\nIf you want items in SMS branch too, you can duplicate them later.');
    
    const targetBranchId = BRANCH_MAPPING.DMMMSU;
    const targetLocationId = `location_${targetBranchId}`;
    
    console.log(`\n🎯 Target: DMMMSU Branch`);
    console.log(`   Branch ID: ${targetBranchId}`);
    console.log(`   Location ID: ${targetLocationId}`);
    
    // Update menu items
    console.log('\n🔧 UPDATING MENU ITEMS...');
    const menuBatch = writeBatch(db);
    let menuUpdated = 0;
    
    menuItems.forEach(({ doc, data }) => {
      if (data.locationId !== targetLocationId) {
        console.log(`  Updating: ${data.name} → ${targetLocationId}`);
        menuBatch.update(doc.ref, {
          locationId: targetLocationId,
          updatedAt: new Date()
        });
        menuUpdated++;
      } else {
        console.log(`  Already correct: ${data.name}`);
      }
    });
    
    if (menuUpdated > 0) {
      await menuBatch.commit();
      console.log(`✅ Updated ${menuUpdated} menu items`);
    }
    
    // Update POS items
    console.log('\n🔧 UPDATING POS ITEMS...');
    const posBatch = writeBatch(db);
    let posUpdated = 0;
    
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.locationId !== targetLocationId) {
        console.log(`  Updating: ${data.name} → ${targetLocationId}`);
        posBatch.update(doc.ref, {
          locationId: targetLocationId,
          updatedAt: new Date()
        });
        posUpdated++;
      } else {
        console.log(`  Already correct: ${data.name}`);
      }
    });
    
    if (posUpdated > 0) {
      await posBatch.commit();
      console.log(`✅ Updated ${posUpdated} POS items`);
    }
    
    console.log('\n🎉 REDISTRIBUTION COMPLETE!');
    console.log('📱 Now test your app:');
    console.log('1. Switch to DMMMSU branch in the header');
    console.log('2. Go to POS - you should see the menu items');
    console.log('3. Switch to SMS branch - it will be empty');
    console.log('4. To add items to SMS, go to Menu Builder and create/duplicate items');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('- If you want items in both branches, duplicate them in Menu Builder');
    console.log('- Or copy items from DMMMSU to SMS using the Menu Builder');
    console.log('- Each branch can have its own menu configuration');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

redistributeMenuItemsToBranches().then(() => process.exit(0));
