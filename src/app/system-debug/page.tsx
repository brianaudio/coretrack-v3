'use client'

import { useAuth } from '../../lib/context/AuthContext'
import { useSubscription } from '../../lib/context/SubscriptionContext'
import { getAccessibleModules } from '../../lib/rbac/subscriptionPermissions'

export default function SystemDebugPage() {
  const { user, profile, tenant, loading: authLoading } = useAuth()
  const { 
    subscription, 
    features, 
    loading: subscriptionLoading,
    isActive,
    hasFeature 
  } = useSubscription()

  const effectiveRole = profile?.role || null
  const allowedModules = getAccessibleModules(effectiveRole, features)

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-red-600">🔍 SYSTEM DEBUG - FULL TRUTH</h1>
      
      {/* Auth Context */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-blue-600">🔐 Auth Context</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>Loading: <span className={authLoading ? 'text-red-600' : 'text-green-600'}>{authLoading ? 'TRUE' : 'FALSE'}</span></div>
          <div>User: <span className={user ? 'text-green-600' : 'text-red-600'}>{user ? user.email : 'NULL'}</span></div>
          <div>User UID: <span className="text-gray-600">{user?.uid || 'NULL'}</span></div>
          <div>Profile: <span className={profile ? 'text-green-600' : 'text-red-600'}>{profile ? 'EXISTS' : 'NULL'}</span></div>
          <div>Profile TenantId: <span className="text-gray-600">{profile?.tenantId || 'NULL'}</span></div>
          <div>Profile Role: <span className="text-gray-600">{profile?.role || 'NULL'}</span></div>
          <div>Tenant: <span className={tenant ? 'text-green-600' : 'text-red-600'}>{tenant ? 'EXISTS' : 'NULL'}</span></div>
          <div>Tenant ID: <span className="text-gray-600">{tenant?.id || 'NULL'}</span></div>
          <div>Tenant Name: <span className="text-gray-600">{tenant?.name || 'NULL'}</span></div>
        </div>
      </div>

      {/* Subscription Context */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-purple-600">💎 Subscription Context</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>Loading: <span className={subscriptionLoading ? 'text-red-600' : 'text-green-600'}>{subscriptionLoading ? 'TRUE' : 'FALSE'}</span></div>
          <div>Subscription: <span className={subscription ? 'text-green-600' : 'text-red-600'}>{subscription ? 'EXISTS' : 'NULL'}</span></div>
          <div>Plan ID: <span className="text-gray-600">{subscription?.planId || 'NULL'}</span></div>
          <div>Status: <span className="text-gray-600">{subscription?.status || 'NULL'}</span></div>
          <div>Is Active: <span className={isActive ? 'text-green-600' : 'text-red-600'}>{isActive ? 'TRUE' : 'FALSE'}</span></div>
          <div>Features: <span className={features ? 'text-green-600' : 'text-red-600'}>{features ? 'EXISTS' : 'NULL'}</span></div>
        </div>
        
        {features && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">Feature Flags:</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(features).map(([key, value]) => (
                <div key={key} className={`p-2 rounded ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {key}: {value ? '✅' : '❌'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Module Access */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-green-600">🏗️ Module Access</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>Effective Role: <span className="text-gray-600">{effectiveRole || 'NULL'}</span></div>
          <div>Allowed Modules Count: <span className="text-gray-600">{allowedModules.length}</span></div>
          <div>Allowed Modules:</div>
          <div className="ml-4 space-y-1">
            {allowedModules.length > 0 ? (
              allowedModules.map((module, index) => (
                <div key={index} className="text-green-600">✅ {module}</div>
              ))
            ) : (
              <div className="text-red-600">❌ NO MODULES ALLOWED</div>
            )}
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-600">📋 Raw Data</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm">Subscription Object:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {subscription ? JSON.stringify(subscription, null, 2) : 'null'}
            </pre>
          </div>
          
          <div>
            <h3 className="font-bold text-sm">Features Object:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {features ? JSON.stringify(features, null, 2) : 'null'}
            </pre>
          </div>

          <div>
            <h3 className="font-bold text-sm">Profile Object:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {profile ? JSON.stringify(profile, null, 2) : 'null'}
            </pre>
          </div>

          <div>
            <h3 className="font-bold text-sm">Tenant Object:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {tenant ? JSON.stringify(tenant, null, 2) : 'null'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
