'use client';

import { useState } from 'react';
import { useSubscription } from '../../lib/context/SubscriptionContext';
import { useAuth } from '../../lib/context/AuthContext';
import { SUBSCRIPTION_PLANS } from '../../lib/types/subscription';
import { updateSubscriptionTier } from '../../lib/firebase/subscription';

export default function SubscriptionPage() {
  const { subscription, features, limits, isActive, isTrial, trialDaysRemaining, refreshSubscription } = useSubscription();
  const { user, tenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async (planId: string) => {
    if (!tenant?.id) return;
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;

    try {
      setLoading(true);
      await updateSubscriptionTier(tenant.id, plan.tier, billingCycle);
      await refreshSubscription();
      alert('Subscription updated successfully!');
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = (planId: string) => {
    if (subscription?.planId === planId) return 'Current Plan';
    return 'Upgrade';
  };

  const getButtonStyle = (planId: string) => {
    if (subscription?.planId === planId) {
      return 'bg-gray-300 text-gray-600 cursor-not-allowed';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Scale your business with the right features and limits for your needs
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Current Subscription
              </h3>
              <p className="text-blue-700">
                {SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId)?.name} Plan
                {isTrial && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                    Trial - {trialDaysRemaining} days remaining
                  </span>
                )}
                {!isActive && (
                  <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                    Inactive
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Status</p>
              <p className="font-semibold text-blue-900 capitalize">
                {subscription.status}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly (Save 2 months)
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 p-8 ${
              plan.popular 
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">
                  ₱{billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                <span className="text-gray-600">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-sm text-green-600 font-medium">
                  Save ₱{(plan.monthlyPrice * 12) - plan.yearlyPrice} annually
                </p>
              )}
            </div>

            {/* Features */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Features included:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Inventory Management
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Point of Sale
                </li>
                {plan.features.purchaseOrders && (
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Purchase Orders
                  </li>
                )}
                {plan.features.advancedAnalytics && (
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Advanced Analytics
                  </li>
                )}
                {plan.features.multiUser && (
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Multi-User Access ({plan.limits.maxUsers === -1 ? 'Unlimited' : plan.limits.maxUsers} users)
                  </li>
                )}
                {plan.features.barcodeScanning && (
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Barcode Scanning
                  </li>
                )}
              </ul>
            </div>

            {/* Limits */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Limits:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>
                  Products: {plan.limits.maxProducts === -1 ? 'Unlimited' : plan.limits.maxProducts.toLocaleString()}
                </li>
                <li>
                  Orders/month: {plan.limits.maxOrders === -1 ? 'Unlimited' : plan.limits.maxOrders.toLocaleString()}
                </li>
                <li>
                  Storage: {plan.limits.storageLimit === -1 ? 'Unlimited' : `${plan.limits.storageLimit}GB`}
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading || subscription?.planId === plan.id}
              className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors ${getButtonStyle(plan.id)}`}
            >
              {loading ? 'Processing...' : getButtonText(plan.id)}
            </button>
          </div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Feature Comparison
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Feature
                </th>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <th key={plan.id} className="px-6 py-3 text-center text-sm font-medium text-gray-900">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">Advanced Analytics</td>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <td key={plan.id} className="px-6 py-4 text-center">
                    {plan.features.advancedAnalytics ? (
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">Multi-User Access</td>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <td key={plan.id} className="px-6 py-4 text-center text-sm">
                    {plan.features.multiUser ? (
                      plan.limits.maxUsers === -1 ? 'Unlimited' : plan.limits.maxUsers
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">API Access</td>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <td key={plan.id} className="px-6 py-4 text-center">
                    {plan.features.apiAccess ? (
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
