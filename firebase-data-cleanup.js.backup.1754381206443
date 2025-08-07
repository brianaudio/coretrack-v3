const admin = require('firebase-admin');

// Initialize Firebase Admin - update this path to your service account key
try {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cfc-inventory-v3-default-rtdb.firebaseio.com"
  });
} catch (error) {
  console.log('Firebase admin already initialized or using emulator');
  if (!admin.apps.length) {
    // Fallback for development
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function analyzeFirebaseData() {
  console.log('🔍 FIREBASE DATA ANALYSIS - CoreTrack v3');
  console.log('=' .repeat(60));
  
  try {
    // Get all root-level collections
    const collections = await db.listCollections();
    console.log(`📚 Found ${collections.length} root collections:\n`);
    
    for (const collection of collections) {
      const collectionName = collection.id;
      const snapshot = await collection.limit(50).get();
      
      console.log(`\n📊 COLLECTION: ${collectionName}`);
      console.log(`   Documents: ${snapshot.size}`);
      
      if (snapshot.size > 0) {
        // Analyze document structure
        const sampleDoc = snapshot.docs[0];
        const sampleData = sampleDoc.data();
        
        console.log(`   Sample ID: ${sampleDoc.id}`);
        console.log(`   Sample Keys: ${Object.keys(sampleData).join(', ')}`);
        
        // Check for tenant-specific structure
        if (collectionName === 'tenants') {
          console.log(`\n   🏢 TENANT ANALYSIS:`);
          for (const doc of snapshot.docs.slice(0, 3)) {
            const data = doc.data();
            console.log(`     Tenant: ${doc.id}`);
            console.log(`       Name: ${data.name || data.businessName || 'Unknown'}`);
            console.log(`       Owner: ${data.ownerId || 'Unknown'}`);
            console.log(`       Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
            
            // Check subcollections for this tenant
            const subCollections = ['teamMembers', 'branches', 'inventory', 'menuItems', 'orders', 'shifts'];
            for (const subCol of subCollections) {
              try {
                const subSnapshot = await db.collection(`tenants/${doc.id}/${subCol}`).limit(1).get();
                if (subSnapshot.size > 0) {
                  console.log(`         ${subCol}: ${subSnapshot.size}+ docs`);
                }
              } catch (e) {
                // Subcollection might not exist
              }
            }
          }
        }
        
        // Check for orphaned data
        if (collectionName === 'userProfiles') {
          console.log(`\n   👥 USER PROFILES ANALYSIS:`);
          for (const doc of snapshot.docs.slice(0, 5)) {
            const data = doc.data();
            console.log(`     User: ${doc.id}`);
            console.log(`       Email: ${data.email || 'Unknown'}`);
            console.log(`       Role: ${data.role || 'Unknown'}`);
            console.log(`       Tenant: ${data.tenantId || 'NO TENANT ID!'}`);
            
            // Check if tenant exists
            if (data.tenantId) {
              try {
                const tenantDoc = await db.doc(`tenants/${data.tenantId}`).get();
                if (!tenantDoc.exists) {
                  console.log(`       ❌ ORPHANED: Tenant ${data.tenantId} doesn't exist!`);
                }
              } catch (e) {
                console.log(`       ❌ ERROR checking tenant: ${e.message}`);
              }
            }
          }
        }
        
        // Check inventory structure
        if (collectionName === 'inventory') {
          console.log(`\n   📦 INVENTORY ANALYSIS:`);
          console.log(`     This should be moved to tenant-specific subcollections!`);
          for (const doc of snapshot.docs.slice(0, 3)) {
            const data = doc.data();
            console.log(`     Item: ${data.name || doc.id}`);
            console.log(`       Tenant: ${data.tenantId || 'NO TENANT ID!'}`);
            console.log(`       Location: ${data.locationId || 'NO LOCATION!'}`);
          }
        }
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🧹 CLEANUP RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    
    // Provide cleanup recommendations
    const recommendations = [
      '1. Move global inventory items to tenant-specific subcollections',
      '2. Remove orphaned user profiles with invalid tenantIds',
      '3. Consolidate duplicate menu items across locations',
      '4. Clean up test data and development artifacts',
      '5. Standardize document ID formats (avoid auto-generated IDs)',
      '6. Remove empty documents and collections',
      '7. Fix inconsistent field naming (businessName vs name)',
      '8. Add proper timestamps to all documents',
      '9. Remove debug/test collections',
      '10. Implement proper data validation rules'
    ];
    
    recommendations.forEach(rec => console.log(`   ${rec}`));
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 CLEANUP: Removing test and debug data...');
  
  try {
    // Remove test collections
    const testCollections = [
      'test-inventory',
      'debug-data', 
      'temp-data',
      'development-test'
    ];
    
    for (const colName of testCollections) {
      try {
        const snapshot = await db.collection(colName).get();
        if (snapshot.size > 0) {
          console.log(`   Removing ${snapshot.size} documents from ${colName}...`);
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`   ✅ Cleaned up ${colName}`);
        }
      } catch (e) {
        // Collection might not exist
      }
    }
    
    // Remove documents with test/debug in names
    const mainCollections = ['tenants', 'userProfiles', 'inventory'];
    for (const colName of mainCollections) {
      const snapshot = await db.collection(colName).get();
      const testDocs = snapshot.docs.filter(doc => {
        const id = doc.id.toLowerCase();
        const data = doc.data();
        const name = (data.name || data.businessName || '').toLowerCase();
        
        return id.includes('test') || id.includes('debug') || 
               name.includes('test') || name.includes('debug') ||
               name.includes('sample') || name.includes('demo');
      });
      
      if (testDocs.length > 0) {
        console.log(`   Found ${testDocs.length} test documents in ${colName}`);
        // Uncomment to actually delete:
        // const batch = db.batch();
        // testDocs.forEach(doc => batch.delete(doc.ref));
        // await batch.commit();
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

async function reorganizeInventoryData() {
  console.log('\n📦 REORGANIZING: Moving global inventory to tenant subcollections...');
  
  try {
    // Get all inventory items from global collection
    const globalInventory = await db.collection('inventory').get();
    
    if (globalInventory.size > 0) {
      console.log(`   Found ${globalInventory.size} items in global inventory`);
      
      // Group by tenant
      const itemsByTenant = {};
      globalInventory.docs.forEach(doc => {
        const data = doc.data();
        const tenantId = data.tenantId;
        
        if (tenantId) {
          if (!itemsByTenant[tenantId]) {
            itemsByTenant[tenantId] = [];
          }
          itemsByTenant[tenantId].push({ id: doc.id, data });
        } else {
          console.log(`   ⚠️  Item ${doc.id} has no tenantId: ${data.name}`);
        }
      });
      
      // Move items to tenant subcollections
      for (const [tenantId, items] of Object.entries(itemsByTenant)) {
        console.log(`   Moving ${items.length} items to tenant ${tenantId}...`);
        
        const batch = db.batch();
        items.forEach(item => {
          const newRef = db.doc(`tenants/${tenantId}/inventory/${item.id}`);
          const cleanData = { ...item.data };
          delete cleanData.tenantId; // Remove redundant field
          batch.set(newRef, cleanData);
        });
        
        // Uncomment to actually execute:
        // await batch.commit();
        console.log(`   ✅ Prepared ${items.length} items for tenant ${tenantId}`);
      }
      
      console.log('   ⚠️  To execute the move, uncomment the batch.commit() lines');
    }
    
  } catch (error) {
    console.error('❌ Reorganization error:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--analyze') || args.length === 0) {
    await analyzeFirebaseData();
  }
  
  if (args.includes('--cleanup')) {
    await cleanupTestData();
  }
  
  if (args.includes('--reorganize')) {
    await reorganizeInventoryData();
  }
  
  if (args.includes('--help')) {
    console.log('\nUsage: node firebase-data-cleanup.js [options]');
    console.log('Options:');
    console.log('  --analyze     Analyze current data structure (default)');
    console.log('  --cleanup     Remove test and debug data');
    console.log('  --reorganize  Move global data to tenant subcollections');
    console.log('  --help        Show this help message');
  }
  
  process.exit(0);
}

main().catch(console.error);
