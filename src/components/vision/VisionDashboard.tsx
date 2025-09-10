'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getPOSOrders, getPOSItems, POSOrder, POSItem } from '../../lib/firebase/pos'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import VisionHeader from './VisionHeader'
import VisionAuth from './VisionAuth'
import FinancialMetrics from './FinancialMetrics'
import RecentOrdersFeed from './RecentOrdersFeed'
import SalesAnalytics from './SalesAnalytics'

interface SalesData {
  todayRevenue: number
  todayOrders: number
  cashCollected: number
  yesterdayComparison: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
  category?: string
}

const VisionDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth()
  const { selectedBranch, branches } = useBranch()
  
  // State management
  const [orders, setOrders] = useState<POSOrder[]>([])
  const [posItems, setPosItems] = useState<POSItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Calculate sales data for today
  const salesData: SalesData = useMemo(() => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    const todayOrders = orders.filter(order => {
      if (order.status !== 'completed') return false
      try {
        const orderDate = order.createdAt?.toDate?.() || new Date()
        return orderDate >= startOfDay
      } catch {
        return false
      }
    })

    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const cashOrders = todayOrders.filter(order => order.paymentMethod.toLowerCase().includes('cash'))
    const cashCollected = cashOrders.reduce((sum, order) => sum + order.total, 0)

    // Simple comparison - you can enhance this with yesterday's data
    const yesterdayComparison = todayRevenue > 0 ? 5.2 : 0 // Placeholder

    return {
      todayRevenue,
      todayOrders: todayOrders.length,
      cashCollected,
      yesterdayComparison
    }
  }, [orders])

  // Calculate top products
  const topProducts: TopProduct[] = useMemo(() => {
    const productStats = new Map<string, { quantity: number; revenue: number; category?: string }>()

    orders.forEach(order => {
      if (order.status === 'completed') {
        order.items.forEach(item => {
          const existing = productStats.get(item.name) || { quantity: 0, revenue: 0 }
          productStats.set(item.name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.total,
            category: 'Food' // Default category, you can enhance this
          })
        })
      }
    })

    return Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [orders])

  // Recent orders for feed (last 10 completed orders)
  const recentOrders = useMemo(() => {
    return orders
      .filter(order => order.status === 'completed')
      .sort((a, b) => {
        try {
          const aTime = a.createdAt?.toDate?.() || new Date()
          const bTime = b.createdAt?.toDate?.() || new Date()
          return bTime.getTime() - aTime.getTime()
        } catch {
          return 0
        }
      })
      .slice(0, 10)
  }, [orders])

  // Load data when component mounts or branch changes
  useEffect(() => {
    let mounted = true

    const loadVisionData = async () => {
      if (!profile?.tenantId || !selectedBranch?.id) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Get branch-specific location ID
        const locationId = getBranchLocationId(selectedBranch.id)

        // Load POS orders and items in parallel
        const [ordersData, itemsData] = await Promise.all([
          getPOSOrders(profile.tenantId, locationId),
          getPOSItems(profile.tenantId, locationId)
        ])

        if (mounted) {
          setOrders(ordersData || [])
          setPosItems(itemsData || [])
          setLastUpdated(new Date())
        }
      } catch (error) {
        console.error('Error loading CoreTrack Vision data:', error)
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load data')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadVisionData()

    return () => {
      mounted = false
    }
  }, [profile?.tenantId, selectedBranch?.id])

  // Refresh data function
  const refreshData = async () => {
    if (!profile?.tenantId || !selectedBranch?.id) return
    
    try {
      setIsLoading(true)
      setError(null)
      const locationId = getBranchLocationId(selectedBranch.id)
      
      const [ordersData, itemsData] = await Promise.all([
        getPOSOrders(profile.tenantId, locationId),
        getPOSItems(profile.tenantId, locationId)
      ])

      setOrders(ordersData || [])
      setPosItems(itemsData || [])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error refreshing CoreTrack Vision data:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh data')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state or redirect if not authenticated
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CoreTrack Vision...</p>
        </div>
      </div>
    )
  }

  // Show login if user is not authenticated
  if (!user) {
    return <VisionAuth />
  }

  // Show loading if profile or branch data is not ready
  if (!profile || !selectedBranch) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <VisionHeader
        selectedBranch={selectedBranch}
        branches={branches}
        lastRefresh={lastUpdated}
        onRefresh={refreshData}
        loading={isLoading}
      />

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Financial Metrics */}
        <FinancialMetrics
          salesData={salesData}
          loading={isLoading}
          error={error}
        />

        {/* Sales Analytics */}
        <SalesAnalytics
          topProducts={topProducts}
          salesData={salesData}
          loading={isLoading}
          error={error}
        />

        {/* Recent Orders Feed */}
        <RecentOrdersFeed
          orders={recentOrders}
          loading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}

export default VisionDashboard