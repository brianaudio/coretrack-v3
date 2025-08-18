const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, addDoc, Timestamp } = require('firebase/firestore');

// Firebase config (using your existing config)
const firebaseConfig = {
  apiKey: "AIzaSyC6oGC0LZhJhhtw4qVYDkaBfn72cXFb2l0",
  authDomain: "coretrack-inventory-v3.firebaseapp.com",
  projectId: "coretrack-inventory-v3",
  storageBucket: "coretrack-inventory-v3.firebasestorage.app",
  messagingSenderId: "779718005742",
  appId: "1:779718005742:web:4c0b8ba2f18d8e12ee6e47",
  measurementId: "G-6T30YWD95N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testOrdersData() {
  console.log('🔍 Testing Orders Data...\n');
  
  const TENANT_ID = 'tenant_9zGPtQzGx5g5VpRfKCgN';
  const LOCATION_ID = 'location_7fJFKQrxc8KKKCCsUyVt';
  
  try {
    // Check if there are any orders in the tenant collection
    console.log('1. Checking all orders for tenant...');
    const allOrdersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    const allOrdersSnapshot = await getDocs(allOrdersRef);
    
    console.log(`📦 Total orders found: ${allOrdersSnapshot.docs.length}`);
    
    if (allOrdersSnapshot.docs.length > 0) {
      const sampleOrder = allOrdersSnapshot.docs[0].data();
      console.log('📦 Sample order structure:', JSON.stringify(sampleOrder, null, 2));
    }
    
    // Check orders for specific location
    console.log('\n2. Checking orders for specific location...');
    const locationOrdersQuery = query(
      allOrdersRef,
      where('locationId', '==', LOCATION_ID)
    );
    const locationOrdersSnapshot = await getDocs(locationOrdersQuery);
    console.log(`📍 Orders for location ${LOCATION_ID}: ${locationOrdersSnapshot.docs.length}`);
    
    // Check recent orders (last 24 hours)
    console.log('\n3. Checking recent orders (last 24 hours)...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentOrdersQuery = query(
      allOrdersRef,
      where('createdAt', '>=', Timestamp.fromDate(yesterday))
    );
    const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
    console.log(`⏰ Recent orders: ${recentOrdersSnapshot.docs.length}`);
    
    // If no orders exist, create a test order
    if (allOrdersSnapshot.docs.length === 0) {
      console.log('\n4. Creating test order...');
      const testOrder = {
        orderNumber: 'TEST001',
        items: [
          {
            itemId: 'test-item-1',
            name: 'Test Coffee',
            price: 150,
            quantity: 2,
            total: 300
          }
        ],
        total: 300,
        subtotal: 300,
        tax: 0,
        status: 'completed',
        paymentMethod: 'cash',
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(allOrdersRef, testOrder);
      console.log('✅ Test order created with ID:', docRef.id);
    }
    
  } catch (error) {
    console.error('❌ Error testing orders:', error);
  }
}

testOrdersData();
