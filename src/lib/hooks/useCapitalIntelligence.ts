'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBranch } from '../context/BranchContext'
import CapitalIntelligenceService, { CapitalMetrics } from '../services/capitalIntelligenceService'

interface UseCapitalIntelligenceOptions {
  refreshInterval?: number // in milliseconds
  autoRefresh?: boolean
}

interface UseCapitalIntelligenceReturn {
  data: CapitalMetrics | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

export function useCapitalIntelligence(
  options: UseCapitalIntelligenceOptions = {}
): UseCapitalIntelligenceReturn {
  const { refreshInterval = 300000, autoRefresh = true } = options // Default: 5 minutes
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  const [data, setData] = useState<CapitalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const serviceRef = useRef<CapitalIntelligenceService | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize service when dependencies are available
  useEffect(() => {
    if (profile?.tenantId && selectedBranch?.id) {
      serviceRef.current = new CapitalIntelligenceService(
        profile.tenantId,
        selectedBranch.id
      )
    } else {
      serviceRef.current = null
    }
  }, [profile?.tenantId, selectedBranch?.id])

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!serviceRef.current) {
      setError('Service not initialized')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const result = await serviceRef.current.getCapitalIntelligence()
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching capital intelligence data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Initial data fetch
  useEffect(() => {
    if (serviceRef.current) {
      fetchData()
    }
  }, [fetchData])

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval)
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, fetchData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated
  }
}

export default useCapitalIntelligence
