'use client'

import { useState, useRef, useEffect } from 'react'
import { useBranch } from '../lib/context/BranchContext'

export default function BranchSelector() {
  const { branches, selectedBranch, setSelectedBranch, loading } = useBranch()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  if (loading || !selectedBranch) {
    return (
      <div className="flex items-center space-x-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
        <div className="w-4 h-4 bg-surface-300 rounded animate-pulse"></div>
        <div className="w-20 h-4 bg-surface-300 rounded animate-pulse"></div>
      </div>
    )
  }

  const handleBranchSelect = (branch: typeof branches[0]) => {
    setSelectedBranch(branch)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white border border-surface-200 rounded-lg px-4 py-2 shadow-sm hover:bg-surface-50 hover:border-surface-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {/* Branch Icon */}
        <div className="text-lg">
          {selectedBranch.icon}
        </div>
        
        {/* Branch Info */}
        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-surface-900 truncate">
              {selectedBranch.name}
            </span>
            {selectedBranch.isMain && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Main
              </span>
            )}
          </div>
          <span className="text-xs text-surface-500 truncate">
            {selectedBranch.manager}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            selectedBranch.status === 'active' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          
          {/* Dropdown Arrow */}
          <svg 
            className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-surface-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-surface-50 border-b border-surface-200">
            <h3 className="text-sm font-semibold text-surface-900">Select Branch</h3>
            <p className="text-xs text-surface-500">{branches.length} locations available</p>
          </div>

          {/* Branch List */}
          <div className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => handleBranchSelect(branch)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                  selectedBranch.id === branch.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                }`}
              >
                {/* Branch Icon */}
                <div className="text-lg flex-shrink-0">
                  {branch.icon}
                </div>
                
                {/* Branch Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-sm font-medium truncate ${
                      selectedBranch.id === branch.id ? 'text-primary-900' : 'text-surface-900'
                    }`}>
                      {branch.name}
                    </span>
                    {branch.isMain && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        Main
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-surface-500">
                    <span className="truncate">{branch.manager}</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        branch.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="capitalize">{branch.status}</span>
                    </div>
                  </div>

                  {/* Branch Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="text-surface-600">
                      <span className="font-medium">₱{(branch.stats.totalRevenue / 1000).toFixed(0)}k</span>
                      <span className="text-surface-400 ml-1">revenue</span>
                    </div>
                    <div className="text-surface-600">
                      <span className="font-medium">{branch.stats.totalOrders}</span>
                      <span className="text-surface-400 ml-1">orders</span>
                    </div>
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedBranch.id === branch.id && (
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-surface-50 border-t border-surface-200">
            <button 
              onClick={() => alert('Add New Branch functionality coming soon!')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add New Branch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
