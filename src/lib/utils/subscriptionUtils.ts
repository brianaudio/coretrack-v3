// Client-side subscription upgrade utility
// This will help diagnose and fix subscription tier issues

import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types/subscription';

// Function to manually upgrade subscription to Enterprise
export const forceUpgradeToEnterprise = async (tenantId: string) => {
  try {
    console.log('🔄 Forcing upgrade to Enterprise tier...');
    
    const enterprisePlan = SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.tier === 'enterprise');
    if (!enterprisePlan) throw new Error('Enterprise plan not found');
    
    const now = Timestamp.now();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now
    
    const enterpriseSubscription = {
      tenantId,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: Timestamp.fromDate(endDate),
      trialEndDate: Timestamp.fromDate(endDate),
      currentUsage: {
        users: 1,
        locations: 1,
        products: 0,
        ordersThisMonth: 0,
        suppliers: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };
    
    // Force set the subscription
    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    await setDoc(subscriptionRef, enterpriseSubscription);
    
    console.log('✅ Successfully upgraded to Enterprise tier!');
    return enterpriseSubscription;
    
  } catch (error) {
    console.error('💥 Error upgrading to Enterprise:', error);
    throw error;
  }
};

// Function to debug current subscription
export const debugSubscription = async (tenantId: string) => {
  try {
    console.log('🔍 Debugging subscription for tenant:', tenantId);
    
    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      const data = subscriptionSnap.data();
      console.log('📊 Current subscription:', data);
      return data;
    } else {
      console.log('❌ No subscription found');
      return null;
    }
  } catch (error) {
    console.error('💥 Error debugging subscription:', error);
    return null;
  }
};

// Add these functions to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).forceUpgradeToEnterprise = forceUpgradeToEnterprise;
  (window as any).debugSubscription = debugSubscription;
}
