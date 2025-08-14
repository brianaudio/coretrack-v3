// FOCUSED EMAIL DIAGNOSIS
// Run this in browser console to get specific error information

const diagnoseEmailIssue = async () => {
  console.log('🔍 FOCUSED EMAIL DIAGNOSIS')
  console.log('========================')
  
  const testEmail = 'bdbasa24@gmail.com'
  
  // Test 1: Check Firebase configuration
  console.log('\n1️⃣ FIREBASE CONFIG CHECK:')
  try {
    const { getAuth } = await import('firebase/auth')
    const auth = getAuth()
    console.log('✅ Firebase Auth initialized')
    console.log('Project ID:', auth.app.options.projectId)
    console.log('Auth Domain:', auth.app.options.authDomain)
    console.log('Current User:', auth.currentUser?.email || 'None')
  } catch (error) {
    console.error('❌ Firebase config issue:', error)
    return
  }
  
  // Test 2: Direct email sending with detailed error handling
  console.log('\n2️⃣ EMAIL SENDING TEST:')
  try {
    const { getAuth, sendPasswordResetEmail } = await import('firebase/auth')
    const auth = getAuth()
    
    console.log(`📧 Attempting to send to: ${testEmail}`)
    await sendPasswordResetEmail(auth, testEmail)
    
    console.log('✅ FIREBASE SAYS: Email sent successfully!')
    console.log('🕐 Current time:', new Date().toLocaleString())
    console.log('')
    console.log('📬 EMAIL SHOULD ARRIVE FROM:')
    console.log('   Sender: noreply@inventory-system-latest.firebaseapp.com')
    console.log('   Subject: Reset your password for CoreTrack')
    console.log('')
    console.log('🔍 CHECK THESE LOCATIONS (in order):')
    console.log('   1. Gmail Primary Inbox')
    console.log('   2. Gmail Spam/Junk folder')
    console.log('   3. Gmail Promotions tab')
    console.log('   4. Search Gmail for "firebase" or "password reset"')
    console.log('')
    console.log('⏰ WAIT TIME: Emails can take 5-30 minutes to arrive')
    
    // Set up timed reminders
    setTimeout(() => console.log('⏰ 5 minute reminder: Check your email now!'), 5 * 60 * 1000)
    setTimeout(() => console.log('⏰ 15 minute reminder: Check email again!'), 15 * 60 * 1000)
    
    return { success: true, timestamp: new Date() }
    
  } catch (error) {
    console.error('❌ EMAIL SENDING FAILED:')
    console.error('Error Code:', error.code)
    console.error('Error Message:', error.message)
    console.error('Full Error:', error)
    
    // Specific error handling
    switch (error.code) {
      case 'auth/user-not-found':
        console.log('\n💡 SOLUTION: User not found in Firebase Auth')
        console.log('   The email address is not registered in Firebase')
        console.log('   Need to create user account first, then send reset email')
        break
        
      case 'auth/invalid-email':
        console.log('\n💡 SOLUTION: Invalid email format')
        console.log('   Check email address for typos')
        break
        
      case 'auth/too-many-requests':
        console.log('\n💡 SOLUTION: Rate limited')
        console.log('   Wait 15-30 minutes before trying again')
        break
        
      case 'auth/quota-exceeded':
        console.log('\n💡 SOLUTION: Email quota exceeded')
        console.log('   Firebase project has reached email sending limits')
        console.log('   Enable billing or wait for quota reset')
        break
        
      case 'auth/billing-required':
        console.log('\n💡 SOLUTION: Billing required')
        console.log('   Enable billing in Firebase Console to send emails')
        console.log('   Visit: https://console.firebase.google.com/project/inventory-system-latest/usage')
        break
        
      default:
        console.log('\n💡 UNKNOWN ERROR - Possible causes:')
        console.log('   • Firebase billing not enabled')
        console.log('   • Project configuration issue')
        console.log('   • Network/firewall blocking')
        console.log('   • Firebase service outage')
    }
    
    return { success: false, error: error.code }
  }
}

// Test 3: Alternative email addresses
const testAlternativeEmails = async () => {
  console.log('\n3️⃣ TESTING ALTERNATIVE EMAILS:')
  const testEmails = [
    'bdbasa24@gmail.com',
    'brianbasa@gmail.com', // From platform admin list
    // Add more emails to test
  ]
  
  for (const email of testEmails) {
    try {
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth')
      const auth = getAuth()
      await sendPasswordResetEmail(auth, email)
      console.log(`✅ ${email}: Email sent`)
    } catch (error) {
      console.log(`❌ ${email}: ${error.code}`)
    }
  }
}

// Run diagnosis
diagnoseEmailIssue().then(result => {
  if (result.success) {
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Wait 5-30 minutes for email delivery')
    console.log('2. Check ALL email folders (inbox, spam, promotions)')
    console.log('3. Search Gmail for "firebase" or "password"')
    console.log('4. If no email after 30 minutes, check Firebase billing')
    console.log('5. Try with a different email address')
  } else {
    console.log('\n🔧 IMMEDIATE ACTION REQUIRED:')
    console.log('Fix the error above before emails can be sent')
  }
})

// Make functions available for manual testing
window.diagnoseEmailIssue = diagnoseEmailIssue
window.testAlternativeEmails = testAlternativeEmails

console.log('\n💡 Available functions:')
console.log('   diagnoseEmailIssue() - Run full diagnosis')
console.log('   testAlternativeEmails() - Test multiple emails')
