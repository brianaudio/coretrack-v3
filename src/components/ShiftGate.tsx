'use client'

import { useShift } from '../lib/context/ShiftContext'
import { useAuth } from '../lib/context/AuthContext'
import { useBranch } from '../lib/context/BranchContext'
import { getBranchLocationId } from '../lib/utils/branchUtils'
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface ShiftGateProps {
  children?: React.ReactNode
  moduleName?: string
  customMessage?: string
  showStartShiftButton?: boolean
  onStartShift?: () => void
}

export default function ShiftGate({ 
  children, 
  moduleName = "this feature", 
  customMessage,
  showStartShiftButton = true,
  onStartShift 
}: ShiftGateProps) {
  const { isShiftActive, loading, currentShift } = useShift()
  const { profile, user } = useAuth()
  const { selectedBranch } = useBranch()

  // DEBUG: Log ShiftGate component state
  console.log('🏛️ ShiftGate Component Debug:', {
    isShiftActive,
    loading,
    currentShift: currentShift ? {
      id: currentShift.id,
      status: currentShift.status,
      name: currentShift.name
    } : null,
    moduleName,
    showStartShiftButton,
    hasOnStartShift: !!onStartShift,
    profile: profile ? {
      tenantId: profile.tenantId,
      displayName: profile.displayName
    } : null,
    user: user ? {
      uid: user.uid,
      email: user.email
    } : null,
    selectedBranch: selectedBranch ? {
      id: selectedBranch.id,
      name: selectedBranch.name
    } : null
  })

  // Handle starting a new shift directly from the gate
  const handleStartShiftFromGate = async () => {
    console.log('🚀 === START SHIFT FUNCTION CALLED ===')
    
    try {
      console.log('🚀 Step 1: Starting shift from ShiftGate...')
      console.log('🚀 Step 2: Debug info check...')
      console.log('Debug info:', {
        selectedBranch: selectedBranch?.id,
        tenantId: profile?.tenantId,
        userUid: user?.uid,
        userEmail: user?.email
      })

      if (!selectedBranch || !profile?.tenantId || !user?.uid) {
        const missing = []
        if (!selectedBranch) missing.push('selectedBranch')
        if (!profile?.tenantId) missing.push('tenantId')
        if (!user?.uid) missing.push('user.uid')
        
        console.error('❌ Missing required data:', missing)
        alert(`Missing required data to start shift: ${missing.join(', ')}`)
        return
      }

      console.log('🚀 Step 3: All required data present, proceeding...')
      const locationId = getBranchLocationId(selectedBranch.id)
      console.log('📍 Location ID generated:', locationId)
      
      const shiftsRef = collection(db, `tenants/${profile.tenantId}/locations/location_${locationId}/shifts`)
      const shiftsPath = `tenants/${profile.tenantId}/locations/location_${locationId}/shifts`
      console.log('📚 Shifts collection path:', shiftsPath)
      
      console.log('🚀 Step 4: Checking for existing active shifts...')
      // First, check for any existing active shifts and end them
      console.log('🔍 Querying for existing active shifts...')
      const activeShiftQuery = query(shiftsRef, where('status', '==', 'active'))
      console.log('🔍 Executing query...')
      const activeShiftSnapshot = await getDocs(activeShiftQuery)
      console.log('🔍 Query completed, found:', activeShiftSnapshot.size, 'active shifts')
      
      if (!activeShiftSnapshot.empty) {
        console.log(`⚠️ Found ${activeShiftSnapshot.size} existing active shift(s), ending them...`)
        const endPromises = activeShiftSnapshot.docs.map(async (shiftDoc) => {
          console.log(`🔄 Ending shift: ${shiftDoc.id}`)
          const shiftRef = doc(db, shiftsPath, shiftDoc.id)
          await updateDoc(shiftRef, {
            status: 'ended',
            endTime: serverTimestamp(),
            endedBy: user.uid,
            autoEnded: true,
            autoEndReason: 'New shift started'
          })
          console.log(`✅ Ended existing shift: ${shiftDoc.id}`)
        })
        await Promise.all(endPromises)
        console.log('✅ All existing shifts ended')
      } else {
        console.log('✅ No existing active shifts found')
      }
      
      console.log('🚀 Step 5: Creating new shift...')
      // Now create the new shift
      const newShift = {
        name: `${profile?.displayName || user.email?.split('@')[0] || 'User'}'s Shift`,
        createdBy: user.uid,
        locationId: locationId,
        status: 'active',
        startTime: serverTimestamp(),
        createdAt: serverTimestamp()
      }

      console.log('📝 New shift data prepared:', newShift)
      console.log('🚀 Step 6: Adding document to Firestore...')
      const docRef = await addDoc(shiftsRef, newShift)
      console.log('✅ New shift created with ID:', docRef.id)
      console.log('🚀 Step 7: Shift creation complete!')
      
      // Show success message
      alert('Shift started successfully! The page will reload to refresh the data.')
      console.log('🚀 Step 8: Showing success message and preparing to reload...')
      
      // Small delay to let the context update, then reload
      setTimeout(() => {
        console.log('🔄 Reloading page to refresh shift context...')
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('❌ === START SHIFT ERROR ===')
      console.error('❌ Failed to start shift from ShiftGate:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined
      
      console.error('Error details:', {
        message: errorMessage,
        code: errorCode,
        error: error
      })
      
      alert(`Failed to start shift: ${errorMessage}. Please try again or use the header button.`)
    }
    
    console.log('🚀 === START SHIFT FUNCTION COMPLETED ===')
  }

  // Show loading state while checking shift status
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Checking shift status...</p>
        </div>
      </div>
    )
  }

    // If shift is active, render children
  if (isShiftActive) {
    return <>{children}</>
  }

  // Show minimalist, Apple-inspired lock screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold text-gray-900 mb-3 tracking-tight">
          Start Your Shift
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          Begin your work session to access {moduleName.replace('the ', '')}
        </p>

        {/* CTA */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">
            Look for the <span className="font-medium text-gray-900">Start Shift</span> button
          </p>
          <p className="text-sm text-gray-400">
            in the header above
          </p>
        </div>
      </div>
    </div>
  )
}
