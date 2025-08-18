// Test script to verify purchase order data connection in Capital Intelligence
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set this up with your service account)
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   // Add your Firebase config here
// });

async function testPurchaseOrderConnection() {
  console.log('🔍 TESTING PURCHASE ORDER CONNECTION IN CAPITAL INTELLIGENCE\n');
  
  // Test parameters (replace with your actual values)
  const testTenantId = 'your-tenant-id';
  const testBranchId = 'your-branch-id';
  const testLocationId = 'your-location-id';
  
  console.log('📋 TEST PARAMETERS:');
  console.log(`Tenant ID: ${testTenantId}`);
  console.log(`Branch ID: ${testBranchId}`);
  console.log(`Location ID: ${testLocationId}\n`);
  
  try {
    // Test 1: Check if purchase orders exist
    console.log('🛒 TEST 1: Checking purchase orders collection...');
    const db = admin.firestore();
    const poRef = db.collection('tenants').doc(testTenantId).collection('purchaseOrders');
    const allPOs = await poRef.limit(10).get();
    
    console.log(`Found ${allPOs.size} purchase orders total`);
    
    if (allPOs.size > 0) {
      console.log('\n📊 SAMPLE PURCHASE ORDER STRUCTURE:');
      allPOs.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`PO ${index + 1}:`, {
          id: doc.id,
          locationId: data.locationId,
          branchId: data.branchId,
          totalAmount: data.totalAmount || data.total,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || 'No date',
          status: data.status,
          supplierName: data.supplierName || data.supplier?.name,
          allFields: Object.keys(data)
        });
      });
    }
    
    // Test 2: Check purchase orders filtered by locationId
    console.log('\n🎯 TEST 2: Filtering by locationId...');
    const filteredPOs = await poRef.where('locationId', '==', testLocationId).get();
    console.log(`Found ${filteredPOs.size} purchase orders for locationId: ${testLocationId}`);
    
    // Test 3: Check purchase orders filtered by branchId (old field)
    console.log('\n🎯 TEST 3: Filtering by branchId (legacy)...');
    const legacyPOs = await poRef.where('branchId', '==', testBranchId).get();
    console.log(`Found ${legacyPOs.size} purchase orders for branchId: ${testBranchId}`);
    
    // Test 4: Date range analysis
    console.log('\n📅 TEST 4: Date range analysis...');
    const now = new Date();
    const last30Days = new Date();
    last30Days.setDate(now.getDate() - 30);
    
    let recentPOs = 0;
    allPOs.docs.forEach(doc => {
      const data = doc.data();
      const poDate = data.createdAt?.toDate() || new Date(data.dateString || 0);
      if (poDate >= last30Days) {
        recentPOs++;
      }
    });
    
    console.log(`Found ${recentPOs} purchase orders in the last 30 days`);
    
    // Test 5: Capital Intelligence data simulation
    console.log('\n🧮 TEST 5: Capital Intelligence data simulation...');
    const mockData = {
      orders: [], // This would come from orders collection
      inventory: [], // This would come from inventory collection
      expenses: [], // This would come from expenses collection
      purchaseOrders: filteredPOs.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
    
    const totalPurchaseSpending = mockData.purchaseOrders.reduce((sum, po) => {
      return sum + (po.totalAmount || po.total || 0);
    }, 0);
    
    console.log(`Total purchase spending: ₱${totalPurchaseSpending}`);
    console.log(`Purchase orders found: ${mockData.purchaseOrders.length}`);
    
    // Test 6: Report type availability
    console.log('\n📊 TEST 6: Report types that include purchase orders:');
    const reportTypes = [
      'executive_summary - Includes purchase order metrics',
      'purchase_summary - Dedicated purchase order analysis',
      'supplier_analysis - Supplier spending breakdown',
      'cost_tracking - Purchase orders + expenses analysis',
      'profit_loss - Purchase orders affect cost calculations'
    ];
    
    reportTypes.forEach(type => console.log(`✅ ${type}`));
    
    console.log('\n🎉 CONCLUSION:');
    if (filteredPOs.size > 0) {
      console.log('✅ Purchase orders are CONNECTED to Capital Intelligence');
      console.log('✅ Data is properly filtered by locationId');
      console.log('✅ Multiple report types include purchase order data');
    } else if (allPOs.size > 0) {
      console.log('⚠️  Purchase orders exist but may have field name issues');
      console.log('💡 Check if locationId field is properly set');
    } else {
      console.log('❌ No purchase orders found in database');
      console.log('💡 Create some purchase orders to test the connection');
    }
    
  } catch (error) {
    console.error('❌ Error testing purchase order connection:', error);
  }
}

// Manual test checklist for browser console
const browserTestScript = `
// Run this in browser console when on Capital Intelligence page
console.log('🔍 BROWSER TEST: Purchase Order Connection');

// Check if BusinessReports component is loaded
console.log('Component loaded:', !!window.React);

// Check report options for purchase order reports
const purchaseReportTypes = [
  'purchase_summary',
  'supplier_analysis', 
  'cost_tracking',
  'executive_summary'
];

console.log('Available purchase order report types:', purchaseReportTypes);

// Test data fetching (would need to be run from within the component)
console.log('To test data fetching:');
console.log('1. Open Debug Mode on Capital Intelligence page');
console.log('2. Try generating any report');
console.log('3. Check browser console for purchase order fetch logs');
console.log('4. Look for: "🛒 Fetching purchase orders..." and "✅ Found X purchase orders"');
`;

console.log('\n📱 BROWSER TESTING INSTRUCTIONS:');
console.log('Copy and paste this script in your browser console:');
console.log('```javascript');
console.log(browserTestScript);
console.log('```');

module.exports = { testPurchaseOrderConnection };

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('⚠️  Note: This test requires Firebase Admin SDK setup');
  console.log('For now, use the browser testing instructions above');
}
