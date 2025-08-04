/**
 * Debug Branch Data Inconsistency
 * Investigation script for branch selector vs location management mismatch
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

async function debugBranchDataInconsistency() {
  try {
    console.log('🔍 DEBUGGING BRANCH DATA INCONSISTENCY');
    console.log('================================================================================');
    
    // Check 1: Branch selector data source (branches collection)
    console.log('📍 CHECK 1: Branch Selector Data Source (/branches)');
    console.log('--------------------------------------------------');
    
    try {
      const branchesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/branches`));
      console.log(`Found ${branchesSnapshot.docs.length} documents in branches collection:`);
      
      branchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  ✅ ID: ${doc.id}`);
        console.log(`     Name: ${data.name || 'Unnamed'}`);
        console.log(`     Address: ${data.address || 'No address'}`);
        console.log(`     Status: ${data.status || data.isActive ? 'Active' : 'Inactive'}`);
        console.log(`     Type: ${data.type || 'Unknown'}`);
        console.log(`     Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000) : 'Unknown'}`);
        console.log(`     All fields:`, Object.keys(data).join(', '));
        console.log('');
      });
    } catch (error) {
      console.log(`❌ Error accessing branches collection: ${error.message}`);
    }

    // Check 2: Location management data source (locations collection)
    console.log('📍 CHECK 2: Location Management Data Source (/locations)');
    console.log('--------------------------------------------------');
    
    try {
      const locationsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/locations`));
      console.log(`Found ${locationsSnapshot.docs.length} documents in locations collection:`);
      
      if (locationsSnapshot.docs.length === 0) {
        console.log('  ⚠️ No documents found in locations collection!');
        console.log('  This explains why location management shows no branches.');
      }
      
      locationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  ✅ ID: ${doc.id}`);
        console.log(`     Name: ${data.name || 'Unnamed'}`);
        console.log(`     Address: ${data.address || 'No address'}`);
        console.log(`     Status: ${data.status || data.isActive ? 'Active' : 'Inactive'}`);
        console.log(`     All fields:`, Object.keys(data).join(', '));
        console.log('');
      });
    } catch (error) {
      console.log(`❌ Error accessing locations collection: ${error.message}`);
    }

    // Check 3: User profile branch selection
    console.log('📍 CHECK 3: User Profile Branch References');
    console.log('--------------------------------------------------');
    
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('tenantId', '==', tenantId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      console.log(`Found ${usersSnapshot.docs.length} users for this tenant:`);
      
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  👤 User: ${doc.id}`);
        console.log(`     Selected Branch: ${data.selectedBranchId || 'None'}`);
        console.log(`     Last Active Branch: ${data.lastActiveBranch || 'None'}`);
        console.log('');
      });
    } catch (error) {
      console.log(`❌ Error accessing users: ${error.message}`);
    }

    // Check 4: Alternative collection names
    console.log('📍 CHECK 4: Checking Alternative Collection Names');
    console.log('--------------------------------------------------');
    
    const alternativeCollections = [
      'branch',
      'location', 
      'offices',
      'stores',
      'outlets',
      'sites'
    ];
    
    for (const collectionName of alternativeCollections) {
      try {
        const snapshot = await getDocs(collection(db, `tenants/${tenantId}/${collectionName}`));
        if (snapshot.docs.length > 0) {
          console.log(`  ✅ Found ${snapshot.docs.length} documents in ${collectionName} collection`);
        }
      } catch (error) {
        // Collection doesn't exist or access denied
      }
    }

    // Check 5: Root level collections
    console.log('\n📍 CHECK 5: Checking Root Level Collections');
    console.log('--------------------------------------------------');
    
    try {
      const rootBranchesSnapshot = await getDocs(collection(db, 'branches'));
      console.log(`Found ${rootBranchesSnapshot.docs.length} documents in root branches collection`);
      
      if (rootBranchesSnapshot.docs.length > 0) {
        console.log('  Documents in root branches:');
        rootBranchesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.tenantId === tenantId) {
            console.log(`    ✅ ${data.name} (tenant match)`);
          }
        });
      }
    } catch (error) {
      console.log(`❌ Error accessing root branches: ${error.message}`);
    }

    // Analysis and Recommendations
    console.log('\n🎯 ANALYSIS & RECOMMENDATIONS');
    console.log('================================================================================');
    
    console.log('📊 ISSUE IDENTIFIED:');
    console.log('  - Branch selector reads from: tenants/{tenantId}/branches');
    console.log('  - Location management reads from: tenants/{tenantId}/locations');
    console.log('  - These are different collections causing the inconsistency!');
    
    console.log('\n🔧 SOLUTION OPTIONS:');
    console.log('  1. SYNC DATA: Copy branches to locations collection');
    console.log('  2. UPDATE UI: Make location management read from branches collection');
    console.log('  3. UNIFY COLLECTIONS: Use single collection for both features');
    
    console.log('\n💡 RECOMMENDED FIX:');
    console.log('  Option 1: Sync the data to maintain current UI expectations');
    console.log('  This ensures both components show the same data immediately');
    
    console.log('\n🎉 READY TO IMPLEMENT FIX');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    process.exit(0);
  }
}

debugBranchDataInconsistency();
