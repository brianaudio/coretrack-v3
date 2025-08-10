// SIMPLE ENTERPRISE FIX - Run this in your browser console
// Go to http://localhost:3002, sign in, then run this script

console.log('🚀 SIMPLE ENTERPRISE FIX');

async function simpleEnterpriseFix() {
  try {
    // Use the browser's Firebase instance
    const firebase = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
    const firestore = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
    
    // Initialize Firebase with your config
    const firebaseConfig = {
      apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
      authDomain: "coretrack-inventory.firebaseapp.com",
      projectId: "coretrack-inventory",
      storageBucket: "coretrack-inventory.firebasestorage.app",
      messagingSenderId: "930028194991",
      appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
    };
    
    const app = firebase.initializeApp(firebaseConfig, 'fix-app');
    const db = firestore.getFirestore(app);
    
    // Create enterprise subscription for demo tenant
    const tenantId = 'demo-tenant';
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    const subscription = {
      tenantId: tenantId,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: endDate,
      currentUsage: {
        users: 1,
        locations: 1,
        products: 0,
        ordersThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };
    
    await firestore.setDoc(firestore.doc(db, 'subscriptions', tenantId), subscription);
    
    console.log('✅ FIXED! Refresh the page.');
    return true;
    
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Run it
simpleEnterpriseFix();
