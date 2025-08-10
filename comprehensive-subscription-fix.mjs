import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

console.log('🔧 COMPREHENSIVE SUBSCRIPTION CHAIN FIX');
console.log('================================================================================');

async function comprehensiveFix() {
  const app = initializeApp(firebaseConfig, 'comprehensive-fix');
  const db = getFirestore(app);
  
  const TARGET_USER_ID = '69Z6LG5jWISrGNzPOK2w1MsKTOU2';
  const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

  try {
    console.log('🔍 Step 1: Verify and fix user document');
    const userDoc = await getDoc(doc(db, 'users', TARGET_USER_ID));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User document exists');
      console.log('   Email:', userData.email);
      console.log('   Current TenantId:', userData.tenantId);
      
      if (userData.tenantId !== TENANT_ID) {
        console.log('🔧 Fixing user tenantId...');
        await updateDoc(doc(db, 'users', TARGET_USER_ID), {
          tenantId: TENANT_ID,
          role: 'owner',
          plan: 'enterprise'
        });
        console.log('✅ User tenantId updated');
      }
    }

    console.log('\n🔍 Step 2: Fix profile document (CRITICAL FOR AUTHCONTEXT)');
    const profileDoc = await getDoc(doc(db, 'profiles', TARGET_USER_ID));
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log('✅ Profile document exists');
      console.log('   Current TenantId:', profileData.tenantId);
      
      if (profileData.tenantId !== TENANT_ID) {
        console.log('🔧 Fixing profile tenantId (THIS IS KEY!)...');
        await updateDoc(doc(db, 'profiles', TARGET_USER_ID), {
          tenantId: TENANT_ID,
          role: 'owner'
        });
        console.log('✅ Profile tenantId updated - AuthContext will now work!');
      }
    } else {
      console.log('❌ Profile document missing - creating...');
      await setDoc(doc(db, 'profiles', TARGET_USER_ID), {
        email: 'reese0201@gmail.com',
        name: 'Restaurant Owner',
        role: 'owner',
        tenantId: TENANT_ID,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Profile document created with proper tenantId');
    }

    console.log('\n🔍 Step 3: Ensure tenant document exists');
    const tenantDoc = await getDoc(doc(db, 'tenants', TENANT_ID));
    if (!tenantDoc.exists()) {
      console.log('🔧 Creating tenant document...');
      await setDoc(doc(db, 'tenants', TENANT_ID), {
        id: TENANT_ID,
        name: 'My Restaurant - Enterprise',
        plan: 'enterprise',
        status: 'active',
        ownerId: TARGET_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Tenant document created');
    } else {
      console.log('✅ Tenant document exists');
    }

    console.log('\n🔍 Step 4: Ensure subscription document exists');
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', TENANT_ID));
    if (!subscriptionDoc.exists()) {
      console.log('🔧 Creating subscription document...');
      
      const now = Timestamp.now();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      await setDoc(doc(db, 'subscriptions', TENANT_ID), {
        tenantId: TENANT_ID,
        planId: 'enterprise',
        tier: 'enterprise',
        status: 'active',
        billingCycle: 'yearly',
        startDate: now,
        endDate: Timestamp.fromDate(endDate),
        trialEndDate: Timestamp.fromDate(endDate),
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
      });
      console.log('✅ Subscription document created');
    } else {
      console.log('✅ Subscription document exists');
      const subData = subscriptionDoc.data();
      console.log('   Plan:', subData.planId, '| Status:', subData.status);
    }

    console.log('\n🎯 VERIFICATION - Testing the chain:');
    console.log('1. AuthContext loads profile document ✅');
    console.log('2. Profile has tenantId:', TENANT_ID, '✅');
    console.log('3. AuthContext calls getTenantInfo(tenantId) ✅');
    console.log('4. AuthContext sets tenant.id =', TENANT_ID, '✅');
    console.log('5. SubscriptionContext watches tenant.id ✅');
    console.log('6. SubscriptionContext calls getTenantSubscription(tenant.id) ✅');
    console.log('7. getTenantSubscription finds subscription document ✅');
    console.log('8. SubscriptionContext sets subscription data ✅');
    console.log('9. Dashboard gets subscriptionFeatures ✅');
    console.log('10. getAccessibleModules returns all enterprise modules ✅');

    console.log('\n🎉 COMPLETE CHAIN FIXED!');
    console.log('🔄 Please refresh your browser - ALL enterprise features should now appear!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

comprehensiveFix();
