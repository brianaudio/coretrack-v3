'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { BusinessSettings, DEFAULT_BUSINESS_SETTINGS } from '../types/business';
import { getBusinessSettings, subscribeToBusinessSettings } from '../firebase/businessSettings';

interface BusinessSettingsContextType {
  settings: BusinessSettings;
  loading: boolean;
  isRestaurant: boolean;
  isRetail: boolean;
  isHybrid: boolean;
  refreshSettings: () => Promise<void>;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | undefined>(undefined);

export const useBusinessSettings = () => {
  const context = useContext(BusinessSettingsContext);
  if (context === undefined) {
    throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider');
  }
  return context;
};

interface BusinessSettingsProviderProps {
  children: ReactNode;
}

export const BusinessSettingsProvider: React.FC<BusinessSettingsProviderProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Load settings when user/profile changes
  useEffect(() => {
    if (isDevelopment) {
      setSettings(DEFAULT_BUSINESS_SETTINGS);
      setLoading(false);
      return;
    }

    if (!user || !profile?.tenantId) {
      setSettings(DEFAULT_BUSINESS_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Subscribe to real-time settings updates
    const unsubscribe = subscribeToBusinessSettings(profile.tenantId, (newSettings) => {
      setSettings(newSettings);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, profile?.tenantId, isDevelopment]);

  const refreshSettings = async () => {
    if (isDevelopment) {
      setSettings(DEFAULT_BUSINESS_SETTINGS);
      return;
    }

    if (!profile?.tenantId) return;
    
    try {
      setLoading(true);
      const newSettings = await getBusinessSettings(profile.tenantId);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error refreshing business settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    settings,
    loading,
    isRestaurant: settings.businessType === 'restaurant' || settings.businessType === 'hybrid',
    isRetail: settings.businessType === 'retail' || settings.businessType === 'hybrid',
    isHybrid: settings.businessType === 'hybrid',
    refreshSettings,
  };

  return (
    <BusinessSettingsContext.Provider value={value}>
      {children}
    </BusinessSettingsContext.Provider>
  );
};
