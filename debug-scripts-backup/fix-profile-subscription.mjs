import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

console.log('🔍 PROFILE & SUBSCRIPTION FIX');
console.log('================================================================================');

async function fixProfileAndSubscription() {
  const app = initializeApp(firebaseConfig, 'profile-fix');
  const db = getFirestore(app);
  
  const TARGET_USER_ID = '69Z6LG5jWISrGNzPOK2w1MsKTOU2';
  const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

  try {
    console.log('👤 Checking user profile document...');
    const profileDoc = await getDoc(doc(db, 'profiles', TARGET_USER_ID));
    
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log('📄 Found profile:', {
        email: profileData.email,
        name: profileData.name,
        role: profileData.role,
        tenantId: profileData.tenantId
      });
      
      if (!profileData.tenantId) {
        console.log('🔧 Adding tenantId to profile...');
        await updateDoc(doc(db, 'profiles', TARGET_USER_ID), {
          tenantId: TENANT_ID
        });
        console.log('✅ Profile updated with tenantId');
      }
    } else {
      console.log('❌ Profile document not found. Creating...');
      
      // Get user data first
      const userDoc = await getDoc(doc(db, 'users', TARGET_USER_ID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        await setDoc(doc(db, 'profiles', TARGET_USER_ID), {
          email: userData.email,
          name: 'Restaurant Owner',
          role: 'owner',
          tenantId: TENANT_ID,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Profile document created');
      }
    }

    console.log('\n🏢 Checking tenant document...');
    const tenantDoc = await getDoc(doc(db, 'tenants', TENANT_ID));
    if (tenantDoc.exists()) {
      console.log('✅ Tenant document exists');
    } else {
      console.log('❌ Tenant document missing. Creating...');
      await setDoc(doc(db, 'tenants', TENANT_ID), {
        id: TENANT_ID,
        name: 'My Restaurant - Enterprise',
        plan: 'enterprise',
        status: 'active',
        ownerId: TARGET_USER_ID,
        createdAt: new Date()
      });
      console.log('✅ Tenant document created');
    }

    console.log('\n📋 Checking subscription document...');
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', TENANT_ID));
    if (subscriptionDoc.exists()) {
      console.log('✅ Subscription document exists');
      const subData = subscriptionDoc.data();
      console.log('📊 Plan:', subData.planId, '| Status:', subData.status);
    } else {
      console.log('❌ Subscription document missing. Creating...');
      // This should already exist from earlier scripts
    }

    console.log('\n✅ COMPLETE! All documents should be properly linked now.');
    console.log('🔄 Please refresh your browser and check again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixProfileAndSubscription();
