/**
 * Auto Sign-In Script - Get authenticated user
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

async function signInDemo() {
  console.log('🔐 AUTO SIGN-IN SCRIPT');
  console.log('================================================================================');

  try {
    const app = initializeApp(firebaseConfig, 'signin-app');
    const auth = getAuth(app);

    console.log('🔑 Attempting to sign in with demo credentials...');
    
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      'demo@coretrack.dev', 
      'SecureDemo123!'
    );

    const user = userCredential.user;
    console.log(`✅ Successfully signed in: ${user.email} (${user.uid})`);
    
    console.log('🎉 SUCCESS! User is now authenticated.');
    console.log('🔄 Refresh your browser at http://localhost:3002 to see the authenticated state.');
    console.log('🔍 Or check the debug page at http://localhost:3002/system-debug');

  } catch (error) {
    console.error('❌ Sign-in failed:', error);
    
    if (error.code === 'auth/user-not-found') {
      console.log('🚨 ISSUE: demo@coretrack.dev user does not exist in Firebase Auth');
      console.log('📝 You need to create this user in Firebase Console first');
    } else if (error.code === 'auth/wrong-password') {
      console.log('🚨 ISSUE: Password is incorrect');
    } else if (error.code === 'auth/invalid-email') {
      console.log('🚨 ISSUE: Email format is invalid');
    }
  }

  console.log('\n================================================================================');
  process.exit(0);
}

signInDemo();
