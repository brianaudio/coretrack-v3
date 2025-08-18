# 🔧 TIER SYSTEM TECHNICAL IMPLEMENTATION GUIDE

**Date:** August 4, 2025  
**Objective:** Step-by-step implementation of 5-tier feature system  
**Focus:** Database, middleware, frontend components, and enforcement

---

## 🗄️ DATABASE SCHEMA IMPLEMENTATION

### **1. Tier Management Tables**

```sql
-- Core tier definitions
CREATE TABLE tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price_php INTEGER NOT NULL,
    price_usd INTEGER NOT NULL,
    display_order INTEGER NOT NULL,
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert 5-tier configuration
INSERT INTO tiers (name, price_php, price_usd, display_order, features, limits) VALUES
('Essentials', 39, 0.69, 1, 
 '["basic_pos", "inventory_basic", "daily_reports", "email_support"]',
 '{"products": 500, "users": 3, "locations": 1, "data_retention_days": 30, "api_calls_per_day": 0}'
),
('Professional', 99, 1.75, 2,
 '["all_essentials", "multi_device_pos", "table_management", "recipe_management", "customer_database", "priority_support"]',
 '{"products": 5000, "users": 15, "locations": 3, "data_retention_days": 90, "api_calls_per_day": 1000}'
),
('Advanced', 189, 3.35, 3,
 '["all_professional", "multi_location_dashboard", "predictive_analytics", "purchase_workflows", "basic_api", "custom_reports"]',
 '{"products": -1, "users": 50, "locations": 10, "data_retention_days": 1095, "api_calls_per_day": 10000}'
),
('Business', 299, 5.30, 4,
 '["all_advanced", "unlimited_users_locations", "full_api", "white_label", "sso_security", "dedicated_manager"]',
 '{"products": -1, "users": -1, "locations": -1, "data_retention_days": -1, "api_calls_per_day": 100000}'
),
('Enterprise', 499, 8.84, 5,
 '["all_business", "custom_development", "dedicated_team", "machine_learning", "custom_compliance", "24_7_support"]',
 '{"products": -1, "users": -1, "locations": -1, "data_retention_days": -1, "api_calls_per_day": -1, "custom_dev_hours": 20}'
);

-- Update tenants table to include tier information
ALTER TABLE tenants ADD COLUMN tier_id INTEGER REFERENCES tiers(id) DEFAULT 1;
ALTER TABLE tenants ADD COLUMN tier_expires_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN tier_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN is_trial BOOLEAN DEFAULT true;

-- Subscription tracking
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    tier_id INTEGER REFERENCES tiers(id),
    status VARCHAR(20) NOT NULL, -- active, cancelled, expired, past_due
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_end TIMESTAMP,
    payment_method JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Feature Flags System**

```sql
-- Feature flags for granular control
CREATE TABLE feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    required_tier_id INTEGER REFERENCES tiers(id),
    is_globally_enabled BOOLEAN DEFAULT true,
    rollout_percentage INTEGER DEFAULT 100, -- for gradual rollouts
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert core feature flags
INSERT INTO feature_flags (name, description, required_tier_id) VALUES
('basic_pos', 'Basic POS functionality', 1),
('multi_device_pos', 'Multiple iPad support', 2),
('table_management', 'Floor plan and table status', 2),
('recipe_management', 'Ingredient tracking and costing', 2),
('multi_location_dashboard', 'Centralized multi-location view', 3),
('predictive_analytics', 'ML-powered forecasting', 3),
('basic_api_access', 'Read-only API access', 3),
('full_api_access', 'Full CRUD API access', 4),
('white_labeling', 'Custom branding options', 4),
('sso_integration', 'Single sign-on support', 4),
('custom_development', 'Dedicated development hours', 5),
('machine_learning_insights', 'Advanced ML analytics', 5);

-- User-specific feature overrides (for beta testing, etc.)
CREATE TABLE user_feature_overrides (
    user_id UUID REFERENCES users(id),
    feature_flag_id INTEGER REFERENCES feature_flags(id),
    is_enabled BOOLEAN NOT NULL,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    reason TEXT,
    PRIMARY KEY (user_id, feature_flag_id)
);
```

### **3. Usage Tracking Tables**

```sql
-- Track usage against limits
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    metric_name VARCHAR(50) NOT NULL, -- products, users, locations, api_calls
    metric_value INTEGER NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_usage_metrics_tenant_period ON usage_metrics(tenant_id, period_start, period_end);
CREATE INDEX idx_usage_metrics_metric ON usage_metrics(metric_name, recorded_at);

