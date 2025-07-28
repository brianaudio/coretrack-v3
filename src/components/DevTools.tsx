'use client'

import { useState } from 'react'
import { useAuth } from '../lib/context/AuthContext'

export default function DevTools() {
  const { profile } = useAuth()
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeedData = async () => {
    if (!profile?.tenantId) {
      alert('No tenant ID found. Please log in first.')
      return
    }

    setIsSeeding(true)
    try {
      // Sample data seeding removed - implement actual data creation features
      alert('Data seeding feature has been removed. Use the regular interface to add data.')
    } catch (error) {
      console.error('Error:', error)
      alert('Feature not available.')
    } finally {
      setIsSeeding(false)
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-surface-800 text-white p-3 rounded-lg shadow-lg space-y-2">
        <p className="text-xs font-medium">Dev Tools</p>
        <button
          onClick={handleSeedData}
          disabled={isSeeding || !profile?.tenantId}
          className="block w-full text-left text-xs px-2 py-1 bg-primary-600 hover:bg-primary-700 disabled:bg-surface-600 disabled:cursor-not-allowed rounded transition-colors"
        >
          {isSeeding ? 'Seeding...' : 'Seed Sample Data'}
        </button>
      </div>
    </div>
  )
}
