'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getLocations } from '../firebase/locationManagement'
import { Location } from '../types/location'

interface LocationContextType {
  currentLocation: Location | null
  setCurrentLocation: (location: Location | null) => void
  locations: Location[]
  loading: boolean
  refreshLocations: () => Promise<void>
  showLocationSelection: boolean
  setShowLocationSelection: (show: boolean) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

interface LocationProviderProps {
  children: ReactNode
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const { profile } = useAuth()
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showLocationSelection, setShowLocationSelection] = useState(false)

  const refreshLocations = async () => {
    if (!profile?.tenantId) {
      return
    }

    try {
      setLoading(true)
      const fetchedLocations = await getLocations(profile.tenantId)
      
      // If no locations exist, create a default main location
      if (fetchedLocations.length === 0) {
        try {
          const defaultLocation: Omit<Location, 'id' | 'createdAt' | 'updatedAt'> = {
            tenantId: profile.tenantId,
            name: 'Main Store',
            type: 'main',
            status: 'active',
            address: {
              street: '123 Main Street',
              city: 'Manila',
              state: 'Metro Manila',
              zipCode: '1000',
              country: 'Philippines'
            },
            contact: {
              phone: '+63 2 1234 5678',
              email: 'main@yourstore.com',
              manager: 'Store Manager'
            },
            settings: {
              timezone: 'Asia/Manila',
              currency: 'PHP',
              businessHours: {
                monday: { open: '09:00', close: '22:00', closed: false },
                tuesday: { open: '09:00', close: '22:00', closed: false },
                wednesday: { open: '09:00', close: '22:00', closed: false },
                thursday: { open: '09:00', close: '22:00', closed: false },
                friday: { open: '09:00', close: '22:00', closed: false },
                saturday: { open: '09:00', close: '22:00', closed: false },
                sunday: { open: '10:00', close: '20:00', closed: false }
              },
              features: {
                inventory: true,
                pos: true,
                expenses: true
              }
            }
          }
          
          // Import the createLocation function
          const { createLocation } = await import('../firebase/locationManagement')
          const createdLocationId = await createLocation(defaultLocation)
          
          // Fetch locations again to get the newly created one
          const updatedLocations = await getLocations(profile.tenantId)
          setLocations(updatedLocations)
          
          // Set the newly created location as current
          if (updatedLocations.length > 0) {
            setCurrentLocation(updatedLocations[0])
          }
        } catch (error) {
          console.error('🏢 LocationContext: Error creating default location:', error)
          setLocations(fetchedLocations) // Set empty array
        }
      } else {
        setLocations(fetchedLocations)
      }
      
      // If no current location is set and we have locations, set based on preference
      if (!currentLocation && fetchedLocations.length > 0) {
        // Try to restore last selected location from localStorage
        const lastSelectedLocationId = localStorage.getItem('lastSelectedLocationId')
        let locationToSelect = null
        
        if (lastSelectedLocationId) {
          locationToSelect = fetchedLocations.find(loc => loc.id === lastSelectedLocationId)
        }
        
        // Fallback: find main location, then first active location, then any location
        if (!locationToSelect) {
          locationToSelect = fetchedLocations.find(loc => loc.type === 'main') ||
                            fetchedLocations.find(loc => loc.status === 'active') ||
                            fetchedLocations[0]
        }
        
        setCurrentLocation(locationToSelect)
      }
    } catch (error) {
      console.error('🏢 LocationContext: Error in refreshLocations:', error)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshLocations()
  }, [profile?.tenantId])

  const value = {
    currentLocation,
    setCurrentLocation,
    locations,
    loading,
    showLocationSelection,
    setShowLocationSelection,
    refreshLocations
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}
