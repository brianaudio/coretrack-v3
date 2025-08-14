// DEFINITIVE BRANCH ISOLATION FIX
// This script will enforce complete branch isolation

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to update this path)
try {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.log('⚠️ Firebase Admin initialization failed - run in browser instead');
}

async function enforceCompleteBranchIsolation(tenantId) {
  try {
    console.log('🔧 ENFORCING COMPLETE BRANCH ISOLATION');
    console.log('=====================================');
    
    const db = admin.firestore();
    
    // Step 1: Get all valid branches
    console.log('\n1️⃣ Getting valid branches...');
    const locationsRef = db.collection('locations').where('tenantId', '==', tenantId);
    const locationsSnapshot = await locationsRef.get();
    
    const validBranches = [];
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      validBranches.push({
        id: doc.id,
        name: data.name,
        locationId: `location_${doc.id}`,
        isMain: data.type === 'main'
      });
    });
    
    console.log(`Found ${validBranches.length} valid branches:`);
    validBranches.forEach(branch => {
      console.log(`  - ${branch.name} (${branch.id}) → ${branch.locationId} ${branch.isMain ? '[MAIN]' : ''}`);
    });
    
    if (validBranches.length === 0) {
      throw new Error('No valid branches found! Cannot proceed.');
    }
    
    // Step 2: Analyze current menu items
    console.log('\n2️⃣ Analyzing current menu items...');
    const menuItemsRef = db.collection(`tenants/${tenantId}/menuItems`);
    const menuSnapshot = await menuItemsRef.get();
    
    console.log(`Found ${menuSnapshot.size} total menu items`);
    
    const itemsByLocation = {};
    const itemsWithoutLocation = [];
    const itemsWithInvalidLocation = [];
    
    const validLocationIds = validBranches.map(b => b.locationId);
    
    menuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const item = { id: doc.id, name: data.name, locationId: data.locationId, ...data };
      
      if (!data.locationId) {
        itemsWithoutLocation.push(item);
      } else if (!validLocationIds.includes(data.locationId)) {
        itemsWithInvalidLocation.push(item);
      } else {
        if (!itemsByLocation[data.locationId]) {
          itemsByLocation[data.locationId] = [];
        }
        itemsByLocation[data.locationId].push(item);
      }
    });
    
    console.log('Current distribution:');
    Object.entries(itemsByLocation).forEach(([locationId, items]) => {
      const branch = validBranches.find(b => b.locationId === locationId);
      console.log(`  ${locationId}: ${items.length} items ${branch ? `(${branch.name})` : ''}`);
    });
    
    if (itemsWithoutLocation.length > 0) {
      console.log(`❌ Items without locationId: ${itemsWithoutLocation.length}`);
    }
    
    if (itemsWithInvalidLocation.length > 0) {
      console.log(`❌ Items with invalid locationId: ${itemsWithInvalidLocation.length}`);
    }
    
    // Step 3: Enforce isolation rules
    console.log('\n3️⃣ Applying branch isolation fixes...');
    
    let fixedCount = 0;
    const batch = db.batch();
    
    // Fix items without locationId - assign to main branch
    const mainBranch = validBranches.find(b => b.isMain) || validBranches[0];
    console.log(`Main branch: ${mainBranch.name} (${mainBranch.locationId})`);
    
    itemsWithoutLocation.forEach(item => {
      console.log(`  Fixing: ${item.name} → ${mainBranch.locationId}`);
      const docRef = db.doc(`tenants/${tenantId}/menuItems/${item.id}`);
      batch.update(docRef, {
        locationId: mainBranch.locationId,
        tenantId: tenantId, // Ensure tenantId is also set
        updatedAt: admin.firestore.Timestamp.now()
      });
      fixedCount++;
    });
    
    // Fix items with invalid locationId - reassign to main branch
    itemsWithInvalidLocation.forEach(item => {
      console.log(`  Fixing invalid: ${item.name} (${item.locationId}) → ${mainBranch.locationId}`);
      const docRef = db.doc(`tenants/${tenantId}/menuItems/${item.id}`);
      batch.update(docRef, {
        locationId: mainBranch.locationId,
        tenantId: tenantId,
        updatedAt: admin.firestore.Timestamp.now()
      });
      fixedCount++;
    });
    
    // Commit fixes
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${fixedCount} menu items`);
    } else {
      console.log('✅ No fixes needed for menu items');
    }
    
    // Step 4: Fix POS items too
    console.log('\n4️⃣ Fixing POS items...');
    const posItemsRef = db.collection(`tenants/${tenantId}/posItems`);
    const posSnapshot = await posItemsRef.get();
    
    let posFixedCount = 0;
    const posBatch = db.batch();
    
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.locationId || !validLocationIds.includes(data.locationId)) {
        console.log(`  Fixing POS: ${data.name} → ${mainBranch.locationId}`);
        posBatch.update(doc.ref, {
          locationId: mainBranch.locationId,
          tenantId: tenantId,
          updatedAt: admin.firestore.Timestamp.now()
        });
        posFixedCount++;
      }
    });
    
    if (posFixedCount > 0) {
      await posBatch.commit();
      console.log(`✅ Fixed ${posFixedCount} POS items`);
    }
    
    // Step 5: Create enforcement rules in code
    console.log('\n5️⃣ Creating client-side enforcement...');
    
    const enforcementCode = `
