/**
 * Live Sales Data Detective
 * Browser-based debugging to find where your sales data is stored
 */

import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

interface SampleDoc {
  id: string;
  locationId: string;
  total: number;
  createdAt: string;
  status: string;
  items: number;
}

interface InvestigationResult {
  collection: string;
  totalDocs: number;
  branchMatches: number;
  todayMatches: number;
  totalRevenue: number;
  sampleDocs: SampleDoc[];
}

export async function investigateSalesData(tenantId: string, branchId: string): Promise<InvestigationResult[]> {
  console.log('🕵️ SALES DETECTIVE: Starting investigation...');
  console.log(`🔍 Tenant: ${tenantId}`);
  console.log(`🏪 Branch: ${branchId}`);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = Timestamp.fromDate(today);
  
  // All possible collection patterns where sales data might be stored
  const collectionPatterns = [
    // Standard POS collections
    `tenants/${tenantId}/orders`,
    `tenants/${tenantId}/pos-orders`,
    `tenants/${tenantId}/pos_orders`,
    `tenants/${tenantId}/posOrders`,
    `tenants/${tenantId}/sales`,
    `tenants/${tenantId}/transactions`,
    
    // Location-specific collections
    `tenants/${tenantId}/locations/${branchId}/orders`,
    `tenants/${tenantId}/locations/${branchId}/sales`,
    `tenants/${tenantId}/locations/${branchId}/transactions`,
    
    // Alternative structures
    `orders`,
    `pos-orders`,
    `sales`,
    `transactions`,
    
    // Other possible patterns
    `tenants/${tenantId}/orderHistory`,
    `tenants/${tenantId}/completedOrders`,
    `tenants/${tenantId}/dailySales`
  ];
  
  const results = [];
  
  for (const collectionPath of collectionPatterns) {
    try {
      console.log(`🔍 Checking: ${collectionPath}`);
      
      // Try to get recent documents
      const collectionRef = collection(db, collectionPath);
      const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`✅ Found ${snapshot.size} documents in ${collectionPath}`);
        
        let branchMatches = 0;
        let todayMatches = 0;
        let totalRevenue = 0;
        
        const sampleDocs: SampleDoc[] = [];
        
        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          
          // Check for branch match
          const hasMatchingBranch = 
            data.locationId === branchId ||
            data.location === branchId ||
            data.branchId === branchId ||
            data.storeId === branchId;
          
          if (hasMatchingBranch) {
            branchMatches++;
            totalRevenue += (data.total || data.amount || 0);
          }
          
          // Check for today's data
          const createdAt = data.createdAt || data.timestamp || data.date;
          if (createdAt && createdAt.toDate) {
            const docDate = createdAt.toDate();
            if (docDate >= today) {
              todayMatches++;
            }
          }
          
          // Collect sample data
          if (index < 3) {
            sampleDocs.push({
              id: doc.id,
              locationId: data.locationId || data.location || data.branchId || 'none',
              total: data.total || data.amount || 0,
              createdAt: createdAt ? (createdAt.toDate ? createdAt.toDate().toISOString() : createdAt) : 'none',
              status: data.status || 'unknown',
              items: data.items ? data.items.length : 0
            });
          }
        });
        
        results.push({
          collection: collectionPath,
          totalDocs: snapshot.size,
          branchMatches,
          todayMatches,
          totalRevenue,
          sampleDocs
        });
        
        if (branchMatches > 0) {
          console.log(`🎯 FOUND BRANCH DATA! ${branchMatches} docs match your branch`);
          console.log(`💰 Revenue from matching docs: ₱${totalRevenue.toLocaleString()}`);
        }
        
        if (todayMatches > 0) {
          console.log(`📅 FOUND TODAY'S DATA! ${todayMatches} docs from today`);
        }
        
      } else {
        console.log(`❌ Empty: ${collectionPath}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`⚠️ Error accessing ${collectionPath}:`, errorMessage);
    }
  }
  
  // Summary report
  console.log('\n📊 INVESTIGATION SUMMARY:');
  console.log('==========================================');
  
  const collectionsWithData = results.filter(r => r.totalDocs > 0);
  const collectionsWithBranchData = results.filter(r => r.branchMatches > 0);
  const collectionsWithTodayData = results.filter(r => r.todayMatches > 0);
  
  console.log(`📂 Collections with data: ${collectionsWithData.length}`);
  console.log(`🏪 Collections with your branch data: ${collectionsWithBranchData.length}`);
  console.log(`📅 Collections with today's data: ${collectionsWithTodayData.length}`);
  
  if (collectionsWithBranchData.length > 0) {
    console.log('\n🎯 BRANCH DATA FOUND IN:');
    collectionsWithBranchData.forEach(result => {
      console.log(`   ${result.collection}: ${result.branchMatches} docs, ₱${result.totalRevenue.toLocaleString()}`);
    });
  }
  
  if (collectionsWithTodayData.length > 0) {
    console.log('\n📅 TODAY\'S DATA FOUND IN:');
    collectionsWithTodayData.forEach(result => {
      console.log(`   ${result.collection}: ${result.todayMatches} docs`);
    });
  }
  
  // Detailed results for collections with branch data
  if (collectionsWithBranchData.length > 0) {
    console.log('\n🔍 DETAILED ANALYSIS:');
    collectionsWithBranchData.forEach(result => {
      console.log(`\n📂 ${result.collection}:`);
      console.log(`   Branch matches: ${result.branchMatches}/${result.totalDocs}`);
      console.log(`   Revenue: ₱${result.totalRevenue.toLocaleString()}`);
      console.log('   Sample documents:');
      result.sampleDocs.forEach((doc, index) => {
        console.log(`      ${index + 1}. ${doc.id}: location=${doc.locationId}, total=₱${doc.total}, items=${doc.items}`);
      });
    });
  }
  
  return results;
}
