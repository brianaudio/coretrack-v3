import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  Timestamp,
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  TenantSubscription, 
  SubscriptionTier, 
  SubscriptionStatus,
  SubscriptionUsage,
  SUBSCRIPTION_PLANS 
} from '../types/subscription';

// Get tenant subscription
export const getTenantSubscription = async (tenantId: string): Promise<TenantSubscription | null> => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      return { id: subscriptionSnap.id, ...subscriptionSnap.data() } as TenantSubscription;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};

// Create initial subscription (for new tenants)
export const createInitialSubscription = async (
  tenantId: string,
  tier: SubscriptionTier = 'starter',
  trialDays: number = 14
): Promise<void> => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  if (!plan) throw new Error(`Plan not found for tier: ${tier}`);

  const now = Timestamp.now();
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + trialDays);

  const subscription: Omit<TenantSubscription, 'id'> = {
    tenantId,
    planId: plan.id,
    tier,
    status: 'trial',
    billingCycle: 'monthly',
    startDate: now,
    endDate: Timestamp.fromDate(trialEndDate),
    trialEndDate: Timestamp.fromDate(trialEndDate),
    currentUsage: {
      users: 1, // The owner
      locations: 1,
      products: 0,
      ordersThisMonth: 0,
      suppliers: 0,
      storageUsed: 0,
      apiCallsThisMonth: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  const subscriptionRef = doc(db, 'subscriptions', tenantId);
  await setDoc(subscriptionRef, subscription);
};

// Update subscription tier
export const updateSubscriptionTier = async (
  tenantId: string,
  newTier: SubscriptionTier,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Promise<void> => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === newTier);
  if (!plan) throw new Error(`Plan not found for tier: ${newTier}`);

  const subscriptionRef = doc(db, 'subscriptions', tenantId);
  const now = Timestamp.now();
  
  // Calculate new end date (assuming immediate upgrade)
  const endDate = new Date();
  if (billingCycle === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  await updateDoc(subscriptionRef, {
    planId: plan.id,
    tier: newTier,
    billingCycle,
    status: 'active',
    endDate: Timestamp.fromDate(endDate),
    updatedAt: now,
  });
};

// Update subscription status
export const updateSubscriptionStatus = async (
  tenantId: string,
  status: SubscriptionStatus
): Promise<void> => {
  const subscriptionRef = doc(db, 'subscriptions', tenantId);
  await updateDoc(subscriptionRef, {
    status,
    updatedAt: Timestamp.now(),
    ...(status === 'canceled' && { canceledAt: Timestamp.now() }),
  });
};

// Track usage - increment counters
export const trackUsage = async (
  tenantId: string,
  usageType: keyof SubscriptionUsage,
  amount: number = 1
): Promise<void> => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    await updateDoc(subscriptionRef, {
      [`currentUsage.${usageType}`]: increment(amount),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
};

// Reset monthly usage counters (should be called monthly via cron job)
export const resetMonthlyUsage = async (tenantId: string): Promise<void> => {
  const subscriptionRef = doc(db, 'subscriptions', tenantId);
  await updateDoc(subscriptionRef, {
    'currentUsage.ordersThisMonth': 0,
    'currentUsage.apiCallsThisMonth': 0,
    updatedAt: Timestamp.now(),
  });
};

// Check if subscription is active
export const isSubscriptionActive = (subscription: TenantSubscription | null): boolean => {
  if (!subscription) return false;
  
  const now = new Date();
  const endDate = subscription.endDate.toDate();
  
  return (
    subscription.status === 'active' || 
    subscription.status === 'trial'
  ) && endDate > now;
};

// Check if subscription is in trial
export const isInTrial = (subscription: TenantSubscription | null): boolean => {
  if (!subscription) return false;
  
  const now = new Date();
  const trialEndDate = subscription.trialEndDate?.toDate();
  
  return subscription.status === 'trial' && !!trialEndDate && trialEndDate > now;
};

// Get days remaining in trial
export const getTrialDaysRemaining = (subscription: TenantSubscription | null): number => {
  if (!subscription || !subscription.trialEndDate) return 0;
  
  const now = new Date();
  const trialEndDate = subscription.trialEndDate.toDate();
  const diffTime = trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};
