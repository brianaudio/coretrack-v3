import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { createInitialSubscription } from './subscription';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'staff';
  selectedBranchId?: string; // Store user's selected branch
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin: Timestamp;
}

export interface TenantInfo {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'food_truck' | 'other';
  createdAt: Timestamp;
  ownerId: string;
  settings: {
    currency: string;
    timezone: string;
    businessHours: {
      open: string;
      close: string;
    };
  };
}

// Create user profile in Firestore
const createUserProfile = async (
  user: User, 
  additionalData: {
    displayName: string;
    tenantId: string;
    role: UserProfile['role'];
  }
): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  const now = Timestamp.now();
  
  const profileData: Omit<UserProfile, 'uid'> = {
    email: user.email!,
    displayName: additionalData.displayName,
    tenantId: additionalData.tenantId,
    role: additionalData.role,
    createdAt: now,
    updatedAt: now,
    lastLogin: now
  };
  
  await setDoc(userRef, profileData);
};

// Create tenant
const createTenant = async (
  tenantData: Omit<TenantInfo, 'id' | 'createdAt'>
): Promise<string> => {
  const tenantRef = doc(db, 'tenants', tenantData.ownerId); // Use owner ID as tenant ID for simplicity
  const now = Timestamp.now();
  
  await setDoc(tenantRef, {
    ...tenantData,
    createdAt: now
  });
  
  return tenantData.ownerId;
};

// Sign up new user and create tenant
export const signUp = async (
  email: string,
  password: string,
  displayName: string,
  businessName: string,
  businessType: TenantInfo['type'] = 'restaurant'
): Promise<{ user: User; profile: UserProfile }> => {
  try {
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name
    await updateProfile(user, { displayName });
    
    // Create tenant
    const tenantId = await createTenant({
      name: businessName,
      type: businessType,
      ownerId: user.uid,
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        businessHours: {
          open: '09:00',
          close: '22:00'
        }
      }
    });
    
    // Create user profile
    await createUserProfile(user, {
      displayName,
      tenantId,
      role: 'owner'
    });
    
    // Create initial subscription (14-day trial)
    await createInitialSubscription(tenantId);
    
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName,
      tenantId,
      role: 'owner',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    };
    
    return { user, profile };
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in existing user
export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User; profile: UserProfile }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user profile
    const profileDoc = await getDoc(doc(db, 'users', user.uid));
    if (!profileDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const profile = { uid: user.uid, ...profileDoc.data() } as UserProfile;
    
    // Update last login
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    return { user, profile };
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const profileDoc = await getDoc(doc(db, 'users', uid));
    if (!profileDoc.exists()) {
      return null;
    }
    
    return { uid, ...profileDoc.data() } as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Get tenant info
export const getTenantInfo = async (tenantId: string): Promise<TenantInfo | null> => {
  try {
    const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
    if (!tenantDoc.exists()) {
      return null;
    }
    
    return { id: tenantId, ...tenantDoc.data() } as TenantInfo;
  } catch (error) {
    console.error('Error getting tenant info:', error);
    return null;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  console.log('🔗 Firebase Auth: Setting up onAuthStateChanged listener');
  return onAuthStateChanged(auth, (user) => {
    console.log('🔗 Firebase Auth: State changed, user:', user ? 'exists' : 'null');
    callback(user);
  });
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Update user's selected branch
export const updateUserSelectedBranch = async (uid: string, branchId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      selectedBranchId: branchId,
      updatedAt: Timestamp.now()
    });
    console.log('✅ User selected branch updated in Firebase:', { uid, branchId });
  } catch (error) {
    console.error('❌ Error updating user selected branch:', error);
    throw error;
  }
};
