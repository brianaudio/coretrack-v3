const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA5f3OZqJHWZMb4S-klY8W8iM6yZGQXDR8",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "21796909415",
  appId: "1:21796909415:web:b6b34c2db0dd8e7c3a3cd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugBranchLocationSync() {
  try {
    console.log('🔍 Debugging Branch-Location Sync Issue...\n');

    // Get all tenants first
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    console.log(`📊 Found ${tenantsSnapshot.docs.length} tenants`);

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      console.log(`\n🏢 TENANT: ${tenantData.businessName || tenantId}`);
      console.log(`   ID: ${tenantId}`);

      // Check branches collection
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const tenantBranches = branchesSnapshot.docs.filter(doc => 
        doc.data().tenantId === tenantId
      );

      console.log(`\n📍 BRANCHES (${tenantBranches.length}):`);
      tenantBranches.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.name}`);
        console.log(`      - ID: ${doc.id}`);
        console.log(`      - Location ID: ${data.locationId || 'No locationId'}`);
        console.log(`      - Status: ${data.status}`);
        console.log(`      - Main: ${data.isMain ? 'Yes' : 'No'}`);
        console.log(`      - Created: ${data.createdAt?.toDate?.() || 'No date'}`);
      });

      // Check locations collection
      const locationsSnapshot = await getDocs(collection(db, 'locations'));
      const tenantLocations = locationsSnapshot.docs.filter(doc => 
        doc.data().tenantId === tenantId
      );

      console.log(`\n🏬 LOCATIONS (${tenantLocations.length}):`);
      tenantLocations.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.name}`);
        console.log(`      - ID: ${doc.id}`);
        console.log(`      - Address: ${data.address || 'No address'}`);
        console.log(`      - Status: ${data.status}`);
        console.log(`      - Type: ${data.type}`);
        console.log(`      - Created: ${data.createdAt?.toDate?.() || 'No date'}`);
      });

      // Cross-reference analysis
      console.log(`\n🔗 CROSS-REFERENCE ANALYSIS:`);
      
      // Find branches without corresponding locations
      const orphanedBranches = tenantBranches.filter(branchDoc => {
        const branchData = branchDoc.data();
        return !tenantLocations.some(locDoc => 
          locDoc.id === branchData.locationId || locDoc.id === branchDoc.id
        );
      });

      if (orphanedBranches.length > 0) {
        console.log(`   ⚠️  ORPHANED BRANCHES (${orphanedBranches.length}):`);
        orphanedBranches.forEach(doc => {
          const data = doc.data();
          console.log(`      - ${data.name} (ID: ${doc.id})`);
          console.log(`        Location ID: ${data.locationId || 'None'}`);
        });
      }

      // Find locations without corresponding branches
      const orphanedLocations = tenantLocations.filter(locDoc => {
        return !tenantBranches.some(branchDoc => 
          branchDoc.data().locationId === locDoc.id || branchDoc.id === locDoc.id
        );
      });

      if (orphanedLocations.length > 0) {
        console.log(`   ⚠️  ORPHANED LOCATIONS (${orphanedLocations.length}):`);
        orphanedLocations.forEach(doc => {
          const data = doc.data();
          console.log(`      - ${data.name} (ID: ${doc.id})`);
        });
      }

      // Summary
      console.log(`\n📋 SUMMARY FOR ${tenantData.businessName || tenantId}:`);
      console.log(`   - Branches in database: ${tenantBranches.length}`);
      console.log(`   - Locations in database: ${tenantLocations.length}`);
      console.log(`   - Orphaned branches: ${orphanedBranches.length}`);
      console.log(`   - Orphaned locations: ${orphanedLocations.length}`);
      
      if (tenantBranches.length !== tenantLocations.length) {
        console.log(`   ❌ MISMATCH: Branches (${tenantBranches.length}) ≠ Locations (${tenantLocations.length})`);
      } else {
        console.log(`   ✅ MATCH: Both collections have same count`);
      }

      console.log('\n' + '='.repeat(80));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugBranchLocationSync();
