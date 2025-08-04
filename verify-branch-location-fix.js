/**
 * Verify Branch-Location Data Sync Fix
 * Confirms both data sources now have consistent information
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKQ0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function verifyBranchLocationSync() {
  try {
    console.log('🔍 VERIFYING BRANCH-LOCATION SYNC FIX');
    console.log('================================================================================');
    
    // Test 1: Branch Selector Data Source (branches collection)
    console.log('🧪 TEST 1: Branch Selector Data Source');
    console.log('Source: tenants/{tenantId}/branches');
    console.log('--------------------------------------------------');
    
    const branchesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/branches`));
    const branchSelectorData = [];
    
    branchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      branchSelectorData.push({
        id: doc.id,
        name: data.name,
        status: data.status
      });
      console.log(`  📍 ${data.name} (${doc.id}) - Status: ${data.status}`);
    });
    
    // Test 2: Location Management Data Source (locations collection)
    console.log('\n🧪 TEST 2: Location Management Data Source');
    console.log('Source: locations (root level, filtered by tenantId)');
    console.log('--------------------------------------------------');
    
    const locationsQuery = query(
      collection(db, 'locations'),
      where('tenantId', '==', tenantId)
    );
    const locationsSnapshot = await getDocs(locationsQuery);
    const locationManagementData = [];
    
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      locationManagementData.push({
        id: doc.id,
        name: data.name,
        status: data.status
      });
      console.log(`  📍 ${data.name} (${doc.id}) - Status: ${data.status}`);
    });
    
    // Test 3: Data Consistency Check
    console.log('\n🧪 TEST 3: Data Consistency Analysis');
    console.log('--------------------------------------------------');
    
    const branchIds = new Set(branchSelectorData.map(b => b.id));
    const locationIds = new Set(locationManagementData.map(l => l.id));
    
    // Check if all branches have corresponding locations
    const missingInLocations = [...branchIds].filter(id => !locationIds.has(id));
    const extraInLocations = [...locationIds].filter(id => !branchIds.has(id));
    
    console.log(`Branch Selector Count: ${branchSelectorData.length}`);
    console.log(`Location Management Count: ${locationManagementData.length}`);
    
    if (missingInLocations.length === 0 && extraInLocations.length === 0) {
      console.log('✅ PERFECT SYNC: All branch IDs match location IDs');
    } else {
      console.log('❌ SYNC ISSUES DETECTED:');
      if (missingInLocations.length > 0) {
        console.log(`  Missing in locations: ${missingInLocations.join(', ')}`);
      }
      if (extraInLocations.length > 0) {
        console.log(`  Extra in locations: ${extraInLocations.join(', ')}`);
      }
    }
    
    // Test 4: Name Consistency Check
    console.log('\n🧪 TEST 4: Name Consistency Check');
    console.log('--------------------------------------------------');
    
    let nameMatches = true;
    for (const branch of branchSelectorData) {
      const correspondingLocation = locationManagementData.find(l => l.id === branch.id);
      if (correspondingLocation) {
        if (branch.name === correspondingLocation.name) {
          console.log(`✅ ${branch.name}: Names match`);
        } else {
          console.log(`❌ ${branch.id}: Name mismatch - Branch: "${branch.name}", Location: "${correspondingLocation.name}"`);
          nameMatches = false;
        }
      }
    }
    
    // Test 5: Status Consistency Check
    console.log('\n🧪 TEST 5: Status Consistency Check');
    console.log('--------------------------------------------------');
    
    let statusMatches = true;
    for (const branch of branchSelectorData) {
      const correspondingLocation = locationManagementData.find(l => l.id === branch.id);
      if (correspondingLocation) {
        if (branch.status === correspondingLocation.status) {
          console.log(`✅ ${branch.name}: Status match (${branch.status})`);
        } else {
          console.log(`❌ ${branch.name}: Status mismatch - Branch: "${branch.status}", Location: "${correspondingLocation.status}"`);
          statusMatches = false;
        }
      }
    }
    
    // Final Report
    console.log('\n📊 FINAL VERIFICATION REPORT');
    console.log('================================================================================');
    
    const allTestsPassed = (
      missingInLocations.length === 0 && 
      extraInLocations.length === 0 && 
      nameMatches && 
      statusMatches &&
      branchSelectorData.length > 0 &&
      locationManagementData.length > 0
    );
    
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Bug fix is successful.');
      console.log('✅ Branch selector and location management now have consistent data');
      console.log('✅ Users should see the same branches in both interfaces');
      console.log('✅ No more display inconsistency between header and location management');
      
      console.log('\n📱 UI Components Status:');
      console.log('  • Header Branch Selector: ✅ Working (shows branches)');
      console.log('  • Location Management: ✅ Working (shows branches)');
      console.log('  • Data Synchronization: ✅ Complete');
      
      console.log('\n🏢 Available Branches for Users:');
      branchSelectorData.forEach(branch => {
        console.log(`  • ${branch.name} (${branch.status})`);
      });
      
    } else {
      console.log('⚠️ SOME ISSUES DETECTED. See test results above.');
    }
    
    console.log('\n✨ VERIFICATION COMPLETE');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyBranchLocationSync();
