'use client';

import React from 'react';
import { useSubscription } from '../../lib/context/SubscriptionContext';
import { SubscriptionFeatures } from '../../lib/types/subscription';

interface FeatureGateProps {
  feature: keyof SubscriptionFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

// Component to conditionally render features based on subscription
export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}) => {
  const { hasFeature, loading } = useSubscription();

  // DEVELOPMENT MODE: Respect subscription tiers for proper testing
  // Set NEXT_PUBLIC_BYPASS_SUBSCRIPTION=true to completely bypass in development
  const shouldBypass = process.env.NODE_ENV === 'development' && 
                      process.env.NEXT_PUBLIC_BYPASS_SUBSCRIPTION === 'true';
  
  if (shouldBypass) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-20 w-full"></div>
    );
  }

  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} />;
  }

  return null;
};

interface UpgradePromptProps {
  feature: keyof SubscriptionFeatures;
  className?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, className = '' }) => {
  const featureNames: Record<keyof SubscriptionFeatures, string> = {
    inventory: 'Inventory Management',
    pos: 'Point of Sale',
    purchaseOrders: 'Purchase Orders',
    expenses: 'Expense Tracking',
    basicAnalytics: 'Basic Analytics',
    advancedAnalytics: 'Advanced Analytics',
    customReports: 'Custom Reports',
    exportData: 'Data Export',
    multiUser: 'Multi-User Access',
    roleBasedAccess: 'Role-Based Access',
    teamManagement: 'Team Management',
    paymentIntegrations: 'Payment Integrations',
    accountingIntegrations: 'Accounting Integrations',
    ecommerceIntegrations: 'E-commerce Integrations',
    apiAccess: 'API Access',
    menuBuilder: 'Menu Builder',
    recipeManagement: 'Recipe Management',
    vendorManagement: 'Vendor Management',
    barcodeScanning: 'Barcode Scanning',
    lowStockAlerts: 'Low Stock Alerts',
    automaticReordering: 'Automatic Reordering',
    emailSupport: 'Email Support',
    prioritySupport: 'Priority Support',
    phoneSupport: 'Phone Support',
    dedicatedManager: 'Dedicated Manager',
  };

  const handleUpgrade = () => {
    // Navigate to subscription/upgrade page
    window.location.href = '/subscription/upgrade';
  };

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center ${className}`}>
      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {featureNames[feature]} Locked
      </h3>
      <p className="text-gray-600 mb-4">
        Upgrade your subscription to access {featureNames[feature]} and unlock more powerful features.
      </p>
      <button
        onClick={handleUpgrade}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Upgrade Now
      </button>
    </div>
  );
};

interface UsageLimitProps {
  limit: keyof import('../../lib/types/subscription').SubscriptionLimits;
  currentUsage: number;
  children: React.ReactNode;
  showWarning?: boolean;
  warningThreshold?: number; // Show warning when usage reaches this percentage
}

// Component to check usage limits
export const UsageLimit: React.FC<UsageLimitProps> = ({ 
  limit, 
  currentUsage, 
  children, 
  showWarning = true,
  warningThreshold = 0.8 
}) => {
  const { isWithinLimit, limits, loading } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-20 w-full"></div>
    );
  }

  // DEVELOPMENT MODE: Always allow access during testing
  const isDevMode = process.env.NODE_ENV === 'development';
  const hasAccess = isDevMode || isWithinLimit(limit, currentUsage);
  
  const limitValue = limits?.[limit] || 0;
  const isUnlimited = limitValue === -1;
  const usagePercentage = isUnlimited ? 0 : (currentUsage / limitValue) * 100;
  const showWarningPrompt = showWarning && !isUnlimited && usagePercentage >= (warningThreshold * 100) && !isDevMode;

  if (hasAccess) {
    return (
      <div className="relative">
        {children}
        {showWarningPrompt && (
          <UsageWarning 
            limit={limit}
            currentUsage={currentUsage}
            limitValue={limitValue}
            usagePercentage={usagePercentage}
          />
        )}
      </div>
    );
  }

  return <LimitReachedPrompt limit={limit} currentUsage={currentUsage} limitValue={limitValue} />;
};

interface UsageWarningProps {
  limit: keyof import('../../lib/types/subscription').SubscriptionLimits;
  currentUsage: number;
  limitValue: number;
  usagePercentage: number;
}

const UsageWarning: React.FC<UsageWarningProps> = ({ 
  limit, 
  currentUsage, 
  limitValue, 
  usagePercentage 
}) => {
  const limitNames: Record<keyof import('../../lib/types/subscription').SubscriptionLimits, string> = {
    maxUsers: 'Users',
    maxLocations: 'Locations',
    maxProducts: 'Products',
    maxOrders: 'Orders',
    maxSuppliers: 'Suppliers',
    storageLimit: 'Storage',
    apiCallsPerMonth: 'API Calls',
  };

  return (
    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800">
            Approaching {limitNames[limit]} Limit
          </p>
          <p className="text-sm text-yellow-700">
            {currentUsage} of {limitValue} used ({Math.round(usagePercentage)}%)
          </p>
        </div>
      </div>
    </div>
  );
};

interface LimitReachedPromptProps {
  limit: keyof import('../../lib/types/subscription').SubscriptionLimits;
  currentUsage: number;
  limitValue: number;
}

const LimitReachedPrompt: React.FC<LimitReachedPromptProps> = ({ 
  limit, 
  currentUsage, 
  limitValue 
}) => {
  const limitNames: Record<keyof import('../../lib/types/subscription').SubscriptionLimits, string> = {
    maxUsers: 'Users',
    maxLocations: 'Locations',
    maxProducts: 'Products',
    maxOrders: 'Orders',
    maxSuppliers: 'Suppliers',
    storageLimit: 'Storage',
    apiCallsPerMonth: 'API Calls',
  };

  const handleUpgrade = () => {
    window.location.href = '/subscription/upgrade';
  };

  return (
    <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.293 4.293a1 1 0 011.414 0L12 10.586l6.293-6.293a1 1 0 111.414 1.414L13.414 12l6.293 6.293a1 1 0 01-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 01-1.414-1.414L10.586 12 4.293 5.707a1 1 0 010-1.414z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {limitNames[limit]} Limit Reached
      </h3>
      <p className="text-gray-600 mb-4">
        You&apos;ve reached your limit of {limitValue} {limitNames[limit].toLowerCase()}. 
        Upgrade your plan to add more.
      </p>
      <button
        onClick={handleUpgrade}
        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Upgrade Plan
      </button>
    </div>
  );
};
