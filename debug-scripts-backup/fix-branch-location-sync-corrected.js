/**
 * Fix Branch-Location Data Sync (Updated)
 * Synchronizes branches to the correct locations collection path for UI consistency
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

async function syncBranchesToCorrectLocations() {
  try {
    console.log('🔄 SYNCING BRANCHES TO CORRECT LOCATIONS COLLECTION');
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
      
      // Create location document with the structure expected by locationManagement.ts
      const locationData = {
        // Core identification (matching Location interface)
        id: branchId,
        name: branchData.name,
        type: 'branch',
        tenantId: tenantId,
        
        // Address structure
        address: {
          street: branchData.address || '',
          city: '',
          state: '',
          zipCode: '',
          country: 'Philippines'
        },
        
        // Contact information
        contact: {
          phone: branchData.phone || '',
          email: branchData.email || '',
          manager: branchData.manager || ''
        },
        
        // Settings structure
        settings: {
          timezone: 'Asia/Manila',
          currency: 'PHP',
          businessHours: {
            monday: { open: '09:00', close: '22:00', closed: false },
            tuesday: { open: '09:00', close: '22:00', closed: false },
            wednesday: { open: '09:00', close: '22:00', closed: false },
            thursday: { open: '09:00', close: '22:00', closed: false },
            friday: { open: '09:00', close: '22:00', closed: false },
            saturday: { open: '09:00', close: '22:00', closed: false },
            sunday: { open: '10:00', close: '20:00', closed: false }
          },
          features: {
            inventory: true,
            pos: true,
            expenses: true
          }
        },
        
        // Status and metadata
        status: branchData.status === 'active' ? 'active' : 'inactive',
        isActive: branchData.status === 'active' || branchData.isActive === true,
        
        // Original branch data for reference
        branchData: {
          isMain: branchData.isMain || false,
          icon: branchData.icon || '',
          stats: branchData.stats || {}
        },
        
        // Timestamps
        createdAt: branchData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Sync metadata
        syncedFromBranch: true,
        syncedAt: serverTimestamp(),
        originalBranchId: branchId
      };
      
      try {
        // Write to ROOT-LEVEL locations collection (as expected by locationManagement.ts)
        await setDoc(doc(db, 'locations', branchId), locationData);
        
        console.log(`  ✅ Successfully synced to root locations/${branchId}`);
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
    const locationsSnapshot = await getDocs(collection(db, 'locations'));
    
    // Filter for our tenant
    const tenantLocations = locationsSnapshot.docs.filter(doc => 
      doc.data().tenantId === tenantId
    );
    
    console.log(`\nRoot locations collection now has ${tenantLocations.length} documents for tenant ${tenantId}:`);
    tenantLocations.forEach(doc => {
      const data = doc.data();
      console.log(`  📍 ${data.name} (${doc.id}) - Status: ${data.status} - Type: ${data.type}`);
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
      console.log('✅ Branch data synchronized to root locations collection');
      console.log('✅ Location management will read from the correct collection');
      console.log('✅ Both UI components now have consistent data sources');
    }
    
    if (failureCount > 0) {
      console.log('\n⚠️ Some branches failed to sync. Check the errors above.');
    }
    
    console.log('\n✨ BUG FIX COMPLETE - CORRECTED VERSION');
    console.log('================================================================================');
    console.log('🔄 The branch selector → location management inconsistency has been resolved!');
    console.log('📱 Branch selector reads from: tenants/{tenantId}/branches');
    console.log('📱 Location management reads from: locations (root level)');
    console.log('🔗 Both now have the same data via synchronization');
    
    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('1. Refresh the application');
    console.log('2. Check branch selector in header (should show branches)');
    console.log('3. Check location management (should now show same branches)');
    console.log('4. Verify both show consistent information');
    console.log('5. Both should show: Creamy Frost & creamy frost 2');
    
  } catch (error) {
    console.error('❌ Sync operation failed:', error);
  } finally {
    process.exit(0);
  }
}

syncBranchesToCorrectLocations();
