// Test script to verify branch isolation is working correctly
const admin = require('firebase-admin');

// Test configuration
const TEST_TENANT_ID = 'tenant_123_test';
const BRANCH_1_ID = 'location_branch1_test';
const BRANCH_2_ID = 'location_branch2_test';

async function testBranchIsolation() {
  try {
    console.log('🧪 Testing Branch Isolation System');
    console.log('===================================');
    
    const db = admin.firestore();
    
    // 1. Create menu items for Branch 1
    console.log('\n1. Creating menu items for Branch 1...');
    const branch1Items = [
      {
        name: 'Branch 1 Special Burger',
        category: 'Main Course',
        price: 12.99,
        locationId: BRANCH_1_ID
      },
      {
        name: 'Branch 1 Signature Pizza',
        category: 'Main Course', 
        price: 15.99,
        locationId: BRANCH_1_ID
      }
    ];
    
    for (const item of branch1Items) {
      const docRef = await db.collection(`tenants/${TEST_TENANT_ID}/menuItems`).add({
        ...item,
        tenantId: TEST_TENANT_ID,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        status: 'active'
      });
      console.log(`✅ Created Branch 1 item: ${item.name} (ID: ${docRef.id})`);
    }
    
    // 2. Create menu items for Branch 2
    console.log('\n2. Creating menu items for Branch 2...');
    const branch2Items = [
      {
        name: 'Branch 2 Exclusive Pasta',
        category: 'Main Course',
        price: 14.99,
        locationId: BRANCH_2_ID
      },
      {
        name: 'Branch 2 Special Salad',
        category: 'Appetizer',
        price: 8.99,
        locationId: BRANCH_2_ID
      }
    ];
    
    for (const item of branch2Items) {
      const docRef = await db.collection(`tenants/${TEST_TENANT_ID}/menuItems`).add({
        ...item,
        tenantId: TEST_TENANT_ID,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        status: 'active'
      });
      console.log(`✅ Created Branch 2 item: ${item.name} (ID: ${docRef.id})`);
    }
    
    // 3. Test Branch 1 isolation - should only see Branch 1 items
    console.log('\n3. Testing Branch 1 isolation...');
    const branch1Query = await db.collection(`tenants/${TEST_TENANT_ID}/menuItems`)
      .where('locationId', '==', BRANCH_1_ID)
      .get();
    
    console.log(`📊 Branch 1 query returned ${branch1Query.size} items:`);
    branch1Query.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (locationId: ${data.locationId})`);
    });
    
    // 4. Test Branch 2 isolation - should only see Branch 2 items  
    console.log('\n4. Testing Branch 2 isolation...');
    const branch2Query = await db.collection(`tenants/${TEST_TENANT_ID}/menuItems`)
      .where('locationId', '==', BRANCH_2_ID)
      .get();
    
    console.log(`📊 Branch 2 query returned ${branch2Query.size} items:`);
    branch2Query.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (locationId: ${data.locationId})`);
    });
    
    // 5. Test cross-contamination - this should show the problem if it exists
    console.log('\n5. Testing for cross-contamination...');
    const allItemsQuery = await db.collection(`tenants/${TEST_TENANT_ID}/menuItems`)
      .get();
    
    console.log(`📊 Total items in database: ${allItemsQuery.size}`);
    const itemsByLocation = {};
    allItemsQuery.docs.forEach(doc => {
      const data = doc.data();
      const locationId = data.locationId || 'NO_LOCATION';
      if (!itemsByLocation[locationId]) {
        itemsByLocation[locationId] = [];
      }
      itemsByLocation[locationId].push(data.name);
    });
    
    console.log('\n📋 Items by location:');
    Object.keys(itemsByLocation).forEach(locationId => {
      console.log(`  ${locationId}: ${itemsByLocation[locationId].length} items`);
      itemsByLocation[locationId].forEach(name => {
        console.log(`    - ${name}`);
      });
    });
    
    // 6. Validation
    console.log('\n6. Validation Results:');
    console.log('======================');
    
    const branch1Count = itemsByLocation[BRANCH_1_ID]?.length || 0;
    const branch2Count = itemsByLocation[BRANCH_2_ID]?.length || 0;
    const noLocationCount = itemsByLocation['NO_LOCATION']?.length || 0;
    
    console.log(`✅ Branch 1 has ${branch1Count} items (expected: 2)`);
    console.log(`✅ Branch 2 has ${branch2Count} items (expected: 2)`);
    
    if (noLocationCount > 0) {
      console.log(`⚠️  Found ${noLocationCount} items without locationId - this is a problem!`);
    } else {
      console.log(`✅ No items found without locationId`);
    }
    
    if (branch1Count === 2 && branch2Count === 2 && noLocationCount === 0) {
      console.log('\n🎉 BRANCH ISOLATION TEST PASSED! 🎉');
      console.log('Each branch has exactly the items it should have.');
    } else {
      console.log('\n❌ BRANCH ISOLATION TEST FAILED!');
      console.log('Branch contamination detected or missing locationId.');
    }
    
    // 7. Cleanup test data
    console.log('\n7. Cleaning up test data...');
    const cleanup = await db.collection(`tenants/${TEST_TENANT_ID}/menuItems`)
      .get();
    
    const batch = db.batch();
    cleanup.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleaned up ${cleanup.size} test items`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Run the test
testBranchIsolation().then(() => {
  console.log('\n🏁 Branch isolation test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
