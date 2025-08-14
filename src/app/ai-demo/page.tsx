// CoreTrack AI Assistant Demo Page
// Test page to showcase the AI assistant functionality

'use client'

import React from 'react'
import AIAssistant from '@/components/AIAssistant'

export default function AIAssistantDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CoreTrack AI Assistant Demo
          </h1>
          <p className="text-xl text-gray-600">
            Experience the power of AI-powered customer support
          </p>
        </div>

        {/* Demo Content */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Features */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              🤖 AI Features
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Gemini Pro AI Integration
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Context-Aware Responses
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Role-Based Quick Actions
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Enterprise Learning System
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                iPad-First Design
              </li>
            </ul>
          </div>

          {/* Usage Guide */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              🚀 How to Use
            </h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex">
                <span className="text-blue-500 font-semibold mr-2">1.</span>
                Click the floating AI button (bottom-right corner)
              </li>
              <li className="flex">
                <span className="text-blue-500 font-semibold mr-2">2.</span>
                Ask questions about CoreTrack features
              </li>
              <li className="flex">
                <span className="text-blue-500 font-semibold mr-2">3.</span>
                Use quick action buttons for common tasks
              </li>
              <li className="flex">
                <span className="text-blue-500 font-semibold mr-2">4.</span>
                Get instant, contextual responses
              </li>
            </ol>
          </div>
        </div>

        {/* Sample Questions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            💬 Try These Sample Questions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Inventory</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>"How do I add new inventory?"</li>
                <li>"Check low stock items"</li>
                <li>"Generate inventory reports"</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">POS Operations</h3>
              <ul className="text-green-700 text-sm space-y-1">
                <li>"How to process orders?"</li>
                <li>"Setup payment methods"</li>
                <li>"Handle refunds"</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Team Management</h3>
              <ul className="text-purple-700 text-sm space-y-1">
                <li>"Add team members"</li>
                <li>"Manage user roles"</li>
                <li>"Setup shift management"</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-12 bg-gray-900 text-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">🔧 Technical Details</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-blue-300">Architecture</h3>
              <ul className="space-y-1 text-gray-300 text-sm">
                <li>• Next.js/React/TypeScript</li>
                <li>• Google Gemini Pro API</li>
                <li>• Tailwind CSS Styling</li>
                <li>• Mobile-First Responsive</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-300">Features</h3>
              <ul className="space-y-1 text-gray-300 text-sm">
                <li>• Enterprise Multi-Tenant</li>
                <li>• Context-Aware Responses</li>
                <li>• Knowledge Base Integration</li>
                <li>• Analytics & Learning</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Component */}
      <AIAssistant />
    </div>
  )
}
