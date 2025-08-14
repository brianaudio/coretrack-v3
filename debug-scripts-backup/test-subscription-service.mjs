import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase config for coretrack-inventory
const firebaseConfig = {
  apiKey: "AIzaSyAS2BNBqV1oNx4YOo4MhSfSIDiPCW1C7JE",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "1033539871650",
  appId: "1:1033539871650:web:c99fb9de7b4d885a6e6bb4"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Import our subscription service
import('./src/lib/services/subscriptionService.js').then(async ({ SubscriptionService }) => {
  console.log('🚀 Testing Subscription Service...')
  
  // Test with demo account
  const mockUser = {
    uid: 'test-uid-demo',
    email: 'demo@coretrack.com',
    displayName: 'Demo User'
  }
  
  try {
    console.log('📝 Testing user initialization...')
    const result = await SubscriptionService.initializeNewUser(mockUser)
    
    console.log('✅ Initialization result:', {
      success: result.success,
      tier: result.subscription.tier,
      features: result.subscription.features,
      tenantId: result.tenant.id
    })
    
    console.log('🔍 Testing accessible modules...')
    const modules = SubscriptionService.getAccessibleModules(result.subscription)
    console.log('✅ Accessible modules:', modules)
    
    console.log('📖 Testing user subscription retrieval...')
    const { profile, tenant, subscription } = await SubscriptionService.getUserSubscription(mockUser.uid)
    
    console.log('✅ Retrieved data:', {
      profile: profile ? 'found' : 'not found',
      tenant: tenant ? 'found' : 'not found',  
      subscription: subscription ? subscription.tier : 'not found'
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('🏁 Test completed!')
  process.exit(0)
})
