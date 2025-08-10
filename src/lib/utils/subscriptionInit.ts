/**
 * Subscription Initialization Utilities
 * Handles automatic subscription setup for new users and tenants
 */

import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { TenantSubscription, SubscriptionTier } from '../types/subscription';

// Simple logging functions
const logInfo = (message: string, ...args: any[]) => console.log(`[SubscriptionInit] ${message}`, ...args);
const logError = (message: string, error?: any) => console.error(`[SubscriptionInit] ${message}`, error);

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
  createdAt: string;
  lastLoginAt: string;
}

export interface TenantData {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
  subscriptionPlan: SubscriptionTier;
  subscriptionStatus: 'active' | 'trial' | 'inactive';
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
  };
}

/**
 * Initialize subscription system for a new user
 * This runs automatically when a user signs up
 */
export async function initializeNewUserSubscription(
  userId: string,
  email: string,
  displayName?: string
): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  try {
    logInfo('Initializing subscription for new user:', email);

    // Generate tenant ID (using user ID for single-tenant setup)
    const tenantId = userId;

    // 1. Create user profile
    const userProfile: UserProfile = {
      id: userId,
      email: email,
      name: displayName || email.split('@')[0],
      tenantId: tenantId,
      role: 'owner',
      permissions: ['all'],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, userProfile);
    logInfo('✅ User profile created');

    // 2. Create tenant
    const tenantData: TenantData = {
      id: tenantId,
      name: `${userProfile.name}'s Business`,
      createdAt: new Date().toISOString(),
      ownerId: userId,
      subscriptionPlan: 'professional', // Start with professional for demo
      subscriptionStatus: 'trial',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        taxRate: 8.5
      }
    };

    const tenantRef = doc(db, 'tenants', tenantId);
    await setDoc(tenantRef, tenantData);
    logInfo('✅ Tenant created');

    // 3. Create professional subscription (14-day trial)
    const now = Timestamp.now();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

    const subscription: Omit<TenantSubscription, 'id'> = {
      tenantId: tenantId,
      planId: 'professional',
      tier: 'professional',
      status: 'trial',
      billingCycle: 'monthly',
      startDate: now,
      endDate: Timestamp.fromDate(trialEndDate),
      trialEndDate: Timestamp.fromDate(trialEndDate),
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

    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    await setDoc(subscriptionRef, subscription);
    logInfo('✅ Professional trial subscription created');

    // 4. Create main location
    const mainLocationData = {
      id: 'main-location',
      name: 'Main Location',
      type: 'main',
      tenantId: tenantId,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      settings: {
        currency: 'USD',
        taxRate: 8.5,
        receiptFooter: 'Thank you for your business!'
      }
    };

    const locationRef = doc(db, 'locations', 'main-location');
    await setDoc(locationRef, mainLocationData);
    logInfo('✅ Main location created');

    logInfo('🎉 User subscription system initialized successfully');

    return {
      success: true,
      tenantId: tenantId
    };

  } catch (error) {
    logError('Failed to initialize user subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if a user needs subscription initialization
 */
export async function checkUserInitialization(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return true; // Needs initialization
    }

    const userData = userSnap.data();
    if (!userData.tenantId) {
      return true; // Needs initialization
    }

    // Check if subscription exists
    const subscriptionRef = doc(db, 'subscriptions', userData.tenantId);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    return !subscriptionSnap.exists(); // Needs initialization if no subscription

  } catch (error) {
    logError('Error checking user initialization:', error);
    return true; // Assume needs initialization on error
  }
}

/**
 * Upgrade a user to enterprise tier
 */
export async function upgradeToEnterprise(tenantId: string): Promise<boolean> {
  try {
    logInfo('Upgrading tenant to Enterprise:', tenantId);

    const now = Timestamp.now();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year

    const enterpriseSubscription: Omit<TenantSubscription, 'id'> = {
      tenantId: tenantId,
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

    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    await setDoc(subscriptionRef, enterpriseSubscription);

    // Update tenant
    const tenantRef = doc(db, 'tenants', tenantId);
    await setDoc(tenantRef, {
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    logInfo('✅ Successfully upgraded to Enterprise');
    return true;

  } catch (error) {
    logError('Failed to upgrade to Enterprise:', error);
    return false;
  }
}

/**
 * Get or create demo account data
 * Used for the demo account setup
 */
export async function ensureDemoAccount(): Promise<boolean> {
  try {
    const demoUserId = 'demo-user-id'; // Fixed demo user ID
    const demoEmail = 'demo@coretrack.com';
    const demoTenantId = 'demo-tenant';

    // Check if demo account exists
    const userRef = doc(db, 'users', demoUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create demo user profile
      const demoProfile: UserProfile = {
        id: demoUserId,
        email: demoEmail,
        name: 'Demo User',
        tenantId: demoTenantId,
        role: 'owner',
        permissions: ['all'],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      await setDoc(userRef, demoProfile);
      logInfo('✅ Demo user profile created');
    }

    // Ensure demo tenant exists
    const tenantRef = doc(db, 'tenants', demoTenantId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      const demoTenant: TenantData = {
        id: demoTenantId,
        name: 'CoreTrack Demo',
        createdAt: new Date().toISOString(),
        ownerId: demoUserId,
        subscriptionPlan: 'enterprise',
        subscriptionStatus: 'active',
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          taxRate: 8.5
        }
      };

      await setDoc(tenantRef, demoTenant);
      logInfo('✅ Demo tenant created');
    }

    // Ensure enterprise subscription exists
    return await upgradeToEnterprise(demoTenantId);

  } catch (error) {
    logError('Failed to ensure demo account:', error);
    return false;
  }
}
