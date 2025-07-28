'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  TenantSubscription, 
  SubscriptionFeatures, 
  SubscriptionLimits, 
  SUBSCRIPTION_PLANS 
} from '../types/subscription';
import { 
  getTenantSubscription, 
  isSubscriptionActive, 
  isInTrial, 
  getTrialDaysRemaining 
} from '../firebase/subscription';

interface SubscriptionContextType {
  subscription: TenantSubscription | null;
  features: SubscriptionFeatures | null;
  limits: SubscriptionLimits | null;
  loading: boolean;
  isActive: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  isWithinLimit: (limit: keyof SubscriptionLimits, currentUsage: number) => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, tenant } = useAuth();
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    console.log('📊 SubscriptionContext: Loading subscription for tenant:', tenant?.id);
    
    if (!tenant?.id) {
      console.log('📊 SubscriptionContext: No tenant ID, setting loading to false');
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📊 SubscriptionContext: Fetching subscription for tenant:', tenant.id);
      const subscriptionData = await getTenantSubscription(tenant.id);
      console.log('📊 SubscriptionContext: Subscription data:', subscriptionData);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('📊 SubscriptionContext: Error loading subscription:', error);
      setSubscription(null);
    } finally {
      console.log('📊 SubscriptionContext: Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📊 SubscriptionContext: useEffect triggered, tenant:', tenant);
    loadSubscription();
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('📊 SubscriptionContext: Safety timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [tenant?.id]);

  // Get current plan features and limits
  const getCurrentPlan = () => {
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(plan => plan.id === subscription.planId) || null;
  };

  const currentPlan = getCurrentPlan();
  const features = currentPlan?.features || null;
  const limits = currentPlan?.limits || null;

  const isActive = isSubscriptionActive(subscription);
  const isTrial = isInTrial(subscription);
  const trialDaysRemaining = getTrialDaysRemaining(subscription);

  // Helper function to check if a feature is available
  const hasFeature = (feature: keyof SubscriptionFeatures): boolean => {
    if (!features || !isActive) return false;
    return features[feature];
  };

  // Helper function to check if within usage limits
  const isWithinLimit = (limit: keyof SubscriptionLimits, currentUsage: number): boolean => {
    if (!limits || !isActive) return false;
    
    const limitValue = limits[limit];
    // -1 means unlimited
    if (limitValue === -1) return true;
    
    return currentUsage < limitValue;
  };

  const refreshSubscription = async () => {
    await loadSubscription();
  };

  const value: SubscriptionContextType = {
    subscription,
    features,
    limits,
    loading,
    isActive,
    isTrial,
    trialDaysRemaining,
    hasFeature,
    isWithinLimit,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
