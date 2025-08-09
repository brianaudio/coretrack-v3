import React from 'react';
import { useSubscription } from '../lib/context/SubscriptionContext';
import { useAuth } from '../lib/context/AuthContext';
import { SUBSCRIPTION_PLANS } from '../lib/types/subscription';

export default function SubscriptionDebugger() {
  const { subscription, features, limits, loading, isActive } = useSubscription();
  const { profile } = useAuth();

  console.log('🔍 SubscriptionDebugger DEBUG:', {
    loading,
    subscription,
    features,
    profile: profile?.email
  });

  if (loading) return <div className="p-4 bg-yellow-100 rounded">🔄 Loading subscription...</div>;

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs font-mono z-50">
      <div className="font-bold text-green-400 mb-2">🔍 SUBSCRIPTION DEBUG</div>
      
      <div className="space-y-2">
        <div>
          <div className="text-blue-300">📧 User:</div>
          <div className="text-gray-300">{profile?.email || 'N/A'}</div>
        </div>

        <div>
          <div className="text-blue-300">🏢 Tenant:</div>
          <div className="text-gray-300">{profile?.tenantId || 'N/A'}</div>
        </div>

        <div>
          <div className="text-blue-300">📋 Subscription Status:</div>
          <div className="text-gray-300">
            {subscription ? (
              <>
                <div>Plan: {subscription.planId}</div>
                <div>Tier: {subscription.tier}</div>
                <div>Status: {subscription.status}</div>
                <div>Active: {isActive ? '✅' : '❌'}</div>
              </>
            ) : (
              <div className="text-red-400">❌ No subscription found</div>
            )}
          </div>
        </div>

        {features && (
          <div>
            <div className="text-blue-300">✨ Available Features:</div>
            <div className="text-gray-300 max-h-32 overflow-y-auto">
              {Object.entries(features)
                .filter(([_, enabled]) => enabled)
                .map(([feature, _]) => (
                  <div key={feature}>• {feature}</div>
                ))}
            </div>
          </div>
        )}

        {limits && (
          <div>
            <div className="text-blue-300">📊 Current Limits:</div>
            <div className="text-gray-300">
              <div>Users: {limits.maxUsers === -1 ? '∞' : limits.maxUsers}</div>
              <div>Locations: {limits.maxLocations === -1 ? '∞' : limits.maxLocations}</div>
              <div>Products: {limits.maxProducts === -1 ? '∞' : limits.maxProducts}</div>
            </div>
          </div>
        )}

        <div>
          <div className="text-blue-300">📋 Available Plans:</div>
          <div className="text-gray-300">
            {SUBSCRIPTION_PLANS.map(plan => (
              <div key={plan.id} className={plan.tier === subscription?.tier ? 'text-green-400' : ''}>
                • {plan.name}: ₱{plan.monthlyPrice}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
