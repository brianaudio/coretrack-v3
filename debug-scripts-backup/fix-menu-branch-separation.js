/**
 * Fix Menu Branch Separation Issue
 * This script will debug and fix menu items showing in wrong branches
 */

console.log('🔧 FIXING MENU BRANCH SEPARATION');
console.log('=====================================\n');

(async function fixMenuBranchSeparation() {
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.log('❌ Firebase not available. Make sure you\'re on the app page.');
      console.log('Please run this script in the browser console while on the CoreTrack app.');
      return;
    }

    const db = firebase.firestore();
    const auth = firebase.auth();
    const user = auth.currentUser;

    if (!user) {
      console.log('❌ No user logged in');
      return;
    }

    const tenantId = user.uid;
    console.log('🏢 Tenant ID:', tenantId);

    // STEP 1: Analyze current state
    console.log('\n📊 STEP 1: Analyzing current menu distribution...');
    
    // Get all branches
    const branchesSnapshot = await db.collection('branches').where('tenantId', '==', tenantId).get();
    const branches = {};
    
    branchesSnapshot.forEach(doc => {
      const data = doc.data();
      branches[doc.id] = {
        id: doc.id,
        name: data.name,
        isMain: data.isMain,
        locationId: `location_${doc.id}`
      };
    });

    console.log('🏪 Available branches:');
    Object.values(branches).forEach(branch => {
      console.log(`   - ${branch.name} (${branch.id}) → locationId: ${branch.locationId} ${branch.isMain ? '[MAIN]' : ''}`);
    });

    // Get all menu items
    const menuItemsSnapshot = await db.collection('tenants').doc(tenantId).collection('menuItems').get();
    console.log(`\n📋 Found ${menuItemsSnapshot.size} total menu items`);

    // Analyze current locationId distribution
    const itemsByLocation = {};
    const itemsWithoutLocation = [];

    menuItemsSnapshot.forEach(doc => {
      const data = doc.data();
      const locationId = data.locationId;
      
      if (!locationId) {
        itemsWithoutLocation.push({ id: doc.id, name: data.name, category: data.category });
        return;
      }
      
      if (!itemsByLocation[locationId]) {
        itemsByLocation[locationId] = [];
      }
      itemsByLocation[locationId].push({ id: doc.id, name: data.name, category: data.category });
    });

    console.log('\n📈 Current menu distribution:');
    Object.keys(itemsByLocation).forEach(locationId => {
      const items = itemsByLocation[locationId];
      const branchId = locationId.replace('location_', '');
      const branch = branches[branchId];
      
      console.log(`\n🏢 ${locationId}:`);
      console.log(`   Branch: ${branch ? branch.name : '⚠️ UNKNOWN/DELETED BRANCH'}`);
      console.log(`   Items: ${items.length}`);
      
      if (items.length > 0) {
        items.slice(0, 5).forEach(item => {
          console.log(`     - ${item.name} (${item.category})`);
        });
        if (items.length > 5) {
          console.log(`     ... and ${items.length - 5} more`);
        }
      }
    });

    if (itemsWithoutLocation.length > 0) {
      console.log(`\n❌ ${itemsWithoutLocation.length} items have NO locationId:`);
      itemsWithoutLocation.forEach(item => {
        console.log(`   - ${item.name} (${item.category})`);
      });
    }

    // STEP 2: Check current branch context
    console.log('\n🔍 STEP 2: Checking current branch context...');
    
    // Try to get current branch from multiple sources
    let currentBranchId = null;
    
    // Method 1: Check localStorage
    const storedBranchId = localStorage.getItem('selectedBranchId');
    console.log(`📱 localStorage selectedBranchId: ${storedBranchId || 'NONE'}`);
    
    // Method 2: Check user profile
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(`👤 User profile selectedBranchId: ${userData.selectedBranchId || 'NONE'}`);
        currentBranchId = userData.selectedBranchId || storedBranchId;
      }
    } catch (error) {
      console.log('⚠️ Could not read user profile');
      currentBranchId = storedBranchId;
    }
    
    if (!currentBranchId) {
      // Default to main branch
      const mainBranch = Object.values(branches).find(b => b.isMain);
      currentBranchId = mainBranch ? mainBranch.id : Object.keys(branches)[0];
      console.log(`🎯 Defaulting to: ${currentBranchId}`);
    }
    
    const currentBranch = branches[currentBranchId];
    const currentLocationId = `location_${currentBranchId}`;
    
    console.log(`\n🎯 Current branch: ${currentBranch ? currentBranch.name : 'UNKNOWN'} (${currentBranchId})`);
    console.log(`📍 Expected locationId: ${currentLocationId}`);

    // STEP 3: Debug filtering logic
    console.log('\n🔬 STEP 3: Testing filtering logic...');
    
    const allMenuItems = [];
    menuItemsSnapshot.forEach(doc => {
      const data = doc.data();
      allMenuItems.push({
        id: doc.id,
        name: data.name,
        category: data.category,
        locationId: data.locationId,
        tenantId: data.tenantId
      });
    });

    console.log(`📋 Total menu items: ${allMenuItems.length}`);

    // Apply the same filtering logic as MenuBuilder
    const getBranchLocationId = (branchId) => `location_${branchId}`;
    const branchId = currentBranchId ? getBranchLocationId(currentBranchId) : null;
    
    const filteredMenuItems = allMenuItems.filter(item => {
      const matchesLocation = branchId ? item.locationId === branchId : true;
      const matchesTenant = item.tenantId === tenantId;
      
      console.log(`🔍 Item: ${item.name}`);
      console.log(`   locationId: ${item.locationId} (expected: ${branchId})`);
      console.log(`   tenantId: ${item.tenantId} (expected: ${tenantId})`);
      console.log(`   matchesLocation: ${matchesLocation}`);
      console.log(`   matchesTenant: ${matchesTenant}`);
      console.log(`   ✅ PASSES FILTER: ${matchesLocation && matchesTenant}\n`);
      
      return matchesLocation && matchesTenant;
    });

    console.log(`\n🎯 After filtering: ${filteredMenuItems.length} items should show for current branch`);

    if (filteredMenuItems.length !== (itemsByLocation[currentLocationId] || []).length) {
      console.log('❌ FILTERING MISMATCH DETECTED!');
      console.log(`   Expected: ${(itemsByLocation[currentLocationId] || []).length} items`);
      console.log(`   Filtered: ${filteredMenuItems.length} items`);
      
      // Find the discrepancy
      const expectedItems = itemsByLocation[currentLocationId] || [];
      const expectedIds = new Set(expectedItems.map(item => item.id));
      const filteredIds = new Set(filteredMenuItems.map(item => item.id));
      
      console.log('\n🔍 Analyzing discrepancy:');
      expectedIds.forEach(id => {
        if (!filteredIds.has(id)) {
          console.log(`   Missing from filter: ${expectedItems.find(item => item.id === id)?.name}`);
        }
      });
      
      filteredIds.forEach(id => {
        if (!expectedIds.has(id)) {
          console.log(`   Extra in filter: ${filteredMenuItems.find(item => item.id === id)?.name}`);
        }
      });
    } else {
      console.log('✅ Filtering logic is working correctly');
    }

    // STEP 4: Identify issues and propose fixes
    console.log('\n🔧 STEP 4: Issue analysis and fixes...');
    
    const issues = [];
    const fixes = [];

    // Check for items without locationId
    if (itemsWithoutLocation.length > 0) {
      issues.push(`${itemsWithoutLocation.length} items have no locationId`);
      fixes.push('Assign missing locationId to items');
    }

    // Check for items with invalid locationId (pointing to non-existent branches)
    Object.keys(itemsByLocation).forEach(locationId => {
      const branchId = locationId.replace('location_', '');
      if (!branches[branchId]) {
        const count = itemsByLocation[locationId].length;
        issues.push(`${count} items have invalid locationId: ${locationId}`);
        fixes.push(`Reassign items from ${locationId} to valid branch`);
      }
    });

    if (issues.length > 0) {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      
      console.log('\n🔨 Suggested fixes:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
      
      // Apply fixes
      const shouldApplyFixes = confirm(`\n🚀 Apply fixes automatically? This will:\n${fixes.join('\n')}`);
      
      if (shouldApplyFixes) {
        console.log('\n🔧 Applying fixes...');
        const batch = db.batch();
        let fixCount = 0;

        // Fix 1: Assign locationId to items without one
        if (itemsWithoutLocation.length > 0) {
          console.log(`\n📝 Assigning locationId to ${itemsWithoutLocation.length} items...`);
          
          // Ask which branch to assign them to
          const branchOptions = Object.values(branches).map(b => `${b.name} (${b.id})`).join(', ');
          const targetBranchId = prompt(`Which branch should these items be assigned to?\nAvailable: ${branchOptions}\nEnter branch ID:`) || currentBranchId;
          const targetLocationId = `location_${targetBranchId}`;
          
          if (branches[targetBranchId]) {
            itemsWithoutLocation.forEach(item => {
              const docRef = db.collection('tenants').doc(tenantId).collection('menuItems').doc(item.id);
              batch.update(docRef, {
                locationId: targetLocationId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              fixCount++;
              console.log(`   ✅ ${item.name} → ${targetLocationId}`);
            });
          } else {
            console.log(`❌ Invalid branch ID: ${targetBranchId}`);
          }
        }

        // Fix 2: Reassign items from invalid locations
        Object.keys(itemsByLocation).forEach(locationId => {
          const branchId = locationId.replace('location_', '');
          if (!branches[branchId]) {
            const items = itemsByLocation[locationId];
            console.log(`\n📝 Reassigning ${items.length} items from invalid location ${locationId}...`);
            
            const targetLocationId = `location_${currentBranchId}`;
            items.forEach(item => {
              const docRef = db.collection('tenants').doc(tenantId).collection('menuItems').doc(item.id);
              batch.update(docRef, {
                locationId: targetLocationId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              fixCount++;
              console.log(`   ✅ ${item.name} → ${targetLocationId}`);
            });
          }
        });

        if (fixCount > 0) {
          await batch.commit();
          console.log(`\n🎉 Successfully applied ${fixCount} fixes!`);
          console.log('Please refresh the page to see the changes.');
        } else {
          console.log('\n✅ No fixes needed to apply.');
        }
      }
    } else {
      console.log('✅ No issues found - menu items are properly separated by branch');
    }

    console.log('\n🏁 Analysis complete!');
    console.log('\nIf you\'re still seeing menu items from other branches:');
    console.log('1. Refresh the page');
    console.log('2. Check that you\'re on the correct branch in the branch selector');
    console.log('3. Clear browser cache if needed');

  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
