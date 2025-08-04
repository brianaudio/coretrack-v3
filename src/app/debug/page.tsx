'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'

export default function DebugPage() {
  const { user, loading } = useAuth()
  const [testMode, setTestMode] = useState('landing')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Auth State:</h2>
        <p>Loading: {loading ? 'true' : 'false'}</p>
        <p>User: {user ? user.email : 'null'}</p>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Test Mode:</h2>
        <p>Current mode: {testMode}</p>
        <div className="space-x-2 mt-2">
          <button 
            onClick={() => {
              console.log('🔧 Setting mode to login')
              setTestMode('login')
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Sign In
          </button>
          <button 
            onClick={() => {
              console.log('🔧 Setting mode to signup')
              setTestMode('signup')
            }}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Test Get Started
          </button>
          <button 
            onClick={() => {
              console.log('🔧 Setting mode to landing')
              setTestMode('landing')
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Reset to Landing
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibr">Console Test:</h2>
        <button 
          onClick={() => {
            console.log('🔧 Console test button clicked!')
            alert('Button clicked - check console!')
          }}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Test Console
        </button>
      </div>
    </div>
  )
}
