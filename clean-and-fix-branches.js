const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch, deleteDoc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function cleanAndFixBranchData() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🧹 CLEANING AND FIXING BRANCH DATA');
    console.log('=' .repeat(60));
    
    // 1. Get valid branches
    const locationsRef = collection(db, 'locations');
    const locationsQuery = query(locationsRef, where('tenantId', '==', TENANT_ID));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    const validBranches = [];
    console.log('🏪 Valid branches in your system:');
    
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      validBranches.push({
        id: doc.id,
        name: data.name,
        locationId: `location_${doc.id}`
      });
      console.log(`  - ${data.name} (${doc.id})`);
    });
    
    if (validBranches.length === 0) {
      console.log('❌ No valid branches found! Cannot proceed.');
      return;
    }
    
    // Use the first branch as the target
    const targetBranch = validBranches[0];
    console.log(`\n🎯 Target branch: ${targetBranch.name}`);
    console.log(`   locationId: ${targetBranch.locationId}`);
    
    // 2. Fix menu items
    console.log('\n🔧 FIXING MENU ITEMS...');
    const menuItemsRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    
    if (menuSnapshot.size > 0) {
      const menuBatch = writeBatch(db);
      let menuFixed = 0;
      
      menuSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId !== targetBranch.locationId) {
          console.log(`  Fixing: ${data.name} → ${targetBranch.locationId}`);
          menuBatch.update(doc.ref, {
            locationId: targetBranch.locationId,
            updatedAt: new Date()
          });
          menuFixed++;
        }
      });
      
      if (menuFixed > 0) {
        await menuBatch.commit();
        console.log(`✅ Fixed ${menuFixed} menu items`);
      } else {
        console.log('✅ All menu items already correct');
      }
    }
    
    // 3. Fix POS items
    console.log('\n🔧 FIXING POS ITEMS...');
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posSnapshot = await getDocs(posItemsRef);
    
    if (posSnapshot.size > 0) {
      const posBatch = writeBatch(db);
      let posFixed = 0;
      
      posSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.locationId !== targetBranch.locationId) {
          console.log(`  Fixing: ${data.name} → ${targetBranch.locationId}`);
          posBatch.update(doc.ref, {
            locationId: targetBranch.locationId,
            updatedAt: new Date()
          });
          posFixed++;
        }
      });
      
      if (posFixed > 0) {
        await posBatch.commit();
        console.log(`✅ Fixed ${posFixed} POS items`);
      } else {
        console.log('✅ All POS items already correct');
      }
    }
    
    // 4. Clean up orphaned locations (ones that don't belong to your tenant)
    console.log('\n🧹 CLEANING ORPHANED LOCATIONS...');
    const allLocationsRef = collection(db, 'locations');
    const allLocationsSnapshot = await getDocs(allLocationsRef);
    
    let orphanedCount = 0;
    console.log('Checking all locations:');
    
    allLocationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.tenantId !== TENANT_ID) {
        console.log(`  Orphaned: ${data.name || 'Unnamed'} (tenant: ${data.tenantId || 'unknown'})`);
        orphanedCount++;
      }
    });
    
    if (orphanedCount > 0) {
      console.log(`Found ${orphanedCount} orphaned locations (belong to other tenants)`);
      console.log('These will be left alone as they belong to other users.');
    }
    
    // 5. Check for duplicate or unnecessary branches
    console.log('\n🔍 CHECKING FOR BRANCH ISSUES...');
    
    // Look for branches collection entries
    const branchesRef = collection(db, `tenants/${TENANT_ID}/branches`);
    const branchesSnapshot = await getDocs(branchesRef);
    
    if (branchesSnapshot.size > 0) {
      console.log(`Found ${branchesSnapshot.size} entries in branches collection:`);
      branchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.name || doc.id}: ${data.locationId || 'no locationId'}`);
      });
      
      console.log('\n💡 Note: Your app should use the locations collection, not branches.');
    } else {
      console.log('✅ No entries in branches collection (this is correct)');
    }
    
    // 6. Final verification
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('\n📋 Final state:');
    console.log(`Menu items: ${menuSnapshot.size} items → assigned to "${targetBranch.name}"`);
    console.log(`POS items: ${posSnapshot.size} items → assigned to "${targetBranch.name}"`);
    console.log(`Available branches: ${validBranches.length}`);
    
    validBranches.forEach(branch => {
      console.log(`  - ${branch.name} (${branch.id})`);
    });
    
    console.log('\n🔄 Next steps:');
    console.log('1. Refresh your app');
    console.log(`2. You should see menu items in the "${targetBranch.name}" branch`);
    console.log('3. Use Menu Builder to create items for other branches if needed');
    
    if (validBranches.length === 1) {
      console.log('\n⚠️ You currently have only 1 branch. If you want multiple branches:');
      console.log('   - Go to Location Management to add more branches');
      console.log('   - Then use Menu Builder to assign items to each branch');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanAndFixBranchData().then(() => process.exit(0));
