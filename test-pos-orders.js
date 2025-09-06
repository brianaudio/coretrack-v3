/**
 * Test script to analyze POS orders in Firebase
 * This will help diagnose if orders are being saved properly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Firebase config (use your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzePOSOrders() {
  try {
    console.log('🔍 Analyzing POS Orders in Firebase...\n');
    
    // Get all tenants to check their orders
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    console.log(`📊 Found ${tenantsSnapshot.docs.length} tenants\n`);
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      console.log(`🏢 Tenant: ${tenantData.name || tenantId}`);
      console.log(`📍 Tenant ID: ${tenantId}`);
      
      try {
        // Check POS orders for this tenant
        const ordersRef = collection(db, 'tenants', tenantId, 'pos_orders');
        const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        console.log(`📋 Recent Orders: ${ordersSnapshot.docs.length}`);
        
        if (ordersSnapshot.docs.length > 0) {
          console.log('\n📝 Recent Order Details:');
          ordersSnapshot.docs.forEach((orderDoc, index) => {
            const orderData = orderDoc.data();
            console.log(`\n   Order ${index + 1}:`);
            console.log(`   ├── ID: ${orderDoc.id}`);
            console.log(`   ├── Order #: ${orderData.orderNumber || 'N/A'}`);
            console.log(`   ├── Status: ${orderData.status || 'N/A'}`);
            console.log(`   ├── Total: ₱${orderData.total || 0}`);
            console.log(`   ├── Items: ${orderData.items?.length || 0}`);
            console.log(`   ├── Location ID: ${orderData.locationId || 'N/A'}`);
            console.log(`   ├── Payment Method: ${orderData.paymentMethod || 'N/A'}`);
            console.log(`   └── Created: ${orderData.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}`);
            
            if (orderData.items && orderData.items.length > 0) {
              console.log(`   └── Order Items:`);
              orderData.items.forEach((item, itemIndex) => {
                console.log(`        ${itemIndex + 1}. ${item.name} x${item.quantity} = ₱${item.total}`);
              });
            }
          });
        } else {
          console.log('   ❌ No orders found for this tenant');
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        
      } catch (error) {
        console.log(`   ❌ Error checking orders for tenant ${tenantId}:`, error.message);
        console.log('\n' + '='.repeat(60) + '\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error analyzing POS orders:', error);
  }
}

// Additional function to check specific tenant orders
async function checkSpecificTenant(tenantId) {
  try {
    console.log(`🔍 Checking specific tenant: ${tenantId}\n`);
    
    // Get recent orders
    const ordersRef = collection(db, 'tenants', tenantId, 'pos_orders');
    const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(20));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    console.log(`📋 Total Orders Found: ${ordersSnapshot.docs.length}\n`);
    
    // Group by location
    const ordersByLocation = {};
    ordersSnapshot.docs.forEach(doc => {
      const orderData = doc.data();
      const locationId = orderData.locationId || 'unknown';
      if (!ordersByLocation[locationId]) {
        ordersByLocation[locationId] = [];
      }
      ordersByLocation[locationId].push({ id: doc.id, ...orderData });
    });
    
    console.log('📍 Orders by Location:');
    Object.entries(ordersByLocation).forEach(([locationId, orders]) => {
      console.log(`\n   Location: ${locationId}`);
      console.log(`   Orders: ${orders.length}`);
      
      orders.slice(0, 3).forEach((order, index) => {
        console.log(`   └── ${index + 1}. Order #${order.orderNumber} - ₱${order.total} (${order.status})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking specific tenant:', error);
  }
}

// Run the analysis
console.log('🚀 Starting POS Orders Analysis...\n');
analyzePOSOrders().then(() => {
  console.log('✅ Analysis complete!');
}).catch(error => {
  console.error('❌ Analysis failed:', error);
});

export { analyzePOSOrders, checkSpecificTenant };
