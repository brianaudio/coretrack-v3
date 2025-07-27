'use client';

import { useEffect } from 'react';
import { DataRestorationService } from '@/lib/data/DataRestorationService';

export default function DataInitializer() {
  useEffect(() => {
    // Initialize data on app startup
    DataRestorationService.restoreAllData();
  }, []);

  return null; // This component doesn't render anything
}
