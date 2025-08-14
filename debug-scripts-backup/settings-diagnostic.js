// Settings page diagnostic - run this in browser console on localhost:3002
console.log('🔍 Settings Diagnostic Starting...')

// Check current user and subscription state
const checkUserState = () => {
  // These should be available in the React DevTools or console
  const user = localStorage.getItem('user') 
  const subscription = localStorage.getItem('subscription')
  
  console.log('👤 User State:')
  console.log('   - User:', user)
  console.log('   - Subscription:', subscription)
  
  // Check Firebase Auth state
  import('firebase/auth').then(({ getAuth }) => {
    const auth = getAuth()
    const currentUser = auth.currentUser
    
    if (currentUser) {
      console.log('✅ Firebase User:')
      console.log('   - UID:', currentUser.uid)
      console.log('   - Email:', currentUser.email) 
      console.log('   - Display Name:', currentUser.displayName)
    } else {
      console.log('❌ No Firebase user found')
    }
  }).catch(console.error)
  
  // Check what modules are available
  const sidebar = document.querySelector('[data-testid="sidebar"]')
  if (sidebar) {
    const moduleButtons = sidebar.querySelectorAll('button')
    console.log('📋 Available modules:')
    moduleButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. ${btn.textContent?.trim()}`)
    })
  }
  
  // Check if settings is accessible
  const settingsBtn = document.querySelector('button[data-module="settings"]') ||
                      document.querySelector('*[href*="settings"]') ||
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent?.toLowerCase().includes('settings')
                      )
  
  if (settingsBtn) {
    console.log('✅ Settings button found:', settingsBtn.textContent)
  } else {
    console.log('❌ Settings button not found')
  }
}

checkUserState()
