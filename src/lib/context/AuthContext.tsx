'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange, getUserProfile, getTenantInfo, UserProfile, TenantInfo } from '../firebase/auth'
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
    // Safety timeout to ensure loading doesn't get stuck
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
    const { signOut } = await import('../firebase/auth');
    await signOut();
  };

  const handleRefreshProfile = async () => {
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
