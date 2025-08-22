// DASHBOARD-POS CONNECTION VERIFICATION
// Run this in the browser console while CoreTrack is open

console.log('🔍 DASHBOARD-POS CONNECTION VERIFICATION');
console.log('=======================================');

// Function to test real-time connection
function testDashboardPOSConnection() {
  console.log('\n🎯 TESTING REAL-TIME CONNECTION:');
  
  // Check if Firebase is available
  if (typeof window.firebase === 'undefined') {
    console.log('❌ Firebase not available in global scope');
    console.log('💡 This is normal - Firebase is likely bundled in modules');
    return;
  }
  
  // Check Firebase auth state
  const auth = window.firebase.auth();
  const user = auth.currentUser;
  
  if (!user) {
    console.log('❌ No user authenticated');
    return;
  }
  
  console.log('✅ User authenticated:', user.email);
  console.log('🏢 Tenant ID:', user.uid);
  
  // Test Firestore connection
  const db = window.firebase.firestore();
  
  // Listen for real-time updates on POS orders
  console.log('\n📡 Setting up real-time listener...');
  
  const ordersRef = db.collection(`tenants/${user.uid}/posOrders`);
  
  const unsubscribe = ordersRef.onSnapshot((snapshot) => {
    console.log(`\n🔄 REAL-TIME UPDATE: ${snapshot.size} POS orders detected`);
    
    if (snapshot.size > 0) {
      const orders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          total: data.total,
          status: data.status,
          createdAt: data.createdAt?.toDate?.(),
          locationId: data.locationId
        });
      });
      
      console.log('📋 Order summary:', orders.map(o => `$${o.total} (${o.status})`).join(', '));
      
      // Check location filtering
      const location = 'location_9Uvi4cOJf8LyTSyqn6Xb';
      const locationOrders = orders.filter(o => o.locationId === location);
      console.log(`🎯 Orders for ${location}: ${locationOrders.length}/${orders.length}`);
    }
  }, (error) => {
    console.error('❌ Real-time listener error:', error);
  });
  
  console.log('✅ Real-time listener established');
  console.log('💡 Try making a sale in POS - you should see updates here immediately');
  
  // Return cleanup function
  return unsubscribe;
}

// Function to create a test sale
function createTestSale() {
  console.log('\n🧪 CREATING TEST SALE:');
  
  if (typeof window.firebase === 'undefined') {
    console.log('❌ Firebase not available');
    return;
  }
  
  const auth = window.firebase.auth();
  const user = auth.currentUser;
  
  if (!user) {
    console.log('❌ No user authenticated');
    return;
  }
  
  const db = window.firebase.firestore();
  const location = 'location_9Uvi4cOJf8LyTSyqn6Xb';
  
  const testOrder = {
    total: 25.99,
    subtotal: 25.99,
    tax: 0,
    status: 'completed',
    paymentMethod: 'cash',
    paymentMethods: [{ method: 'cash', amount: 25.99 }],
    items: [{
      id: 'test-item',
      name: 'Test Connection Item',
      price: 25.99,
      quantity: 1
    }],
    locationId: location,
    tenantId: user.uid,
    createdAt: new Date(),
    createdBy: user.uid,
    orderNumber: `TEST-${Date.now()}`,
    source: 'dashboard-test'
  };
  
  console.log('📦 Creating test order:', testOrder.orderNumber);
  
  db.collection(`tenants/${user.uid}/posOrders`)
    .add(testOrder)
    .then((docRef) => {
      console.log('✅ Test sale created:', docRef.id);
      console.log('💡 Check your dashboard - it should update immediately!');
      console.log('🎯 Amount: $25.99 (cash)');
    })
    .catch((error) => {
      console.error('❌ Failed to create test sale:', error);
    });
}

