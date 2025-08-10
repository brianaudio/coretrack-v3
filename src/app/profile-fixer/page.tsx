'use client'

import { useState } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../lib/context/AuthContext'

export default function ProfileFixerPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const createProfile = async () => {
    if (!user) {
      setStatus('❌ No user logged in!')
      return
    }

    setLoading(true)
    setStatus('🔧 Creating profile and enterprise setup...')

    try {
      const userId = user.uid
      const userEmail = user.email || 'unknown@example.com'
      const newTenantId = `TENANT_${userId.substring(0, 8)}_${Date.now()}`

      setStatus(`👤 User: ${userEmail} (${userId})\n🆕 TenantId: ${newTenantId}`)

      // 1. Create/Update user document
      setStatus(prev => prev + '\n\n1️⃣ Creating user document...')
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: userEmail,
        tenantId: newTenantId,
        role: 'owner',
        permissions: ['all'],
        plan: 'enterprise',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          notifications: true,
          theme: 'light'
        }
      })
      setStatus(prev => prev + '\n✅ User document created')

      // 2. Create profile document
      setStatus(prev => prev + '\n\n2️⃣ Creating profile document...')
      await setDoc(doc(db, 'profiles', userId), {
        uid: userId,
        email: userEmail,
        displayName: userEmail.split('@')[0],
        tenantId: newTenantId,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        assignedBranches: [],
        primaryBranch: null,
        branchPermissions: {}
      })
      setStatus(prev => prev + '\n✅ Profile document created')

      // 3. Create tenant document
      setStatus(prev => prev + '\n\n3️⃣ Creating tenant document...')
      await setDoc(doc(db, 'tenants', newTenantId), {
        id: newTenantId,
        name: `${userEmail.split('@')[0]}'s Restaurant - Enterprise`,
        type: 'restaurant',
        plan: 'enterprise',
        status: 'active',
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          businessHours: {
            open: '09:00',
            close: '22:00',
          },
          businessType: 'restaurant'
        }
      })
      setStatus(prev => prev + '\n✅ Tenant document created')

      // 4. Create subscription document
      setStatus(prev => prev + '\n\n4️⃣ Creating subscription document...')
      await setDoc(doc(db, 'subscriptions', newTenantId), {
        tenantId: newTenantId,
        planId: 'enterprise',
        status: 'active',
        billingCycle: 'monthly',
        pricePerMonth: 99,
        currency: 'USD',
        startDate: new Date(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        features: {
          users: true,
          inventory: true,
          pos: true,
          analytics: true,
          team: true,
          expenses: true,
          reports: true,
          api: true,
          customBranding: true,
          prioritySupport: true,
          advancedAnalytics: true,
          multiLocation: true,
          customIntegrations: true,
          purchaseOrders: true,
          menuBuilder: true,
          locationManagement: true,
          businessReports: true
        },
        limits: {
          users: -1,
          locations: -1,
          storage: -1,
          apiCalls: -1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      setStatus(prev => prev + '\n✅ Subscription document created')

      // 5. Create main location document (THIS WAS MISSING!)
      setStatus(prev => prev + '\n\n5️⃣ Creating main location document...')
      const locationId = `main-location-${newTenantId}`
      await setDoc(doc(db, 'locations', locationId), {
        id: locationId,
        name: 'Main Location',
        tenantId: newTenantId,
        type: 'main',
        
        // Default address - user can update in Location Management
        address: {
          street: 'Please update your address',
          city: 'Please update your city', 
          state: 'Please update your province',
          zipCode: 'Please update your postal code',
          country: 'Philippines'
        },
        
        // Default contact
        contact: {
          phone: 'Please update your phone',
          email: userEmail,
          manager: 'Please assign a manager'
        },
        
        // Default business hours
        settings: {
          seatingCapacity: 20,
          businessHours: {
            monday: { open: '09:00', close: '21:00', closed: false },
            tuesday: { open: '09:00', close: '21:00', closed: false },
            wednesday: { open: '09:00', close: '21:00', closed: false },
            thursday: { open: '09:00', close: '21:00', closed: false },
            friday: { open: '09:00', close: '21:00', closed: false },
            saturday: { open: '09:00', close: '21:00', closed: false },
            sunday: { open: '10:00', close: '20:00', closed: false }
          },
          features: {
            inventory: true,
            pos: true,
            expenses: true
          }
        },
        
        // Default features
        features: {
          hasDelivery: false,
          hasTakeout: true,
          hasDineIn: true,
          hasOnlineOrdering: false
        },
        
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      setStatus(prev => prev + '\n✅ Main location created')

      // 6. Verification
      setStatus(prev => prev + '\n\n6️⃣ Verification...')
      const profileCheck = await getDoc(doc(db, 'profiles', userId))
      const tenantCheck = await getDoc(doc(db, 'tenants', newTenantId))
      const subscriptionCheck = await getDoc(doc(db, 'subscriptions', newTenantId))
      const locationCheck = await getDoc(doc(db, 'locations', `main-location-${newTenantId}`))

      setStatus(prev => prev + 
        `\nProfile exists: ${profileCheck.exists() ? '✅ YES' : '❌ NO'}` +
        `\nTenant exists: ${tenantCheck.exists() ? '✅ YES' : '❌ NO'}` +
        `\nSubscription exists: ${subscriptionCheck.exists() ? '✅ YES' : '❌ NO'}` +
        `\nMain location exists: ${locationCheck.exists() ? '✅ YES' : '❌ NO'}`
      )

      setStatus(prev => prev + 
        '\n\n🎉 SUCCESS! Complete enterprise setup with main location created!' +
        '\n🔄 REFRESH THE PAGE TO SEE ALL ENTERPRISE MODULES!' +
        '\n🏪 Main branch should now appear in branch selector!' +
        '\n📍 Location can be updated in Location Management module!'
      )

    } catch (error: any) {
      setStatus(prev => prev + `\n❌ Error: ${error.message}`)
      console.error('Profile creation error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">🔧 Profile Fixer</h1>
      
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Current User</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>User: <span className={user ? 'text-green-600' : 'text-red-600'}>{user ? user.email : 'Not logged in'}</span></div>
          <div>UID: <span className="text-gray-600">{user?.uid || 'N/A'}</span></div>
        </div>
      </div>

      {user ? (
        <div className="mb-8">
          <button 
            onClick={createProfile}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 Creating...' : '🚀 Create Profile & Enterprise Setup'}
          </button>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ You need to be logged in to create a profile.
        </div>
      )}

      {status && (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Status</h2>
          <pre className="text-sm whitespace-pre-wrap">{status}</pre>
        </div>
      )}
    </div>
  )
}
