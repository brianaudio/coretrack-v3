/**
 * 🧪 Debugging Demo Component
 * This component demonstrates all our debugging techniques in action
 */

'use client'

import React, { useState } from 'react'
import { debugTrace, debugStep, debugValidation, debugError, debugSuccess, debugTimer, debugInspect } from '../lib/utils/debugHelper'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

export default function DebuggingDemo() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // 🎯 Demonstration of our debugging techniques
  const simulateUserLogin = async (email: string, password: string) => {
    // STEP 1: Trace function entry
    const stopTimer = debugTimer('User Login Simulation')
    
    debugTrace('simulateUserLogin', {
      email,
      hasPassword: !!password,
      passwordLength: password.length
    }, { 
      component: 'DebuggingDemo',
      sensitive: true 
    })

    setLoading(true)
    setError('')

    try {
      // STEP 2: Log process steps
      debugStep('Validating input parameters', {
        emailFormat: email.includes('@') ? 'valid' : 'invalid',
        passwordLength: password.length
      }, { component: 'DebuggingDemo' })

      // STEP 3: Validation with debugging
      const isValidEmail = email.includes('@') && email.includes('.')
      const isValidPassword = password.length >= 6

      debugValidation('Email format check', isValidEmail, {
        email: 'Email format check',
        hasAtSymbol: email.includes('@'),
        hasDot: email.includes('.')
      }, { component: 'DebuggingDemo', sensitive: true })

      debugValidation('Password length check', isValidPassword, {
        passwordLength: password.length,
        minimumRequired: 6
      }, { component: 'DebuggingDemo' })

      if (!isValidEmail || !isValidPassword) {
        const errorMsg = !isValidEmail ? 'Invalid email format' : 'Password too short'
        debugError(errorMsg, {
          emailValid: isValidEmail,
          passwordValid: isValidPassword
        }, { component: 'DebuggingDemo' })
        throw new Error(errorMsg)
      }

      // STEP 4: Simulate API call
      debugStep('Simulating API call', {
        endpoint: '/api/auth/login',
        method: 'POST'
      }, { component: 'DebuggingDemo' })

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // STEP 5: Process response
      const mockUser: User = {
        id: '123',
        name: email.split('@')[0],
        email: email,
        role: email.includes('admin') ? 'admin' : 'user'
      }

      debugInspect(mockUser, 'Mock User Object', { component: 'DebuggingDemo' })

      debugStep('Processing user data', {
        userId: mockUser.id,
        userName: mockUser.name,
        userRole: mockUser.role
      }, { component: 'DebuggingDemo', sensitive: true })

      // STEP 6: Success logging
      debugSuccess('User login completed successfully', {
        userId: mockUser.id,
        role: mockUser.role,
        loginTime: new Date().toISOString()
      }, { component: 'DebuggingDemo', level: 'success' })

      setUser(mockUser)

    } catch (err: any) {
      // STEP 7: Error handling with context
      debugError(err, {
        attemptedEmail: email,
        inputValid: {
          email: email.includes('@'),
          password: password.length >= 6
        },
        timestamp: new Date().toISOString()
      }, { component: 'DebuggingDemo', sensitive: true })

      setError(err.message)
    } finally {
      setLoading(false)
      stopTimer() // End performance measurement
    }
  }

  const handleBuggyFunction = () => {
    debugTrace('handleBuggyFunction', {}, { component: 'DebuggingDemo' })

    try {
      // Intentionally buggy code to demonstrate error debugging
      const data: any = null
      debugInspect(data, 'Data object before access', { component: 'DebuggingDemo' })
      
      // This will throw an error
      const result = data.someProperty.nestedProperty
      console.log(result)
    } catch (err: any) {
      debugError(err, {
        operation: 'Accessing nested property',
        dataType: typeof null,
        expectedStructure: 'object with someProperty.nestedProperty'
      }, { component: 'DebuggingDemo' })
    }
  }

  const testDataTypes = () => {
    debugTrace('testDataTypes', {}, { component: 'DebuggingDemo' })

    const testValues = [
      undefined,
      null,
      '',
      'hello',
      0,
      42,
      [],
      ['item1', 'item2'],
      {},
      { name: 'test', value: 123 }
    ]

    testValues.forEach((value, index) => {
      debugInspect(value, `Test Value ${index}`, { component: 'DebuggingDemo' })
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        🧪 Debugging Techniques Demo
      </h1>
      
      <p className="text-gray-600 mb-8">
        Open your browser&apos;s Developer Tools (F12) and check the Console tab to see our debugging techniques in action!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Login Simulation */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🔐 Login Simulation</h2>
          <p className="text-sm text-gray-600 mb-4">
            Test with: admin@test.com / password123
          </p>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const email = formData.get('email') as string
            const password = formData.get('password') as string
            simulateUserLogin(email, password)
          }} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full p-3 border rounded-lg"
              defaultValue="admin@test.com"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg"
              defaultValue="password123"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login (Check Console!)'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
              Error: {error}
            </div>
          )}

          {user && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700">
              Welcome, {user.name}! (Role: {user.role})
            </div>
          )}
        </div>

        {/* Error Testing */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🐛 Error Testing</h2>
          <p className="text-sm text-gray-600 mb-4">
            Test how our debugging handles errors
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleBuggyFunction}
              className="w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700"
            >
              Trigger Null Reference Error
            </button>
            
            <button
              onClick={testDataTypes}
              className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700"
            >
              Test Data Type Inspection
            </button>
            
            <button
              onClick={() => simulateUserLogin('invalid-email', '123')}
              className="w-full bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700"
            >
              Test Validation Errors
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          📖 How to Use This Demo
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-700">
          <li>Open Browser Developer Tools (F12)</li>
          <li>Go to the Console tab</li>
          <li>Click any of the buttons above</li>
          <li>Watch the structured debug output in the console</li>
          <li>Notice how errors are logged with context</li>
          <li>See performance timing information</li>
        </ol>
      </div>

      {/* Debugging Legend */}
      <div className="mt-6 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🎯 Debug Output Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span>🚀</span>
            <span>Function Entry</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>📋</span>
            <span>Process Step</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span>Validation Success</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>❌</span>
            <span>Error/Failure</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🔍</span>
            <span>Object Inspection</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>⏱️</span>
            <span>Performance Timer</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>Warning</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🛡️</span>
            <span>Sensitive Data Masked</span>
          </div>
        </div>
      </div>
    </div>
  )
}
