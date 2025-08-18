'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Smartphone, Monitor, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';

export default function MobilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<{isMobile: boolean, userAgent: string}>({
    isMobile: false,
    userAgent: ''
  });

  useEffect(() => {
    // Check if user is accessing from mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceInfo({
      isMobile,
      userAgent: navigator.userAgent
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CoreTrack Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <Smartphone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">CoreTrack Intelligence</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your mobile dashboard</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const isOwner = profile?.role === 'owner';

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-6">Mobile owner dashboard is only available for business owners</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Simple mobile owner dashboard (safe version)
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CoreTrack Intelligence</h1>
            <p className="text-sm text-gray-600">Mobile Owner Dashboard</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{profile?.displayName}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="p-4">
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <h3 className="font-medium text-gray-900 mb-2">Device Information</h3>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Device Type: {deviceInfo.isMobile ? '📱 Mobile' : '💻 Desktop'}
            </p>
            <p className="text-sm text-gray-600">
              Status: ✅ Connected
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Today's Sales</p>
                <p className="text-lg font-bold text-gray-900">₱0.00</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Active Staff</p>
                <p className="text-lg font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Features */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-3">🚀 Coming Soon</h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Real-time sales monitoring
            </div>
            <div className="flex items-center text-sm text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Staff activity alerts
            </div>
            <div className="flex items-center text-sm text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Inventory notifications
            </div>
            <div className="flex items-center text-sm text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              QR code sync between devices
            </div>
          </div>
        </div>

        {/* Safe Link to Main App */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Monitor className="w-5 h-5 mr-2" />
            Open Full Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
