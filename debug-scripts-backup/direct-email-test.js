// Direct Email Test Script
// Copy and paste this into your browser console while on the app

const directEmailTest = async () => {
  console.log('🚀 DIRECT EMAIL SENDING TEST')
  console.log('===========================')
  
  const testEmail = 'bdbasa24@gmail.com' // The email you've been testing with
  
  try {
    // Import Firebase auth
    const { getAuth, sendPasswordResetEmail } = await import('firebase/auth')
    const auth = getAuth()
    
    console.log('📧 Sending password reset email to:', testEmail)
    console.log('⏳ Please wait...')
    
    const result = await sendPasswordResetEmail(auth, testEmail)
    
    console.log('✅ SUCCESS: Password reset email sent!')
    console.log('📬 Check your email at:', testEmail)
    console.log('📂 Don\'t forget to check:')
    console.log('   • Inbox')
    console.log('   • Spam/Junk folder') 
    console.log('   • Promotions tab (Gmail)')
    console.log('   • Social tab (Gmail)')
    console.log('📧 Expected sender: noreply@inventory-system-latest.firebaseapp.com')
    
    // Set a reminder to check
    setTimeout(() => {
      console.log('⏰ REMINDER: It\'s been 2 minutes - check your email now!')
    }, 120000) // 2 minutes
    
    return true
    
  } catch (error) {
    console.error('❌ FAILED to send email')
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    if (error.code === 'auth/user-not-found') {
      console.log('💡 SOLUTION: User not found in Firebase Auth')
      console.log('   This email needs to be registered first')
      console.log('   Try creating the user account first, then sending reset email')
      
      // Try to create the user first
      try {
        console.log('🔧 Attempting to create user account...')
        const { createUserWithEmailAndPassword } = await import('firebase/auth')
        const auth = getAuth()
        
        // Create with temporary password
        const tempPassword = 'TempPass123!'
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, tempPassword)
        console.log('✅ User account created:', userCredential.user.uid)
        
        // Now send password reset
        await sendPasswordResetEmail(auth, testEmail)
        console.log('✅ Password reset email sent after user creation!')
        
        return true
        
      } catch (createError) {
        console.error('❌ Failed to create user:', createError)
        if (createError.code === 'auth/email-already-in-use') {
          console.log('💡 Email already exists - trying reset again...')
          try {
            await sendPasswordResetEmail(auth, testEmail)
            console.log('✅ Password reset sent for existing user!')
            return true
          } catch (retryError) {
            console.error('❌ Retry failed:', retryError)
          }
        }
      }
      
    } else if (error.code === 'auth/invalid-email') {
      console.log('💡 SOLUTION: Invalid email format')
      console.log('   Check the email address for typos')
      
    } else if (error.code === 'auth/too-many-requests') {
      console.log('💡 SOLUTION: Too many requests')
      console.log('   Wait 15-30 minutes before trying again')
      
    } else {
      console.log('💡 UNKNOWN ERROR - trying alternative approach...')
      
      // Try with different method
      try {
        const auth = getAuth()
        console.log('🔄 Trying alternative email sending method...')
        await auth.sendPasswordResetEmail(testEmail)
        console.log('✅ Alternative method worked!')
        return true
      } catch (altError) {
        console.error('❌ Alternative method also failed:', altError)
      }
    }
    
    return false
  }
}

// Run the test
directEmailTest()

// Make it available globally for manual testing
window.directEmailTest = directEmailTest
window.testSpecificEmail = async (email) => {
  console.log(`🧪 Testing email: ${email}`)
  try {
    const { getAuth, sendPasswordResetEmail } = await import('firebase/auth')
    const auth = getAuth()
    await sendPasswordResetEmail(auth, email)
    console.log('✅ Email sent successfully to:', email)
    return true
  } catch (error) {
    console.error('❌ Failed to send to:', email, error)
    return false
  }
}

console.log('💡 Manual functions available:')
console.log('   directEmailTest() - Test the default email')
console.log('   testSpecificEmail("your@email.com") - Test any email')
