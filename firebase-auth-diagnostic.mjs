// Simple diagnostic to check Firebase Auth state
import { auth, db } from './src/lib/firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

console.log('🔍 Firebase Auth Diagnostic Starting...')

onAuthStateChanged(auth, async (user) => {
  console.log('👤 Auth State Changed:')
  
  if (user) {
    console.log('✅ User is signed in:')
    console.log('   - UID:', user.uid)
    console.log('   - Email:', user.email)
    console.log('   - Display Name:', user.displayName)
    console.log('   - Email Verified:', user.emailVerified)
    
    // Test Firestore access
    try {
      console.log('🔍 Testing Firestore access...')
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        console.log('✅ Firestore access successful')
        console.log('👤 User profile data:', userDoc.data())
      } else {
        console.log('❌ User profile document does not exist')
      }
      
    } catch (error) {
      console.error('❌ Firestore access failed:', error)
      console.error('   - Error code:', error.code)
      console.error('   - Error message:', error.message)
    }
    
  } else {
    console.log('❌ No user is signed in')
  }
})

// Keep the script running
setTimeout(() => {
  console.log('🏁 Diagnostic complete')
}, 5000)
