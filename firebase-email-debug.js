// Firebase Email Configuration Debugger
// Run this in browser console on your app

console.log('🔍 FIREBASE EMAIL CONFIGURATION DEBUG');

async function debugFirebaseEmailConfig() {
  try {
    // Get Firebase config
    const { getApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    
    const app = getApp();
    const auth = getAuth();
    
    console.log('🔧 Firebase App Config:', {
      name: app.name,
      projectId: app.options.projectId,
      authDomain: app.options.authDomain,
      apiKey: app.options.apiKey ? 'PRESENT' : 'MISSING'
    });
    
    console.log('🔐 Auth Instance:', {
      currentUser: auth.currentUser?.email || 'None',
      tenantId: auth.tenantId || 'None',
      config: auth.config
    });
    
    // Test email sending with detailed logging
    console.log('📧 Testing password reset email...');
    
    const testEmails = ['bdbasa24@gmail.com', 'brianyts0201@gmail.com'];
    
    for (const email of testEmails) {
      try {
        console.log(`⏳ Sending to ${email}...`);
        
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email, {
          url: window.location.origin + '/login',
          handleCodeInApp: false
        });
        
        console.log(`✅ SUCCESS: Email sent to ${email}`);
        console.log(`   Time: ${new Date().toISOString()}`);
        console.log(`   Project: ${app.options.projectId}`);
        console.log(`   Auth Domain: ${app.options.authDomain}`);
        
      } catch (emailError) {
        console.error(`❌ FAILED: Email to ${email}`, {
          code: emailError.code,
          message: emailError.message,
          details: emailError
        });
      }
    }
    
  } catch (error) {
    console.error('🚨 Debug script failed:', error);
  }
}

// Run the debug
debugFirebaseEmailConfig();

console.log('📋 NEXT STEPS:');
console.log('1. Check Firebase Console → Authentication → Templates');
console.log('2. Verify email domain is authorized');
console.log('3. Check if emails are being blocked by Gmail');
console.log('4. Look for Firebase quotas/limits');
