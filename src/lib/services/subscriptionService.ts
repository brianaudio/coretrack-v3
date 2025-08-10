'use client'

import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from 'firebase/auth'

export interface SubscriptionTier {
  name: 'starter' | 'professional' | 'enterprise'
  displayName: string
  features: string[]
  maxLocations: number
  maxUsers: number
}

export interface UserSubscription {
  id: string
  userId: string
  tenantId: string
  tier: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'inactive' | 'pending' | 'cancelled'
  startDate: Date
  endDate?: Date
  features: string[]
  maxLocations: number
  maxUsers: number
  metadata: {
    createdAt: Date
    updatedAt: Date
    source: 'automatic' | 'manual' | 'migration'
  }
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  role: 'owner' | 'manager' | 'staff'
  tenantId: string
  permissions: string[]
  isActive: boolean
  metadata: {
    createdAt: Date
    updatedAt: Date
    lastLogin?: Date
  }
}

export interface TenantData {
  id: string
  name: string
  domain: string
  ownerId: string
  status: 'active' | 'inactive' | 'suspended'
  settings: {
    timezone: string
    currency: string
    businessType: string
  }
  metadata: {
    createdAt: Date
    updatedAt: Date
  }
}

// Subscription tier definitions
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  starter: {
    name: 'starter',
    displayName: 'Starter',
    features: ['pos', 'inventory', 'analytics', 'settings'],
    maxLocations: 1,
    maxUsers: 3
  },
  professional: {
    name: 'professional', 
    displayName: 'Professional',
    features: ['pos', 'inventory', 'analytics', 'purchase-orders', 'expenses', 'reports', 'team-management', 'settings'],
    maxLocations: 3,
    maxUsers: 10
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise', 
    features: [
      'pos', 
      'inventory', 
      'analytics', 
      'purchase-orders', 
      'expenses', 
      'reports', 
      'team-management', 
      'menu-builder',
      'integrations',
      'advanced-analytics',
      'multi-location',
      'api-access',
      'settings'
    ],
    maxLocations: -1, // unlimited
    maxUsers: -1 // unlimited
  }
}

// Enterprise account domains/emails
export const ENTERPRISE_ACCOUNTS = [
  'demo@coretrack.com',
  'admin@coretrack.com',
  'test@coretrack.com'
]

export class SubscriptionService {
  
  /**
   * Initialize complete user setup (profile + tenant + subscription + location)
   */
  static async initializeNewUser(user: User): Promise<{
    profile: UserProfile
    tenant: TenantData
    subscription: UserSubscription
    success: boolean
  }> {
    const batch = writeBatch(db)
    const timestamp = serverTimestamp()
    
    try {
      // Determine subscription tier based on email
      const tier = this.determineUserTier(user.email || '')
      const subscriptionTier = SUBSCRIPTION_TIERS[tier]
      
      // Generate IDs
      const tenantId = `tenant_${user.uid}`
      const profileId = user.uid
      const subscriptionId = `sub_${user.uid}`
      const locationId = `loc_${user.uid}_main`
      
      // Create tenant
      const tenantData: TenantData = {
        id: tenantId,
        name: this.generateTenantName(user.email || ''),
        domain: this.extractDomain(user.email || ''),
        ownerId: user.uid,
        status: 'active',
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          businessType: 'restaurant'
        },
        metadata: {
          createdAt: timestamp as any,
          updatedAt: timestamp as any
        }
      }
      
      const tenantRef = doc(db, 'tenants', tenantId)
      batch.set(tenantRef, tenantData)
      
      // Create user profile
      const profileData: UserProfile = {
        id: profileId,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: 'owner',
        tenantId: tenantId,
        permissions: ['all'],
        isActive: true,
        metadata: {
          createdAt: timestamp as any,
          updatedAt: timestamp as any,
          lastLogin: timestamp as any
        }
      }
      
      const profileRef = doc(db, 'users', profileId)
      batch.set(profileRef, profileData)
      
      // Create subscription
      const subscriptionData: UserSubscription = {
        id: subscriptionId,
        userId: user.uid,
        tenantId: tenantId,
        tier: tier,
        status: 'active',
        startDate: timestamp as any,
        features: subscriptionTier.features,
        maxLocations: subscriptionTier.maxLocations,
        maxUsers: subscriptionTier.maxUsers,
        metadata: {
          createdAt: timestamp as any,
          updatedAt: timestamp as any,
          source: 'automatic'
        }
      }
      
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId)
      batch.set(subscriptionRef, subscriptionData)
      
