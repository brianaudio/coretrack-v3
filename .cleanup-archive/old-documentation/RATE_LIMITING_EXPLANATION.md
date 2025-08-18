# 🔒 Per-Tenant Rate Limiting System

## Overview
The AI chat system now implements **per-subscriber/tenant rate limiting** instead of global server-wide limits. This ensures fair usage across all your CoreTrack tenants/customers.

## 🏢 How It Works

### **Per-Tenant Isolation**
- Each tenant (subscriber) has their own independent rate limit counters
- Tenant A's usage doesn't affect Tenant B's rate limits
- Isolated tracking prevents one heavy user from blocking others

### **Rate Limit Structure**
```typescript
interface RateLimitInfo {
  requestCount: number      // Requests this minute
  lastReset: number        // Last minute reset timestamp
  dailyCount: number       // Requests today
  lastDayReset: number     // Last day reset timestamp
  isBlocked: boolean       // Currently blocked?
  blockUntil?: number      // Block until timestamp
}
```

### **Per-Tenant Storage**
```typescript
private tenantRateLimits: PerTenantRateLimit = {
  "tenant-1": { requestCount: 5, dailyCount: 45, ... },
  "tenant-2": { requestCount: 12, dailyCount: 203, ... },
  "tenant-3": { requestCount: 0, dailyCount: 15, ... }
}
```

## 📊 Rate Limits by Subscription

### **Standard Plan**
- **12 requests per minute** per tenant
- **400 requests per day** per tenant

### **Enterprise Plan** 
- **12 requests per minute** per tenant
- **1,000 requests per day** per tenant (2.5x more)

## 🔧 Key Features

### **1. Subscription-Based Limits**
```typescript
private getTenantDailyLimit(subscriptionPlan?: string): number {
  // Enterprise subscribers get higher limits
  if (subscriptionPlan === 'enterprise') {
    return this.ENTERPRISE_DAILY_LIMIT // 1,000
  }
  return this.MAX_REQUESTS_PER_DAY // 400
}
```

### **2. Individual Tenant Tracking**
```typescript
// Each tenant gets their own rate limit object
private getTenantRateLimit(tenantId: string): RateLimitInfo {
  if (!this.tenantRateLimits[tenantId]) {
    // Create new rate limit for new tenant
    this.tenantRateLimits[tenantId] = { ... }
  }
  return this.tenantRateLimits[tenantId]
}
```

### **3. Fair Usage Protection**
- Tenant A using 400 requests won't block Tenant B
- Each tenant gets their full allocation
- No shared/global counters

## 🎯 Usage Examples

### **Checking Rate Limits**
```typescript
// Check specific tenant's rate limit status
const status = chatService.getRateLimitStatus('tenant-123')
console.log(`Tenant has used ${status.requestsToday}/${status.maxPerDay} daily requests`)
```

### **Per-Tenant Reset**
```typescript
// Reset specific tenant (for testing)
chatService.resetRateLimit('tenant-123')

// Emergency reset all tenants
chatService.resetAllRateLimits()
```

### **API Calls with Tenant Context**
```typescript
// AI API calls now include tenant information
const response = await chatService.sendMessage("Hello", {
  tenantId: "tenant-123",
  subscriptionPlan: "enterprise",
  userRole: "owner"
})
```

## 💡 Benefits

### **🏢 Multi-Tenant SaaS Ready**
- Perfect for SaaS applications with multiple customers
- Each customer gets fair, isolated usage
- No cross-tenant interference

### **📈 Scalable Architecture**
- Supports unlimited tenants
- Memory-efficient per-tenant tracking
- Automatic cleanup (can be enhanced)

### **💰 Subscription-Aware**
- Enterprise customers get higher limits
- Easy to add more subscription tiers
- Revenue-based rate limiting

### **🔧 Flexible Management**
- Per-tenant monitoring and analytics
- Individual tenant resets for support
- Detailed usage tracking

## 🚀 Production Considerations

### **Memory Management**
In production, consider:
- Periodic cleanup of inactive tenants
- Redis/database storage for persistence
- Distributed rate limiting across server instances

### **Monitoring & Analytics**
- Track usage patterns per tenant
- Identify heavy users for upselling
- Monitor API costs per customer

### **Enhanced Features**
- Burst allowances for occasional spikes  
- Different limits by subscription tier
- Usage notifications/warnings

## 🔍 Implementation Details

The system automatically:
1. **Creates** new tenant rate limits on first use
2. **Tracks** minute/daily usage separately per tenant  
3. **Resets** counters automatically (minute/day boundaries)
4. **Blocks** individual tenants when limits exceeded
5. **Provides** graceful fallbacks with real business data

This ensures your CoreTrack AI system can scale to handle many customers while providing fair, reliable service to each tenant! 🎉
