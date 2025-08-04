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

async function testRealEmail() {
  console.log('🔍 TESTING WITH YOUR REAL EMAIL');
  console.log('===============================');
  console.log('Firebase Project: inventory-system-latest');
  console.log('Email Domain: inventory-system-latest.firebaseapp.com');
  console.log('');

  const testEmail = 'bdbasa24@gmail.com'; // Your real email
  
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
      console.log('📮 EMAIL DETAILS:');
      console.log('   From: noreply@inventory-system-latest.firebaseapp.com');
      console.log('   To: ' + testEmail);
      console.log('   Subject: Reset your password for inventory-system-latest');
      console.log('   Time: ' + new Date().toISOString());
      console.log('');
      console.log('🔍 CHECK YOUR EMAIL NOW:');
      console.log('• Gmail Inbox');
      console.log('• Gmail Spam/Junk folder 📁');
      console.log('• Gmail Promotions tab 📋');
      console.log('• All Mail folder 📂');
      console.log('');
      console.log('⚠️ ADD TO CONTACTS:');
      console.log('   noreply@inventory-system-latest.firebaseapp.com');
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('1. Check your email immediately');
      console.log('2. If you receive it, emails are working!');
      console.log('3. If not, check spam folders thoroughly');
      
    } else {
      console.log('❌ User does NOT exist in Firebase Auth');
      console.log('');
      console.log('🔧 SOLUTION: Create user account first');
      console.log('   This explains why team member emails are not arriving!');
      console.log('');
      console.log('📋 RECOMMENDED TEST:');
      console.log('1. Go to your team management page');
      console.log('2. Create a team member with email: ' + testEmail);
      console.log('3. This should create the Firebase Auth account');
      console.log('4. Then check if you receive the password reset email');
      console.log('');
      console.log('💡 The issue is likely that createStaffAccount() is failing silently');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.code);
    console.log('   Message:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('');
      console.log('🔧 CONFIRMED: User needs to be created first');
      console.log('   This is exactly why no emails are arriving!');
      console.log('');
      console.log('📋 ACTION PLAN:');
      console.log('1. Try creating a team member with your email through the UI');
      console.log('2. Watch browser console for any errors');
      console.log('3. If account creation succeeds, you should get an email');
    }
  }
}

testRealEmail().catch(console.error);
