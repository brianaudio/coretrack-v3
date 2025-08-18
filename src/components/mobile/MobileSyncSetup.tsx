'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Smartphone, Monitor, Link, RefreshCw } from 'lucide-react';

interface MobileSyncSetupProps {
  onSyncMethodSelect: (method: 'qr' | 'link' | 'auto') => void;
}

export function MobileSyncSetup({ onSyncMethodSelect }: MobileSyncSetupProps) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Generate secure mobile link with session token
    const baseUrl = window.location.origin;
    const sessionToken = generateSecureToken();
    setCurrentUrl(`${baseUrl}/mobile?token=${sessionToken}&sync=auto`);
  }, []);

  const generateSecureToken = () => {
    return btoa(Date.now().toString() + Math.random().toString(36));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            CoreTrack Intelligence
          </h1>
          <p className="text-gray-600">
            Connect your mobile device to monitor your business remotely
          </p>
        </div>

        {/* Sync Methods */}
        <div className="space-y-4">
          {/* QR Code Method */}
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Monitor className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">QR Code Sync</h3>
                <p className="text-sm text-gray-600">Scan from your computer</p>
              </div>
            </div>
            
            {currentUrl && (
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <QRCodeSVG 
                    value={currentUrl} 
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={() => onSyncMethodSelect('qr')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Use QR Code
            </button>
          </div>

          {/* Direct Link Method */}
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Link className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Direct Link</h3>
                <p className="text-sm text-gray-600">Copy and share the link</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={currentUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => copyToClipboard(currentUrl)}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {copySuccess && (
              <p className="text-sm text-green-600 mb-2">✅ Link copied to clipboard!</p>
            )}
            
            <button
              onClick={() => onSyncMethodSelect('link')}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Use Direct Link
            </button>
          </div>

          {/* Auto-Sync Method */}
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <RefreshCw className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Auto-Sync</h3>
                <p className="text-sm text-gray-600">Already logged in on this device</p>
              </div>
            </div>
            
            <button
              onClick={() => onSyncMethodSelect('auto')}
              className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors"
            >
              Continue with Current Session
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">🎯 How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Choose your preferred sync method above</li>
            <li>• Link your mobile device to your CoreTrack account</li>
            <li>• Monitor your business from anywhere</li>
            <li>• Real-time updates when staff make sales</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
