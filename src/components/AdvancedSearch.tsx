'use client'

import { useState, useEffect } from 'react'

interface AdvancedSearchProps {
  onSearch: (searchTerm: string, filters: SearchFilters) => void
  placeholder?: string
  filters?: FilterOption[]
  className?: string
}

interface FilterOption {
  key: string
  label: string
  type: 'select' | 'date' | 'range' | 'boolean'
  options?: { value: string; label: string }[]
  min?: number
  max?: number
}

interface SearchFilters {
  [key: string]: any
}

export default function AdvancedSearch({ 
  onSearch, 
  placeholder = "Search...", 
  filters = [],
  className = ""
}: AdvancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      onSearch(searchTerm, appliedFilters)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, appliedFilters, onSearch])

  const handleFilterChange = (filterKey: string, value: any) => {
    setAppliedFilters(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }

  const clearFilters = () => {
    setAppliedFilters({})
    setSearchTerm('')
  }

  const activeFilterCount = Object.values(appliedFilters).filter(value => 
    value !== '' && value !== null && value !== undefined
  ).length

  const renderFilterInput = (filter: FilterOption) => {
    const value = appliedFilters[filter.key] || ''

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full input-field text-sm"
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full input-field text-sm"
          />
        )

      case 'range':
        return (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              min={filter.min}
              max={filter.max}
              value={value.min || ''}
              onChange={(e) => handleFilterChange(filter.key, { ...value, min: e.target.value })}
              className="w-full input-field text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              min={filter.min}
              max={filter.max}
              value={value.max || ''}
              onChange={(e) => handleFilterChange(filter.key, { ...value, max: e.target.value })}
              className="w-full input-field text-sm"
            />
          </div>
        )

      case 'boolean':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full input-field text-sm"
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full input-field text-sm"
            placeholder={`Filter by ${filter.label.toLowerCase()}`}
          />
        )
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`input-field pl-10 pr-12 ${isMobile ? 'text-base' : 'text-sm'}`}
            placeholder={placeholder}
          />
          {(searchTerm || activeFilterCount > 0) && (
            <button
              onClick={clearFilters}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        {filters.length > 0 && (
          <div className="absolute right-0 top-0 h-full flex items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`mr-10 p-2 rounded-lg transition-colors relative ${
                showFilters || activeFilterCount > 0
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'
              }`}
              title="Toggle filters"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && filters.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-900">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className={`grid gap-4 ${
            isMobile 
              ? 'grid-cols-1' 
              : filters.length <= 2 
                ? 'grid-cols-2' 
                : filters.length <= 3 
                  ? 'grid-cols-3' 
                  : 'grid-cols-4'
          }`}>
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <label className="block text-sm font-medium text-surface-700">
                  {filter.label}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Summary (Mobile) */}
      {isMobile && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(appliedFilters)
            .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
            .map(([key, value]) => {
              const filter = filters.find(f => f.key === key)
              const displayValue = filter?.type === 'select' 
                ? filter.options?.find(opt => opt.value === value)?.label || value
                : typeof value === 'object' 
                  ? `${value.min || '0'} - ${value.max || '∞'}`
                  : value

              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full"
                >
                  {filter?.label}: {displayValue}
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )
            })}
        </div>
      )}
    </div>
  )
}
