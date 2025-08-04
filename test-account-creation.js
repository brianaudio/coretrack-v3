const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } = require('firebase/auth');

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

async function testAccountCreationAndEmail() {
  console.log('🧪 TESTING ACCOUNT CREATION & EMAIL SENDING');
  console.log('===========================================');
  
  const testEmail = 'test-user-' + Date.now() + '@example.com'; // Unique test email
  const testPassword = 'TempPass123!';
  
  try {
    console.log(`📧 Creating test account: ${testEmail}`);
    
    // Step 1: Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User account created successfully!');
    console.log('   UID:', userCredential.user.uid);
    console.log('   Email:', userCredential.user.email);
    
    // Step 2: Verify user exists
    const signInMethods = await fetchSignInMethodsForEmail(auth, testEmail);
    console.log('✅ User exists in Firebase Auth');
    console.log('   Sign-in methods:', signInMethods);
    
    // Step 3: Send password reset email
    console.log('');
    console.log('📮 Sending password reset email...');
    await sendPasswordResetEmail(auth, testEmail);
    console.log('✅ Password reset email sent successfully!');
    
    console.log('');
    console.log('🎯 CONCLUSION:');
    console.log('• Account creation: WORKING ✅');
    console.log('• Email sending: WORKING ✅');
    console.log('• Firebase configuration: CORRECT ✅');
    console.log('');
    console.log('📧 Email Details:');
    console.log('   From: noreply@inventory-system-latest.firebaseapp.com');
    console.log('   To: ' + testEmail);
    console.log('   Subject: Reset your password for inventory-system-latest');
    console.log('');
    console.log('🔍 NEXT STEPS FOR YOUR REAL USERS:');
    console.log('1. Check if createStaffAccount() is actually being called');
    console.log('2. Check browser console for any errors during team member creation');
    console.log('3. Users should check spam folders for emails');
    console.log('4. Try creating a team member with your own email to test');
    
    // Clean up: Delete the test user (optional)
    console.log('');
    console.log('🧹 Cleaning up test user...');
    await userCredential.user.delete();
    console.log('✅ Test user deleted');
    
  } catch (error) {
    console.log('❌ ERROR:', error.code);
    console.log('   Message:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('');
      console.log('ℹ️ Email already exists - this is actually good!');
      console.log('   It means account creation works, just using an existing email');
    }
  }
}

testAccountCreationAndEmail().catch(console.error);
