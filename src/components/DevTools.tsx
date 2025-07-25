'use client'

import { useState } from 'react'
import { useAuth } from '../lib/context/AuthContext'
import { seedInventoryData } from '../lib/firebase/seedData'

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
      await seedInventoryData(profile.tenantId)
      alert('Sample inventory data has been added successfully!')
    } catch (error) {
      console.error('Error seeding data:', error)
      alert('Failed to seed data. Please check the console for errors.')
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
