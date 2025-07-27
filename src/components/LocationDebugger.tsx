'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/context/AuthContext'

export default function LocationDebugger() {
  const { profile } = useAuth()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const testLocations = async () => {
    if (!profile?.tenantId) {
      alert('Please log in first to test locations')
      return
    }

    setLoading(true)
    try {
      // Test creating a location
      const { createLocation } = await import('../lib/firebase/locationManagement')
      const testLocation = {
        tenantId: profile.tenantId,
        name: 'Test Location ' + Math.random().toString(36).substr(2, 5),
        type: 'branch' as const,
        status: 'active' as const,
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Philippines'
        },
        contact: {
          phone: '+63 2 1234 5678',
          email: 'test@test.com',
          manager: 'Test Manager'
        },
        settings: {
          timezone: 'Asia/Manila',
          currency: 'PHP',
          businessHours: {
            monday: { open: '09:00', close: '22:00', closed: false }
          },
          features: {
            inventory: true,
            pos: true,
            expenses: true
          }
        }
      }

      const locationId = await createLocation(testLocation)
      console.log('Created location:', locationId)
      
      // Now fetch all locations
      const { getLocations } = await import('../lib/firebase/locationManagement')
      const allLocations = await getLocations(profile.tenantId)
      setLocations(allLocations)
      
      alert(`Created location! Total locations: ${allLocations.length}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error)
    } finally {
      setLoading(false)
    }
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
          disabled={loading || !profile}
          className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create Test Location'}
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
