import React from 'react';
import { useSubscription } from '../lib/context/SubscriptionContext';
import { useAuth } from '../lib/context/AuthContext';
import { forceUpgradeToEnterprise } from '../lib/utils/subscriptionUtils';

export default function QuickSubscriptionFixer() {
  const { subscription, refreshSubscription } = useSubscription();
  const { user, profile } = useAuth();

  const handleUpgradeToEnterprise = async () => {
    const tenantId = user?.uid;
    if (!tenantId) {
      alert('No tenant ID found');
      return;
    }

    try {
      await forceUpgradeToEnterprise(tenantId);
      
      // Refresh subscription data
      await refreshSubscription();
      
      alert('✅ Successfully upgraded to Enterprise tier! Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('❌ Error upgrading to Enterprise. Check console for details.');
    }
  };

  // Only show if not already on Enterprise
  if (subscription?.tier === 'enterprise') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="text-red-800 font-semibold mb-2">
        🚨 Subscription Issue Detected
      </div>
      <div className="text-red-700 text-sm mb-3">
        You selected Enterprise but you're on {subscription?.tier || 'no'} tier.
      </div>
      <button
        onClick={handleUpgradeToEnterprise}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm w-full"
      >
        🚀 Fix: Upgrade to Enterprise
      </button>
    </div>
  );
}
