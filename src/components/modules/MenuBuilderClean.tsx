'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

const MenuBuilderClean: React.FC = () => {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [activeTab, setActiveTab] = useState<'menu-items' | 'addons'>('menu-items')
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Load menu items
  useEffect(() => {
    if (profile?.tenantId && selectedBranch?.id) {
      // Load data here
      setLoading(false)
    }
  }, [profile?.tenantId, selectedBranch?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* Clean Minimalist Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
              <h1 className="text-2xl font-light text-gray-900 tracking-tight">Menu Builder</h1>
            </div>
            
            {/* Primary Action - Clean & Prominent */}
            <button className="inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:scale-[1.02]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Menu Item
            </button>
          </div>

          {/* Navigation Tabs - Clean Design */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('menu-items')}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'menu-items'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Menu Items
                {activeTab === 'menu-items' && (
                  <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('addons')}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'addons'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Add-ons
                {activeTab === 'addons' && (
                  <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>
            </div>

            {/* Secondary Actions - Minimal & Clean */}
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white border border-gray-200/60 hover:border-gray-300 rounded-lg transition-all duration-200 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
                Select
              </button>
              
              <button
                onClick={async () => {
                  if (!profile?.tenantId || !selectedBranch?.id) return;
                  
                  try {
                    console.log('🔄 Starting price sync...');
                    const { updateAllMenuItemCosts } = await import('../../lib/firebase/autoMenuPriceSync');
                    const updatedCount = await updateAllMenuItemCosts(profile.tenantId, selectedBranch.id);
                    alert(`✅ Updated ${updatedCount} menu items!`);
                  } catch (error) {
                    console.error('Error syncing menu prices:', error);
                    alert('❌ Error syncing menu prices. Please try again.');
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/60 hover:border-amber-300 rounded-lg transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Prices
              </button>

              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white border border-gray-200/60 hover:border-gray-300 rounded-lg transition-all duration-200 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Clean Stats Overview */}
        <div className="bg-white/60 backdrop-blur-sm border-t border-gray-200/50">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-sm font-semibold text-gray-900">{menuItems.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Active</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {menuItems.filter(item => item.status === 'active').length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">In Stock</span>
                <span className="text-sm font-semibold text-blue-600">0</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Low Stock</span>
                <span className="text-sm font-semibold text-orange-600">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Search & Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search menu items..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border-0 bg-gray-50/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
              />
            </div>
            <select className="px-4 py-2.5 text-sm border-0 bg-gray-50/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200">
              <option>All Categories</option>
            </select>
            <select className="px-4 py-2.5 text-sm border-0 bg-gray-50/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200">
              <option>All Status</option>
            </select>
          </div>

          {/* Empty State */}
          {menuItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 text-gray-300">
                <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                  <path d="M17 8H7V10H17V8ZM17 11H7V13H17V11ZM17 14H7V16H17V14Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3">No menu items yet</h3>
              <p className="text-gray-500 text-center mb-8 max-w-sm">
                Start building your menu by adding your first item
              </p>
              <button className="inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:scale-[1.02]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuBuilderClean
