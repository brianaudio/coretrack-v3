// Subscription-Based Feature Access Control
// Combines user roles with subscription tier limitations

import { UserRole } from './permissions'
import { SubscriptionFeatures, SubscriptionTier } from '../types/subscription'

export type ModuleFeatureMap = {
  'pos': 'pos'
  'inventory': 'inventory' 
  'purchase-orders': 'purchaseOrders'
  'menu-builder': 'menuBuilder'
  'dashboard': 'basicAnalytics' // Dashboard shows basic analytics
  'expenses': 'expenses'
  'team-management': 'teamManagement'
  'location-management': 'multiUser' // Requires multi-user feature
  'settings': 'pos' // Settings always available if POS is available
  'discrepancy-monitoring': 'advancedAnalytics'
  'business-reports': 'customReports'
}

export const MODULE_FEATURE_MAPPING: ModuleFeatureMap = {
  'pos': 'pos',
  'inventory': 'inventory', 
  'purchase-orders': 'purchaseOrders',
  'menu-builder': 'menuBuilder',
  'dashboard': 'basicAnalytics',
  'expenses': 'expenses',
  'team-management': 'teamManagement',
  'location-management': 'multiUser',
  'settings': 'pos',
  'discrepancy-monitoring': 'advancedAnalytics',
  'business-reports': 'customReports'
}

// Check if user has access to a module based on both role and subscription
export const hasModuleAccess = (
  userRole: UserRole | null,
  subscriptionFeatures: SubscriptionFeatures | null,
  module: keyof ModuleFeatureMap
): boolean => {
  if (!userRole) return false
  
  // If no subscription data, default to basic access for owners
  if (!subscriptionFeatures) {
    return userRole === 'owner' && ['pos', 'inventory', 'dashboard', 'settings'].includes(module)
  }
  
  // Get the required feature for this module
  const requiredFeature = MODULE_FEATURE_MAPPING[module]
  const hasFeature = subscriptionFeatures[requiredFeature as keyof SubscriptionFeatures]
  
  // Staff can only access basic modules even with subscription features
  if (userRole === 'staff') {
    return hasFeature && ['pos', 'inventory'].includes(module)
  }
  
  // Managers and owners can access all subscribed features
  return hasFeature
}

// Get all accessible modules for a user
export const getAccessibleModules = (
  userRole: UserRole | null,
  subscriptionFeatures: SubscriptionFeatures | null
): (keyof ModuleFeatureMap)[] => {
  if (!userRole) return []
  
  const allModules: (keyof ModuleFeatureMap)[] = [
    'pos', 'inventory', 'purchase-orders', 'menu-builder', 
    'dashboard', 'expenses', 'team-management', 'location-management',
    'settings', 'discrepancy-monitoring', 'business-reports'
  ]
  
  return allModules.filter(module => 
    hasModuleAccess(userRole, subscriptionFeatures, module)
  )
}

// Get feature restrictions for display purposes
export const getFeatureRestrictions = (
  subscriptionTier: SubscriptionTier | null
): { restrictedModules: string[], upgradeMessage: string } => {
  if (!subscriptionTier || subscriptionTier === 'starter') {
    return {
      restrictedModules: [
        'purchase-orders', 'team-management', 'location-management',
        'discrepancy-monitoring', 'business-reports'
      ],
      upgradeMessage: 'Upgrade to Professional to unlock purchase orders, team management, and advanced reports.'
    }
  }
  
  if (subscriptionTier === 'professional') {
    return {
      restrictedModules: ['location-management'],
      upgradeMessage: 'Upgrade to Enterprise for multi-location management and API access.'
    }
  }
  
  return {
    restrictedModules: [],
    upgradeMessage: ''
  }
}
