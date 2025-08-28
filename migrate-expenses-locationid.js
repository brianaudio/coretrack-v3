/**
 * Migration Script: Add locationId to existing expenses
 * 
 * This script fixes the expense branch isolation issue by:
 * 1. Finding all expenses without locationId
 * 2. Adding a default locationId based on your current branch
 * 3. Ensuring proper branch isolation for expenses
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

// Your tenant ID and branch locationId from the logs
const TENANT_ID = '6yZUO71agSaZZ2TSxLeQxhT6V0F3';
const DEFAULT_LOCATION_ID = 'location_6cwvUakzskIHbTHDYv5E'; // From your logs

async function migrateExpenses() {
  try {
    console.log('🔧 Starting expense locationId migration...');
    
    // Get all expenses for this tenant
    const expensesRef = db.collection(`tenants/${TENANT_ID}/expenses`);
    const snapshot = await expensesRef.get();
    
    console.log(`📋 Found ${snapshot.size} expense documents to check`);
    
    let updatedCount = 0;
    let alreadyHasLocationId = 0;
    
    // Process each expense document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (!data.locationId) {
        // Add locationId to expenses that don't have it
        await doc.ref.update({
          locationId: DEFAULT_LOCATION_ID,
          updatedAt: admin.firestore.Timestamp.now()
        });
        
        updatedCount++;
        console.log(`✅ Updated expense: ${doc.id} - "${data.title}"`);
      } else {
        alreadyHasLocationId++;
        console.log(`✓ Expense already has locationId: ${doc.id} - "${data.title}" (${data.locationId})`);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Updated expenses: ${updatedCount}`);
    console.log(`✓ Already had locationId: ${alreadyHasLocationId}`);
    console.log(`📊 Total processed: ${snapshot.size}`);
    
    // Test the query to make sure it works now
    console.log('\n🧪 Testing branch-isolated expense query...');
    const testQuery = expensesRef.where('locationId', '==', DEFAULT_LOCATION_ID);
    const testSnapshot = await testQuery.get();
    
    console.log(`✅ Branch-isolated query successful: ${testSnapshot.size} expenses found for location ${DEFAULT_LOCATION_ID}`);
    
    return {
      totalProcessed: snapshot.size,
      updated: updatedCount,
      alreadyHadLocationId: alreadyHasLocationId,
      testQueryResults: testSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateExpenses()
  .then((results) => {
    console.log('\n🎯 Migration Results:', results);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });
