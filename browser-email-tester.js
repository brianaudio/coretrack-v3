/**
 * Standalone Email Reset Tester
 * 
 * This tool allows you to test password reset emails directly
 * Run this in browser console to test email functionality
 */

// Test function for browser console
window.testPasswordResetEmail = async (email) => {
  try {
    console.log(`📧 Testing password reset email for: ${email}`);
    
    // Import Firebase auth (assumes Firebase is already loaded)
    const { sendPasswordResetEmail, getAuth } = window.firebase || window;
    const auth = getAuth();
    
    if (!auth) {
      console.error('❌ Firebase Auth not initialized');
      return;
    }
    
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent successfully!');
    console.log('📮 Check these locations:');
    console.log('   • Inbox');
    console.log('   • Spam/Junk folder');
    console.log('   • Promotions tab (Gmail)');
    console.log('   • Social/Updates tabs (Gmail)');
    console.log('   • Wait 5-15 minutes for delivery');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    console.log('\n🔧 Common solutions:');
    console.log('   • Make sure email exists in Firebase Auth users');
    console.log('   • Check Firebase Console → Authentication → Templates');
    console.log('   • Verify email template is configured');
    console.log('   • Check Firebase project billing status');
    return false;
  }
};

// Instructions for using this tester
console.log('🔧 Email Reset Tester Loaded!');
console.log('');
console.log('To test password reset emails:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Run: testPasswordResetEmail("user@example.com")');
console.log('4. Check email folders and wait up to 15 minutes');
console.log('');
console.log('Example usage:');
console.log('  testPasswordResetEmail("your-email@gmail.com")');

// Browser detection and Firebase check
if (typeof window !== 'undefined') {
  console.log('🌐 Running in browser environment');
  
  // Check if Firebase is available
  if (window.firebase || window.auth) {
    console.log('✅ Firebase detected');
  } else {
    console.log('⚠️ Firebase not detected - make sure page has loaded completely');
  }
} else {
  console.log('🖥️ Running in Node.js environment');
  console.log('This tool is designed for browser console use');
}
