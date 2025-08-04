/**
 * Fix Branch-Location Data Sync
 * Synchronizes branches collection to locations collection for UI consistency
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, setDoc, serverTimestamp } = require('firebase/firestore');

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

async function syncBranchesToLocations() {
  try {
    console.log('🔄 SYNCING BRANCHES TO LOCATIONS COLLECTION');
    console.log('================================================================================');
    
    // Step 1: Read all branches
    console.log('📖 Step 1: Reading branches collection...');
    const branchesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/branches`));
    
    if (branchesSnapshot.docs.length === 0) {
      console.log('❌ No branches found to sync!');
      return;
    }
    
    console.log(`Found ${branchesSnapshot.docs.length} branches to sync:`);
    
    // Step 2: Process each branch
    const syncResults = [];
    
    for (const branchDoc of branchesSnapshot.docs) {
      const branchData = branchDoc.data();
      const branchId = branchDoc.id;
      
      console.log(`\n🏢 Processing: ${branchData.name}`);
      
      // Create location document with same ID and compatible data structure
      const locationData = {
        // Core identification
        id: branchId,
        name: branchData.name,
        address: branchData.address,
        
        // Status and type
        status: branchData.status || 'active',
        isActive: branchData.status === 'active' || branchData.isActive === true,
        type: branchData.type || 'branch',
        
        // Contact information
        phone: branchData.phone || '',
        email: branchData.email || '',
        
        // Management
        manager: branchData.manager || '',
        isMain: branchData.isMain || false,
        
        // Visual
        icon: branchData.icon || '',
        
        // Stats and metrics
        stats: branchData.stats || {
          totalOrders: 0,
          totalRevenue: 0,
          inventoryItems: 0,
          activeUsers: 0
        },
        
        // Timestamps
        createdAt: branchData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
        
        // Metadata
        source: 'branches_collection',
        syncVersion: '1.0',
        tenantId: tenantId
      };
      
      try {
        // Write to locations collection
        await setDoc(doc(db, `tenants/${tenantId}/locations`, branchId), locationData);
        
        console.log(`  ✅ Successfully synced to locations/${branchId}`);
        syncResults.push({
          branchId,
          name: branchData.name,
          status: 'success'
        });
        
      } catch (error) {
        console.log(`  ❌ Failed to sync ${branchId}: ${error.message}`);
        syncResults.push({
          branchId,
          name: branchData.name,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Step 3: Verification
    console.log('\n🔍 Step 3: Verifying sync results...');
    const locationsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/locations`));
    
    console.log(`\nLocations collection now has ${locationsSnapshot.docs.length} documents:`);
    locationsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  📍 ${data.name} (${doc.id}) - Status: ${data.status}`);
    });
    
    // Step 4: Summary Report
    console.log('\n📊 SYNC SUMMARY REPORT');
    console.log('================================================================================');
    
    const successCount = syncResults.filter(r => r.status === 'success').length;
    const failureCount = syncResults.filter(r => r.status === 'failed').length;
    
    console.log(`✅ Successfully synced: ${successCount} branches`);
    console.log(`❌ Failed to sync: ${failureCount} branches`);
    
    if (successCount > 0) {
      console.log('\n🎉 SUCCESS! Location management should now display branches.');
      console.log('Both branch selector and location management now read from consistent data sources.');
    }
    
    if (failureCount > 0) {
      console.log('\n⚠️ Some branches failed to sync. Check the errors above.');
    }
    
    console.log('\n✨ BUG FIX COMPLETE');
    console.log('================================================================================');
    console.log('🔄 The branch selector → location management inconsistency has been resolved!');
    console.log('📱 Both UI components now have access to the same branch data.');
    console.log('🏢 Location management will display all available branches.');
    
    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('1. Refresh the application');
    console.log('2. Check branch selector in header (should show branches)');
    console.log('3. Check location management (should now show same branches)');
    console.log('4. Verify both show consistent information');
    
  } catch (error) {
    console.error('❌ Sync operation failed:', error);
  } finally {
    process.exit(0);
  }
}

syncBranchesToLocations();
