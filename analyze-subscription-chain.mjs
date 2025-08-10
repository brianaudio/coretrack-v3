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

console.log('🔍 DEEP SUBSCRIPTION CHAIN ANALYSIS');
console.log('================================================================================');

async function analyzeSubscriptionChain() {
  const app = initializeApp(firebaseConfig, 'chain-analysis');
  const db = getFirestore(app);
  
  const TARGET_USER_ID = '69Z6LG5jWISrGNzPOK2w1MsKTOU2';
  
  try {
    console.log('1️⃣ CHECKING USER DOCUMENT');
    const userDoc = await getDoc(doc(db, 'users', TARGET_USER_ID));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User exists');
      console.log('   Email:', userData.email);
      console.log('   TenantId:', userData.tenantId);
    } else {
      console.log('❌ User document missing');
      return;
    }

    console.log('\n2️⃣ CHECKING PROFILE DOCUMENT');
    const profileDoc = await getDoc(doc(db, 'profiles', TARGET_USER_ID));
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log('✅ Profile exists');
      console.log('   Email:', profileData.email);
      console.log('   TenantId:', profileData.tenantId);
      
      if (!profileData.tenantId) {
        console.log('🚨 ISSUE: Profile has no tenantId!');
      }
    } else {
      console.log('❌ Profile document missing');
    }

    const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

    console.log('\n3️⃣ CHECKING TENANT DOCUMENT');
    const tenantDoc = await getDoc(doc(db, 'tenants', TENANT_ID));
    if (tenantDoc.exists()) {
      console.log('✅ Tenant exists');
      console.log('   Name:', tenantDoc.data().name);
    } else {
      console.log('❌ Tenant document missing');
    }

    console.log('\n4️⃣ CHECKING SUBSCRIPTION DOCUMENT');
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', TENANT_ID));
    if (subscriptionDoc.exists()) {
      console.log('✅ Subscription exists');
      const subData = subscriptionDoc.data();
      console.log('   Plan:', subData.planId);
      console.log('   Status:', subData.status);
      console.log('   Tenant ID:', subData.tenantId);
    } else {
      console.log('❌ Subscription document missing');
    }

    console.log('\n🔧 SUBSCRIPTION CONTEXT FLOW ANALYSIS:');
    console.log('1. AuthContext loads user auth data ✅');
    console.log('2. AuthContext loads profile document...');
    console.log('   - Profile document sets tenant data in AuthContext');
    console.log('3. SubscriptionContext watches tenant.id from AuthContext');
    console.log('   - Calls getTenantSubscription(tenant.id)');
    console.log('   - getTenantSubscription looks in /subscriptions/{tenantId}');
    console.log('4. SubscriptionContext sets subscription state');
    console.log('5. Dashboard uses subscriptionFeatures from SubscriptionContext');

    console.log('\n🎯 THE PROBLEM:');
    console.log('If AuthContext profile is missing tenantId, then:');
    console.log('- tenant.id will be null/undefined');
    console.log('- SubscriptionContext.loadSubscription() returns early');
    console.log('- subscriptionFeatures stays null');
    console.log('- allowedModules = getAccessibleModules(role, null) = []');
    console.log('- Sidebar shows no modules!');

    console.log('\n🔥 IMMEDIATE FIX NEEDED:');
    console.log('Check if profile document has proper tenantId');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeSubscriptionChain();