-- Daily usage snapshots
CREATE TABLE daily_usage_snapshots (
    tenant_id UUID REFERENCES tenants(id),
    snapshot_date DATE NOT NULL,
    products_count INTEGER DEFAULT 0,
    users_count INTEGER DEFAULT 0,
    locations_count INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tenant_id, snapshot_date)
);
```

---

## 🔧 BACKEND IMPLEMENTATION

### **1. Tier Service Layer**

```typescript
// services/TierService.ts
export class TierService {
  static async getTierByTenantId(tenantId: string): Promise<Tier> {
    const tenant = await db.tenants.findUnique({
      where: { id: tenantId },
      include: { tier: true }
    });
    
    if (!tenant) throw new Error('Tenant not found');
    return tenant.tier;
  }
  
  static async checkFeatureAccess(tenantId: string, featureName: string): Promise<boolean> {
    const tier = await this.getTierByTenantId(tenantId);
    const feature = await db.feature_flags.findUnique({
      where: { name: featureName }
    });
    
    if (!feature) return false;
    
    // Check if tier includes this feature
    if (tier.id >= feature.required_tier_id) return true;
    
    // Check for user-specific overrides
    const override = await db.user_feature_overrides.findFirst({
      where: {
        user_id: getCurrentUserId(),
        feature_flag_id: feature.id,
        expires_at: { gt: new Date() }
      }
    });
    
    return override?.is_enabled || false;
  }
  
  static async checkUsageLimit(tenantId: string, metric: string): Promise<{
    current: number;
    limit: number;
    withinLimit: boolean;
  }> {
    const tier = await this.getTierByTenantId(tenantId);
    const limit = tier.limits[metric];
    
    if (limit === -1) return { current: 0, limit: -1, withinLimit: true }; // Unlimited
    
    const currentUsage = await this.getCurrentUsage(tenantId, metric);
    
    return {
      current: currentUsage,
      limit,
      withinLimit: currentUsage < limit
    };
  }
  
  private static async getCurrentUsage(tenantId: string, metric: string): Promise<number> {
    switch (metric) {
      case 'products':
        return await db.products.count({ where: { tenant_id: tenantId } });
      case 'users':
        return await db.users.count({ where: { tenant_id: tenantId } });
      case 'locations':
        return await db.locations.count({ where: { tenant_id: tenantId } });
      case 'api_calls':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return await db.api_calls.count({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: today,
              lt: tomorrow
            }
          }
        });
      default:
        return 0;
    }
  }
  
  static async upgradeTier(tenantId: string, newTierId: number): Promise<void> {
    await db.tenants.update({
      where: { id: tenantId },
      data: {
        tier_id: newTierId,
        tier_expires_at: null, // Remove expiration for paid tiers
        is_trial: false
      }
    });
    
    // Log the upgrade
    await db.tenant_events.create({
      data: {
        tenant_id: tenantId,
        event_type: 'tier_upgrade',
        event_data: { new_tier_id: newTierId },
        created_at: new Date()
      }
    });
  }
}
```

### **2. Middleware for Tier Enforcement**

```typescript
// middleware/tierGuard.ts
import { Request, Response, NextFunction } from 'express';
import { TierService } from '../services/TierService';

export function requireTier(minimumTierId: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const tier = await TierService.getTierByTenantId(tenantId);
      
      if (tier.id < minimumTierId) {
        const requiredTier = await db.tiers.findUnique({
          where: { id: minimumTierId }
        });
        
        return res.status(403).json({
          error: 'Feature requires higher tier',
          currentTier: tier.name,
          requiredTier: requiredTier?.name,
          upgradeUrl: `/upgrade?feature=${req.originalUrl}&required_tier=${minimumTierId}`
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Tier check failed' });
    }
  };
}

export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      const hasAccess = await TierService.checkFeatureAccess(tenantId, featureName);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: `Feature '${featureName}' not available in your current plan`,
          upgradeUrl: `/upgrade?feature=${featureName}`
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Feature check failed' });
    }
  };
}

export function enforceUsageLimit(metric: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      const usage = await TierService.checkUsageLimit(tenantId, metric);
      
      if (!usage.withinLimit) {
        return res.status(429).json({
          error: `${metric} limit exceeded`,
          current: usage.current,
          limit: usage.limit,
          upgradeUrl: `/upgrade?limit=${metric}`
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: 'Usage limit check failed' });
    }
  };
}
```

### **3. API Route Protection Examples**

```typescript
// routes/inventory.ts
app.post('/api/products', 
  authenticate,
  enforceUsageLimit('products'),
  requireFeature('basic_pos'),
  createProduct
);

