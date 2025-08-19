"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
    setIsInstallable(true);
    console.log('`beforeinstallprompt` event was fired.');
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [handleBeforeInstallPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('The app can\'t be installed right now. This might be because it is already installed, you are using an unsupported browser, or you need to refresh the page.');
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA prompt');
      alert('CoreTrack has been installed successfully!');
    } else {
      console.log('User dismissed the PWA prompt');
      alert('Installation cancelled.');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <button
      onClick={handleInstallClick}
      disabled={!isInstallable}
      className="flex items-center space-x-2 text-gray-300 hover:text-white text-sm font-medium transition-colors duration-200 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
      title={isInstallable ? "Install CoreTrack App" : "Installation not available"}
    >
      <span className="text-lg">📱</span>
      <span>Install App</span>
    </button>
  );
};

export default PWAInstallButton;
