'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '../../../lib/context/SubscriptionContext';

function UpgradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, isActive, isTrial, trialDaysRemaining } = useSubscription();
  const feature = searchParams.get('feature') || '';

  useEffect(() => {
    // If already on a higher tier, redirect to subscription page
    if (subscription?.tier === 'enterprise') {
      router.push('/subscription');
    }
  }, [subscription, router]);

  const featureMessages: Record<string, string> = {
    purchaseOrders: 'Purchase Orders feature is available in Professional and Enterprise plans',
    advancedAnalytics: 'Advanced Analytics is available in Professional and Enterprise plans',
    multiUser: 'Multi-user access is available in Professional and Enterprise plans',
    apiAccess: 'API Access is available in Enterprise plan',
    barcodeScanning: 'Barcode Scanning is available in Professional and Enterprise plans',
    // Add more as needed
  };

  const getMessage = () => {
    if (feature && featureMessages[feature]) {
      return featureMessages[feature];
    }
    return 'Upgrade your subscription to unlock more powerful features';
  };

  const getRecommendedPlan = () => {
    if (subscription?.tier === 'starter') {
      return 'professional';
    }
    return 'enterprise';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Unlock More Features
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {getMessage()}
          </p>
        </div>

        {/* Current Status */}
        {subscription && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Current Plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                </h3>
                {isTrial && (
                  <p className="text-yellow-600">
                    Trial period - {trialDaysRemaining} days remaining
                  </p>
                )}
                {!isActive && (
                  <p className="text-red-600">
                    Subscription inactive - Please upgrade to continue using CoreTrack
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Locked Message */}
        {feature && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-900">
                  Feature Locked
                </h3>
                <p className="text-blue-700 mt-1">
                  The feature you&apos;re trying to access requires a higher subscription tier.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <button
            onClick={() => router.push('/subscription')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg text-lg transition-colors"
          >
            View All Plans
          </button>
          
          <div className="text-sm text-gray-500">
            or{' '}
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              go back
            </button>
          </div>
        </div>

        {/* Why Upgrade Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Upgrade?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                More Features
              </h3>
              <p className="text-gray-600">
                Access advanced analytics, multi-user support, and powerful integrations
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Higher Limits
              </h3>
              <p className="text-gray-600">
                Store more products, process more orders, and scale your business
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M12 12h.01M12 12h.01M12 12h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Priority Support
              </h3>
              <p className="text-gray-600">
                Get faster response times and dedicated customer success support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading upgrade options...</p>
      </div>
    </div>}>
      <UpgradePageContent />
    </Suspense>
  );
}