app.get('/api/analytics/advanced',
  authenticate,
  requireTier(3), // Advanced tier
  requireFeature('predictive_analytics'),
  getAdvancedAnalytics
);

app.post('/api/integrations/webhook',
  authenticate,
  requireTier(4), // Business tier
  requireFeature('full_api_access'),
  createWebhook
);

// routes/locations.ts
app.post('/api/locations',
  authenticate,
  enforceUsageLimit('locations'),
  requireFeature('multi_location_dashboard'),
  createLocation
);
```

---

## 🎨 FRONTEND IMPLEMENTATION

### **1. Tier Context Provider**

```tsx
// contexts/TierContext.tsx
interface TierContextType {
  tier: Tier | null;
  hasFeature: (featureName: string) => boolean;
  checkUsageLimit: (metric: string) => Promise<UsageLimitResult>;
  upgradeUrl: (reason: string) => string;
  isLoading: boolean;
}

export const TierContext = createContext<TierContextType | null>(null);

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadTierInfo() {
      if (!user?.tenantId) return;
      
      try {
        const tierData = await api.get('/api/tenant/tier');
        setTier(tierData);
      } catch (error) {
        console.error('Failed to load tier info:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTierInfo();
  }, [user?.tenantId]);

  const hasFeature = useCallback((featureName: string) => {
    if (!tier) return false;
    return tier.features.includes(featureName);
  }, [tier]);

  const checkUsageLimit = useCallback(async (metric: string) => {
    if (!tier) throw new Error('Tier not loaded');
    
    const response = await api.get(`/api/tenant/usage/${metric}`);
    return response.data;
  }, [tier]);

  const upgradeUrl = useCallback((reason: string) => {
    return `/upgrade?reason=${encodeURIComponent(reason)}`;
  }, []);

  return (
    <TierContext.Provider value={{
      tier,
      hasFeature,
      checkUsageLimit,
      upgradeUrl,
      isLoading
    }}>
      {children}
    </TierContext.Provider>
  );
}

