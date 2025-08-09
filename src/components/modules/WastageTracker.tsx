'use client'

import { useState, useEffect } from 'react'
import { useBranch } from '../../lib/context/BranchContext'
import { useAuth } from '../../lib/context/AuthContext'
import { 
  addWastageEntry, 
  uploadWastagePhoto, 
  getTodayWastageEntries, 
  checkWastageThresholds,
  WastageEntry 
} from '../../lib/firebase/wastageTracking'
import { InventoryItem } from '../../lib/firebase/inventory'
import { getBranchLocationId } from '../../lib/utils/branchUtils'

interface WastageTrackerProps {
  inventoryItems?: InventoryItem[]
}

export default function WastageTracker({ inventoryItems: propInventoryItems }: WastageTrackerProps = {}) {
  const { selectedBranch } = useBranch()
  const { profile } = useAuth()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [todayWastage, setTodayWastage] = useState<WastageEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState<'expired' | 'damaged' | 'spillage' | 'theft' | 'other'>('expired')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    if (selectedBranch?.id && profile?.tenantId) {
      loadData()
    }
  }, [selectedBranch?.id, profile?.tenantId, propInventoryItems])

  // Debug logging
  useEffect(() => {
    console.log("🐛 WastageTracker Debug:", {
      propInventoryItems: propInventoryItems?.length || 0,
      localInventoryItems: inventoryItems?.length || 0,
      selectedBranch: selectedBranch?.id,
      tenantId: profile?.tenantId,
      itemsWithStock: inventoryItems?.filter(item => (item.currentStock || 0) > 0)?.length || 0
    });
  }, [propInventoryItems, inventoryItems, selectedBranch, profile])

  const loadData = async () => {
    if (!selectedBranch?.id || !profile?.tenantId) return

    try {
      setIsLoading(true)
      
      // Use prop inventory items if available, otherwise they should be loaded in parent
      if (propInventoryItems && propInventoryItems.length > 0) {
        const itemsWithStock = propInventoryItems.filter(item => (item.currentStock || 0) > 0)
        setInventoryItems(itemsWithStock) // Only show items in stock
        console.log("✅ Using prop inventory items:", itemsWithStock.length, "items with stock");
      } else {
        console.log("❌ No prop inventory items available");
        setInventoryItems([])
      }

      // Load today's wastage
      const locationId = getBranchLocationId(selectedBranch.id)
      const wastage = await getTodayWastageEntries(profile.tenantId, locationId)
      setTodayWastage(wastage)

    } catch (error) {
      console.error('❌ Error loading wastage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => setPhotoPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedItem || !quantity || !reason || !selectedBranch?.id || !profile?.tenantId) {
      alert('Please fill in all required fields')
      return
    }

    const quantityNum = parseFloat(quantity)
    if (quantityNum <= 0 || quantityNum > (selectedItem.currentStock || 0)) {
      alert(`Quantity must be between 1 and ${selectedItem.currentStock || 0}`)
      return
    }

    try {
      setIsSubmitting(true)

      // Create wastage entry
      const wastageData = {
        tenantId: profile.tenantId,
        branchId: selectedBranch.id,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity: quantityNum,
        unitCost: selectedItem.costPerUnit || 0,
        totalCost: quantityNum * (selectedItem.costPerUnit || 0),
        reason,
        category,
        reportedBy: profile.uid,
        reportedByName: profile.displayName || profile.email,
        notes: notes || undefined,
        timestamp: new Date() as any, // Will be overridden in the service
        status: 'pending' as const
      }

      const wastageId = await addWastageEntry(wastageData)

      // Upload photo if provided
      let photoUrl = undefined
      if (photo) {
        photoUrl = await uploadWastagePhoto(photo, wastageId)
        // Update the wastage entry with photo URL
        // Note: You'd need to add an updateWastageEntry function to the wastageTracking service
      }

      // Check if this exceeds thresholds
      const locationId = getBranchLocationId(selectedBranch.id)
      const thresholdCheck = await checkWastageThresholds(
        profile.tenantId, 
        locationId, 
        selectedItem.id
      )

      if (thresholdCheck.exceeded) {
        alert(
          `⚠️ Wastage Alert!\n\n` +
          `${selectedItem.name} has exceeded the ${thresholdCheck.thresholdType} threshold.\n` +
          `Current: ${thresholdCheck.currentWastage} | Threshold: ${thresholdCheck.threshold}`
        )
      }

      // Reset form
      setSelectedItem(null)
      setQuantity('')
      setReason('')
      setCategory('expired')
      setNotes('')
      setPhoto(null)
      setPhotoPreview(null)

      // Reload data
      await loadData()

      alert('Wastage recorded successfully!')

    } catch (error) {
      console.error('❌ Error recording wastage:', error)
      alert('Error recording wastage. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTotalWasteValue = () => {
    return todayWastage.reduce((sum, entry) => sum + entry.totalCost, 0)
  }

  const getCategoryIcon = (cat: string) => {
    const icons = {
      expired: '⏰',
      damaged: '💔',
      spillage: '💧',
      theft: '🚨',
      other: '❓'
    }
    return icons[cat as keyof typeof icons] || '❓'
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-surface-200 rounded"></div>
            <div className="h-96 bg-surface-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">
          🗑️ Wastage & Shrinkage Tracking
        </h1>
        <p className="text-surface-600">
          Monitor and record inventory losses for {selectedBranch?.name}
        </p>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Today's Waste Items</p>
              <p className="text-2xl font-bold text-surface-900">
                {todayWastage.reduce((sum, entry) => sum + entry.quantity, 0)}
              </p>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Waste Value</p>
              <p className="text-2xl font-bold text-red-600">
                ₱{getTotalWasteValue().toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-600">Waste Entries</p>
              <p className="text-2xl font-bold text-surface-900">{todayWastage.length}</p>
            </div>
            <div className="text-3xl">📝</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Record Wastage Form */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">Record New Wastage</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Selection */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Select Item *
              </label>
              <select
                value={selectedItem?.id || ''}
                onChange={(e) => {
                  const item = inventoryItems.find(i => i.id === e.target.value)
                  setSelectedItem(item || null)
                }}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Choose an item...</option>
                {inventoryItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock: {item.currentStock}, Cost: ₱{item.costPerUnit || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Quantity Wasted *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                max={selectedItem?.currentStock || 0}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter quantity"
                required
              />
              {selectedItem && (
                <p className="text-xs text-surface-500 mt-1">
                  Available: {selectedItem.currentStock} | Cost per unit: ₱{selectedItem.costPerUnit || 0}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Waste Category *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'expired', label: '⏰ Expired', color: 'orange' },
                  { value: 'damaged', label: '💔 Damaged', color: 'red' },
                  { value: 'spillage', label: '💧 Spillage', color: 'blue' },
                  { value: 'theft', label: '🚨 Theft', color: 'purple' },
                  { value: 'other', label: '❓ Other', color: 'gray' }
                ].map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value as any)}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                      category === cat.value
                        ? `border-${cat.color}-500 bg-${cat.color}-50 text-${cat.color}-700`
                        : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Reason *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Brief description of what happened"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional additional details"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Photo Evidence (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {photoPreview && (
                <div className="mt-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg border border-surface-200"
                  />
                </div>
              )}
            </div>

            {/* Cost Calculation */}
            {selectedItem && quantity && (
              <div className="bg-surface-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-surface-700 mb-2">Cost Impact</h3>
                <div className="flex justify-between text-sm">
                  <span>Unit Cost:</span>
                  <span>₱{selectedItem.costPerUnit || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantity:</span>
                  <span>{quantity}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-red-600 border-t border-surface-200 pt-2 mt-2">
                  <span>Total Loss:</span>
                  <span>₱{(parseFloat(quantity) * (selectedItem.costPerUnit || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedItem || !quantity || !reason}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Recording...' : 'Record Wastage'}
            </button>
          </form>
        </div>

        {/* Today's Wastage List */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-xl font-semibold text-surface-900 mb-6">Today's Wastage</h2>
          
          {todayWastage.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-surface-600">No wastage recorded today!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {todayWastage.map(entry => (
                <div key={entry.id} className="border border-surface-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getCategoryIcon(entry.category)}</span>
                      <div>
                        <h3 className="font-medium text-surface-900">{entry.itemName}</h3>
                        <p className="text-sm text-surface-600">
                          {entry.quantity} items • ₱{entry.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'disputed'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-surface-100 text-surface-800'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-surface-700 mb-1">
                    <strong>Reason:</strong> {entry.reason}
                  </p>
                  
                  {entry.notes && (
                    <p className="text-sm text-surface-600 mb-2">
                      <strong>Notes:</strong> {entry.notes}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-surface-500">
                    <span>By: {entry.reportedByName}</span>
                    <span>{entry.timestamp.toDate().toLocaleTimeString()}</span>
                  </div>
                  
                  {entry.photoUrl && (
                    <div className="mt-2">
                      <img
                        src={entry.photoUrl}
                        alt="Wastage evidence"
                        className="w-full h-24 object-cover rounded border border-surface-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
