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

  // If shift is active, show the actual content
  if (isShiftActive && currentShift && children) {
    return <>{children}</>
  }

  // Show shift gate notification when no active shift or no children provided
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full text-center border border-orange-200/50">
        
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          {/* Floating rings animation */}
          <div className="absolute inset-0 animate-ping">
            <div className="w-32 h-32 border-4 border-orange-400 rounded-full opacity-20"></div>
          </div>
          <div className="absolute inset-2 animate-ping" style={{ animationDelay: '0.5s' }}>
            <div className="w-28 h-28 border-2 border-orange-300 rounded-full opacity-30"></div>
          </div>
        </div>

        {/* Main Message */}
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          🚀 Ready to Start Working?
        </h2>
        
        <p className="text-xl text-gray-600 mb-2">
          {customMessage || `You need to start your shift first to access ${moduleName}`}
        </p>
        
        <p className="text-lg text-gray-500 mb-8">
          Click the <strong className="text-green-600">"Start Shift"</strong> button in the header to begin your work session
        </p>

        {/* User Info */}
        {profile && (
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold text-gray-700">
                Welcome, {profile.displayName || profile.email?.split('@')[0] || 'User'}!
              </span>
            </div>
            <div className="text-gray-500 text-sm">
              Ready to start your shift and begin {moduleName}?
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <span className="text-green-800 font-medium">Look for the "Start Shift" button in the top-right corner</span>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">2</span>
            </div>
            <span className="text-green-800 font-medium">Click it to create a new work shift</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <span className="text-green-800 font-medium">Enjoy full access to all CoreTrack features!</span>
          </div>
        </div>

        {/* Optional custom action button */}
        {showStartShiftButton && (
          <button
            onClick={() => {
              console.log('🚨 START SHIFT BUTTON CLICKED!')
              alert('Start Shift button clicked - check console for details')
              if (onStartShift) {
                console.log('🔄 Calling custom onStartShift function...')
                onStartShift()
              } else {
                console.log('🔄 Calling handleStartShiftFromGate function...')
                handleStartShiftFromGate()
              }
            }}
            className="mt-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v5a2 2 0 002 2z" />
            </svg>
            Start My Shift Now
          </button>
        )}

      </div>
    </div>
  )
}