export const useTier = () => {
  const context = useContext(TierContext);
  if (!context) throw new Error('useTier must be used within TierProvider');
  return context;
};
```

### **2. Feature Gate Components**

```tsx
// components/TierGate.tsx
interface TierGateProps {
  requiredTier?: number;
  requiredFeature?: string;
  metric?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function TierGate({
  requiredTier,
  requiredFeature,
  metric,
  children,
  fallback,
  showUpgradePrompt = true
}: TierGateProps) {
  const { tier, hasFeature, checkUsageLimit } = useTier();
  const [usageCheck, setUsageCheck] = useState<UsageLimitResult | null>(null);

  useEffect(() => {
    if (metric) {
      checkUsageLimit(metric).then(setUsageCheck);
    }
  }, [metric, checkUsageLimit]);

  // Check tier requirement
  if (requiredTier && tier && tier.id < requiredTier) {
    return fallback || (showUpgradePrompt ? 
      <UpgradePrompt reason={`Feature requires ${getTierName(requiredTier)} tier or higher`} /> : 
      null
    );
  }

  // Check feature requirement
  if (requiredFeature && !hasFeature(requiredFeature)) {
    return fallback || (showUpgradePrompt ? 
      <UpgradePrompt reason={`Feature '${requiredFeature}' not available in your plan`} /> : 
      null
    );
  }

  // Check usage limit
  if (metric && usageCheck && !usageCheck.withinLimit) {
    return fallback || (showUpgradePrompt ? 
      <UsageLimitPrompt metric={metric} usage={usageCheck} /> : 
      null
    );
  }

  return <>{children}</>;
}

// Usage examples:
// <TierGate requiredTier={3}>
//   <AdvancedAnalyticsPanel />
// </TierGate>

// <TierGate requiredFeature="multi_device_pos">
//   <SecondPOSTerminal />
// </TierGate>

// <TierGate metric="products">
//   <AddProductButton />
// </TierGate>
```

### **3. Upgrade Prompt Components**

```tsx
// components/UpgradePrompt.tsx
interface UpgradePromptProps {
  reason: string;
  suggestedTier?: number;
  className?: string;
}

export function UpgradePrompt({ reason, suggestedTier, className }: UpgradePromptProps) {
  const { tier, upgradeUrl } = useTier();
  
  return (
    <div className={`bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6 text-center ${className}`}>
      <div className="text-primary-600 mb-2">
        <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upgrade Required</h3>
      <p className="text-gray-600 mb-4">{reason}</p>
      
      {suggestedTier && (
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <div className="text-sm text-gray-500">Recommended:</div>
          <div className="text-lg font-semibold text-primary-600">
            {getTierName(suggestedTier)} Plan
          </div>
        </div>
      )}
      
      <Link
        href={upgradeUrl(reason)}
        className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 14l5-5 5 5z"/>
        </svg>
        View Upgrade Options
      </Link>
    </div>
  );
}

// Usage limit specific prompt
export function UsageLimitPrompt({ metric, usage }: { metric: string; usage: UsageLimitResult }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <div>
          <div className="font-medium text-yellow-800">
            {metric.charAt(0).toUpperCase() + metric.slice(1)} Limit Reached
          </div>
          <div className="text-sm text-yellow-600">
            You've used {usage.current} of {usage.limit} {metric}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **4. Usage Dashboard Component**

```tsx
// components/UsageDashboard.tsx
export function UsageDashboard() {
  const { tier } = useTier();
  const [usage, setUsage] = useState<Record<string, UsageLimitResult>>({});

  useEffect(() => {
    async function loadUsage() {
      const metrics = ['products', 'users', 'locations', 'api_calls'];
      const usageData: Record<string, UsageLimitResult> = {};
      
      for (const metric of metrics) {
        try {
          const result = await api.get(`/api/tenant/usage/${metric}`);
          usageData[metric] = result.data;
        } catch (error) {
          console.error(`Failed to load ${metric} usage:`, error);
        }
      }
      
      setUsage(usageData);
    }
    
    loadUsage();
  }, []);

  if (!tier) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Current Plan: {tier.name}
      </h3>
      
      <div className="space-y-4">
        {Object.entries(usage).map(([metric, data]) => (
          <UsageBar key={metric} metric={metric} usage={data} />
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <Link
          href="/upgrade"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          Upgrade Plan
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 14l5-5 5 5z"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}

function UsageBar({ metric, usage }: { metric: string; usage: UsageLimitResult }) {
  const percentage = usage.limit === -1 ? 0 : Math.min((usage.current / usage.limit) * 100, 100);
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 capitalize">{metric}</span>
        <span className="text-sm text-gray-500">
          {usage.current} {usage.limit === -1 ? '' : `/ ${usage.limit}`}
        </span>
      </div>
      
      {usage.limit !== -1 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      
      {usage.limit === -1 && (
        <div className="text-xs text-green-600 font-medium">Unlimited</div>
      )}
    </div>
  );
}
```

---

## 🚀 DEPLOYMENT & MONITORING

### **1. Feature Flag Management**

```typescript
// admin/FeatureFlagManager.tsx
export function FeatureFlagManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  const updateFlag = async (flagId: number, updates: Partial<FeatureFlag>) => {
    await api.patch(`/api/admin/feature-flags/${flagId}`, updates);
    // Refresh flags
  };

  return (
    <div className="space-y-4">
      {flags.map(flag => (
        <div key={flag.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">{flag.name}</h4>
              <p className="text-sm text-gray-600">{flag.description}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={flag.is_globally_enabled}
                  onChange={(e) => updateFlag(flag.id, { is_globally_enabled: e.target.checked })}
                />
                <span className="ml-2">Enabled</span>
              </label>
              
              <select
                value={flag.rollout_percentage}
                onChange={(e) => updateFlag(flag.id, { rollout_percentage: parseInt(e.target.value) })}
                className="border rounded px-2 py-1"
              >
                {[0, 25, 50, 75, 100].map(pct => (
                  <option key={pct} value={pct}>{pct}%</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### **2. Usage Analytics Dashboard**

```typescript
// admin/UsageAnalytics.tsx
export function UsageAnalytics() {
  const [metrics, setMetrics] = useState<UsageMetrics[]>([]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Active Tenants"
        value={metrics.filter(m => m.metric_name === 'active_tenants')[0]?.metric_value || 0}
        change={"+12%"}
        changeType="positive"
      />
      
      <MetricCard
        title="Upgrade Rate"
        value={`${calculateUpgradeRate()}%`}
        change={"+5%"}
        changeType="positive"
      />
      
      <MetricCard
        title="Avg Revenue per User"
        value={`₱${calculateARPU()}`}
        change={"+8%"}
        changeType="positive"
      />
      
      <MetricCard
        title="Churn Rate"
        value={`${calculateChurnRate()}%`}
        change={"-2%"}
        changeType="positive"
      />
    </div>
  );
}
```

---

**This comprehensive implementation provides a robust, scalable tier system that can grow with your business. Ready to start building?** 🚀
