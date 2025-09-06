/**
 * Simple Firebase POS Orders Test
 * Run this in browser console on POS page to analyze orders
 */

// Test function to check POS orders
async function testPOSOrders() {
  try {
    console.log('🔍 Testing POS Orders Firebase Integration...\n');
    
    // Check if Firebase is available
    if (typeof window === 'undefined') {
      console.log('❌ This test should be run in browser console');
      return;
    }
    
    // Access Firebase through the window object (if available)
    const { db } = await import('/src/lib/firebase.js');
    const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
    
    console.log('✅ Firebase modules loaded');
    
    // Get current user context (you may need to adjust this)
    const tenantId = 'your-tenant-id'; // Replace with actual tenant ID
    
    console.log(`📊 Checking orders for tenant: ${tenantId}`);
    
    // Query recent orders
    const ordersRef = collection(db, 'tenants', tenantId, 'pos_orders');
    const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(5));
    const snapshot = await getDocs(ordersQuery);
    
    console.log(`📋 Found ${snapshot.docs.length} recent orders\n`);
    
    if (snapshot.docs.length > 0) {
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Order ${index + 1}:`);
        console.log(`├── ID: ${doc.id}`);
        console.log(`├── Order #: ${data.orderNumber}`);
        console.log(`├── Status: ${data.status}`);
        console.log(`├── Total: ₱${data.total}`);
        console.log(`├── Items: ${data.items?.length || 0}`);
        console.log(`├── Location: ${data.locationId}`);
        console.log(`└── Created: ${data.createdAt?.toDate?.()}\n`);
      });
    } else {
      console.log('❌ No orders found. This could mean:');
      console.log('   1. No orders have been created yet');
      console.log('   2. Orders are being saved to a different tenant');
      console.log('   3. There\'s an issue with the Firebase save process');
    }
    
  } catch (error) {
    console.error('❌ Error testing POS orders:', error);
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Check if you\'re logged in');
    console.log('   2. Verify the tenant ID is correct');
    console.log('   3. Check Firebase console for data');
    console.log('   4. Check browser network tab for failed requests');
  }
}

// Test order creation process
async function testOrderCreation() {
  try {
    console.log('🧪 Testing Order Creation Process...\n');
    
    // Mock order data
    const testOrder = {
      items: [
        {
          itemId: 'test-item-1',
          name: 'Test Coffee',
          price: 150,
          quantity: 1,
          total: 150
        }
      ],
      subtotal: 150,
      total: 150,
      orderType: 'dine-in',
      paymentMethod: 'cash',
      tenantId: 'your-tenant-id', // Replace with actual tenant ID
      locationId: 'your-location-id', // Replace with actual location ID
      status: 'completed'
    };
    
    console.log('📝 Test order data:', testOrder);
    
    // Import the createPOSOrder function
    const { createPOSOrder } = await import('/src/lib/firebase/pos.js');
    
    console.log('🚀 Attempting to create test order...');
    
    const orderId = await createPOSOrder(testOrder);
    
    console.log(`✅ Test order created successfully!`);
    console.log(`📋 Order ID: ${orderId}`);
    
    return orderId;
    
  } catch (error) {
    console.error('❌ Error creating test order:', error);
    
    if (error.message.includes('permission')) {
      console.log('🔒 Permission denied - check Firestore rules');
    } else if (error.message.includes('network')) {
      console.log('🌐 Network error - check internet connection');
    } else {
      console.log('🐛 Unexpected error - check console for details');
    }
  }
}

// Export functions for console use
if (typeof window !== 'undefined') {
  window.testPOSOrders = testPOSOrders;
  window.testOrderCreation = testOrderCreation;
  console.log('🎯 Test functions available:');
  console.log('   - testPOSOrders() - Check existing orders');
  console.log('   - testOrderCreation() - Create a test order');
}
