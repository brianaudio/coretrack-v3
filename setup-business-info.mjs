import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'

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

async function setupBusinessInfo() {
  const userId = "9VFmmEq3XXVc0jW0PVKddWfsvsr1" // Current authenticated user
  
  try {
    console.log('🏢 Setting up business information...')
    
    // Check if tenant exists
    const tenantDoc = await getDoc(doc(db, 'tenants', userId))
    
    if (tenantDoc.exists()) {
      console.log('✅ Tenant already exists:', tenantDoc.data().name)
    } else {
      // Create tenant with business info
      const tenantData = {
        id: userId,
        name: 'CoreTrack Demo Restaurant',
        type: 'restaurant',
        domain: 'coretrack.com',
        ownerId: userId,
        status: 'active',
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
      console.log('✅ Tenant created with business info')
    }
    
    // Check if user profile exists
    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (userDoc.exists()) {
      console.log('✅ User profile already exists:', userDoc.data().email)
    } else {
      // Create user profile
      const userProfile = {
        id: userId,
        email: 'demo@coretrack.com',
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
    }
    
    console.log('🎉 Business information setup complete!')
    console.log('📋 Please refresh your browser to see the data in Settings > Business Information')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupBusinessInfo()
