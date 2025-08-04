'use client';

import { useEffect } from 'react';
import { SecurityConfig } from '@/lib/security/SecurityConfig';

/**
 * SecurityValidation Component
 * 
 * Runtime security validation to ensure production environments
 * don't have development bypasses enabled.
 */
export function SecurityValidation() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Validate production security configuration
    const securityValidation = SecurityConfig.validateProductionSecurity();
    
    if (!securityValidation.isSecure) {
      // Log critical security warning
      console.error('🚨 CRITICAL SECURITY WARNING: Development bypasses detected in production environment!');
      
      // Log specific errors and warnings
      securityValidation.errors.forEach(error => {
        console.error(`❌ SECURITY ERROR: ${error}`);
      });
      
      securityValidation.warnings.forEach(warning => {
        console.warn(`⚠️ SECURITY WARNING: ${warning}`);
      });
      
      // In production, we could also send this to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to error tracking service
        // errorTrackingService.captureException(new Error('Production security bypass detected'));
      }
    }

    // Additional runtime checks
    const performRuntimeSecurityChecks = () => {
      const issues: string[] = [];

      // Check for development authentication bypass
      if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true" && process.env.NODE_ENV === 'production') {
        issues.push('Development authentication bypass enabled in production');
      }

      // Check for demo mode in production
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && process.env.NODE_ENV === 'production') {
        issues.push('Demo mode enabled in production');
      }

      // Check for debug flags
      if (process.env.NEXT_PUBLIC_DEBUG_LOGS === "true" && process.env.NODE_ENV === 'production') {
        issues.push('Debug logging enabled in production');
      }

      // Report any issues found
      if (issues.length > 0) {
        console.error('🚨 PRODUCTION SECURITY ISSUES DETECTED:', issues);
        
        // Could integrate with monitoring service here
        issues.forEach(issue => {
          console.error(`❌ Security Issue: ${issue}`);
        });
      }
    };

    performRuntimeSecurityChecks();
  }, []);

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook for components that need to verify security state
 */
export function useSecurityValidation() {
  useEffect(() => {
    const securityValidation = SecurityConfig.validateProductionSecurity();
    
    if (!securityValidation.isSecure && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Security validation failed - development bypasses may be active');
    }
  }, []);

  const securityValidation = SecurityConfig.validateProductionSecurity();
  
  return {
    isProductionSecure: securityValidation.isSecure,
    isDevelopmentMode: process.env.NODE_ENV === 'development',
    hasSecurityWarnings: !securityValidation.isSecure && process.env.NODE_ENV === 'production',
    securityErrors: securityValidation.errors,
    securityWarnings: securityValidation.warnings
  };
}
