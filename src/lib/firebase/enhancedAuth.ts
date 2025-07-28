import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { createInitialSubscription } from './subscription';
import { initializeBusinessSettings } from './businessSettings';

export interface BusinessSetup {
  // Personal Information
  displayName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  
  // Business Information
  businessName: string
  businessType: 'restaurant' | 'cafe' | 'food_truck' | 'bakery' | 'bar' | 'catering' | 'retail' | 'other'
  businessDescription: string
  
  // Business Details
  cuisine: string
  seatingCapacity: number
  avgTicketSize: number
  operatingHours: {
    open: string
    close: string
  }
  
  // Location
  address: string
  city: string
  province: string
  postalCode: string
  
  // Features
  hasDelivery: boolean
  hasTakeout: boolean
  hasDineIn: boolean
  hasOnlineOrdering: boolean
  
  // Team
  teamSize: number
  currentPOS: string
  
  // Goals
  goals: string[]
  monthlyRevenue: string
}

export interface EnhancedUserProfile {
  uid: string
  email: string
  displayName: string
  phone: string
  tenantId: string
  role: 'owner'
  emailVerified: boolean
  
  // Business Information
  businessName: string
  businessType: string
  businessDescription: string
  
  // Business Details
  cuisine: string
  seatingCapacity: number
  avgTicketSize: number
  operatingHours: {
    open: string
    close: string
  }
  
  // Location
  address: string
  city: string
  province: string
  postalCode: string
  
  // Features
  hasDelivery: boolean
  hasTakeout: boolean
  hasDineIn: boolean
  hasOnlineOrdering: boolean
  
  // Team
  teamSize: number
  currentPOS: string
  
  // Goals
  goals: string[]
  monthlyRevenue: string
  
  // Onboarding
  onboardingCompleted: boolean
  onboardingSteps: {
    profileSetup: boolean
    businessSetup: boolean
    teamSetup: boolean
    integrationSetup: boolean
    trialStarted: boolean
  }
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLogin: Timestamp
}

export interface EnhancedTenantInfo {
  id: string
  name: string
  type: string
  description: string
  ownerId: string
  
  // Business Details
  cuisine: string
  seatingCapacity: number
  avgTicketSize: number
  monthlyRevenue: string
  
  // Location
  address: string
  city: string
  province: string
  postalCode: string
  
  // Features
  features: {
    hasDelivery: boolean
    hasTakeout: boolean
    hasDineIn: boolean
    hasOnlineOrdering: boolean
  }
  
  // Team
  teamSize: number
  currentPOS: string
  goals: string[]
  
  // Settings
  settings: {
    currency: string
    timezone: string
    businessHours: {
      open: string
      close: string
    }
    emailVerificationRequired: boolean
  }
  
