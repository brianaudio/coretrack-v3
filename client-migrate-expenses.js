/**
 * Client-Side Migration: Add locationId to existing expenses
 * 
 * This script runs in the browser and fixes the expense branch isolation issue.
 * Run this in your browser console on the dashboard page.
 */

(async function migrateExpenses() {
  console.log('🔧 Starting client-side expense locationId migration...');
  
  try {
    // Import Firebase modules (assuming they're already loaded)
    const { db } = window; // Assuming Firebase db is available globally
    const { collection, getDocs, doc, updateDoc, query, Timestamp } = await import('firebase/firestore');
    
    // Your tenant ID and branch locationId from the logs
    const TENANT_ID = '6yZUO71agSaZZ2TSxLeQxhT6V0F3';
    const DEFAULT_LOCATION_ID = 'location_6cwvUakzskIHbTHDYv5E'; // From your logs
    
    // Get all expenses for this tenant
    const expensesRef = collection(db, `tenants/${TENANT_ID}/expenses`);
    const snapshot = await getDocs(expensesRef);
    
    console.log(`📋 Found ${snapshot.size} expense documents to check`);
    
    let updatedCount = 0;
    let alreadyHasLocationId = 0;
    
    // Process each expense document
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      if (!data.locationId) {
        // Add locationId to expenses that don't have it
        const docRef = doc(db, `tenants/${TENANT_ID}/expenses`, docSnap.id);
        await updateDoc(docRef, {
          locationId: DEFAULT_LOCATION_ID,
          updatedAt: Timestamp.now()
        });
        
        updatedCount++;
        console.log(`✅ Updated expense: ${docSnap.id} - "${data.title}"`);
      } else {
        alreadyHasLocationId++;
        console.log(`✓ Expense already has locationId: ${docSnap.id} - "${data.title}" (${data.locationId})`);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Updated expenses: ${updatedCount}`);
    console.log(`✓ Already had locationId: ${alreadyHasLocationId}`);
    console.log(`📊 Total processed: ${snapshot.size}`);
    
    return {
      totalProcessed: snapshot.size,
      updated: updatedCount,
      alreadyHadLocationId: alreadyHasLocationId
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
})();
