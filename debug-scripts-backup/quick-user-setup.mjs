import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
  authDomain: "coretrack-inventory.firebaseapp.com", 
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "930028194991",
  appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function setupUser() {
  const userId = "9VFmmEq3XXVc0jW0PVKddWfsvsr1" // Current authenticated user
  const email = "demo@coretrack.com"
  
  try {
    console.log('🔧 Setting up user profile...')
    
    // Create user profile
    const userProfile = {
      id: userId,
      email: email,
      displayName: 'Demo User',
      role: 'owner',
      tenantId: userId,
      permissions: ['all'],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      assignedBranches: [],
      branchPermissions: {}
    }
    
    await setDoc(doc(db, 'users', userId), userProfile)
    console.log('✅ User profile created')
    
    // Create tenant
    const tenantData = {
      id: userId,
      name: 'CoreTrack Demo Business',
      domain: 'coretrack.com',
      ownerId: userId,
      status: 'active',
      type: 'restaurant',
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        businessHours: {
          open: '09:00',
          close: '22:00'
        }
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    await setDoc(doc(db, 'tenants', userId), tenantData)
    console.log('✅ Tenant created')
    
    // Create location
    const locationId = `main-location-${userId}`
    const locationData = {
      id: locationId,
      tenantId: userId,
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
    
    await setDoc(doc(db, 'locations', locationId), locationData)
    console.log('✅ Location created')
    
    console.log('🎉 User setup complete! Please refresh your browser.')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupUser()
