// IMMEDIATE BROWSER FIX FOR BRANCH ISOLATION
// Copy this entire script and paste it into your browser console while logged into the app

console.log('🚀 IMMEDIATE BRANCH ISOLATION FIX');
console.log('=================================');

(async function() {
  try {
    // Check if user is logged in
    const auth = window.auth || firebase.auth();
    const db = window.db || firebase.firestore();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ No user logged in. Please log in first.');
      return;
    }
    
    const tenantId = user.uid;
    console.log('👤 User/Tenant ID:', tenantId);
    
    // Get current branch from localStorage
    const currentBranchId = localStorage.getItem('selectedBranchId');
    if (!currentBranchId) {
      console.error('❌ No branch selected. Please select a branch first.');
      return;
    }
    
    const expectedLocationId = `location_${currentBranchId}`;
    console.log('🏢 Current branch ID:', currentBranchId);
    console.log('📍 Expected locationId:', expectedLocationId);
    
    // Step 1: Get all menu items
    console.log('\n📋 Step 1: Analyzing menu items...');
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const menuSnapshot = await menuItemsRef.get();
    
    console.log(`Found ${menuSnapshot.size} total menu items`);
    
    // Analyze current state
    const correctItems = [];
    const incorrectItems = [];
    const noLocationItems = [];
    
    menuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const item = { id: doc.id, name: data.name, locationId: data.locationId, ...data };
      
      if (!data.locationId) {
        noLocationItems.push(item);
      } else if (data.locationId === expectedLocationId) {
        correctItems.push(item);
      } else {
        incorrectItems.push(item);
      }
    });
    
    console.log(`✅ Correct items: ${correctItems.length}`);
    console.log(`❌ Items with wrong locationId: ${incorrectItems.length}`);
    console.log(`⚠️ Items without locationId: ${noLocationItems.length}`);
    
    if (incorrectItems.length > 0) {
      console.log('\n❌ Items with wrong locationId:');
      incorrectItems.forEach(item => {
        console.log(`  - ${item.name} has locationId: ${item.locationId}`);
      });
    }
    
    if (noLocationItems.length > 0) {
      console.log('\n⚠️ Items without locationId:');
      noLocationItems.forEach(item => {
        console.log(`  - ${item.name}`);
      });
    }
    
    // Step 2: Fix the items
    const itemsToFix = [...incorrectItems, ...noLocationItems];
    
    if (itemsToFix.length === 0) {
      console.log('\n🎉 All menu items already have correct branch isolation!');
      console.log('If you still see items from other branches, the issue might be elsewhere.');
      return;
    }
    
    console.log(`\n🔧 Step 2: Fixing ${itemsToFix.length} items...`);
    
    // Create batch update
    const batch = db.batch();
    
    itemsToFix.forEach(item => {
      console.log(`  Fixing: ${item.name} → ${expectedLocationId}`);
      const docRef = db.collection('tenants').doc(tenantId).collection('menuItems').doc(item.id);
      batch.update(docRef, {
        locationId: expectedLocationId,
        tenantId: tenantId, // Ensure tenantId is set
        updatedAt: new Date()
      });
    });
    
    // Commit the changes
    console.log('\n💾 Committing changes to database...');
    await batch.commit();
    console.log(`✅ Successfully fixed ${itemsToFix.length} menu items!`);
    
    // Step 3: Fix POS items too
    console.log('\n📦 Step 3: Fixing POS items...');
    const posItemsRef = db.collection('tenants').doc(tenantId).collection('posItems');
    const posSnapshot = await posItemsRef.get();
    
    let posFixedCount = 0;
    const posBatch = db.batch();
    
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId || data.locationId !== expectedLocationId) {
        console.log(`  Fixing POS: ${data.name} → ${expectedLocationId}`);
        posBatch.update(doc.ref, {
          locationId: expectedLocationId,
          tenantId: tenantId,
          updatedAt: new Date()
        });
        posFixedCount++;
      }
    });
    
    if (posFixedCount > 0) {
      await posBatch.commit();
      console.log(`✅ Fixed ${posFixedCount} POS items`);
    } else {
      console.log('✅ All POS items already correct');
    }
    
    // Step 4: Verification
    console.log('\n🔍 Step 4: Verifying fix...');
    const verifySnapshot = await menuItemsRef.get();
    const finalCorrect = [];
    const finalIncorrect = [];
    
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.locationId === expectedLocationId) {
        finalCorrect.push(data.name);
      } else {
        finalIncorrect.push({ name: data.name, locationId: data.locationId });
      }
    });
    
    console.log(`✅ Items correctly assigned: ${finalCorrect.length}`);
    if (finalIncorrect.length > 0) {
      console.log(`❌ Items still incorrect: ${finalIncorrect.length}`);
      finalIncorrect.forEach(item => {
        console.log(`  - ${item.name}: ${item.locationId}`);
      });
    }
    
    // Success message
    console.log('\n🎉 BRANCH ISOLATION FIX COMPLETE!');
    console.log(`All menu items are now assigned to branch: ${currentBranchId}`);
    console.log('Reloading page in 3 seconds to see changes...');
    
    // Reload the page to see the changes
    setTimeout(() => {
      console.log('🔄 Reloading page...');
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error during branch isolation fix:', error);
    console.log('\n💡 Try these steps:');
    console.log('1. Make sure you are logged in');
    console.log('2. Select a branch in the UI');
    console.log('3. Run this script again');
  }
})();

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Make sure you are logged in to the app');
console.log('2. Select the branch you want to assign items to');
console.log('3. Run this script in browser console');
console.log('4. All menu items will be assigned to your current branch');
console.log('5. Page will automatically reload to show changes');
