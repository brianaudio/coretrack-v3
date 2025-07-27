'use client'

import { useState } from 'react'
import { useLocation } from '../lib/context/LocationContext'
import { Location } from '../lib/types/location'

interface LocationSelectionModalProps {
  isOpen: boolean
  onLocationSelected: (location: Location) => void
  userDisplayName?: string
}

export default function LocationSelectionModal({
  isOpen,
  onLocationSelected,
  userDisplayName
}: LocationSelectionModalProps) {
  const { locations, loading, setCurrentLocation } = useLocation()
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')

  const handleContinue = () => {
    const selectedLocation = locations.find(loc => loc.id === selectedLocationId)
    if (selectedLocation) {
      // Update the current location in context
      setCurrentLocation(selectedLocation)
      // Store the selection in localStorage for future sessions
      localStorage.setItem('lastSelectedLocationId', selectedLocation.id)
      // Call the callback
      onLocationSelected(selectedLocation)
    }
  }

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'main':
        return (
          <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        )
      case 'branch':
        return (
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        )
      case 'warehouse':
        return (
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
          </svg>
        )
      case 'kiosk':
        return (
          <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/>
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8 text-surface-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        )
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl transform rounded-xl bg-white p-8 shadow-2xl transition-all">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">
              Welcome back{userDisplayName ? `, ${userDisplayName}` : ''}!
            </h2>
            <p className="text-surface-600">
              Select your working location to continue to your dashboard
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-surface-600 mt-2">Loading locations...</p>
            </div>
          )}

          {/* No Locations */}
          {!loading && locations.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-surface-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-surface-900 mb-2">No Locations Available</h3>
              <p className="text-surface-600">Please contact your administrator to set up locations.</p>
            </div>
          )}

          {/* Location Selection */}
          {!loading && locations.length > 0 && (
            <>
              <div className="space-y-3 mb-8 max-h-96 overflow-y-auto">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className={`relative rounded-lg border-2 transition-all cursor-pointer hover:border-primary-300 ${
                      selectedLocationId === location.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-surface-200 bg-white hover:bg-surface-50'
                    }`}
                    onClick={() => setSelectedLocationId(location.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-4">
                        {/* Location Icon */}
                        <div className="flex-shrink-0">
                          {getLocationIcon(location.type)}
                        </div>
                        
                        {/* Location Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-surface-900 truncate">
                              {location.name}
                            </h3>
                            {getStatusBadge(location.status === 'active')}
                          </div>
                          
                          <div className="space-y-1 text-sm text-surface-600">
                            <p className="capitalize">
                              <span className="font-medium">Type:</span> {location.type}
                            </p>
                            {location.address && (
                              <p>
                                <span className="font-medium">Address:</span> {location.address.street}, {location.address.city}
                              </p>
                            )}
                            {location.contact?.phone && (
                              <p>
                                <span className="font-medium">Phone:</span> {location.contact.phone}
                              </p>
                            )}
                          </div>

                          {/* Business Hours Preview */}
                          {location.settings?.businessHours && Object.keys(location.settings.businessHours).length > 0 && (
                            <div className="mt-2 text-xs text-surface-500">
                              <span className="font-medium">Today:</span>{' '}
                              {(() => {
                                const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
                                const todayHours = location.settings.businessHours[today];
                                return todayHours && !todayHours.closed
                                  ? `${todayHours.open} - ${todayHours.close}`
                                  : 'Closed';
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        <div className="flex-shrink-0">
                          <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                            selectedLocationId === location.id
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-surface-300'
                          }`}>
                            {selectedLocationId === location.id && (
                              <svg className="w-3 h-3 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleContinue}
                  disabled={!selectedLocationId}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedLocationId
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-surface-200 text-surface-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
