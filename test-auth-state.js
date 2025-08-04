/**
 * Test script to check current authentication state after team management fixes
 */

const { initializeApp } = require('firebase/app');
const { getAuth, onAuthStateChanged } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "966077408568",
  appId: "1:966077408568:web:80a2bb00c7b037fb2090a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log('🔍 Checking current Firebase Auth state...');

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('✅ User is signed in:');
    console.log('   Email:', user.email);
    console.log('   UID:', user.uid);
    console.log('   Display Name:', user.displayName);
    console.log('   Email Verified:', user.emailVerified);
  } else {
    console.log('❌ No user is currently signed in');
  }
  
  // Exit after checking state
  process.exit(0);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('⏰ Timeout: Unable to determine auth state');
  process.exit(1);
}, 5000);
