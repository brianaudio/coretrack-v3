// Quick browser fix for authentication and permissions
// Run this in the browser console on localhost:3002

console.log('🚀 Starting authentication and permissions fix...')

// Check current user state
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ User authenticated:', user.email, user.uid)
    
    try {
      // Test basic Firestore access
      console.log('🔍 Testing Firestore access...')
      
      // Try to read user profile
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        console.log('✅ User profile found:', userDoc.data())
      } else {
        console.log('❌ User profile not found, creating...')
        
        // Create basic user profile
        const profileData = {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'owner',
          tenantId: user.uid, // Use user ID as tenant ID for demo
          permissions: ['all'],
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        }
        
        await setDoc(userDocRef, profileData)
        console.log('✅ User profile created:', profileData)
      }
      
      // Test tenant access
      const tenantDocRef = doc(db, 'tenants', user.uid)
      const tenantDoc = await getDoc(tenantDocRef)
      
      if (!tenantDoc.exists()) {
        console.log('❌ Tenant not found, creating...')
        
        const tenantData = {
          id: user.uid,
          name: `${user.email?.split('@')[0] || 'User'}'s Business`,
          domain: user.email?.split('@')[1] || 'example.com',
          ownerId: user.uid,
          status: 'active',
          settings: {
            timezone: 'America/New_York',
            currency: 'USD',
            businessType: 'restaurant'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        await setDoc(tenantDocRef, tenantData)
        console.log('✅ Tenant created:', tenantData)
      }
      
      // Create default location
      const locationId = `main-location-${user.uid}`
      const locationDocRef = doc(db, 'locations', locationId)
      const locationDoc = await getDoc(locationDocRef)
      
      if (!locationDoc.exists()) {
        console.log('❌ Location not found, creating...')
        
        const locationData = {
          id: locationId,
          tenantId: user.uid,
          name: 'Main Location',
          address: '',
          isDefault: true,
          isActive: true,
          settings: {
            timezone: 'America/New_York',
            currency: 'USD'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        await setDoc(locationDocRef, locationData)
        console.log('✅ Location created:', locationData)
      }
      
      console.log('🎉 Setup complete! Please refresh the page.')
      
    } catch (error) {
      console.error('❌ Error during setup:', error)
    }
    
  } else {
    console.log('❌ No user authenticated')
  }
})
