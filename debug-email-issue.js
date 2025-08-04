const { initializeApp } = require('firebase/app');
const { getAuth, sendPasswordResetEmail, fetchSignInMethodsForEmail } = require('firebase/auth');

// Your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function debugEmailIssue() {
  console.log('🔍 EMAIL DELIVERY DIAGNOSTIC');
  console.log('============================');
  console.log('Firebase Project: inventory-system-latest');
  console.log('Email Domain: inventory-system-latest.firebaseapp.com');
  console.log('');

  // Test with your email first
  const testEmail = 'brianbasa@gmail.com';
  
  try {
    console.log(`📧 Testing with: ${testEmail}`);
    console.log('');
    
    // Step 1: Check if user exists
    console.log('1️⃣ Checking if user exists in Firebase Auth...');
    const signInMethods = await fetchSignInMethodsForEmail(auth, testEmail);
    
    if (signInMethods.length > 0) {
      console.log('✅ User EXISTS in Firebase Auth');
      console.log('   Sign-in methods:', signInMethods);
      
      // Step 2: Try sending password reset email
      console.log('');
      console.log('2️⃣ Attempting to send password reset email...');
      
      await sendPasswordResetEmail(auth, testEmail);
      console.log('✅ SUCCESS: Password reset email sent!');
      console.log('');
      console.log('📮 EMAIL SENT FROM: noreply@inventory-system-latest.firebaseapp.com');
      console.log('📧 TO: ' + testEmail);
      console.log('⏰ Time sent:', new Date().toISOString());
      console.log('');
      console.log('🔍 CHECK THESE LOCATIONS:');
      console.log('• Gmail Inbox');
      console.log('• Gmail Spam/Junk folder');
      console.log('• Gmail Promotions tab');
      console.log('• All Mail folder');
      console.log('');
      console.log('⚠️ IMPORTANT: Add noreply@inventory-system-latest.firebaseapp.com to your contacts!');
      
    } else {
      console.log('❌ User does NOT exist in Firebase Auth');
      console.log('');
      console.log('🔧 SOLUTION: The user must be created in Firebase Auth first');
      console.log('   This explains why no emails are being received!');
      console.log('');
      console.log('📋 WHAT TO DO:');
      console.log('1. Create the user account first using createStaffAccount()');
      console.log('2. Then send password reset email');
      console.log('3. Or use Firebase Console to manually create the user');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.code);
    console.log('   Message:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('');
      console.log('🔧 SOLUTION: User needs to be created in Firebase Auth first');
      console.log('   This is why no password reset emails are arriving!');
    }
  }
}

debugEmailIssue().catch(console.error);
