/**
 * Firebase Email Diagnostic Tool
 * 
 * This tool helps diagnose and test password reset email functionality
 */

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/lib/firebase';

console.log('🔍 Firebase Email Diagnostic Tool\n');

// Test email sending functionality
const testPasswordResetEmail = async (email: string) => {
  try {
    console.log(`📧 Testing password reset email for: ${email}`);
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent successfully!');
    console.log('📮 Check the following locations:');
    console.log('   • Inbox');
    console.log('   • Spam/Junk folder');
    console.log('   • Promotions tab (Gmail)');
    console.log('   • Social/Updates tabs (Gmail)');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('   • Email address not registered in Firebase Auth');
    console.log('   • Firebase project email sending not configured');
    console.log('   • Email provider blocking Firebase emails');
    console.log('   • Daily email quota exceeded');
    return false;
  }
};

// Common email issues and solutions
console.log('🚨 Common Email Issues & Solutions:');
console.log('=' .repeat(50));

console.log('\n1️⃣ Email Template Configuration:');
console.log('   • Go to Firebase Console → Authentication → Templates');
console.log('   • Check "Password reset" template is enabled and configured');
console.log('   • Verify sender name and email address');

console.log('\n2️⃣ Domain Configuration:');
console.log('   • Firebase project: inventory-system-latest');
console.log('   • Auth domain: inventory-system-latest.firebaseapp.com');
console.log('   • Make sure domain is verified');

console.log('\n3️⃣ Email Provider Issues:');
console.log('   • Gmail: Check spam, promotions, social tabs');
console.log('   • Yahoo: Check spam folder');
console.log('   • Outlook: Check junk email folder');
console.log('   • Corporate email: Contact IT about Firebase email filtering');

console.log('\n4️⃣ Firebase Console Checks:');
console.log('   • Go to: https://console.firebase.google.com/');
console.log('   • Select project: inventory-system-latest');
console.log('   • Navigate to: Authentication → Templates');
console.log('   • Verify password reset template is configured');

console.log('\n5️⃣ Testing Steps:');
console.log('   • Try sending reset email to different email providers');
console.log('   • Check if user exists in Firebase Auth users list');
console.log('   • Verify Firebase project email quota');

// Email testing function for different providers
const testDifferentProviders = async () => {
  console.log('\n🧪 Email Provider Testing:');
  console.log('Test with these email types to identify provider-specific issues:');
  console.log('   • Gmail: test@gmail.com');
  console.log('   • Yahoo: test@yahoo.com');
  console.log('   • Outlook: test@outlook.com');
  console.log('   • iCloud: test@icloud.com');
  console.log('   • Custom domain: test@yourdomain.com');
};

// Troubleshooting checklist
console.log('\n✅ Troubleshooting Checklist:');
console.log('□ User exists in Firebase Authentication users list');
console.log('□ Email template is configured in Firebase Console');
console.log('□ Checked all email folders (inbox, spam, promotions)');
console.log('□ Tested with different email providers');
console.log('□ Verified Firebase project is active and not suspended');
console.log('□ Checked Firebase project quotas and billing');
console.log('□ Confirmed no email filtering rules blocking Firebase');

// Manual test function
console.log('\n🔧 Manual Testing:');
console.log('To manually test email sending:');
console.log('1. Go to Firebase Console → Authentication → Users');
console.log('2. Find the user you want to test');
console.log('3. Click the user and select "Send password reset email"');
console.log('4. Check if email arrives');

console.log('\n📱 Development Testing:');
console.log('For development, you can also:');
console.log('1. Use Firebase Auth Emulator for testing');
console.log('2. Check browser developer tools for auth errors');
console.log('3. Monitor Firebase Functions logs if using custom functions');

// Email verification status check
console.log('\n🔐 Email Verification:');
console.log('Check if the issue is specific to password reset or all emails:');
console.log('• Try sending email verification (for new signups)');
console.log('• Test with Firebase Auth emulator');
console.log('• Check Firebase project status and billing');

testDifferentProviders();

// Export the test function for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPasswordResetEmail };
}
