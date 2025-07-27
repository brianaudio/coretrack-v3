import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole } from '../rbac/permissions';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId: string;
  locationIds?: string[]; // For staff - which locations they can access
  status: 'active' | 'inactive' | 'pending';
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RoleBasedLoginResponse {
  user: AuthUser;
  permissions: string[];
  allowedModules: string[];
}

// Enhanced role-based sign in
export const roleBasedSignIn = async (credentials: LoginCredentials): Promise<RoleBasedLoginResponse> => {
  try {
    // 1. Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    const firebaseUser = userCredential.user;

    // 2. Get user profile with role information
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found. Please contact your administrator.');
    }

    const userData = userDoc.data() as AuthUser;

    // 3. Check if user is active
    if (userData.status !== 'active') {
      await firebaseSignOut(auth);
      throw new Error(`Account is ${userData.status}. Please contact your administrator.`);
    }

    // 4. Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: Timestamp.now()
    });

    // 5. Get role-based permissions
    const permissions = getRolePermissions(userData.role);
    const allowedModules = getAllowedModulesForRole(userData.role);

    return {
      user: userData,
      permissions,
      allowedModules
    };
  } catch (error: any) {
    console.error('Role-based sign in error:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

// Create staff account (can only be done by owner/manager)
export const createStaffAccount = async (
  staffData: {
    email: string;
    displayName: string;
    role: 'staff' | 'manager';
    locationIds?: string[];
  },
  tenantId: string,
  createdBy: string
): Promise<string> => {
  try {
    // Generate a temporary password
    const tempPassword = generateSecurePassword();
    
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, staffData.email, tempPassword);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: staffData.displayName });

    // Create user profile
    const userProfile: AuthUser = {
      uid: user.uid,
      email: staffData.email,
      displayName: staffData.displayName,
      role: staffData.role,
      tenantId,
      locationIds: staffData.locationIds || [],
      status: 'pending', // User needs to reset password on first login
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    // Send password reset email for first-time setup
    await sendPasswordResetEmail(auth, staffData.email);

    // Log the action
    console.log(`Staff account created: ${staffData.email} by ${createdBy}`);

    return user.uid;
  } catch (error: any) {
    console.error('Create staff account error:', error);
    throw new Error(error.message || 'Failed to create staff account');
  }
};

// Secure logout
export const secureSignOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
};

// Get user by email (for checking if user exists)
export const getUserByEmail = async (email: string, tenantId: string): Promise<AuthUser | null> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email),
      where('tenantId', '==', tenantId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data() as AuthUser;
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
};

// Helper functions
const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const getRolePermissions = (role: UserRole): string[] => {
  const permissions: Record<UserRole, string[]> = {
    owner: ['read', 'write', 'delete', 'admin', 'manage_users', 'manage_locations'],
    manager: ['read', 'write', 'manage_staff', 'view_reports'],
    staff: ['read', 'limited_write']
  };
  return permissions[role] || [];
};

const getAllowedModulesForRole = (role: UserRole): string[] => {
  const modules: Record<UserRole, string[]> = {
    owner: ['all'],
    manager: ['all'],
    staff: ['pos', 'purchase-orders', 'inventory']
  };
  return modules[role] || [];
};

// Dev mode mock authentication
export const mockAuthentication = {
  staff: {
    email: 'staff@coretrack.dev',
    password: 'Staff123!',
    role: 'staff' as UserRole
  },
  manager: {
    email: 'manager@coretrack.dev', 
    password: 'Manager123!',
    role: 'manager' as UserRole
  },
  owner: {
    email: 'owner@coretrack.dev',
    password: 'Owner123!', 
    role: 'owner' as UserRole
  }
};
