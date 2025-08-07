const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

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

async function fixBranchSync() {
  try {
    console.log('🔧 FIXING BRANCH SYNC - FAST MODE\n');

    // Get first tenant
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    const tenantId = tenantsSnapshot.docs[0].id;
    
    // Get branches and locations for this tenant
    const branchesQuery = query(collection(db, 'branches'), where('tenantId', '==', tenantId));
    const branchesSnapshot = await getDocs(branchesQuery);
    
    const locationsQuery = query(collection(db, 'locations'), where('tenantId', '==', tenantId));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    console.log(`Found ${branchesSnapshot.docs.length} branches, ${locationsSnapshot.docs.length} locations`);
    
    // If more branches than locations, delete extra branches
    if (branchesSnapshot.docs.length > locationsSnapshot.docs.length) {
      console.log('🗑️ Deleting orphaned branches...');
      
      const locationIds = locationsSnapshot.docs.map(doc => doc.id);
      
      for (const branchDoc of branchesSnapshot.docs) {
        const branchData = branchDoc.data();
        const hasMatchingLocation = locationIds.includes(branchData.locationId) || locationIds.includes(branchDoc.id);
        
        if (!hasMatchingLocation && !branchData.isMain) {
          console.log(`   Deleting branch: ${branchData.name}`);
          await deleteDoc(doc(db, 'branches', branchDoc.id));
        }
      }
      
      console.log('✅ Cleanup complete!');
    }
    
    console.log('\n🎉 Branch sync fixed! Refresh your browser.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBranchSync();
