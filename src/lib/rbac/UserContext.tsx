'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from './permissions';

interface UserContextType {
  currentRole: UserRole | null;
  setCurrentRole: (role: UserRole | null) => void;
  currentUser: {
    uid: string;
    email: string;
    role: UserRole;
  } | null;
  setCurrentUser: (user: { uid: string; email: string; role: UserRole } | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // Initialize with no user - will be set via authentication
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string;
    role: UserRole;
  } | null>(null);

  return (
    <UserContext.Provider value={{
      currentRole,
      setCurrentRole,
      currentUser,
      setCurrentUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
