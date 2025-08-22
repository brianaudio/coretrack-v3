#!/usr/bin/env node

/**
 * Live Sales Data Investigation
 * Check what's happening with the SMS branch data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'coretrack-inventory'
  });
}

const db = admin.firestore();

async function investigateLiveSalesData() {
  console.log('🔍 Investigating live sales data for SMS branch...');
  
  const TENANT_ID = 'gJPRV0nFGiULXAW9nciyGad686z2';
  const BRANCH_ID = '9Uvi4cOJf8LyTSyqn6Xb';
  const BRANCH_NAME = 'SMS';
  
  console.log(`\n📋 Checking data for:`);
  console.log(`   Tenant: ${TENANT_ID}`);
  console.log(`   Branch: ${BRANCH_NAME} (${BRANCH_ID})`);
  
  try {
    // Check all possible collection patterns
    const collectionPatterns = [
      // Standard patterns
      `tenants/${TENANT_ID}/orders`,
      `tenants/${TENANT_ID}/expenses`,  
      `tenants/${TENANT_ID}/inventory`,
      `tenants/${TENANT_ID}/menuItems`,
      `tenants/${TENANT_ID}/pos-orders`,
      `tenants/${TENANT_ID}/pos_orders`,
      `tenants/${TENANT_ID}/posOrders`,
      
      // Location-specific patterns
      `tenants/${TENANT_ID}/locations/${BRANCH_ID}/orders`,
      `tenants/${TENANT_ID}/locations/${BRANCH_ID}/pos-orders`,
      `tenants/${TENANT_ID}/locations/${BRANCH_ID}/sales`,
      `tenants/${TENANT_ID}/locations/${BRANCH_ID}/transactions`,
      
      // Alternative patterns
      `orders`,
      `pos-orders`,
      `sales`,
      `transactions`
    ];
    
    console.log('\n🔍 Scanning all possible collection patterns...');
    
    for (const pattern of collectionPatterns) {
      try {
        console.log(`\n📂 Checking: ${pattern}`);
        
        const snapshot = await db.collection(pattern).limit(10).get();
        
        if (!snapshot.empty) {
          console.log(`   ✅ Found ${snapshot.size} documents!`);
          
          // Check for location filtering
          let locationFiltered = 0;
          let todayRecords = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Check location match
            const hasLocation = data.location === BRANCH_ID || 
                              data.locationId === BRANCH_ID ||
                              data.branchId === BRANCH_ID ||
                              data.storeId === BRANCH_ID;
            
            if (hasLocation) {
              locationFiltered++;
            }
            
            // Check if today's data
            let isToday = false;
            if (data.createdAt || data.timestamp || data.date) {
              const recordDate = (data.createdAt || data.timestamp || data.date).toDate ? 
                (data.createdAt || data.timestamp || data.date).toDate() : 
                new Date(data.createdAt || data.timestamp || data.date);
              
              if (recordDate >= today) {
                isToday = true;
                todayRecords++;
              }
            }
            
            // Sample first document
            if (doc === snapshot.docs[0]) {
              console.log(`   📄 Sample document:`, {
                id: doc.id,
                location: data.location || data.locationId || data.branchId || 'none',
                date: data.createdAt || data.timestamp || data.date || 'none',
                isToday,
                hasMatchingLocation: hasLocation
              });
            }
          });
          
          console.log(`   📊 Analysis:`);
          console.log(`      - Total documents: ${snapshot.size}`);
          console.log(`      - Matching branch: ${locationFiltered}`);
          console.log(`      - Today's records: ${todayRecords}`);
          
          if (locationFiltered > 0) {
            console.log(`   🎯 FOUND DATA FOR YOUR BRANCH!`);
          }
          
        } else {
          console.log(`   ❌ Empty collection`);
        }
        
      } catch (error) {
        console.log(`   ⚠️  Error accessing: ${error.message}`);
      }
    }
    
    // Check today's activity specifically
    console.log('\n📅 Checking today\'s activity across all collections...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayChecks = [
      `tenants/${TENANT_ID}/orders`,
      `tenants/${TENANT_ID}/pos-orders`,
      `orders`,
      `pos-orders`,
      `sales`,
      `transactions`
    ];
    
    for (const collection of todayChecks) {
      try {
        const snapshot = await db.collection(collection)
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
          .limit(20)
          .get();
          
        if (!snapshot.empty) {
          console.log(`\n💰 Found ${snapshot.size} today's records in ${collection}:`);
          
          snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            if (index < 3) { // Show first 3
              console.log(`   ${index + 1}. ${doc.id}: location=${data.location || data.locationId || 'none'}, amount=${data.total || data.amount || 'none'}`);
            }
          });
        }
      } catch (error) {
        console.log(`   ⚠️  Error checking today's ${collection}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
  
  console.log('\n🔍 Investigation complete!');
  process.exit(0);
}

investigateLiveSalesData();
