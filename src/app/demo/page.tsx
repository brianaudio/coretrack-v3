'use client'

import React from 'react'
import Dashboard from '../../components/Dashboard'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
        <p className="font-bold">Demo Mode</p>
        <p>Authentication bypassed for development testing</p>
      </div>
      <Dashboard />
    </div>
  )
}