// BRANCH ISOLATION ENFORCEMENT WRAPPER
// Add this to your getMenuItems calls to ensure isolation

export const getMenuItemsWithEnforcement = async (tenantId, locationId) => {
  // Get items using our isolation system
  const items = await getMenuItems(tenantId, locationId);
  
  // Additional client-side validation
  const validItems = items.filter(item => {
    const hasCorrectTenant = item.tenantId === tenantId;
    const hasCorrectLocation = item.locationId === locationId;
    
    if (!hasCorrectTenant || !hasCorrectLocation) {
      console.warn('🚨 ISOLATION BREACH:', {
        itemName: item.name,
        itemTenantId: item.tenantId,
        expectedTenant: tenantId,
        itemLocationId: item.locationId,
        expectedLocation: locationId
      });
      return false;
    }
    
    return true;
  });
  
  // Log isolation status
  console.log(\`🛡️ BRANCH ISOLATION: \${validItems.length}/\${items.length} items passed validation\`);
  
  return validItems;
};
`;
    
    console.log('Add this to your menuBuilder.ts:');
    console.log(enforcementCode);
    
    // Step 6: Verification
    console.log('\n6️⃣ Final verification...');
    const verifySnapshot = await menuItemsRef.get();
    const verifyByLocation = {};
    
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const locationId = data.locationId || 'NO_LOCATION';
      verifyByLocation[locationId] = (verifyByLocation[locationId] || 0) + 1;
    });
    
    console.log('Final distribution:');
    Object.entries(verifyByLocation).forEach(([locationId, count]) => {
      const branch = validBranches.find(b => b.locationId === locationId);
      const status = validLocationIds.includes(locationId) ? '✅' : '❌';
      console.log(`  ${status} ${locationId}: ${count} items ${branch ? `(${branch.name})` : ''}`);
    });
    
    console.log('\n🎉 BRANCH ISOLATION ENFORCEMENT COMPLETE!');
    console.log('Each branch should now have complete data isolation.');
    
    return {
      validBranches,
      fixedMenuItems: fixedCount,
      fixedPOSItems: posFixedCount,
      finalDistribution: verifyByLocation
    };
    
  } catch (error) {
    console.error('❌ Failed to enforce branch isolation:', error);
    throw error;
  }
}

// Browser-compatible version
const browserVersion = `
// BROWSER VERSION - Run this in console
(async function() {
  const tenantId = firebase.auth().currentUser.uid;
  const db = firebase.firestore();
  
  console.log('🔧 BROWSER-BASED BRANCH ISOLATION FIX');
  console.log('====================================');
  
  // Get current branch
  const currentBranchId = localStorage.getItem('selectedBranchId');
  if (!currentBranchId) {
    console.error('❌ No current branch selected');
    return;
  }
  
  const expectedLocationId = \`location_\${currentBranchId}\`;
  console.log('Current branch:', currentBranchId);
  console.log('Expected locationId:', expectedLocationId);
  
  // Get all menu items
  const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
  const snapshot = await menuItemsRef.get();
  
  console.log('Found', snapshot.size, 'menu items');
  
  let fixedCount = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Fix items that don't have the correct locationId
    if (data.locationId !== expectedLocationId) {
      console.log('Fixing:', data.name, '(' + data.locationId + ') →', expectedLocationId);
      batch.update(doc.ref, {
        locationId: expectedLocationId,
        tenantId: tenantId,
        updatedAt: new Date()
      });
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    await batch.commit();
    console.log('✅ Fixed', fixedCount, 'menu items');
    
    // Reload the page to see changes
    console.log('🔄 Reloading page to apply changes...');
    setTimeout(() => window.location.reload(), 1000);
  } else {
    console.log('✅ All items already have correct locationId');
  }
})();
`;

console.log('\n🌐 BROWSER VERSION:');
console.log('If running in browser console, use this instead:');
console.log(browserVersion);

// Export for Node.js usage
module.exports = { enforceCompleteBranchIsolation };
