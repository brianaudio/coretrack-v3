'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/context/AuthContext'

export default function LocationDebugger() {
  const { profile } = useAuth()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const testLocations = async () => {
    // Test location creation disabled - use branch management instead
    alert('Test location creation has been disabled. Use the branch management system instead.')
    return
  }

  const fetchLocations = async () => {
    if (!profile?.tenantId) return

    try {
      const { getLocations } = await import('../lib/firebase/locationManagement')
      const allLocations = await getLocations(profile.tenantId)
      setLocations(allLocations)
      console.log('Fetched locations:', allLocations)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  useEffect(() => {
    if (profile?.tenantId) {
      fetchLocations()
    }
  }, [profile?.tenantId])

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-blue-900 mb-2">🔧 Location Debugger</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Logged in:</strong> {profile ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Tenant ID:</strong> {profile?.tenantId || 'None'}
        </div>
        <div>
          <strong>Locations:</strong> {locations.length}
        </div>
        
        {locations.length > 0 && (
          <div className="max-h-32 overflow-y-auto">
            {locations.map((loc, index) => (
              <div key={index} className="text-xs bg-gray-100 p-1 rounded">
                {loc.name} ({loc.type})
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <button
          onClick={testLocations}
          disabled={true}
          className="w-full bg-gray-400 text-white px-3 py-1 rounded text-sm cursor-not-allowed"
        >
          Test Location Creation (Disabled)
        </button>
        
        <button
          onClick={fetchLocations}
          disabled={!profile}
          className="w-full bg-green-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
        >
          Refresh Locations
        </button>
      </div>
    </div>
  )
}
