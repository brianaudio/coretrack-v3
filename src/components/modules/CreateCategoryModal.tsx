'use client'

import React, { useState } from 'react'
import { MenuCategory } from '@/lib/types/menu'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (category: Omit<MenuCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  existingCategories: MenuCategory[]
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingCategories
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order: existingCategories.length + 1,
    isActive: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // Validate
    if (!formData.name.trim()) {
      setError('Category name is required')
      return
    }

    if (existingCategories.some(cat => cat.name.toLowerCase() === formData.name.toLowerCase())) {
      setError('A category with this name already exists')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        order: formData.order,
        isActive: formData.isActive
      })
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        order: existingCategories.length + 2,
        isActive: true
      })
      
      onClose()
    } catch (error) {
      console.error('Error creating category:', error)
      setError('Failed to create category. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      order: existingCategories.length + 1,
      isActive: true
    })
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-surface-900 bg-opacity-50 transition-opacity" onClick={handleClose} />
        
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
            <h3 className="text-lg font-semibold text-surface-900">Create Category</h3>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Category Name */}
              <div>
                <label htmlFor="categoryName" className="block text-sm font-medium text-surface-700 mb-2">
                  Category Name *
                </label>
                <input
                  id="categoryName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    setError('')
                  }}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Appetizers, Main Courses, Desserts"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="categoryDescription" className="block text-sm font-medium text-surface-700 mb-2">
                  Description
                </label>
                <textarea
                  id="categoryDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Brief description of the category..."
                />
              </div>

              {/* Display Order */}
              <div>
                <label htmlFor="categoryOrder" className="block text-sm font-medium text-surface-700 mb-2">
                  Display Order
                </label>
                <input
                  id="categoryOrder"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-surface-500 mt-1">
                  Lower numbers appear first in the menu
                </p>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
                  />
                  <span className="ml-2 text-sm text-surface-700">Category is active</span>
                </label>
                <p className="text-xs text-surface-500 mt-1">
                  Inactive categories won't be shown in the menu
                </p>
              </div>

              {/* Existing Categories Preview */}
              {existingCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Existing Categories
                  </label>
                  <div className="bg-surface-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <div className="space-y-1">
                      {existingCategories
                        .sort((a, b) => a.order - b.order)
                        .map((category) => (
                          <div key={category.id} className="flex items-center justify-between text-sm">
                            <span className={`${category.isActive ? 'text-surface-900' : 'text-surface-400'}`}>
                              {category.order}. {category.name}
                            </span>
                            {!category.isActive && (
                              <span className="text-xs text-surface-400 bg-surface-200 px-1.5 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-200 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-surface-700 hover:text-surface-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateCategoryModal
