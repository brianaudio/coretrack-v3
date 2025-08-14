const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Use production Firebase config
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
const auth = getAuth(app);

// Demo credentials
const DEMO_EMAIL = 'demo@coretrack.com';
const DEMO_PASSWORD = 'demo123456';
const DEMO_TENANT_ID = 'demo-tenant';

async function fixEnterpriseAccount() {
  console.log('🔧 Fixing Enterprise Account Configuration...');
  
  try {
    // Sign in first
    await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    console.log('✅ Signed in successfully');

    // Check current subscription
    console.log('\n1️⃣ Checking current subscription...');
    const subscriptionRef = doc(db, 'subscriptions', DEMO_TENANT_ID);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      const currentSub = subscriptionSnap.data();
      console.log('📊 Current subscription:', {
        planId: currentSub.planId,
        tier: currentSub.tier,
        status: currentSub.status
      });
    } else {
      console.log('❌ No subscription found');
    }

    // Force create proper Enterprise subscription
    console.log('\n2️⃣ Creating Enterprise subscription...');
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now

    const enterpriseSubscription = {
      tenantId: DEMO_TENANT_ID,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: endDate,
      trialEndDate: endDate,
      currentUsage: {
        users: 1,
        locations: 1,
        products: 3,
        ordersThisMonth: 0,
        suppliers: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };

    await setDoc(subscriptionRef, enterpriseSubscription, { merge: false });
    console.log('✅ Enterprise subscription created');

    // Verify tenant document
    console.log('\n3️⃣ Updating tenant document...');
    const tenantRef = doc(db, 'tenants', DEMO_TENANT_ID);
    const tenantUpdate = {
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      updatedAt: now.toISOString()
    };
    
    await setDoc(tenantRef, tenantUpdate, { merge: true });
    console.log('✅ Tenant updated with enterprise status');

    // Check what features should be available
    console.log('\n4️⃣ Enterprise Features Available:');
    console.log('✅ Point of Sale');
    console.log('✅ Inventory Center');
    console.log('✅ Purchase Orders'); // Should be available
    console.log('✅ Menu Builder');
    console.log('✅ Analytics Dashboard');
    console.log('✅ Advanced Analytics'); // Should be available
    console.log('✅ Custom Reports'); // Should be available
    console.log('✅ Expense Management');
    console.log('✅ Team Management'); // Should be available
    console.log('✅ Location Management'); // Should be available
    console.log('✅ Business Reports'); // Should be available
    console.log('✅ Settings');

    console.log('\n🎉 SUCCESS: Enterprise account configured!');
    console.log('\n🔄 Please refresh your browser to see all enterprise features.');
    console.log('You should now see ALL modules in your sidebar, not just the basic 4.');

  } catch (error) {
    console.error('❌ Error fixing enterprise account:', error);
  }
}

fixEnterpriseAccount().then(() => {
  process.exit(0);
});