      // Create default location
      const locationData = {
        id: locationId,
        tenantId: tenantId,
        name: 'Main Location',
        address: '',
        isDefault: true,
        isActive: true,
        settings: {
          timezone: 'America/New_York',
          currency: 'USD'
        },
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }
      
      const locationRef = doc(db, 'locations', locationId)
      batch.set(locationRef, locationData)
      
      // Commit all changes
      await batch.commit()
      
      console.log('✅ User initialization completed successfully:', {
        userId: user.uid,
        email: user.email,
        tier: tier,
        tenantId: tenantId,
        features: subscriptionTier.features
      })
      
      return {
        profile: profileData,
        tenant: tenantData,
        subscription: subscriptionData,
        success: true
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize new user:', error)
      throw error
    }
  }
  
  /**
   * Get user's subscription with all related data
   */
  static async getUserSubscription(userId: string): Promise<{
    profile: UserProfile | null
    tenant: TenantData | null
    subscription: UserSubscription | null
  }> {
    try {
      // Get user profile
      const profileDoc = await getDoc(doc(db, 'users', userId))
      const profile = profileDoc.exists() ? { id: profileDoc.id, ...profileDoc.data() } as UserProfile : null
      
      if (!profile) {
        return { profile: null, tenant: null, subscription: null }
      }
      
      // Get tenant
      const tenantDoc = await getDoc(doc(db, 'tenants', profile.tenantId))
      const tenant = tenantDoc.exists() ? { id: tenantDoc.id, ...tenantDoc.data() } as TenantData : null
      
      // Get subscription
      const subscriptionQuery = query(
        collection(db, 'subscriptions'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      )
      const subscriptionDocs = await getDocs(subscriptionQuery)
      const subscription = subscriptionDocs.empty ? null : 
        { id: subscriptionDocs.docs[0].id, ...subscriptionDocs.docs[0].data() } as UserSubscription
      
      return { profile, tenant, subscription }
      
    } catch (error) {
      console.error('❌ Failed to get user subscription:', error)
      return { profile: null, tenant: null, subscription: null }
    }
  }
  
  /**
   * Check if user needs initialization and do it
   */
  static async ensureUserSetup(user: User): Promise<{
    profile: UserProfile
    subscription: UserSubscription
    needsInitialization: boolean
  }> {
    try {
      const { profile, subscription } = await this.getUserSubscription(user.uid)
      
      if (!profile || !subscription) {
        console.log('🔄 User needs initialization, setting up...', user.email)
        const initResult = await this.initializeNewUser(user)
        return {
          profile: initResult.profile,
          subscription: initResult.subscription,
          needsInitialization: true
        }
      }
      
      return {
        profile,
        subscription,
        needsInitialization: false
      }
      
    } catch (error) {
      console.error('❌ Failed to ensure user setup:', error)
      throw error
    }
  }
  
  /**
   * Get accessible modules based on subscription
   */
  static getAccessibleModules(subscription: UserSubscription | null): string[] {
    if (!subscription) {
      return SUBSCRIPTION_TIERS.starter.features
    }
    
    const tier = SUBSCRIPTION_TIERS[subscription.tier]
    return tier ? tier.features : SUBSCRIPTION_TIERS.starter.features
  }
  
  /**
   * Determine user tier based on email
   */
  private static determineUserTier(email: string): 'starter' | 'professional' | 'enterprise' {
    if (ENTERPRISE_ACCOUNTS.includes(email.toLowerCase())) {
      return 'enterprise'
    }
    
    // Check domain-based rules
    const domain = this.extractDomain(email)
    if (domain === 'coretrack.com') {
      return 'enterprise'
    }
    
    // Default to professional for new signups (can be changed based on business logic)
    return 'professional'
  }
  
  /**
   * Generate tenant name from email
   */
  private static generateTenantName(email: string): string {
    const username = email.split('@')[0]
    const domain = this.extractDomain(email)
    
    if (ENTERPRISE_ACCOUNTS.includes(email.toLowerCase())) {
      return 'CoreTrack Demo Business'
    }
    
    return `${username}'s Business`
  }
  
  /**
   * Extract domain from email
   */
  private static extractDomain(email: string): string {
    return email.split('@')[1] || 'unknown.com'
  }
}
