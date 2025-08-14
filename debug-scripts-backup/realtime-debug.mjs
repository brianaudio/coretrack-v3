import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

console.log('🔄 REAL-TIME SUBSCRIPTION DEBUG');
console.log('================================================================================');

async function realTimeDebug() {
  const app = initializeApp(firebaseConfig, 'realtime-debug');
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

  try {
    // Sign out any existing session first
    await signOut(auth);
    console.log('🔐 Signed out existing session');

    // Listen to subscription document changes in real-time
    console.log('👂 Setting up real-time listener for subscription...');
    
    const unsubscribe = onSnapshot(doc(db, 'subscriptions', TENANT_ID), (docSnap) => {
      console.log('\n📡 REAL-TIME UPDATE:');
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('  🔍 Subscription data changed:');
        console.log('    Plan ID:', data.planId);
        console.log('    Tier:', data.tier); 
        console.log('    Status:', data.status);
        console.log('    Tenant ID:', data.tenantId);
        
        // Simulate what SubscriptionContext does
        console.log('\n  🎯 App Logic Simulation:');
        console.log('    1. getTenantSubscription() returns this data');
        console.log('    2. SubscriptionContext looks up SUBSCRIPTION_PLANS');
        console.log('    3. Finds plan with id:', data.planId);
        console.log('    4. Uses plan.features for access control');
        
        if (data.planId === 'enterprise') {
          console.log('    ✅ Should have ALL enterprise features enabled!');
        }
      } else {
        console.log('  ❌ No subscription document found');
      }
    });

    // Keep running for 30 seconds then cleanup
    setTimeout(() => {
      console.log('\n⏰ Stopping real-time debug...');
      unsubscribe();
    }, 30000);

    console.log('\n🎯 INSTRUCTIONS:');
    console.log('1. Refresh your browser now');
    console.log('2. Check if all enterprise features appear');  
    console.log('3. Look at the browser console for SubscriptionDebugger output');
    console.log('4. This script will run for 30 seconds to monitor changes');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

realTimeDebug();
