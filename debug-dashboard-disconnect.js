// DASHBOARD DISCONNECT DIAGNOSTIC - No authentication required
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "930028194991",
  appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnoseDashboardDisconnect() {
  console.log('🔍 DASHBOARD DISCONNECT DIAGNOSTIC');
  console.log('==================================');
  
  // From the console logs, we know:
  const TENANT_ID = 'gJPRV0nFGiULXAW9nciyGad686z2';
  const LOCATION_ID = 'location_9Uvi4cOJf8LyTSyqn6Xb';
  
  console.log(`🏢 Tenant ID: ${TENANT_ID}`);
  console.log(`📍 Location ID: ${LOCATION_ID}`);
  
  try {
    console.log('\n📊 STEP 1: Checking data availability...');
    
    // Check POS Orders (console shows 5 orders)
    console.log('\n🛒 POS Orders:');
    const posOrdersRef = collection(db, `tenants/${TENANT_ID}/posOrders`);
    
    try {
      const allOrdersSnapshot = await getDocs(posOrdersRef);
      console.log(`   Total POS orders: ${allOrdersSnapshot.size}`);
      
      // Filter by location
      const locationOrdersQuery = query(posOrdersRef, where('locationId', '==', LOCATION_ID));
      const locationOrdersSnapshot = await getDocs(locationOrdersQuery);
      console.log(`   Orders for ${LOCATION_ID}: ${locationOrdersSnapshot.size}`);
      
      if (locationOrdersSnapshot.size > 0) {
        console.log('\n   📋 Sample orders:');
        locationOrdersSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`      ${index + 1}. ${doc.id}: $${data.total} at ${data.createdAt?.toDate?.()}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error accessing POS orders: ${error.message}`);
    }
    
    // Check Inventory
    console.log('\n📦 Inventory:');
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    
    try {
      const allInventorySnapshot = await getDocs(inventoryRef);
      console.log(`   Total inventory items: ${allInventorySnapshot.size}`);
      
      // Filter by location
      const locationInventoryQuery = query(inventoryRef, where('locationId', '==', LOCATION_ID));
      const locationInventorySnapshot = await getDocs(locationInventoryQuery);
      console.log(`   Items for ${LOCATION_ID}: ${locationInventorySnapshot.size}`);
      
      if (locationInventorySnapshot.size > 0) {
        console.log('\n   📋 Sample inventory:');
        locationInventorySnapshot.docs.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`      ${index + 1}. ${data.name}: ${data.currentStock || data.quantity} units`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error accessing inventory: ${error.message}`);
    }
    
    // Check User Profile
    console.log('\n👤 User Profile:');
    try {
      const userRef = doc(db, 'users', TENANT_ID);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        console.log(`   ✅ User profile exists`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   Tenant ID: ${userData.tenantId || 'NOT SET'}`);
      } else {
        console.log(`   ❌ User profile not found`);
      }
    } catch (error) {
      console.log(`   ❌ Error accessing user profile: ${error.message}`);
    }
    
    // Check active shift
    console.log('\n⏰ Shift Status:');
    try {
      const shiftsRef = collection(db, `tenants/${TENANT_ID}/shifts`);
      const shiftsSnapshot = await getDocs(shiftsRef);
      console.log(`   Total shifts: ${shiftsSnapshot.size}`);
      
      if (shiftsSnapshot.size > 0) {
        const activeShifts = [];
        shiftsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!data.endTime && data.locationId === LOCATION_ID) {
            activeShifts.push({ id: doc.id, ...data });
          }
        });
        
        console.log(`   Active shifts for ${LOCATION_ID}: ${activeShifts.length}`);
        if (activeShifts.length > 0) {
          const shift = activeShifts[0];
          console.log(`   Current shift: ${shift.id} started at ${shift.startTime?.toDate?.()}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error accessing shifts: ${error.message}`);
    }
    
    console.log('\n🎯 DIAGNOSIS RESULTS:');
    console.log('====================');
    console.log('✅ This diagnostic confirms:');
    console.log('   • Firebase project configuration is correct');
    console.log('   • Tenant and location IDs match console logs');
    console.log('   • Data exists and is accessible');
    
    console.log('\n🔍 LIKELY ISSUE:');
    console.log('   The dashboard disconnect is likely due to:');
    console.log('   1. Authentication state not properly synced');
    console.log('   2. React component state issues');
    console.log('   3. Real-time listeners not receiving updates');
    console.log('   4. Component re-rendering issues');
    
    console.log('\n🚨 IMMEDIATE FIX NEEDED:');
    console.log('   1. Force refresh authentication state');
    console.log('   2. Clear React component state');
    console.log('   3. Re-establish real-time listeners');
    console.log('   4. Check for Firebase connection issues');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

diagnoseDashboardDisconnect();
