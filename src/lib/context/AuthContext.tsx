'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange, getUserProfile, getTenantInfo, UserProfile, TenantInfo, signOut as firebaseSignOut } from '../firebase/auth'
import { UserRole } from '../rbac/permissions'

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tenant: TenantInfo | null;
  loading: boolean;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Development mode - bypass authentication (DISABLED for testing)
// Can be controlled via NEXT_PUBLIC_ENABLE_DEV_AUTH=true in .env.local
const isDevelopment = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'

const mockUser: User = {
  uid: 'dev-user-123',
  email: 'developer@coretrack.dev',
  displayName: 'Developer User',
  emailVerified: true,
} as User

const mockProfile: UserProfile = {
  uid: 'dev-user-123',
  email: 'developer@coretrack.dev',
  displayName: 'Developer User',
  tenantId: 'dev-tenant-123',
  role: 'owner',
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  lastLogin: new Date() as any,
  assignedBranches: [], // Dev user has access to all branches (owner)
  primaryBranch: undefined,
  branchPermissions: {}
}

const mockTenant: TenantInfo = {
  id: 'dev-tenant-123',
  name: 'CoreTrack Development Restaurant',
  type: 'restaurant',
  createdAt: new Date() as any,
  ownerId: 'dev-user-123',
  settings: {
    currency: 'PHP',
    timezone: 'Asia/Manila',
    businessHours: {
      open: '09:00',
      close: '22:00',
    },
  },
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Development mode - bypass Firebase authentication
    if (isDevelopment) {
      console.log('🔧 Development Mode: Using mock authentication data');
      console.warn('🚨 SECURITY WARNING: Development mode is enabled! Branch access controls are bypassed.');
      console.warn('🚨 This should NEVER be enabled in production!');
      setUser(mockUser);
      setProfile(mockProfile);
      setTenant(mockTenant);
      setLoading(false);
      return;
    }

    // Production mode - use Firebase authentication
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 seconds max

    const unsubscribe = onAuthStateChange(async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          // User is signed in
          setUser(firebaseUser);
          
          const userProfile = await getUserProfile(firebaseUser.uid);
          setProfile(userProfile);
          
          if (userProfile?.tenantId) {
            const tenantInfo = await getTenantInfo(userProfile.tenantId);
            setTenant(tenantInfo);
          } else {
            setTenant(null);
          }
        } else {
          // User is signed out
          setUser(null);
          setProfile(null);
          setTenant(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isDevelopment) {
      console.log('🔧 Development Mode: Mock sign out');
      setUser(null);
      setProfile(null);
      setTenant(null);
      return;
    }
    
    await firebaseSignOut();
  };

  const handleRefreshProfile = async () => {
    if (isDevelopment) {
      console.log('🔧 Development Mode: Mock profile refresh');
      return;
    }
    
    if (user?.uid) {
      try {
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
        
        if (userProfile?.tenantId) {
          const tenantInfo = await getTenantInfo(userProfile.tenantId);
          setTenant(tenantInfo);
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  const value = {
    user,
    profile,
    tenant,
    loading,
    signOut: handleSignOut,
    refreshProfile: handleRefreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
