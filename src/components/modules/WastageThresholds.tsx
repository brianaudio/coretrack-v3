'use client'

import { useState, useEffect } from 'react'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { 
  getWastageThresholds, 
  updateWastageThreshold,
  WastageThreshold 
} from '../../lib/firebase/wastageTracking'
import { InventoryItem } from '../../lib/firebase/inventory'
import { getBranchLocationId } from '../../lib/utils/branchUtils'

interface WastageThresholdsProps {
  inventoryItems?: InventoryItem[]
}

export default function WastageThresholds({ inventoryItems: propInventoryItems }: WastageThresholdsProps = {}) {
  const { selectedBranch } = useBranch()
  const { profile } = useAuth()
  const [thresholds, setThresholds] = useState<WastageThreshold[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingThreshold, setEditingThreshold] = useState<WastageThreshold | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Load data
  useEffect(() => {
    if (selectedBranch?.id && profile?.tenantId) {
      loadData()
    }
  }, [selectedBranch?.id, profile?.tenantId, propInventoryItems])

  const loadData = async () => {
    if (!selectedBranch?.id || !profile?.tenantId) return

    try {
      setIsLoading(true)
      
      // Load existing thresholds
      const locationId = getBranchLocationId(selectedBranch.id)
      const existingThresholds = await getWastageThresholds(profile.tenantId, locationId)
      setThresholds(existingThresholds)

      // Use prop inventory items if available
      if (propInventoryItems) {
        setInventoryItems(propInventoryItems)
      }

    } catch (error) {
      console.error('❌ Error loading threshold data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateThreshold = (item: InventoryItem) => {
    const newThreshold: WastageThreshold = {
      tenantId: profile!.tenantId,
      branchId: selectedBranch!.id,
      itemId: item.id,
      itemName: item.name,
      dailyThreshold: 1,
      weeklyThreshold: 5,
      monthlyThreshold: 20,
      alertEnabled: true,
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    }
    
    setEditingThreshold(newThreshold)
    setIsModalOpen(true)
  }

  const handleEditThreshold = (threshold: WastageThreshold) => {
    setEditingThreshold(threshold)
    setIsModalOpen(true)
  }

  const handleSaveThreshold = async () => {
    if (!editingThreshold) return

    try {
      await updateWastageThreshold(editingThreshold)
      await loadData() // Reload data
      setIsModalOpen(false)
      setEditingThreshold(null)
      alert('Threshold saved successfully!')
    } catch (error) {
      console.error('❌ Error saving threshold:', error)
      alert('Error saving threshold. Please try again.')
    }
  }

  const getItemsWithoutThresholds = () => {
    return inventoryItems.filter(item => 
      !thresholds.some(threshold => threshold.itemId === item.id)
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-surface-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">
          ⚠️ Wastage Alert Thresholds
        </h1>
        <p className="text-surface-600">
          Set custom alert thresholds for inventory items in {selectedBranch?.name}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Total Items</p>
              <p className="text-2xl font-bold text-surface-900">{inventoryItems.length}</p>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">With Thresholds</p>
              <p className="text-2xl font-bold text-green-600">{thresholds.length}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Active Alerts</p>
              <p className="text-2xl font-bold text-orange-600">
                {thresholds.filter(t => t.alertEnabled).length}
              </p>
            </div>
            <div className="text-3xl">🔔</div>
          </div>
        </div>
      </div>

      {/* Existing Thresholds */}
      {thresholds.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">Current Thresholds</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-3 px-4 font-medium text-surface-700">Item</th>
                  <th className="text-center py-3 px-4 font-medium text-surface-700">Daily</th>
                  <th className="text-center py-3 px-4 font-medium text-surface-700">Weekly</th>
                  <th className="text-center py-3 px-4 font-medium text-surface-700">Monthly</th>
                  <th className="text-center py-3 px-4 font-medium text-surface-700">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-surface-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map(threshold => (
                  <tr key={threshold.id || threshold.itemId} className="border-b border-surface-100">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-surface-900">{threshold.itemName}</p>
                        <p className="text-sm text-surface-500">ID: {threshold.itemId.slice(-8)}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        {threshold.dailyThreshold}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        {threshold.weeklyThreshold}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {threshold.monthlyThreshold}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                        threshold.alertEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-surface-100 text-surface-800'
                      }`}>
                        {threshold.alertEnabled ? '🔔 Active' : '🔕 Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleEditThreshold(threshold)}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Items Without Thresholds */}
      {getItemsWithoutThresholds().length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">
            Items Without Thresholds ({getItemsWithoutThresholds().length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getItemsWithoutThresholds().map(item => (
              <div key={item.id} className="border border-surface-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-surface-900">{item.name}</h3>
                    <p className="text-sm text-surface-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-surface-900">
                      Stock: {item.currentStock}
                    </p>
                    <p className="text-xs text-surface-500">
                      ₱{item.costPerUnit || 0}/unit
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleCreateThreshold(item)}
                  className="w-full bg-primary-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Set Threshold
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for editing thresholds */}
      {isModalOpen && editingThreshold && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">
              {editingThreshold.id ? 'Edit' : 'Create'} Threshold: {editingThreshold.itemName}
            </h3>
            
            <div className="space-y-4">
              {/* Daily Threshold */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Daily Threshold (items)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingThreshold.dailyThreshold}
                  onChange={(e) => setEditingThreshold({
                    ...editingThreshold,
                    dailyThreshold: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Weekly Threshold */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Weekly Threshold (items)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingThreshold.weeklyThreshold}
                  onChange={(e) => setEditingThreshold({
                    ...editingThreshold,
                    weeklyThreshold: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Monthly Threshold */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Monthly Threshold (items)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingThreshold.monthlyThreshold}
                  onChange={(e) => setEditingThreshold({
                    ...editingThreshold,
                    monthlyThreshold: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Alert Enabled */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="alertEnabled"
                  checked={editingThreshold.alertEnabled}
                  onChange={(e) => setEditingThreshold({
                    ...editingThreshold,
                    alertEnabled: e.target.checked
                  })}
                  className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="alertEnabled" className="ml-2 text-sm text-surface-700">
                  Enable alerts for this item
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingThreshold(null)
                }}
                className="flex-1 py-2 px-4 border border-surface-300 rounded-lg text-surface-700 font-medium hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThreshold}
                className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Save Threshold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {inventoryItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-surface-900 mb-2">No Inventory Items</h3>
          <p className="text-surface-600">Add inventory items to set wastage thresholds.</p>
        </div>
      )}
    </div>
  )
}
