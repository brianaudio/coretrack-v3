'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useUserPermissions } from '../../lib/context/UserPermissionsContext';
import { FeatureGate } from '../subscription/FeatureGate';
import { Location } from '../../lib/types/location';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation
} from '../../lib/firebase/locationManagement';

const LocationManagement: React.FC = () => {
  const { profile } = useAuth();
  const { canManageSettings, isOwner } = useUserPermissions();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Form state
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'branch' as Location['type'],
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Philippines'
    },
    contact: {
      phone: '',
      email: '',
      manager: ''
    },
    settings: {
      timezone: 'Asia/Manila',
      currency: 'PHP',
      businessHours: {
        monday: { open: '09:00', close: '22:00', closed: false },
        tuesday: { open: '09:00', close: '22:00', closed: false },
        wednesday: { open: '09:00', close: '22:00', closed: false },
        thursday: { open: '09:00', close: '22:00', closed: false },
        friday: { open: '09:00', close: '22:00', closed: false },
        saturday: { open: '09:00', close: '22:00', closed: false },
        sunday: { open: '10:00', close: '20:00', closed: false }
      },
      features: {
        inventory: true,
        pos: true,
        expenses: true
      }
    },
    status: 'active' as Location['status']
  });

  useEffect(() => {
    loadLocations();
  }, [profile?.tenantId]);

  const loadLocations = async () => {
    if (!profile?.tenantId) return;

    try {
      setLoading(true);
      const locationsData = await getLocations(profile.tenantId);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!profile?.tenantId) return;

    try {
      await createLocation({
        ...locationForm,
        tenantId: profile.tenantId
      });

      setShowCreateModal(false);
      resetForm();
      await loadLocations();
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;

    try {
      await updateLocation(editingLocation.id, locationForm);
      setEditingLocation(null);
      resetForm();
      await loadLocations();
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDeleteLocation = async (location: Location) => {
    if (!confirm(`Delete ${location.name}? This action cannot be undone.`)) return;

    try {
      await deleteLocation(location.id);
      await loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const resetForm = () => {
    setLocationForm({
      name: '',
      type: 'branch',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Philippines'
      },
      contact: {
        phone: '',
        email: '',
        manager: ''
      },
      settings: {
        timezone: 'Asia/Manila',
        currency: 'PHP',
        businessHours: {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '22:00', closed: false },
          saturday: { open: '09:00', close: '22:00', closed: false },
          sunday: { open: '10:00', close: '20:00', closed: false }
        },
        features: {
          inventory: true,
          pos: true,
          expenses: true
        }
      },
      status: 'active'
    });
  };

  const openEditModal = (location: Location) => {
    const mapBusinessHours = (hours: any) => ({
      open: hours?.open || '09:00',
      close: hours?.close || '22:00',
      closed: hours?.closed ?? false
    });

    setLocationForm({
      name: location.name,
      type: location.type,
      address: location.address,
      contact: {
        phone: location.contact.phone || '',
        email: location.contact.email || '',
        manager: location.contact.manager || ''
      },
      settings: {
        ...location.settings,
        businessHours: {
          monday: mapBusinessHours(location.settings.businessHours.monday),
          tuesday: mapBusinessHours(location.settings.businessHours.tuesday),
          wednesday: mapBusinessHours(location.settings.businessHours.wednesday),
          thursday: mapBusinessHours(location.settings.businessHours.thursday),
          friday: mapBusinessHours(location.settings.businessHours.friday),
          saturday: mapBusinessHours(location.settings.businessHours.saturday),
          sunday: mapBusinessHours(location.settings.businessHours.sunday)
        }
      },
      status: location.status
    });
    setEditingLocation(location);
  };

  const getTypeColor = (type: Location['type']) => {
    switch (type) {
      case 'main': return 'bg-purple-100 text-purple-800';
      case 'branch': return 'bg-blue-100 text-blue-800';
      case 'warehouse': return 'bg-green-100 text-green-800';
      case 'kiosk': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Location['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="multiUser">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-surface-900">Location Management</h1>
          {canManageSettings() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Location
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div key={location.id} className="bg-white rounded-lg shadow-sm border border-surface-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900">{location.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(location.type)}`}>
                      {location.type}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(location.status)}`}>
                      {location.status}
                    </span>
                  </div>
                </div>
                
                {canManageSettings() && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(location)}
                      className="p-2 text-surface-400 hover:text-primary-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {location.type !== 'main' && (
                      <button
                        onClick={() => handleDeleteLocation(location)}
                        className="p-2 text-surface-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm text-surface-600">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div>{location.address.street}</div>
                    <div>{location.address.city}, {location.address.state} {location.address.zipCode}</div>
                  </div>
                </div>

                {location.contact.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{location.contact.phone}</span>
                  </div>
                )}

                {location.contact.manager && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{location.contact.manager}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-surface-100">
                  <div className="flex gap-3">
                    {location.settings.features.inventory && (
                      <span className="text-xs text-primary-600">📦 Inventory</span>
                    )}
                    {location.settings.features.pos && (
                      <span className="text-xs text-primary-600">💳 POS</span>
                    )}
                    {location.settings.features.expenses && (
                      <span className="text-xs text-primary-600">💰 Expenses</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingLocation) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-6">
                  {editingLocation ? 'Edit Location' : 'Add New Location'}
                </h3>
                
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  editingLocation ? handleUpdateLocation() : handleCreateLocation();
                }}>
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-surface-900">Basic Information</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">
                            Location Name
                          </label>
                          <input
                            type="text"
                            required
                            value={locationForm.name}
                            onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-surface-700 mb-1">
                            Type
                          </label>
                          <select
                            value={locationForm.type}
                            onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value as Location['type'] })}
                            className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="main">Main</option>
                            <option value="branch">Branch</option>
                            <option value="warehouse">Warehouse</option>
                            <option value="kiosk">Kiosk</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-surface-900">Address</h4>
                      
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={locationForm.address.street}
                        onChange={(e) => setLocationForm({ 
                          ...locationForm, 
                          address: { ...locationForm.address, street: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <input
                          type="text"
                          placeholder="City"
                          value={locationForm.address.city}
                          onChange={(e) => setLocationForm({ 
                            ...locationForm, 
                            address: { ...locationForm.address, city: e.target.value }
                          })}
                          className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="State/Province"
                          value={locationForm.address.state}
                          onChange={(e) => setLocationForm({ 
                            ...locationForm, 
                            address: { ...locationForm.address, state: e.target.value }
                          })}
                          className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="ZIP Code"
                          value={locationForm.address.zipCode}
                          onChange={(e) => setLocationForm({ 
                            ...locationForm, 
                            address: { ...locationForm.address, zipCode: e.target.value }
                          })}
                          className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-surface-900">Contact Information</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={locationForm.contact.phone}
                          onChange={(e) => setLocationForm({ 
                            ...locationForm, 
                            contact: { ...locationForm.contact, phone: e.target.value }
                          })}
                          className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Manager Name"
                          value={locationForm.contact.manager}
                          onChange={(e) => setLocationForm({ 
                            ...locationForm, 
                            contact: { ...locationForm.contact, manager: e.target.value }
                          })}
                          className="px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-surface-900">Enabled Features</h4>
                      
                      <div className="space-y-2">
                        {Object.entries(locationForm.settings.features).map(([feature, enabled]) => (
                          <label key={feature} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => setLocationForm({
                                ...locationForm,
                                settings: {
                                  ...locationForm.settings,
                                  features: {
                                    ...locationForm.settings.features,
                                    [feature]: e.target.checked
                                  }
                                }
                              })}
                              className="mr-2"
                            />
                            <span className="text-sm capitalize">{feature}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-8">
                    <button
                      type="submit"
                      className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                    >
                      {editingLocation ? 'Update Location' : 'Create Location'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingLocation(null);
                        resetForm();
                      }}
                      className="flex-1 bg-surface-100 text-surface-700 py-2 rounded-lg hover:bg-surface-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
};

export default LocationManagement;
