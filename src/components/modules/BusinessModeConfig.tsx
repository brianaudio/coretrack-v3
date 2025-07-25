'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useBusinessSettings } from '../../lib/context/BusinessSettingsContext';
import { updateBusinessSettings } from '../../lib/firebase/businessSettings';
import { BusinessType, RESTAURANT_PRESET, RETAIL_PRESET, HYBRID_PRESET } from '../../lib/types/business';

const BusinessModeConfig: React.FC = () => {
  const { profile } = useAuth();
  const { settings, loading, refreshSettings } = useBusinessSettings();
  const [saving, setSaving] = useState(false);

  const handleBusinessTypeChange = async (businessType: BusinessType) => {
    if (!profile?.tenantId) return;

    setSaving(true);
    try {
      let preset = {};
      switch (businessType) {
        case 'restaurant':
          preset = RESTAURANT_PRESET;
          break;
        case 'retail':
          preset = RETAIL_PRESET;
          break;
        case 'hybrid':
          preset = HYBRID_PRESET;
          break;
      }

      await updateBusinessSettings(profile.tenantId, preset);
      await refreshSettings();
      
      console.log(`✅ Business mode changed to: ${businessType}`);
    } catch (error) {
      console.error('Error updating business type:', error);
      alert('Failed to update business mode');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingToggle = async (setting: string, value: boolean) => {
    if (!profile?.tenantId) return;

    setSaving(true);
    try {
      await updateBusinessSettings(profile.tenantId, { [setting]: value });
      await refreshSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Business Configuration</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure your business type and features
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Business Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Business Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Restaurant Mode */}
            <div
              onClick={() => handleBusinessTypeChange('restaurant')}
              className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                settings.businessType === 'restaurant'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-2xl mb-2">🍽️</div>
              <h3 className="font-medium text-gray-900">Restaurant</h3>
              <p className="text-sm text-gray-600 mt-1">
                Recipe-based inventory, table management, dine-in orders
              </p>
              <div className="mt-2 text-xs text-gray-500">
                • Ingredient tracking
                • Recipe management
                • Table service
                • Tips enabled
              </div>
            </div>

            {/* Retail Mode */}
            <div
              onClick={() => handleBusinessTypeChange('retail')}
              className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                settings.businessType === 'retail'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-2xl mb-2">🏪</div>
              <h3 className="font-medium text-gray-900">Retail</h3>
              <p className="text-sm text-gray-600 mt-1">
                Product-based inventory, counter sales, SKU tracking
              </p>
              <div className="mt-2 text-xs text-gray-500">
                • Product inventory
                • SKU management
                • Counter service
                • Barcode support
              </div>
            </div>

            {/* Hybrid Mode */}
            <div
              onClick={() => handleBusinessTypeChange('hybrid')}
              className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                settings.businessType === 'hybrid'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-medium text-gray-900">Hybrid</h3>
              <p className="text-sm text-gray-600 mt-1">
                Both restaurant and retail features enabled
              </p>
              <div className="mt-2 text-xs text-gray-500">
                • All features
                • Recipe + Products
                • Maximum flexibility
                • Complex setup
              </div>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Feature Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-900">Table Management</label>
                <p className="text-xs text-gray-500">Enable table service and reservations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableTableManagement}
                  onChange={(e) => handleSettingToggle('enableTableManagement', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-900">Recipe Tracking</label>
                <p className="text-xs text-gray-500">Track ingredients and recipe costs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableRecipeTracking}
                  onChange={(e) => handleSettingToggle('enableRecipeTracking', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-900">Tips & Service Charge</label>
                <p className="text-xs text-gray-500">Enable tip collection and service charges</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableTips}
                  onChange={(e) => handleSettingToggle('enableTips', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Current Configuration</h4>
          <div className="text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-2">
              <div>Business Type: <span className="font-medium capitalize">{settings.businessType}</span></div>
              <div>Default Order: <span className="font-medium">{settings.defaultOrderType}</span></div>
              <div>Currency: <span className="font-medium">{settings.currency}</span></div>
              <div>Tax Rate: <span className="font-medium">{settings.taxRate}%</span></div>
            </div>
          </div>
        </div>

        {saving && (
          <div className="text-center text-sm text-blue-600">
            Saving configuration...
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessModeConfig;