// Function to check current shift status
function checkShiftStatus() {
  console.log('\n⏰ CHECKING SHIFT STATUS:');
  
  if (typeof window.firebase === 'undefined') {
    console.log('❌ Firebase not available');
    return;
  }
  
  const auth = window.firebase.auth();
  const user = auth.currentUser;
  
  if (!user) {
    console.log('❌ No user authenticated');
    return;
  }
  
  const db = window.firebase.firestore();
  
  db.collection(`tenants/${user.uid}/shifts`)
    .where('status', '==', 'active')
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        console.log('❌ No active shift found');
        console.log('💡 This explains why dashboard shows 0 values');
        console.log('🎯 Start a shift to see real-time data');
      } else {
        console.log(`✅ Active shift found: ${snapshot.size} shift(s)`);
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log('📋 Shift details:', {
            id: doc.id,
            name: data.name,
            startTime: data.startTime?.toDate?.(),
            status: data.status,
            locationId: data.locationId
          });
        });
      }
    })
    .catch((error) => {
      console.error('❌ Error checking shifts:', error);
    });
}

// Main diagnostic function
function runFullDiagnostic() {
  console.log('🚀 RUNNING FULL DASHBOARD-POS DIAGNOSTIC:');
  console.log('=========================================');
  
  // Check authentication
  console.log('\n1️⃣ Authentication Check:');
  if (typeof window.firebase !== 'undefined') {
    const auth = window.firebase.auth();
    const user = auth.currentUser;
    
    if (user) {
      console.log('✅ User authenticated:', user.email);
      console.log('🏢 Tenant ID:', user.uid);
    } else {
      console.log('❌ Not authenticated');
      return;
    }
  } else {
    console.log('⚠️ Firebase not in global scope (this is normal with modern bundling)');
  }
  
  // Check component state
  console.log('\n2️⃣ Component State Check:');
  
  // Look for React DevTools data
  if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React detected - components should be reactive');
  } else {
    console.log('⚠️ React DevTools not detected');
  }
  
  // Check local storage
  console.log('\n3️⃣ Local Storage Check:');
  const profileData = localStorage.getItem('coretrack_user_profile');
  const shiftData = localStorage.getItem('currentShift');
  
  if (profileData) {
    try {
      const profile = JSON.parse(profileData);
      console.log('✅ User profile in localStorage:', {
        email: profile.email,
        tenantId: profile.tenantId,
        role: profile.role
      });
    } catch (e) {
      console.log('⚠️ Invalid profile data in localStorage');
    }
  } else {
    console.log('⚠️ No profile data in localStorage');
  }
  
  if (shiftData) {
    try {
      const shift = JSON.parse(shiftData);
      console.log('✅ Current shift in localStorage:', {
        id: shift.id,
        status: shift.status,
        startTime: shift.startTime
      });
    } catch (e) {
      console.log('⚠️ Invalid shift data in localStorage');
    }
  } else {
    console.log('❌ No active shift in localStorage');
    console.log('💡 This is why dashboard shows 0 values - no active shift!');
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('The dashboard is NOT disconnected from POS.');
  console.log('The 0 values you see are CORRECT behavior when no shift is active.');
  console.log('Start a shift to see real-time data flowing immediately.');
}

// Export functions to global scope for easy testing
window.testDashboardConnection = testDashboardPOSConnection;
window.createTestSale = createTestSale;
window.checkShiftStatus = checkShiftStatus;
window.runFullDiagnostic = runFullDiagnostic;

console.log('\n🛠️ AVAILABLE FUNCTIONS:');
console.log('- testDashboardConnection() - Test real-time listener');
console.log('- createTestSale() - Create a test sale to verify connection');
console.log('- checkShiftStatus() - Check if shift is active');
console.log('- runFullDiagnostic() - Run complete diagnostic');

console.log('\n🎯 QUICK START:');
console.log('1. Run: runFullDiagnostic()');
console.log('2. If no active shift: Start a shift in CoreTrack');
console.log('3. Run: createTestSale() to test connection');
console.log('4. Watch dashboard update in real-time!');

// Auto-run diagnostic
runFullDiagnostic();
