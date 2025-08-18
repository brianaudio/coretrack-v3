const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase config
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

async function quickCleanup() {
  console.log('🚀 Quick cleanup - removing test coffee items...\n');
  
  const TENANT_ID = 'gJPRV0nFGiULXAW9nciyGad686z2';

  try {
    // Just focus on orders first
    console.log('🗑️ Removing test orders...');
    const ordersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    const ordersSnapshot = await getDocs(ordersRef);
    
    let deleted = 0;
    const batch = [];
    
    ordersSnapshot.docs.forEach(orderDoc => {
      const orderData = orderDoc.data();
      const orderNumber = orderData.orderNumber || '';
      const items = orderData.items || [];
      
      // Check for test data (coffee or TEST in name)
      const hasTestData = orderNumber.includes('TEST') || 
                         items.some(item => item.name && item.name.toLowerCase().includes('coffee'));
      
      if (hasTestData) {
        batch.push(orderDoc.id);
        console.log(`   Found: ${orderNumber} - ${items.map(i => i.name).join(', ')}`);
      }
    });
    
    // Delete in parallel for speed
    await Promise.all(batch.map(orderId => 
      deleteDoc(doc(db, `tenants/${TENANT_ID}/orders`, orderId))
    ));
    
    console.log(`✅ Deleted ${batch.length} test orders`);
    console.log('🎉 Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickCleanup();
