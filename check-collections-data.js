// URGENT: Check what data exists in both orders collections
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkCollectionsData() {
  const TENANT_ID = '6yZUO71agSaZZ2TSxLeQxhT6V0F3'; // Your tenant ID
  
  console.log('🚨 URGENT COLLECTION DATA CHECK');
  console.log('================================');
  
  try {
    // Check orders collection
    console.log('\n📋 CHECKING: tenants/orders collection');
    const ordersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    const ordersSnapshot = await getDocs(ordersRef);
    console.log(`   Count: ${ordersSnapshot.docs.length} documents`);
    
    if (ordersSnapshot.docs.length > 0) {
      const sampleOrder = ordersSnapshot.docs[0].data();
      console.log('   Sample document:', {
        id: ordersSnapshot.docs[0].id,
        total: sampleOrder.total,
        paymentMethod: sampleOrder.paymentMethod,
        status: sampleOrder.status,
        createdAt: sampleOrder.createdAt?.toDate?.() || sampleOrder.createdAt
      });
    }
    
    // Check posOrders collection  
    console.log('\n📋 CHECKING: tenants/posOrders collection');
    const posOrdersRef = collection(db, `tenants/${TENANT_ID}/posOrders`);
    const posOrdersSnapshot = await getDocs(posOrdersRef);
    console.log(`   Count: ${posOrdersSnapshot.docs.length} documents`);
    
    if (posOrdersSnapshot.docs.length > 0) {
      const samplePosOrder = posOrdersSnapshot.docs[0].data();
      console.log('   Sample document:', {
        id: posOrdersSnapshot.docs[0].id,
        total: samplePosOrder.total,
        paymentMethod: samplePosOrder.paymentMethod,
        status: samplePosOrder.status,
        createdAt: samplePosOrder.createdAt?.toDate?.() || samplePosOrder.createdAt
      });
    }
    
    console.log('\n🚨 CONCLUSION:');
    if (ordersSnapshot.docs.length > 0 && posOrdersSnapshot.docs.length > 0) {
      console.log('❌ BOTH COLLECTIONS HAVE DATA - We have a split data problem!');
    } else if (ordersSnapshot.docs.length > 0) {
      console.log('⚠️  Only "orders" collection has data');
    } else if (posOrdersSnapshot.docs.length > 0) {
      console.log('⚠️  Only "posOrders" collection has data');
    } else {
      console.log('✅ Neither collection has data yet');
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error);
  }
}

checkCollectionsData();
