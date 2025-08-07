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

async function quickBranchDebug() {
  try {
    console.log('🔍 Quick Branch Debug...\n');

    // Get the active tenant (assuming there's only one or we're checking the first one)
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    
    if (tenantsSnapshot.empty) {
      console.log('❌ No tenants found');
      return;
    }

    const tenantDoc = tenantsSnapshot.docs[0]; // Check first tenant
    const tenantId = tenantDoc.id;
    const tenantData = tenantDoc.data();
    
    console.log(`🏢 Checking tenant: ${tenantData.businessName || tenantId}`);
    console.log(`   Tenant ID: ${tenantId}\n`);

    // Get branches for this tenant only
    const branchesQuery = query(collection(db, 'branches'), where('tenantId', '==', tenantId));
    const branchesSnapshot = await getDocs(branchesQuery);
    
    console.log(`📍 BRANCHES FOUND: ${branchesSnapshot.docs.length}`);
    branchesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name} (ID: ${doc.id})`);
      console.log(`      - Status: ${data.status}`);
      console.log(`      - Main: ${data.isMain ? 'Yes' : 'No'}`);
      console.log(`      - Location ID: ${data.locationId || 'None'}`);
    });

    // Get locations for this tenant only
    const locationsQuery = query(collection(db, 'locations'), where('tenantId', '==', tenantId));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    console.log(`\n🏬 LOCATIONS FOUND: ${locationsSnapshot.docs.length}`);
    locationsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name} (ID: ${doc.id})`);
      console.log(`      - Status: ${data.status}`);
      console.log(`      - Type: ${data.type}`);
      console.log(`      - Address: ${data.address || 'No address'}`);
    });

    // Quick analysis
    console.log(`\n📊 ANALYSIS:`);
    console.log(`   - Branch Selector shows: 3 branches`);
    console.log(`   - Database branches: ${branchesSnapshot.docs.length}`);
    console.log(`   - Location Management shows: 1 location`);
    console.log(`   - Database locations: ${locationsSnapshot.docs.length}`);
    
    if (branchesSnapshot.docs.length > locationsSnapshot.docs.length) {
      console.log(`\n⚠️  ISSUE: More branches (${branchesSnapshot.docs.length}) than locations (${locationsSnapshot.docs.length})`);
      console.log(`   This explains why the branch selector shows 3 but location management shows 1.`);
      console.log(`\n💡 SOLUTION: Need to clean up orphaned branches or create missing locations.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickBranchDebug();
