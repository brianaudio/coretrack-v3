'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocation } from '../lib/context/LocationContext'
import { Location } from '../lib/types/location'

export default function LocationSwitcher() {
  const { currentLocation, locations, setCurrentLocation } = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  console.log('🏢 LocationSwitcher: Rendering with', locations.length, 'locations, current:', currentLocation?.name)

  // Don't render if no locations
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!locations || locations.length === 0) {
    console.log('🏢 LocationSwitcher: No locations available, not rendering')
    return null
  }

  const handleLocationChange = (location: Location) => {
    setCurrentLocation(location)
    setIsOpen(false)
    
    // Store selection in localStorage for next login
    localStorage.setItem('lastSelectedLocationId', location.id)
  }

  const getLocationIcon = (type: string, className: string = "w-4 h-4") => {
    switch (type) {
      case 'main':
        return (
          <svg className={`${className} text-primary-600`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        )
      case 'branch':
        return (
          <svg className={`${className} text-blue-600`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        )
      case 'warehouse':
        return (
          <svg className={`${className} text-green-600`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
          </svg>
        )
      case 'kiosk':
        return (
          <svg className={`${className} text-purple-600`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/>
          </svg>
        )
      default:
        return (
          <svg className={`${className} text-surface-600`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        )
    }
  }

  const getStatusIndicator = (status: string) => {
    const colors = {
      active: 'bg-green-400',
      inactive: 'bg-gray-400',
      maintenance: 'bg-yellow-400'
    }
    return <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-400'}`} />
  }

  if (!currentLocation || locations.length <= 1) {
    return null // Don't show if no location selected or only one location
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Location Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {getLocationIcon(currentLocation.type)}
        <span className="font-medium text-surface-900 max-w-[120px] truncate">
          {currentLocation.name}
        </span>
        <svg
          className={`w-4 h-4 text-surface-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-surface-200 z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-surface-500 px-3 py-2 uppercase tracking-wide">
              Switch Location
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationChange(location)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                    location.id === currentLocation.id
                      ? 'bg-primary-50 text-primary-900'
                      : 'hover:bg-surface-50 text-surface-900'
                  }`}
                >
                  {/* Location Icon */}
                  <div className="flex-shrink-0">
                    {getLocationIcon(location.type)}
                  </div>
                  
                  {/* Location Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {location.name}
                      </p>
                      {getStatusIndicator(location.status)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-surface-500">
                      <span className="capitalize">{location.type}</span>
                      {location.address && (
                        <>
                          <span>•</span>
                          <span className="truncate">{location.address.city}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {location.id === currentLocation.id && (
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
