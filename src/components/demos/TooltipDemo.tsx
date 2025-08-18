'use client'

import React from 'react'
import { Tooltip } from '../ui/Tooltip'
import { Package, ShoppingCart, BarChart, HelpCircle, Info, Star } from 'lucide-react'

export default function TooltipDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          🎯 Tooltip Demo - CoreTrack UX Enhancements
        </h1>
        
        <div className="grid gap-8">
          {/* Basic Tooltips */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Basic Tooltips</h2>
            <div className="flex flex-wrap gap-4">
              
              <Tooltip content="Add new inventory items to track your stock levels" position="top">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Package className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </Tooltip>

              <Tooltip content="Process sales and manage customer orders" position="bottom">
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <ShoppingCart className="w-4 h-4" />
                  <span>POS System</span>
                </button>
              </Tooltip>

              <Tooltip content="View detailed analytics and sales reports" position="left">
                <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <BarChart className="w-4 h-4" />
                  <span>Analytics</span>
                </button>
              </Tooltip>

              <Tooltip content="Get help and support for this feature" position="right">
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  <HelpCircle className="w-4 h-4" />
                  <span>Help</span>
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Touch vs Hover Triggers */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Different Trigger Types</h2>
            <div className="flex flex-wrap gap-4">
              
              <Tooltip content="Touch/Click to show tooltip (mobile-friendly)" trigger="touch">
                <div className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-200">
                  📱 Touch Trigger
                </div>
              </Tooltip>

              <Tooltip content="Hover to show tooltip (desktop)" trigger="hover">
                <div className="px-4 py-3 bg-green-100 text-green-700 rounded-lg cursor-pointer hover:bg-green-200">
                  🖱️ Hover Trigger
                </div>
              </Tooltip>

              <Tooltip content="Click to toggle tooltip" trigger="click">
                <div className="px-4 py-3 bg-purple-100 text-purple-700 rounded-lg cursor-pointer hover:bg-purple-200">
                  👆 Click Trigger
                </div>
              </Tooltip>
            </div>
          </div>

          {/* With Icons */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Tooltips with Help Icons</h2>
            <div className="flex flex-wrap gap-4">
              
              <Tooltip content="This feature helps you manage inventory efficiently" showIcon>
                <span className="text-gray-700">Inventory Management</span>
              </Tooltip>

              <Tooltip content="Track your sales performance and trends" showIcon>
                <span className="text-gray-700">Sales Analytics</span>
              </Tooltip>

              <Tooltip content="Manage your team members and their permissions" showIcon>
                <span className="text-gray-700">Team Management</span>
              </Tooltip>
            </div>
          </div>

          {/* Long Content */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Long Content Tooltips</h2>
            <div className="flex flex-wrap gap-4">
              
              <Tooltip 
                content="CoreTrack is a comprehensive business management system designed for restaurants, cafes, and food businesses. It includes inventory tracking, point-of-sale, analytics, and much more to help you run your business efficiently."
                maxWidth="300px"
              >
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  About CoreTrack
                </button>
              </Tooltip>

              <Tooltip 
                content="Our advanced inventory system tracks stock levels in real-time, sends low-stock alerts, manages suppliers, and provides detailed reports to help you optimize your inventory management."
                maxWidth="350px"
                position="bottom"
              >
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Inventory Features
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Real-world Examples */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Real-world Usage Examples</h2>
            
            {/* Simulated form with tooltip help */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Product Name</label>
                <Tooltip content="Enter a clear, descriptive name for your product" position="top">
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </Tooltip>
              </div>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Premium Coffee Beans"
              />

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Minimum Stock Level</label>
                <Tooltip content="Set the minimum quantity before you receive low-stock alerts. We recommend setting this to 2-3 days of typical usage." position="top">
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </Tooltip>
              </div>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 10"
              />
            </div>
          </div>

          {/* Mobile Optimization Note */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start space-x-3">
              <Star className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Mobile-Optimized Features</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Touch-friendly triggers (default for mobile devices)</li>
                  <li>• Smart positioning to stay within viewport</li>
                  <li>• Optimized touch targets (44px minimum)</li>
                  <li>• Works great on iPad, Android tablets, and phones</li>
                  <li>• Auto-dismiss when tapping outside</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
