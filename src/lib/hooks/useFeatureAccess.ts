'use client';

import { useSubscription } from '../context/SubscriptionContext';
import { SubscriptionFeatures, SubscriptionLimits } from '../types/subscription';

export const useFeatureAccess = () => {
  const { 
    hasFeature, 
    isWithinLimit, 
    subscription, 
    isActive, 
    isTrial, 
    trialDaysRemaining 
  } = useSubscription();

  // DEVELOPMENT MODE: Allow everything during testing
  const isDevMode = process.env.NODE_ENV === 'development';

  // Quick access functions for common features
  const canAccessPOS = () => isDevMode || hasFeature('pos');
  const canAccessInventory = () => isDevMode || hasFeature('inventory');
  const canAccessPurchaseOrders = () => isDevMode || hasFeature('purchaseOrders');
  const canAccessAdvancedAnalytics = () => isDevMode || hasFeature('advancedAnalytics');
  const canExportData = () => isDevMode || hasFeature('exportData');
  const canManageTeam = () => isDevMode || hasFeature('teamManagement');
  const canUseBarcodeScanning = () => isDevMode || hasFeature('barcodeScanning');
  const canUseAutomaticReordering = () => isDevMode || hasFeature('automaticReordering');
  const canAccessVendorManagement = () => isDevMode || hasFeature('vendorManagement');
  const canAccessRecipeManagement = () => isDevMode || hasFeature('recipeManagement');

  // Limit checking functions
  const canAddUser = (currentUsers: number) => isDevMode || isWithinLimit('maxUsers', currentUsers);
  const canAddProduct = (currentProducts: number) => isDevMode || isWithinLimit('maxProducts', currentProducts);
  const canAddSupplier = (currentSuppliers: number) => isDevMode || isWithinLimit('maxSuppliers', currentSuppliers);
  const canAddLocation = (currentLocations: number) => isDevMode || isWithinLimit('maxLocations', currentLocations);
  const canPlaceOrder = (currentOrders: number) => isDevMode || isWithinLimit('maxOrders', currentOrders);

  // Get current usage limits
  const getUserLimit = () => subscription?.currentUsage.users || 0;
  const getProductLimit = () => subscription?.currentUsage.products || 0;
  const getSupplierLimit = () => subscription?.currentUsage.suppliers || 0;
  const getLocationLimit = () => subscription?.currentUsage.locations || 0;
  const getOrderLimit = () => subscription?.currentUsage.ordersThisMonth || 0;

  // Feature requirement checker
  const requiresFeature = (feature: keyof SubscriptionFeatures): boolean => {
    return isDevMode || hasFeature(feature);
  };

  // Block action if feature not available
  const blockAction = (feature: keyof SubscriptionFeatures, action: () => void) => {
    if (isDevMode || hasFeature(feature)) {
      action();
    } else {
      // Could show a modal or redirect to upgrade page
      console.warn(`Action blocked: ${feature} not available in current plan`);
      // You can customize this behavior
      window.location.href = '/subscription/upgrade';
    }
  };

  // Check if user can perform an action that affects limits
  const blockActionWithLimit = (
    limit: keyof SubscriptionLimits, 
    currentUsage: number, 
    action: () => void
  ) => {
    if (isDevMode || isWithinLimit(limit, currentUsage)) {
      action();
    } else {
      console.warn(`Action blocked: ${limit} limit reached`);
      window.location.href = '/subscription/upgrade';
    }
  };

  // Get tier-specific information
  const getTierInfo = () => {
    if (!subscription) return null;
    
    return {
      tier: subscription.tier,
      planId: subscription.planId,
      status: subscription.status,
      isActive,
      isTrial,
      trialDaysRemaining,
      billingCycle: subscription.billingCycle,
    };
  };

  return {
    // Feature access
    hasFeature,
    canAccessPOS,
    canAccessInventory,
    canAccessPurchaseOrders,
    canAccessAdvancedAnalytics,
    canExportData,
    canManageTeam,
    canUseBarcodeScanning,
    canUseAutomaticReordering,
    canAccessVendorManagement,
    canAccessRecipeManagement,

    // Limit checking
    isWithinLimit,
    canAddUser,
    canAddProduct,
    canAddSupplier,
    canAddLocation,
    canPlaceOrder,

    // Current usage
    getUserLimit,
    getProductLimit,
    getSupplierLimit,
    getLocationLimit,
    getOrderLimit,

    // Utilities
    requiresFeature,
    blockAction,
    blockActionWithLimit,
    getTierInfo,

    // Subscription info
    subscription,
    isActive,
    isTrial,
    trialDaysRemaining,
  };
};
