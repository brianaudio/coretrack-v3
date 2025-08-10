import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

console.log('🔍 DEBUG SUBSCRIPTION DATA');
console.log('================================================================================');

async function debugSubscriptionData() {
  const app = initializeApp(firebaseConfig, 'debug-app');
  const db = getFirestore(app);
  
  const TARGET_USER_ID = '69Z6LG5jWISrGNzPOK2w1MsKTOU2';
  const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

  try {
    // Check user document
    console.log('👤 USER DOCUMENT:');
    const userDoc = await getDoc(doc(db, 'users', TARGET_USER_ID));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('  Email:', userData.email);
      console.log('  Role:', userData.role);
      console.log('  TenantId:', userData.tenantId);
      console.log('  Plan:', userData.plan);
    } else {
      console.log('  ❌ User document not found');
    }

    // Check tenant document  
    console.log('\n🏢 TENANT DOCUMENT:');
    const tenantDoc = await getDoc(doc(db, 'tenants', TENANT_ID));
    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data();
      console.log('  Name:', tenantData.name);
      console.log('  Plan:', tenantData.plan);
      console.log('  Status:', tenantData.status);
      console.log('  Owner:', tenantData.ownerId);
    } else {
      console.log('  ❌ Tenant document not found');
    }

    // Check subscription document
    console.log('\n📋 SUBSCRIPTION DOCUMENT:');
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', TENANT_ID));
    if (subscriptionDoc.exists()) {
      const subData = subscriptionDoc.data();
      console.log('  Plan ID:', subData.planId);
      console.log('  Tier:', subData.tier);
      console.log('  Status:', subData.status);
      console.log('  Billing:', subData.billingCycle);
      console.log('  Tenant ID:', subData.tenantId);
      
      console.log('\n🎯 This is what the app reads for features!');
      
      // The app looks for features in SUBSCRIPTION_PLANS based on planId
      console.log('\n📊 EXPECTED FEATURE LOOKUP:');
      console.log('  App will look in SUBSCRIPTION_PLANS array for planId:', subData.planId);
      console.log('  Then use plan.features to determine available features');
      
    } else {
      console.log('  ❌ Subscription document not found');
    }

    console.log('\n🔧 DIAGNOSIS:');
    console.log('The app loads subscription data from /subscriptions/{tenantId}');
    console.log('Then looks up features in SUBSCRIPTION_PLANS array by planId');
    console.log('Features come from the static plan definition, not the document');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugSubscriptionData();
