const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, query, where } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupDuplicateMainLocations() {
  console.log('🧹 CLEANING UP DUPLICATE "MAIN LOCATION" ENTRIES');
  console.log('=' .repeat(60));
  
  try {
    // Get all locations from root collection
    const locationsSnapshot = await getDocs(collection(db, 'locations'));
    
    // Group locations by tenantId
    const locationsByTenant = {};
    
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const tenantId = data.tenantId;
      
      if (!locationsByTenant[tenantId]) {
        locationsByTenant[tenantId] = [];
      }
      
      locationsByTenant[tenantId].push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`\n📊 Found ${Object.keys(locationsByTenant).length} tenants with locations`);
    
    let totalDuplicatesRemoved = 0;
    
    // Process each tenant
    for (const [tenantId, locations] of Object.entries(locationsByTenant)) {
      const mainLocations = locations.filter(loc => 
        loc.name?.toLowerCase().includes('main location') || 
        loc.type === 'main'
      );
      
      if (mainLocations.length > 1) {
        console.log(`\n🚨 Tenant ${tenantId} has ${mainLocations.length} main locations:`);
        
        mainLocations.forEach((loc, index) => {
          console.log(`   [${index + 1}] ${loc.name} (ID: ${loc.id})`);
          console.log(`       Created: ${loc.createdAt?.toDate?.() || 'Unknown'}`);
          console.log(`       Type: ${loc.type || 'No type'}`);
        });
        
        // Keep the oldest one (first created) or the one marked as type: 'main'
        const mainTypeLocation = mainLocations.find(loc => loc.type === 'main');
        let locationToKeep;
        
        if (mainTypeLocation) {
          locationToKeep = mainTypeLocation;
        } else {
          // Keep the oldest one based on creation time
          locationToKeep = mainLocations.reduce((oldest, current) => {
            const oldestTime = oldest.createdAt?.toDate?.() || new Date(0);
            const currentTime = current.createdAt?.toDate?.() || new Date(0);
            return currentTime < oldestTime ? current : oldest;
          });
        }
        
        console.log(`   ✅ Keeping: ${locationToKeep.name} (${locationToKeep.id})`);
        
        // Delete the duplicates
        for (const loc of mainLocations) {
          if (loc.id !== locationToKeep.id) {
            console.log(`   🗑️ Deleting duplicate: ${loc.name} (${loc.id})`);
            try {
              await deleteDoc(doc(db, 'locations', loc.id));
              console.log(`   ✅ Successfully deleted ${loc.id}`);
              totalDuplicatesRemoved++;
            } catch (error) {
              console.log(`   ❌ Failed to delete ${loc.id}:`, error.message);
            }
          }
        }
      } else if (mainLocations.length === 1) {
        console.log(`✅ Tenant ${tenantId} has 1 main location (OK)`);
      } else {
        console.log(`⚠️ Tenant ${tenantId} has 0 main locations`);
      }
    }
    
    console.log(`\n🏁 CLEANUP SUMMARY:`);
    console.log(`📊 Processed ${Object.keys(locationsByTenant).length} tenants`);
    console.log(`🗑️ Removed ${totalDuplicatesRemoved} duplicate main locations`);
    
    if (totalDuplicatesRemoved > 0) {
      console.log('\n✅ Duplicate main locations have been cleaned up!');
      console.log('💡 New account signups will now create only one main location.');
    } else {
      console.log('\n✅ No duplicate main locations found - database is clean!');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupDuplicateMainLocations().then(() => {
  console.log('\n🎯 Cleanup completed!');
  process.exit(0);
});