  // Business Intelligence
  businessIntelligence: {
    setupScore: number // 0-100 based on completed setup
    riskLevel: 'low' | 'medium' | 'high'
    recommendations: string[]
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Calculate business setup score
const calculateSetupScore = (setup: BusinessSetup): number => {
  let score = 0
  const maxScore = 100
  
  // Basic information (30 points)
  if (setup.businessName) score += 10
  if (setup.businessType) score += 10
  if (setup.businessDescription) score += 10
  
  // Business details (25 points)
  if (setup.cuisine) score += 5
  if (setup.seatingCapacity > 0) score += 5
  if (setup.avgTicketSize > 0) score += 5
  if (setup.operatingHours.open && setup.operatingHours.close) score += 10
  
  // Location (15 points)
  if (setup.address) score += 5
  if (setup.city) score += 5
  if (setup.province) score += 5
  
  // Features (15 points)
  const featureCount = [
    setup.hasDelivery,
    setup.hasTakeout,
    setup.hasDineIn,
    setup.hasOnlineOrdering
  ].filter(Boolean).length
  score += featureCount * 3.75
  
  // Team & Goals (15 points)
  if (setup.teamSize > 0) score += 5
  if (setup.goals.length > 0) score += 5
  if (setup.monthlyRevenue) score += 5
  
  return Math.round(score)
}

// Generate business recommendations
const generateRecommendations = (setup: BusinessSetup): string[] => {
  const recommendations: string[] = []
  
  if (setup.avgTicketSize < 100) {
    recommendations.push('Consider menu optimization to increase average ticket size')
  }
  
  if (!setup.hasDelivery && setup.businessType !== 'food_truck') {
    recommendations.push('Adding delivery service could increase revenue by 20-30%')
  }
  
  if (!setup.hasOnlineOrdering) {
    recommendations.push('Online ordering integration can reduce wait times and increase efficiency')
  }
  
  if (setup.teamSize > 5 && setup.goals.includes('Manage team better')) {
    recommendations.push('Implement shift management and role-based access controls')
  }
  
  if (setup.goals.includes('Reduce inventory waste')) {
    recommendations.push('Set up automated inventory alerts and usage tracking')
  }
  
  if (setup.goals.includes('Increase profit margins')) {
    recommendations.push('Enable cost tracking and menu profitability analysis')
  }
  
  return recommendations
}

// Create enhanced user profile
const createEnhancedUserProfile = async (
  user: User,
  setup: BusinessSetup,
  tenantId: string
): Promise<void> => {
  const userRef = doc(db, 'users', user.uid)
  const now = Timestamp.now()
  
  const profileData: Omit<EnhancedUserProfile, 'uid'> = {
    email: user.email!,
    displayName: setup.displayName,
    phone: setup.phone,
    tenantId,
    role: 'owner',
    emailVerified: user.emailVerified,
    
    // Business Information
    businessName: setup.businessName,
    businessType: setup.businessType,
    businessDescription: setup.businessDescription,
    
    // Business Details
    cuisine: setup.cuisine,
    seatingCapacity: setup.seatingCapacity,
    avgTicketSize: setup.avgTicketSize,
    operatingHours: setup.operatingHours,
    
    // Location
    address: setup.address,
    city: setup.city,
    province: setup.province,
    postalCode: setup.postalCode,
    
    // Features
    hasDelivery: setup.hasDelivery,
    hasTakeout: setup.hasTakeout,
    hasDineIn: setup.hasDineIn,
    hasOnlineOrdering: setup.hasOnlineOrdering,
    
    // Team
    teamSize: setup.teamSize,
    currentPOS: setup.currentPOS,
    
    // Goals
    goals: setup.goals,
    monthlyRevenue: setup.monthlyRevenue,
    
    // Onboarding
    onboardingCompleted: false,
    onboardingSteps: {
      profileSetup: true,
      businessSetup: true,
      teamSetup: false,
      integrationSetup: false,
      trialStarted: true
    },
    
    createdAt: now,
    updatedAt: now,
    lastLogin: now
  }
  
  await setDoc(userRef, profileData)
}

// Create enhanced tenant
const createEnhancedTenant = async (
  setup: BusinessSetup,
  ownerId: string
): Promise<string> => {
  const tenantId = ownerId // Use owner ID as tenant ID for simplicity
  const tenantRef = doc(db, 'tenants', tenantId)
  const now = Timestamp.now()
  
  const setupScore = calculateSetupScore(setup)
  const recommendations = generateRecommendations(setup)
  
  const tenantData: Omit<EnhancedTenantInfo, 'id'> = {
    name: setup.businessName,
    type: setup.businessType,
    description: setup.businessDescription,
    ownerId,
    
    // Business Details
    cuisine: setup.cuisine,
    seatingCapacity: setup.seatingCapacity,
    avgTicketSize: setup.avgTicketSize,
    monthlyRevenue: setup.monthlyRevenue,
    
    // Location
    address: setup.address,
    city: setup.city,
    province: setup.province,
    postalCode: setup.postalCode,
    
    // Features
    features: {
      hasDelivery: setup.hasDelivery,
      hasTakeout: setup.hasTakeout,
      hasDineIn: setup.hasDineIn,
      hasOnlineOrdering: setup.hasOnlineOrdering
    },
    
    // Team
    teamSize: setup.teamSize,
    currentPOS: setup.currentPOS,
    goals: setup.goals,
    
    // Settings
    settings: {
      currency: 'PHP',
      timezone: 'Asia/Manila',
      businessHours: setup.operatingHours,
      emailVerificationRequired: true
    },
    
    // Business Intelligence
    businessIntelligence: {
      setupScore,
      riskLevel: setupScore > 80 ? 'low' : setupScore > 60 ? 'medium' : 'high',
      recommendations
    },
    
    createdAt: now,
    updatedAt: now
  }
  
  await setDoc(tenantRef, tenantData)
  
  return tenantId
}

// Initialize first location
const createInitialLocation = async (tenantId: string, setup: BusinessSetup): Promise<void> => {
  const locationRef = doc(db, 'tenants', tenantId, 'locations', 'main-location')
  const now = Timestamp.now()
  
  const locationData = {
    id: 'main-location',
    name: 'Main Location',
    address: setup.address,
    city: setup.city,
    province: setup.province,
    postalCode: setup.postalCode,
    phone: setup.phone,
    
    // Business Details
    seatingCapacity: setup.seatingCapacity,
    operatingHours: setup.operatingHours,
    
    // Features
    features: {
      hasDelivery: setup.hasDelivery,
      hasTakeout: setup.hasTakeout,
      hasDineIn: setup.hasDineIn,
      hasOnlineOrdering: setup.hasOnlineOrdering
    },
    
    isActive: true,
    isMain: true,
    createdAt: now,
    updatedAt: now
  }
  
  await setDoc(locationRef, locationData)
}

// Send welcome email with business-specific content
const sendWelcomeEmail = async (user: User, setup: BusinessSetup): Promise<void> => {
  try {
    // Send email verification
    await sendEmailVerification(user, {
      url: `${window.location.origin}/verify-email`,
      handleCodeInApp: true
    })
    
    // TODO: Send custom welcome email with:
    // - Business setup summary
    // - Next steps for onboarding
    // - Key features based on business type
    // - Contact information for support
    
    console.log('📧 Welcome email sent to:', user.email)
  } catch (error) {
    console.error('Error sending welcome email:', error)
    // Don't throw error - email verification failure shouldn't block account creation
  }
}

// Create enhanced account with comprehensive business setup
export const createEnhancedAccount = async (setup: BusinessSetup): Promise<{
  user: User
  profile: EnhancedUserProfile
  tenant: EnhancedTenantInfo
}> => {
  try {
    // 1. Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      setup.email, 
      setup.password
    )
    const user = userCredential.user
    
    // 2. Update display name
    await updateProfile(user, { 
      displayName: setup.displayName 
    })
    
    // 3. Create enhanced tenant
    const tenantId = await createEnhancedTenant(setup, user.uid)
    
    // 4. Create enhanced user profile
    await createEnhancedUserProfile(user, setup, tenantId)
    
    // 5. Create initial location
    await createInitialLocation(tenantId, setup)
    
    // 6. Initialize business settings with enhanced data
    await initializeBusinessSettings(tenantId, {
      businessName: setup.businessName,
      businessType: setup.businessType === 'restaurant' || setup.businessType === 'cafe' || setup.businessType === 'bar' 
        ? 'restaurant' : setup.businessType === 'retail' ? 'retail' : 'hybrid',
      currency: 'PHP',
      timezone: 'Asia/Manila',
      enableTableManagement: setup.hasDineIn,
      enableRecipeTracking: setup.businessType === 'restaurant' || setup.businessType === 'cafe',
      enableIngredientInventory: setup.businessType === 'restaurant' || setup.businessType === 'cafe',
      enableProductInventory: setup.businessType === 'retail',
      defaultOrderType: setup.hasDineIn ? 'dine-in' : setup.hasTakeout ? 'takeout' : 'over-counter',
      enableTips: setup.businessType !== 'retail',
      enableLoyaltyProgram: false,
      taxRate: 12, // Philippines VAT
      serviceCharge: setup.businessType === 'restaurant' ? 10 : 0
    })
    
    // 7. Create initial subscription (14-day trial)
    await createInitialSubscription(tenantId, 'starter', 14)
    
    // 8. Send welcome email with verification
    await sendWelcomeEmail(user, setup)
    
    // 9. Return structured data
    const profile: EnhancedUserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: setup.displayName,
      phone: setup.phone,
      tenantId,
      role: 'owner',
      emailVerified: user.emailVerified,
      businessName: setup.businessName,
      businessType: setup.businessType,
      businessDescription: setup.businessDescription,
      cuisine: setup.cuisine,
      seatingCapacity: setup.seatingCapacity,
      avgTicketSize: setup.avgTicketSize,
      operatingHours: setup.operatingHours,
      address: setup.address,
      city: setup.city,
      province: setup.province,
      postalCode: setup.postalCode,
      hasDelivery: setup.hasDelivery,
      hasTakeout: setup.hasTakeout,
      hasDineIn: setup.hasDineIn,
      hasOnlineOrdering: setup.hasOnlineOrdering,
      teamSize: setup.teamSize,
      currentPOS: setup.currentPOS,
      goals: setup.goals,
      monthlyRevenue: setup.monthlyRevenue,
      onboardingCompleted: false,
      onboardingSteps: {
        profileSetup: true,
        businessSetup: true,
        teamSetup: false,
        integrationSetup: false,
        trialStarted: true
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    }
    
    const tenant: EnhancedTenantInfo = {
      id: tenantId,
      name: setup.businessName,
      type: setup.businessType,
      description: setup.businessDescription,
      ownerId: user.uid,
      cuisine: setup.cuisine,
      seatingCapacity: setup.seatingCapacity,
      avgTicketSize: setup.avgTicketSize,
      monthlyRevenue: setup.monthlyRevenue,
      address: setup.address,
      city: setup.city,
      province: setup.province,
      postalCode: setup.postalCode,
      features: {
        hasDelivery: setup.hasDelivery,
        hasTakeout: setup.hasTakeout,
        hasDineIn: setup.hasDineIn,
        hasOnlineOrdering: setup.hasOnlineOrdering
      },
      teamSize: setup.teamSize,
      currentPOS: setup.currentPOS,
      goals: setup.goals,
      settings: {
        currency: 'PHP',
        timezone: 'Asia/Manila',
        businessHours: setup.operatingHours,
        emailVerificationRequired: true
      },
      businessIntelligence: {
        setupScore: calculateSetupScore(setup),
        riskLevel: calculateSetupScore(setup) > 80 ? 'low' : calculateSetupScore(setup) > 60 ? 'medium' : 'high',
        recommendations: generateRecommendations(setup)
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    
    console.log('✅ Enhanced account created successfully:', {
      email: user.email,
      businessName: setup.businessName,
      setupScore: calculateSetupScore(setup)
    })
    
    return { user, profile, tenant }
    
  } catch (error) {
    console.error('Error creating enhanced account:', error)
    throw error
  }
}

// Email verification helpers
export const resendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser
  if (!user) throw new Error('No user signed in')
  
  await sendEmailVerification(user, {
    url: `${window.location.origin}/verify-email`,
    handleCodeInApp: true
  })
}

export const checkEmailVerificationStatus = (): boolean => {
  return auth.currentUser?.emailVerified || false
}
