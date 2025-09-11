'use client'

// Simple in-memory cache with TTL support
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttlMs: number = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.includes(pattern))
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  size(): number {
    return this.cache.size
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Global cache instance
export const capitalIntelligenceCache = new MemoryCache()

// Auto-cleanup every 10 minutes
setInterval(() => {
  capitalIntelligenceCache.cleanup()
}, 600000)

// Cache keys factory
export const CacheKeys = {
  capitalMetrics: (tenantId: string, branchId: string) => 
    `capital_metrics_${tenantId}_${branchId}`,
  inventory: (tenantId: string, branchId: string) => 
    `inventory_${tenantId}_${branchId}`,
  purchases: (tenantId: string, branchId: string) => 
    `purchases_${tenantId}_${branchId}`,
  sales: (tenantId: string, branchId: string, days: number) => 
    `sales_${tenantId}_${branchId}_${days}d`,
}

export default capitalIntelligenceCache
