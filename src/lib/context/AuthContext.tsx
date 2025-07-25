'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, TenantInfo, onAuthStateChange, getUserProfile, getTenantInfo } from '../firebase/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tenant: TenantInfo | null;
  loading: boolean;
  signOut: () => void;
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
  console.log('🔥 AuthProvider: Component initializing...');
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🔥 AuthProvider: State initialized, loading:', loading);

  useEffect(() => {
    console.log('🔥 AuthProvider: useEffect starting...');
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔥 AuthProvider: Auth state changed:', firebaseUser?.email || 'No user');
      
      try {
        if (firebaseUser) {
          console.log('🔥 AuthProvider: User found, fetching profile...');
          
          const userProfile = await getUserProfile(firebaseUser.uid);
          console.log('🔥 AuthProvider: Profile fetched:', userProfile);
          
          if (userProfile?.tenantId) {
            console.log('🔥 AuthProvider: Fetching tenant info...');
            const tenantInfo = await getTenantInfo(userProfile.tenantId);
            console.log('🔥 AuthProvider: Tenant info fetched:', tenantInfo);
            setTenant(tenantInfo);
          }
          
          setUser(firebaseUser);
          setProfile(userProfile);
        } else {
          console.log('🔥 AuthProvider: No user, clearing state...');
          setUser(null);
          setProfile(null);
          setTenant(null);
        }
      } catch (error) {
        console.error('🔥 AuthProvider: Error in auth state change:', error);
      } finally {
        console.log('🔥 AuthProvider: Setting loading to false');
        setLoading(false);
      }
    });

    return () => {
      console.log('🔥 AuthProvider: Cleanup - unsubscribing...');
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { signOut } = await import('../firebase/auth');
    await signOut();
  };

  const value = {
    user,
    profile,
    tenant,
    loading,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
