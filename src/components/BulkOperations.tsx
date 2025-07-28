'use client'

import { useState, useEffect } from 'react'

interface BulkOperationsProps<T> {
  items: T[]
  selectedItems: T[]
  onSelectionChange: (items: T[]) => void
  operations: BulkOperation<T>[]
  className?: string
  idField?: keyof T
}

interface BulkOperation<T> {
  id: string
  label: string
  icon: React.ReactNode
  action: (items: T[]) => Promise<void> | void
  confirmMessage?: string
  disabled?: (items: T[]) => boolean
  color?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success'
}

export default function BulkOperations<T>({
  items,
  selectedItems,
  onSelectionChange,
  operations,
  className = "",
  idField = 'id' as keyof T
}: BulkOperationsProps<T>) {
  const [isExecuting, setIsExecuting] = useState<string | null>(null)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(items)
    }
  }

  const handleSelectItem = (item: T) => {
    const isSelected = selectedItems.some(selected => 
      selected[idField] === item[idField]
    )
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter(selected => 
        selected[idField] !== item[idField]
      ))
    } else {
      onSelectionChange([...selectedItems, item])
    }
  }

  const executeOperation = async (operation: BulkOperation<T>) => {
    if (selectedItems.length === 0) return
    
    if (operation.disabled?.(selectedItems)) return

    if (operation.confirmMessage) {
      const confirmed = window.confirm(
        operation.confirmMessage.replace('{count}', selectedItems.length.toString())
      )
      if (!confirmed) return
    }

    try {
      setIsExecuting(operation.id)
      await operation.action(selectedItems)
      onSelectionChange([]) // Clear selection after operation
      setShowMobileActions(false)
    } catch (error) {
      console.error(`Error executing bulk operation ${operation.id}:`, error)
      alert(`Failed to execute ${operation.label}. Please try again.`)
    } finally {
      setIsExecuting(null)
    }
  }

  const getColorClasses = (color: string = 'primary') => {
    switch (color) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-600'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600'
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600'
      case 'secondary':
        return 'bg-surface-100 hover:bg-surface-200 text-surface-700 border-surface-300'
      default:
        return 'bg-primary-600 hover:bg-primary-700 text-white border-primary-600'
    }
  }

  if (items.length === 0) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selection Controls */}
      <div className="flex items-center justify-between p-4 bg-white border border-surface-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length && items.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
            />
            <label className="ml-2 text-sm text-surface-700">
              {selectedItems.length === 0
                ? `Select all (${items.length})`
                : selectedItems.length === items.length
                ? `All ${items.length} selected`
                : `${selectedItems.length} of ${items.length} selected`
              }
            </label>
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            {isMobile ? (
              <button
                onClick={() => setShowMobileActions(!showMobileActions)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <span>Actions</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showMobileActions ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              operations.map((operation) => (
                <button
                  key={operation.id}
                  onClick={() => executeOperation(operation)}
                  disabled={isExecuting !== null || operation.disabled?.(selectedItems)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${getColorClasses(operation.color)}
                  `}
                >
                  {isExecuting === operation.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    operation.icon
                  )}
                  <span className="hidden sm:inline">{operation.label}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Mobile Actions Dropdown */}
      {isMobile && showMobileActions && selectedItems.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl shadow-lg overflow-hidden">
          {operations.map((operation, index) => (
            <button
              key={operation.id}
              onClick={() => executeOperation(operation)}
              disabled={isExecuting !== null || operation.disabled?.(selectedItems)}
              className={`
                w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-surface-50
                ${index !== operations.length - 1 ? 'border-b border-surface-100' : ''}
              `}
            >
              {isExecuting === operation.id ? (
                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className={`text-${operation.color === 'danger' ? 'red' : operation.color === 'warning' ? 'yellow' : operation.color === 'success' ? 'green' : 'primary'}-600`}>
                  {operation.icon}
                </div>
              )}
              <div>
                <p className="font-medium text-surface-900">{operation.label}</p>
                <p className="text-sm text-surface-500">{selectedItems.length} items selected</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selection Helper */}
      <div className="text-xs text-surface-500 px-4">
        💡 Tip: {isMobile ? 'Tap' : 'Click'} on items below to select them for bulk operations
      </div>
    </div>
  )
}

// Helper component for item selection
export function SelectableItem<T>({
  item,
  isSelected,
  onSelect,
  children,
  className = ""
}: {
  item: T
  isSelected: boolean
  onSelect: (item: T) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'ring-2 ring-primary-500 bg-primary-50 border-primary-200' 
          : 'hover:bg-surface-50 border-surface-200'
        }
        ${className}
      `}
      onClick={() => onSelect(item)}
    >
      {/* Selection Indicator */}
      <div className="absolute top-3 left-3 z-10">
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${isSelected 
              ? 'bg-primary-600 border-primary-600' 
              : 'border-surface-300 bg-white hover:border-surface-400'
            }
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content with left padding for selection indicator */}
      <div className="pl-10">
        {children}
      </div>
    </div>
  )
}
