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
    role: UserRole;
    locationIds?: string[];
  },
  tenantId: string,
  createdBy: string
): Promise<string> => {
  try {
    // Store current user to restore later
    const currentUser = auth.currentUser;
    
    // Check if user already exists in our system
    const existingUser = await getUserByEmail(staffData.email, tenantId);
    if (existingUser) {
      console.log(`User ${staffData.email} already exists in tenant ${tenantId}`);
      
      // Even for existing users, send password reset email to help them access their account
      console.log(`🔄 Sending password reset email to existing user: ${staffData.email}`);
      try {
        await sendPasswordResetEmail(auth, staffData.email);
        console.log(`✅ Password reset email sent successfully to existing user: ${staffData.email}`);
        console.log(`📧 Email troubleshooting tips:`);
        console.log(`   • Check spam/junk folders`);
        console.log(`   • Look in Gmail Promotions tab`);
        console.log(`   • Add noreply@inventory-system-latest.firebaseapp.com to contacts`);
        console.log(`   • Email may take 5-15 minutes to arrive`);
      } catch (emailError) {
        console.error(`❌ Failed to send password reset email to existing user ${staffData.email}:`, emailError);
        console.log(`💡 User can still reset password manually from login page`);
      }
      
      return existingUser.uid;
    }

    // Generate a temporary password
    const tempPassword = generateSecurePassword();
    
    // Create Firebase user (this will automatically sign them in)
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
    console.log(`🔄 Attempting to send password reset email to: ${staffData.email}`);
    try {
      await sendPasswordResetEmail(auth, staffData.email);
      console.log(`✅ Password reset email sent successfully to: ${staffData.email}`);
      console.log(`📧 Email troubleshooting tips:`);
      console.log(`   • Check spam/junk folders`);
      console.log(`   • Look in Gmail Promotions tab`);
      console.log(`   • Add noreply@inventory-system-latest.firebaseapp.com to contacts`);
      console.log(`   • Email may take 5-15 minutes to arrive`);
    } catch (emailError) {
      console.error(`❌ Failed to send password reset email to ${staffData.email}:`, emailError);
      console.log(`🔧 Email sending failed, but user account was created successfully`);
      console.log(`💡 User can still reset password manually from login page`);
      // Don't throw error here - user account was created successfully
    }

    // Note: Creating a user with createUserWithEmailAndPassword automatically signs them in
    // This is expected Firebase behavior. The frontend should handle auth state changes gracefully.
    console.log(`Staff account created and signed in: ${staffData.email} by ${createdBy}`);
    console.log('Note: The newly created user is now signed in. Frontend should handle this appropriately.');

    // Log the action
    console.log(`Staff account created: ${staffData.email} by ${createdBy}`);

    return user.uid;
  } catch (error: any) {
    console.error('Create staff account error:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      console.log(`Email ${staffData.email} already exists in Firebase Auth, attempting to handle gracefully...`);
      
      // For existing Firebase Auth users, send them a password reset email
      console.log(`🔄 Sending password reset email to Firebase Auth user: ${staffData.email}`);
      try {
        await sendPasswordResetEmail(auth, staffData.email);
        console.log(`✅ Password reset email sent successfully to Firebase Auth user: ${staffData.email}`);
        console.log(`📧 Email troubleshooting tips:`);
        console.log(`   • Check spam/junk folders`);
        console.log(`   • Look in Gmail Promotions tab`);
        console.log(`   • Add noreply@inventory-system-latest.firebaseapp.com to contacts`);
        console.log(`   • Email may take 5-15 minutes to arrive`);
        console.log(`   • User can use this email to reset their password and access the system`);
      } catch (emailError) {
        console.error(`❌ Failed to send password reset email to Firebase Auth user ${staffData.email}:`, emailError);
        console.log(`💡 User can still reset password manually from login page`);
      }
      
      // For team management purposes, we can continue without creating a new auth account
      // The user already exists in Firebase Auth, so they can potentially log in
      // We'll let the team management system handle adding them to the team
      console.log(`Skipping auth account creation for ${staffData.email} - already exists`);
      return 'existing-user'; // Return a special identifier
    }
    
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
    cashier: ['read', 'pos_access', 'basic_inventory'],
    staff: ['read', 'limited_write', 'pos_access']
  };
  return permissions[role] || [];
};

const getAllowedModulesForRole = (role: UserRole): string[] => {
  const modules: Record<UserRole, string[]> = {
    owner: ['all'],
    manager: ['all'],
    cashier: ['pos', 'inventory'],
    staff: ['pos', 'purchase-orders', 'inventory']
  };
  return modules[role] || [];
};

// Dev mode mock authentication (should be removed in production)
export const mockAuthentication = process.env.NODE_ENV === 'development' ? {
  staff: {
    email: process.env.NEXT_PUBLIC_STAFF_EMAIL || 'staff@coretrack.dev',
    password: process.env.NEXT_PUBLIC_STAFF_PASSWORD || 'Staff123!',
    role: 'staff' as UserRole
  },
  cashier: {
    email: process.env.NEXT_PUBLIC_CASHIER_EMAIL || 'cashier@coretrack.dev',
    password: process.env.NEXT_PUBLIC_CASHIER_PASSWORD || 'Cashier123!',
    role: 'cashier' as UserRole
  },
  manager: {
    email: process.env.NEXT_PUBLIC_MANAGER_EMAIL || 'manager@coretrack.dev', 
    password: process.env.NEXT_PUBLIC_MANAGER_PASSWORD || 'Manager123!',
    role: 'manager' as UserRole
  },
  owner: {
    email: process.env.NEXT_PUBLIC_OWNER_EMAIL || 'owner@coretrack.dev',
    password: process.env.NEXT_PUBLIC_OWNER_PASSWORD || 'Owner123!', 
    role: 'owner' as UserRole
  }
} : {};
