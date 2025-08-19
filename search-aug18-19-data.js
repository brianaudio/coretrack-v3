const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to initialize with default credentials or service account
    admin.initializeApp({
      projectId: 'coretrack-v3'
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.log('❌ Firebase Admin initialization failed:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();
const tenantId = 'gJPRV0nFGiULXAW9nciyGad686z2';

async function searchForAug18_19Data() {
  console.log('🔍 COMPREHENSIVE SEARCH FOR AUG 18-19 DATA');
  console.log('='.repeat(50));
  console.log(`Tenant ID: ${tenantId}`);
  console.log('Target Dates: August 18-19, 2025');
  console.log('');
  
  let totalOrdersFound = 0;
  let totalRevenue = 0;
  const foundOrders = [];
  
  // Helper function to check if date is Aug 18-19
  const isAug18_19 = (date) => {
    if (!date) return false;
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    return (day === 18 || day === 19) && month === 7 && year === 2025; // August is month 7 (0-indexed)
  };
  
  // 1. Check operational collections first
  console.log('📂 1. OPERATIONAL COLLECTIONS:');
  console.log('-'.repeat(30));
  
  const operationalPaths = [
    `tenants/${tenantId}/posOrders`,
    `tenants/${tenantId}/orders`,
    `tenants/${tenantId}/pos_orders`,
    `tenants/${tenantId}/completed_orders`
  ];
  
  for (const path of operationalPaths) {
    try {
      console.log(`  Checking: ${path}`);
      const ref = db.collection(path);
      const snapshot = await ref.get();
      
      const aug18_19Orders = [];
      snapshot.docs.forEach(doc => {
        const order = doc.data();
        const createdAt = order.createdAt?.toDate?.();
        if (isAug18_19(createdAt)) {
          aug18_19Orders.push({
            id: doc.id,
            ...order,
            createdAtDate: createdAt
          });
        }
      });
      
      if (aug18_19Orders.length > 0) {
        console.log(`    🎯 FOUND ${aug18_19Orders.length} Aug 18-19 orders!`);
        aug18_19Orders.forEach(order => {
          console.log(`      - ${order.id}: ₱${order.total} (${order.createdAtDate})`);
          foundOrders.push({ collection: path, ...order });
          totalOrdersFound++;
          totalRevenue += order.total || 0;
        });
      } else {
        console.log(`    Empty for Aug 18-19`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
  
  // 2. Check shift archives
  console.log('\n📂 2. SHIFT ARCHIVES:');
  console.log('-'.repeat(30));
  
  try {
    const archivesRef = db.collection(`tenants/${tenantId}/shift_archives`);
    const archivesSnapshot = await archivesRef.get();
    
    console.log(`  Found ${archivesSnapshot.docs.length} shift archives`);
    
    for (const archiveDoc of archivesSnapshot.docs) {
      const archiveId = archiveDoc.id;
      const archiveData = archiveDoc.data();
      
      console.log(`\n  📅 Archive: ${archiveId}`);
      
      const startTime = archiveData.startTime?.toDate?.();
      const endTime = archiveData.endTime?.toDate?.();
      
      if (startTime && endTime) {
        console.log(`    Period: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);
        
        // Check if this archive might contain Aug 18-19 data
        const mightContainAug18_19 = isAug18_19(startTime) || isAug18_19(endTime) ||
          (startTime.getDate() <= 19 && endTime.getDate() >= 18 && 
           startTime.getMonth() === 7 && endTime.getMonth() === 7);
        
        if (mightContainAug18_19) {
          console.log(`    🎯 POTENTIAL Aug 18-19 archive!`);
          
          // Check posOrders in this archive
          const posOrdersRef = db.collection(`tenants/${tenantId}/shift_archives/${archiveId}/posOrders`);
          const posOrdersSnapshot = await posOrdersRef.get();
          
          console.log(`    📋 Archive contains ${posOrdersSnapshot.docs.length} posOrders`);
          
          const aug18_19Orders = [];
          posOrdersSnapshot.docs.forEach(doc => {
            const order = doc.data();
            const createdAt = order.createdAt?.toDate?.();
            if (isAug18_19(createdAt)) {
              aug18_19Orders.push({
                id: doc.id,
                ...order,
                createdAtDate: createdAt
              });
            }
          });
          
          if (aug18_19Orders.length > 0) {
            console.log(`      🎯 FOUND ${aug18_19Orders.length} Aug 18-19 orders in archive!`);
            aug18_19Orders.forEach(order => {
              console.log(`        - ${order.id}: ₱${order.total} (${order.createdAtDate})`);
              foundOrders.push({ collection: `shift_archives/${archiveId}/posOrders`, ...order });
              totalOrdersFound++;
              totalRevenue += order.total || 0;
            });
          }
        } else {
          console.log(`    Skipping - outside Aug 18-19 range`);
        }
      }
    }
  } catch (error) {
    console.log(`  ❌ Error checking shift archives: ${error.message}`);
  }
  
  // 3. Check date-based archives
  console.log('\n📂 3. DATE-BASED ARCHIVES:');
  console.log('-'.repeat(30));
  
  const dateArchivePaths = [
    `tenants/${tenantId}/archives/2025-08-18/posOrders`,
    `tenants/${tenantId}/archives/2025-08-19/posOrders`,
    `archives/2025-08-18/tenants/${tenantId}/posOrders`,
    `archives/2025-08-19/tenants/${tenantId}/posOrders`,
    `archives/2025-08-18/locations/main-location-${tenantId}/posOrders`,
    `archives/2025-08-19/locations/main-location-${tenantId}/posOrders`
  ];
  
  for (const path of dateArchivePaths) {
    try {
      console.log(`  Checking: ${path}`);
      const ref = db.collection(path);
      const snapshot = await ref.get();
      
      if (snapshot.docs.length > 0) {
        console.log(`    🎯 FOUND ${snapshot.docs.length} orders in date archive!`);
        snapshot.docs.forEach(doc => {
          const order = doc.data();
          const createdAt = order.createdAt?.toDate?.();
          console.log(`      - ${doc.id}: ₱${order.total || 0} (${createdAt || 'No date'})`);
          foundOrders.push({ collection: path, id: doc.id, ...order });
          totalOrdersFound++;
          totalRevenue += order.total || 0;
        });
      } else {
        console.log(`    Empty`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
  
  // 4. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SEARCH SUMMARY:');
  console.log('='.repeat(50));
  
  if (totalOrdersFound > 0) {
    console.log(`✅ FOUND ${totalOrdersFound} Aug 18-19 orders`);
    console.log(`💰 Total Revenue: ₱${totalRevenue.toLocaleString()}`);
    console.log('\n📋 DETAILED BREAKDOWN:');
    
    foundOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. Order ${order.id}`);
      console.log(`     Collection: ${order.collection}`);
      console.log(`     Amount: ₱${order.total || 0}`);
      console.log(`     Date: ${order.createdAtDate || order.createdAt?.toDate?.() || 'No date'}`);
      console.log(`     Status: ${order.status || 'unknown'}`);
      console.log('');
    });
  } else {
    console.log('❌ NO Aug 18-19 data found in any location');
    console.log('\n💡 POSSIBLE REASONS:');
    console.log('   1. Data was never created (no sales on Aug 18-19)');
    console.log('   2. Data exists in different tenant/location');
    console.log('   3. Data was deleted or corrupted');
    console.log('   4. Archive process moved data to unexpected location');
  }
  
  console.log('\n🔍 NEXT STEPS:');
  if (totalOrdersFound > 0) {
    console.log('   1. Update BusinessReports to include archive collections');
    console.log('   2. Consider implementing historical data recovery');
  } else {
    console.log('   1. Check if transactions were recorded in different system');
    console.log('   2. Verify actual sales occurred on Aug 18-19');
    console.log('   3. Check backup systems or export logs');
  }
}

// Run the search
searchForAug18_19Data()
  .then(() => {
    console.log('\n✅ Search completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Search failed:', error);
    process.exit(1);
  });
