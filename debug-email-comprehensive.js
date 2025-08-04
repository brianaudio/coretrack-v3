// Comprehensive Email Debugging Script
// Run this in browser console after trying to create a team member

const debugEmailDelivery = async () => {
  console.log('🔍 COMPREHENSIVE EMAIL DELIVERY DEBUG')
  console.log('=====================================')
  
  // 1. Check Firebase configuration
  console.log('\n📋 FIREBASE PROJECT INFO:')
  console.log('Project ID:', firebase?.app?.()?.options?.projectId || 'Not found')
  console.log('Auth Domain:', firebase?.app?.()?.options?.authDomain || 'Not found')
  console.log('API Key:', firebase?.app?.()?.options?.apiKey ? 'Present' : 'Missing')
  
  // 2. Check current auth state
  console.log('\n👤 CURRENT USER INFO:')
  const currentUser = firebase.auth().currentUser
  if (currentUser) {
    console.log('Current user UID:', currentUser.uid)
    console.log('Current user email:', currentUser.email)
    console.log('Email verified:', currentUser.emailVerified)
  } else {
    console.log('No current user signed in')
  }
  
  // 3. Test email sending directly
  console.log('\n📧 TESTING DIRECT EMAIL SENDING:')
  const testEmail = 'bdbasa24@gmail.com' // Replace with the email you're testing
  
  try {
    console.log(`⏳ Attempting to send password reset email to: ${testEmail}`)
    await firebase.auth().sendPasswordResetEmail(testEmail)
    console.log('✅ Password reset email sent successfully!')
    
    // Check if this triggers any additional logs
    setTimeout(() => {
      console.log('⏰ 10 seconds have passed since email send attempt')
      console.log('📬 Check your email inbox, spam folder, and promotions tab')
    }, 10000)
    
  } catch (error) {
    console.error('❌ Failed to send password reset email:')
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Full error:', error)
    
    // Provide specific troubleshooting based on error
    if (error.code === 'auth/user-not-found') {
      console.log('💡 User not found - need to create Firebase Auth account first')
    } else if (error.code === 'auth/invalid-email') {
      console.log('💡 Invalid email format')
    } else if (error.code === 'auth/too-many-requests') {
      console.log('💡 Too many email requests - wait before trying again')
    }
  }
  
  // 4. Check Firebase Auth users
  console.log('\n👥 CHECKING IF USER EXISTS IN FIREBASE AUTH:')
  try {
    // This will only work if you have admin access, but let's try
    const functions = firebase.functions()
    console.log('Firebase Functions available:', !!functions)
  } catch (e) {
    console.log('Cannot check user existence from client side')
  }
  
  // 5. Check email template configuration
  console.log('\n📝 EMAIL TEMPLATE CONFIGURATION:')
  console.log('Expected sender: noreply@inventory-system-latest.firebaseapp.com')
  console.log('Project domain: inventory-system-latest.firebaseapp.com')
  
  // 6. Browser and network checks
  console.log('\n🌐 BROWSER & NETWORK INFO:')
  console.log('User Agent:', navigator.userAgent)
  console.log('Online:', navigator.onLine)
  console.log('Cookies enabled:', navigator.cookieEnabled)
  
  // 7. Provide troubleshooting checklist
  console.log('\n📋 TROUBLESHOOTING CHECKLIST:')
  console.log('1. ✓ Check email inbox for: noreply@inventory-system-latest.firebaseapp.com')
  console.log('2. ✓ Check spam/junk folder')
  console.log('3. ✓ Check Gmail Promotions tab')
  console.log('4. ✓ Check if email filters are blocking Firebase emails')
  console.log('5. ✓ Try with a different email address')
  console.log('6. ✓ Wait 15-30 minutes (emails can be delayed)')
  console.log('7. ✓ Check Firebase Console for email quota limits')
  console.log('8. ✓ Verify Firebase project billing is enabled')
  
  return {
    projectId: firebase?.app?.()?.options?.projectId,
    currentUser: currentUser?.email,
    testEmailSent: true
  }
}

// Auto-run the debug
debugEmailDelivery().catch(console.error)

// Also provide manual test function
window.testEmailSending = async (email) => {
  console.log(`🧪 MANUAL EMAIL TEST for: ${email}`)
  try {
    await firebase.auth().sendPasswordResetEmail(email)
    console.log('✅ Manual test: Email sent successfully!')
    return true
  } catch (error) {
    console.error('❌ Manual test failed:', error)
    return false
  }
}

console.log('💡 You can also run: testEmailSending("your-email@example.com")')
