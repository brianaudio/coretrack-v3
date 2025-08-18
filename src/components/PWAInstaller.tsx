'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [installMethod, setInstallMethod] = useState<string>('');

  useEffect(() => {
    console.log('🔍 PWA Installer: Initializing...');

    // Check if already installed
    const checkInstalled = () => {
      // Check if running in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ PWA already installed (standalone mode)');
        setIsInstalled(true);
        return true;
      }
      
      // Check iOS standalone
      if ((window.navigator as any).standalone) {
        console.log('✅ PWA already installed (iOS standalone)');
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    if (checkInstalled()) return;

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('🎯 PWA Install prompt received!');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setInstallMethod('native');
      
      // Store globally
      (window as any).__pwaPrompt = e;
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('🎉 PWA successfully installed!');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check PWA criteria after a delay
    setTimeout(() => {
      if (!deferredPrompt) {
        console.log('⚠️ No install prompt received, checking PWA criteria...');
        checkPWACriteria();
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkPWACriteria = async () => {
    try {
      // Check service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        console.log('🔧 Service worker registered:', !!registration);
        
        if (registration) {
          setIsInstallable(true);
          setInstallMethod('manual');
          console.log('✅ PWA criteria likely met, enabling manual install');
        }
      }

      // Check manifest
      const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
      console.log('📄 Manifest links found:', manifestLinks.length);

      // Check if we're on HTTPS
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      console.log('🔒 Secure context:', isSecure);

    } catch (error) {
      console.error('❌ Error checking PWA criteria:', error);
    }
  };

  const handleInstallClick = async () => {
    console.log('🚀 Install button clicked, method:', installMethod);
    setIsLoading(true);

    try {
      // Try stored prompt first
      const prompt = deferredPrompt || (window as any).__pwaPrompt;
      
      if (prompt) {
        console.log('📱 Using native install prompt');
        await prompt.prompt();
        const result = await prompt.userChoice;
        
        if (result.outcome === 'accepted') {
          console.log('✅ User accepted install');
          setIsInstalled(true);
        } else {
          console.log('❌ User dismissed install');
        }
        
        setDeferredPrompt(null);
        return;
      }

      // Fallback methods
      console.log('🔄 Trying fallback install methods...');
      
      // Check if browser has install capability
      if ('getInstalledRelatedApps' in navigator) {
        const relatedApps = await (navigator as any).getInstalledRelatedApps();
        if (relatedApps.length > 0) {
          alert('CoreTrack is already installed!');
          setIsInstalled(true);
          return;
        }
      }

      // Platform-specific instructions
      const userAgent = navigator.userAgent.toLowerCase();
      let instructions = '';
      
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
        instructions = 'Chrome: Look for the install button (⬇️) in the address bar, or go to Menu → Install CoreTrack';
      } else if (userAgent.includes('edge') || userAgent.includes('edg')) {
        instructions = 'Edge: Click the install button in the address bar, or go to Menu → Apps → Install CoreTrack';
      } else if (userAgent.includes('firefox')) {
        instructions = 'Firefox: Go to Menu → Install → Add to Home Screen';
      } else if (userAgent.includes('safari')) {
        if (userAgent.includes('mobile')) {
          instructions = 'Safari iOS: Tap Share button → Add to Home Screen';
        } else {
          instructions = 'Safari: This browser may not support PWA installation. Try Chrome or Edge.';
        }
      } else {
        instructions = 'Look for an install or "Add to Home Screen" option in your browser menu';
      }

      console.log('📝 Showing install instructions for:', userAgent);
      alert(`To install CoreTrack:\n\n${instructions}`);

    } catch (error) {
      console.error('❌ Install failed:', error);
      alert('Installation failed. Please try using the install option in your browser menu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if already installed
  if (isInstalled) {
    return (
      <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
        CoreTrack Installed!
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center px-8 py-3 
        bg-gradient-to-r from-blue-600 to-green-600 
        hover:from-blue-700 hover:to-green-700 
        text-white font-semibold rounded-xl 
        transition-all duration-200 shadow-lg 
        hover:shadow-xl hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed
        min-w-[200px]
      `}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Installing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Install CoreTrack
        </>
      )}
    </button>
  );
}
