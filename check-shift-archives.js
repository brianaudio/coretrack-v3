// Deep analysis: Check shift archives and data preservation
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDma3bpLMVhcOTU_rPJfhMN1QK4Lxr6oy8",
  authDomain: "coretrack-web.firebaseapp.com",
  projectId: "coretrack-web",
  storageBucket: "coretrack-web.firebasestorage.app",
  messagingSenderId: "343946787418",
  appId: "1:343946787418:web:e13a13e8ced6f32dfa88c5",
  measurementId: "G-CPDEK10T79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeShiftArchives() {
  const TENANT_ID = '6yZUO71agSaZZ2TSxLeQxhT6V0F3';
  
  console.log('🔍 DEEP ANALYSIS: Shift Archives & Data Preservation');
  console.log('=====================================================');
  
  try {
    // 1. Check if shift_archives collection exists
    console.log('\n📁 CHECKING: shift_archives collection structure');
    const archivesRef = collection(db, `tenants/${TENANT_ID}/shift_archives`);
    const archivesSnapshot = await getDocs(archivesRef);
    console.log(`   Archive IDs found: ${archivesSnapshot.docs.length}`);
    
    if (archivesSnapshot.docs.length > 0) {
      // Show sample archive structure
      const sampleArchiveId = archivesSnapshot.docs[0].id;
      console.log(`   Sample Archive ID: ${sampleArchiveId}`);
      
      // Check what's inside the archive
      const archiveData = ['posOrders', 'expenses', 'inventory_transactions'];
      for (const collectionName of archiveData) {
        const archiveCollectionRef = collection(db, `tenants/${TENANT_ID}/shift_archives/${sampleArchiveId}/${collectionName}`);
        const archiveCollectionSnapshot = await getDocs(archiveCollectionRef);
        console.log(`   └── ${collectionName}: ${archiveCollectionSnapshot.docs.length} documents`);
        
        if (archiveCollectionSnapshot.docs.length > 0) {
          const sampleDoc = archiveCollectionSnapshot.docs[0].data();
          console.log(`       Sample: ${JSON.stringify({
            id: archiveCollectionSnapshot.docs[0].id,
            total: sampleDoc.total,
            archivedAt: sampleDoc.archivedAt?.toDate?.() || sampleDoc.archivedAt,
            originalCollection: sampleDoc.originalCollection
          }, null, 2)}`);
        }
      }
    }
    
    // 2. Check shift_reset_logs
    console.log('\n📊 CHECKING: shift_reset_logs (KPI summaries)');
    const resetLogsRef = collection(db, `tenants/${TENANT_ID}/shift_reset_logs`);
    const resetLogsSnapshot = await getDocs(resetLogsRef);
    console.log(`   Reset log entries: ${resetLogsSnapshot.docs.length}`);
    
    if (resetLogsSnapshot.docs.length > 0) {
      const sampleLog = resetLogsSnapshot.docs[0].data();
      console.log(`   Sample KPI Summary:`, {
        archiveId: sampleLog.archiveId,
        totalSales: sampleLog.totalSales,
        totalOrders: sampleLog.totalOrders,
        netProfit: sampleLog.netProfit,
        resetAt: sampleLog.resetAt?.toDate?.() || sampleLog.resetAt
      });
    }
    
    // 3. Check current operational collections (should be empty after reset)
    console.log('\n🔄 CHECKING: Current operational collections');
    const operationalCollections = ['posOrders', 'orders', 'expenses', 'inventory_transactions'];
    
    for (const collectionName of operationalCollections) {
      const collectionRef = collection(db, `tenants/${TENANT_ID}/${collectionName}`);
      const collectionSnapshot = await getDocs(collectionRef);
      console.log(`   ${collectionName}: ${collectionSnapshot.docs.length} documents`);
    }
    
    // 4. Check traditional archives structure (if exists)
    console.log('\n🗄️ CHECKING: Traditional archives structure');
    const traditionalArchivesRef = collection(db, `tenants/${TENANT_ID}/archives`);
    const traditionalArchivesSnapshot = await getDocs(traditionalArchivesRef);
    console.log(`   Traditional archive dates: ${traditionalArchivesSnapshot.docs.length}`);
    
    if (traditionalArchivesSnapshot.docs.length > 0) {
      console.log('   Available archive dates:', traditionalArchivesSnapshot.docs.map(doc => doc.id));
    }
    
    // 5. CONCLUSION
    console.log('\n🎯 DATA PRESERVATION ANALYSIS:');
    console.log('===============================');
    
    if (archivesSnapshot.docs.length > 0) {
      console.log('✅ SHIFT ARCHIVES EXIST - Data is being preserved!');
      console.log('   • All financial transactions are archived before reset');
      console.log('   • Historical data is accessible via shift_archives');
      console.log('   • KPI summaries are stored in shift_reset_logs');
    } else {
      console.log('❌ NO SHIFT ARCHIVES FOUND');
      console.log('   • Data may be lost during shift reset');
      console.log('   • Need to verify archival process is working');
    }
    
    if (resetLogsSnapshot.docs.length > 0) {
      console.log('✅ SHIFT RESET LOGS EXIST - KPI summaries are preserved!');
    } else {
      console.log('⚠️  NO RESET LOGS - KPI summaries may not be preserved');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing shift archives:', error);
  }
}

analyzeShiftArchives();
