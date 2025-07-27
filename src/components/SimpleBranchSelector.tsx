'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/context/AuthContext'

export default function SimpleBranchSelector() {
  const { profile } = useAuth()
  const [branches, setBranches] = useState([
    { id: 'main', name: 'Main Store', type: 'main' },
    { id: 'branch1', name: 'Branch 1', type: 'branch' },
    { id: 'branch2', name: 'Branch 2', type: 'branch' }
  ])
  const [selectedBranch, setSelectedBranch] = useState('main')

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId)
    localStorage.setItem('selectedBranch', branchId)
    
    // Emit event to notify other components
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: branchId }))
    
    // Trigger a page refresh to apply the branch filter
    window.location.reload()
  }

  useEffect(() => {
    // Restore saved branch selection
    const saved = localStorage.getItem('selectedBranch')
    if (saved) {
      setSelectedBranch(saved)
    }
  }, [])

  if (!profile) return null

  return (
    <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
      <div className="text-sm font-medium text-gray-700">
        📍 Branch:
      </div>
      <select
        value={selectedBranch}
        onChange={(e) => handleBranchChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} {branch.type === 'main' ? '(Main)' : '(Branch)'}
          </option>
        ))}
      </select>
      
      <div className="text-xs text-gray-500">
        Current: {branches.find(b => b.id === selectedBranch)?.name}
      </div>
    </div>
  )
}
