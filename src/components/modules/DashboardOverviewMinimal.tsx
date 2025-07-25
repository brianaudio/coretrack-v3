'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'

export default function DashboardOverviewMinimal() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-surface-900">CoreTrack Dashboard</h1>
        <p className="text-surface-600 mt-1">
          Welcome to your business inventory management system
        </p>
      </div>
    </div>
  )
}
