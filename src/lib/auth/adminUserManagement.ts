import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole } from '../rbac/permissions';

export interface AdminCreateUserData {
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  password: string;
  locationIds?: string[];
}

export interface AdminCreatedUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  password: string; // For sharing with admin
  tenantId: string;
}

// Generate secure password
export const generateSecurePassword = (length: number = 12): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special
  
  // Fill the rest
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Admin creates user account with generated password
export const adminCreateUser = async (userData: AdminCreateUserData): Promise<AdminCreatedUser> => {
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const user = userCredential.user;

    // 2. Update user profile
    await updateProfile(user, {
      displayName: userData.fullName
    });

    // 3. Create user document in Firestore
    const userDocData = {
      uid: user.uid,
      email: userData.email,
      displayName: userData.fullName,
      role: userData.role,
      tenantId: userData.tenantId,
      locationIds: userData.locationIds || [],
      status: 'active',
      createdBy: 'admin',
      passwordChangeRequired: true, // Force password change on first login
      createdAt: Timestamp.now(),
      lastLogin: null,
      updatedAt: Timestamp.now()
    };

    // Save to main users collection
    await setDoc(doc(db, 'users', user.uid), userDocData);

    // Save to tenant users subcollection
    await setDoc(doc(db, 'tenants', userData.tenantId, 'users', user.uid), {
      uid: user.uid,
      email: userData.email,
      role: userData.role,
      status: 'active',
      joinedAt: Timestamp.now()
    });

    console.log(`✅ Admin created user: ${userData.email} (${userData.role})`);

    return {
      uid: user.uid,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role,
      password: userData.password,
      tenantId: userData.tenantId
    };

  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    throw error;
  }
};

// Send welcome email with credentials (for future implementation)
export const sendWelcomeEmail = async (
  email: string, 
  password: string, 
  fullName: string,
  tenantName: string
): Promise<void> => {
  // TODO: Implement email service integration
  console.log(`📧 Welcome email would be sent to ${email}`, {
    email,
    password,
    fullName,
    tenantName,
    loginUrl: window.location.origin
  });
};

// Bulk user creation for enterprise setup
export const adminCreateMultipleUsers = async (
  users: Omit<AdminCreateUserData, 'password'>[],
  tenantId: string
): Promise<AdminCreatedUser[]> => {
  const results: AdminCreatedUser[] = [];
  
  for (const userData of users) {
    try {
      const password = generateSecurePassword();
      const createdUser = await adminCreateUser({
        ...userData,
        password,
        tenantId
      });
      results.push(createdUser);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error);
      // Continue with other users
    }
  }
  
  return results;
};

// Reset user password (admin function)
export const adminResetUserPassword = async (email: string): Promise<string> => {
  try {
    const newPassword = generateSecurePassword();
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    
    console.log(`🔄 Password reset initiated for ${email}`);
    return newPassword;
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    throw error;
  }
};

const adminUserManagement = {
  adminCreateUser,
  generateSecurePassword,
  sendWelcomeEmail,
  adminCreateMultipleUsers,
  adminResetUserPassword
};

export default adminUserManagement;
