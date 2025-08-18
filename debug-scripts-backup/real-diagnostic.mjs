/**
 * REAL DIAGNOSTIC - No false fixes, just the truth
 */

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

async function realDiagnostic() {
  console.log('🔍 REAL DIAGNOSTIC - TRUTH ONLY');
  console.log('================================================================================');

  try {
    const app = initializeApp(firebaseConfig, 'diagnostic-app');
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Wait for auth state with timeout
    const user = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Auth timeout')), 10000);
      onAuthStateChanged(auth, (user) => {
        if (user) {
          clearTimeout(timeout);
          resolve(user);
        }
      });
    });

    console.log(`👤 USER: ${user.email} (${user.uid})`);

    // 1. Check user document
    console.log('\n1️⃣ CHECKING USER DOCUMENT:');
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User document exists');
      console.log(`   tenantId: ${userData.tenantId || 'MISSING!'}`);
      console.log(`   role: ${userData.role || 'MISSING!'}`);
      console.log(`   plan: ${userData.plan || 'MISSING!'}`);
    } else {
      console.log('❌ User document does NOT exist');
      return;
    }

    // 2. Check profile document  
    console.log('\n2️⃣ CHECKING PROFILE DOCUMENT:');
    const profileDocRef = doc(db, 'profiles', user.uid);
    const profileDoc = await getDoc(profileDocRef);
    
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log('✅ Profile document exists');
      console.log(`   tenantId: ${profileData.tenantId || 'MISSING!'}`);
    } else {
      console.log('❌ Profile document does NOT exist');
    }

    // 3. Get tenantId from user document
    const userData = userDoc.data();
    const tenantId = userData.tenantId;

    if (!tenantId) {
      console.log('\n❌ CRITICAL: No tenantId found in user document!');
      return;
    }

    // 4. Check tenant document
    console.log(`\n3️⃣ CHECKING TENANT DOCUMENT (${tenantId}):`);
    const tenantDocRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantDocRef);
    
    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data();
      console.log('✅ Tenant document exists');
      console.log(`   name: ${tenantData.name}`);
      console.log(`   plan: ${tenantData.plan || 'MISSING!'}`);
      console.log(`   status: ${tenantData.status || 'MISSING!'}`);
    } else {
      console.log('❌ Tenant document does NOT exist');
      return;
    }

    // 5. Check subscription document
    console.log(`\n4️⃣ CHECKING SUBSCRIPTION DOCUMENT (${tenantId}):`);
    const subscriptionDocRef = doc(db, 'subscriptions', tenantId);
    const subscriptionDoc = await getDoc(subscriptionDocRef);
    
    if (subscriptionDoc.exists()) {
      const subscriptionData = subscriptionDoc.data();
      console.log('✅ Subscription document exists');
      console.log(`   plan: ${subscriptionData.plan || 'MISSING!'}`);
      console.log(`   status: ${subscriptionData.status || 'MISSING!'}`);
      console.log(`   features: ${JSON.stringify(subscriptionData.features || {}, null, 2)}`);
    } else {
      console.log('❌ Subscription document does NOT exist');
    }

    // 6. Check what the frontend would actually load
    console.log('\n5️⃣ FRONTEND DATA SIMULATION:');
    
    // Simulate AuthContext loading
    console.log('AuthContext would load:');
    if (profileDoc.exists() && profileDoc.data().tenantId) {
      console.log(`   ✅ tenant.id = ${profileDoc.data().tenantId}`);
    } else if (userDoc.exists() && userDoc.data().tenantId) {
      console.log(`   ⚠️  fallback tenant.id = ${userDoc.data().tenantId} (from user doc)`);
    } else {
      console.log(`   ❌ tenant.id = undefined (NO TENANT LOADED)`);
    }

    // Simulate SubscriptionContext loading
    const frontendTenantId = profileDoc.exists() && profileDoc.data().tenantId 
      ? profileDoc.data().tenantId 
      : (userDoc.exists() && userDoc.data().tenantId ? userDoc.data().tenantId : null);

    if (frontendTenantId) {
      const frontendSubscription = await getDoc(doc(db, 'subscriptions', frontendTenantId));
      if (frontendSubscription.exists()) {
        const subData = frontendSubscription.data();
        console.log('SubscriptionContext would load:');
        console.log(`   ✅ plan: ${subData.plan}`);
        console.log(`   ✅ features: ${Object.keys(subData.features || {}).length} features`);
      } else {
        console.log('SubscriptionContext would load:');
        console.log(`   ❌ NO SUBSCRIPTION DATA`);
      }
    } else {
      console.log('SubscriptionContext would load:');
      console.log(`   ❌ NO TENANT ID TO LOAD SUBSCRIPTION`);
    }

    console.log('\n🎯 FINAL VERDICT:');
    console.log('================================================================================');

  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
  }

  process.exit(0);
}

realDiagnostic();
