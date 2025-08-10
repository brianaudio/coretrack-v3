import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

console.log('🔧 CREATING PROPER SUBSCRIPTION DOCUMENT');
console.log('================================================================================');

async function createSubscriptionDocument() {
  const app = initializeApp(firebaseConfig, 'subscription-fix');
  const db = getFirestore(app);
  
  const TARGET_USER_ID = '69Z6LG5jWISrGNzPOK2w1MsKTOU2';
  const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

  console.log(`👤 Target User: ${TARGET_USER_ID}`);
  console.log(`🏢 Tenant ID: ${TENANT_ID}`);

  try {
    // Check if subscription document already exists
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', TENANT_ID));
    
    if (subscriptionDoc.exists()) {
      console.log('📄 Existing subscription found:', subscriptionDoc.data());
      console.log('🔄 Updating to Enterprise...');
    }

    // Create the proper subscription document that the app expects
    const now = Timestamp.now();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now

    const enterpriseSubscription = {
      tenantId: TENANT_ID,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: Timestamp.fromDate(endDate),
      trialEndDate: Timestamp.fromDate(endDate), // Set to same as endDate since this is active
      currentUsage: {
        users: 1,
        locations: 1,
        products: 0,
        ordersThisMonth: 0,
        suppliers: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };

    console.log('💾 Creating subscription document...');
    await setDoc(doc(db, 'subscriptions', TENANT_ID), enterpriseSubscription);
    console.log('✅ Subscription document created successfully');

    // Verify the subscription document
    console.log('🔍 Verifying subscription document...');
    const verifyDoc = await getDoc(doc(db, 'subscriptions', TENANT_ID));
    
    if (verifyDoc.exists()) {
      const data = verifyDoc.data();
      console.log('📊 Subscription data:', {
        planId: data.planId,
        tier: data.tier,
        status: data.status,
        billingCycle: data.billingCycle,
        endDate: data.endDate
      });
    }

    console.log('');
    console.log('🎉 SUBSCRIPTION DOCUMENT CREATED SUCCESSFULLY!');
    console.log('🎉 ENTERPRISE FEATURES SHOULD NOW BE VISIBLE!');
    console.log('🔄 Please refresh your browser to see all features.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSubscriptionDocument();
