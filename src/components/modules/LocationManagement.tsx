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
import { createBranchFromLocation, deleteBranchByLocationId } from '../../lib/firebase/branches';
import { useBranch } from '../../lib/context/BranchContext';

const LocationManagement: React.FC = () => {
  const { profile } = useAuth();
  const { canManageSettings, isOwner } = useUserPermissions();
  const { refreshBranches, selectedBranch, switchBranch } = useBranch();
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
    console.log('🏢 LocationManagement loaded, tenantId:', profile?.tenantId);
    console.log('🏢 Can manage settings:', canManageSettings());
    loadLocations();
  }, [profile?.tenantId]);

  useEffect(() => {
    console.log('🏢 Modal state changed - showCreateModal:', showCreateModal, 'editingLocation:', !!editingLocation);
  }, [showCreateModal, editingLocation]);

  const loadLocations = async () => {
    if (!profile?.tenantId) return;

    try {
      setLoading(true);
      const locationsData = await getLocations(profile.tenantId);
      
      console.log('🏢 Raw locations data:', locationsData);
      console.log('🏢 Number of locations loaded:', locationsData.length);
      
      // Check if there's a main location
      const hasMainLocation = locationsData.some(location => location.type === 'main');
      
      if (!hasMainLocation) {
        console.log('🏢 No main location found, creating default main location...');
        
        // Create a default main location
        const mainLocationData = {
          name: 'Main Location',
          type: 'main' as Location['type'],
          address: {
            street: 'Please update your address',
            city: 'City',
            state: 'State',
            zipCode: '0000',
            country: 'Philippines'
          },
          contact: {
            phone: 'Please update your phone',
            email: '',
            manager: 'Please assign a manager'
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
          status: 'active' as Location['status'],
          tenantId: profile.tenantId
        };
        
        try {
          const mainLocationId = await createLocation(mainLocationData);
          console.log('🏢 Main location created with ID:', mainLocationId);
          
          // Create corresponding branch for the main location
          const mainLocation: Location = {
            id: mainLocationId,
            ...mainLocationData,
            createdAt: new Date() as any,
            updatedAt: new Date() as any
          };
          
          const mainBranch = await createBranchFromLocation(mainLocation);
          console.log('🏢 Main branch created:', mainBranch);
          
          // Refresh branches to sync with location management
          setTimeout(async () => {
            await refreshBranches();
          }, 1000);
          
          // Reload locations to include the new main location
          const updatedLocations = await getLocations(profile.tenantId);
          setLocations(updatedLocations);
        } catch (error) {
          console.error('Error creating main location:', error);
          setLocations(locationsData);
        }
      } else {
        setLocations(locationsData);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!profile?.tenantId) return;

    try {
      console.log('🏢 Creating location...', locationForm);
      
      // Create the location first
      const locationData = {
        ...locationForm,
        tenantId: profile.tenantId
      };
      
      const locationId = await createLocation(locationData);
      console.log('🏢 Location created with ID:', locationId);
      
      // Create a corresponding branch for the branch selector
      const createdLocation: Location = {
        id: locationId,
        ...locationData,
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      };
      
      console.log('🏢 Creating corresponding branch...');
      const createdBranch = await createBranchFromLocation(createdLocation);
      console.log('🏢 Branch created successfully:', createdBranch);
      
      // Force refresh branches with a slight delay to ensure Firebase has processed
      console.log('🏢 Forcing branch refresh...');
      setTimeout(async () => {
        await refreshBranches();
        console.log('🏢 Branch refresh completed');
      }, 1000);
      
      // Refresh locations
      await loadLocations();
      
      setShowCreateModal(false);
      resetForm();
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
    // Prevent deletion of main location
    if (location.type === 'main') {
      alert('Cannot delete the main location. You can edit it instead.');
      return;
    }
    
    if (!confirm(`Delete ${location.name}? This action cannot be undone.`)) return;

    try {
      // Delete the location
      await deleteLocation(location.id);
      
      // Delete the corresponding branch
      if (profile?.tenantId) {
        await deleteBranchByLocationId(profile.tenantId, location.id);
      }
      
      // Refresh both locations and branches
      await loadLocations();
      refreshBranches();
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
      <div className="min-h-screen bg-gray-50">
        {/* Header Section - Enterprise Style */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage your business locations and branches</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {canManageSettings() && (
                  <button
                    onClick={() => {
                      console.log('🏢 Add Location button clicked');
                      console.log('🏢 Setting showCreateModal to true');
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Location
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                    <span className="text-purple-600 text-lg">👑</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Main Locations</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {locations.filter(l => l.type === 'main').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Branches</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {locations.filter(l => l.type === 'branch').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {locations.filter(l => l.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-6h2v6zm0-8h-2V7h2v4z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Locations</p>
                  <p className="text-2xl font-semibold text-gray-900">{locations.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {locations
              .sort((a, b) => {
                // Always show main location first
                if (a.type === 'main' && b.type !== 'main') return -1;
                if (b.type === 'main' && a.type !== 'main') return 1;
                // Then sort by name
                return a.name.localeCompare(b.name);
              })
              .map((location, index) => {
                console.log(`🏢 Rendering location ${index}:`, location.id, location.name, location.type);
                return (
                <div key={location.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                  location.type === 'main' 
                    ? 'border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white ring-1 ring-purple-100' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  {/* Card Header */}
                  <div className="p-6 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{location.name}</h3>
                          {location.type === 'main' && (
                            <div className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full">
                              <span className="text-purple-600 text-sm">👑</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(location.type)}`}>
                            {location.type === 'main' ? 'Main Location' : location.type.charAt(0).toUpperCase() + location.type.slice(1)}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(location.status)}`}>
                            {location.status.charAt(0).toUpperCase() + location.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      {canManageSettings() && (
                        <div className="flex items-center space-x-1 ml-4">
                          <button
                            onClick={() => openEditModal(location)}
                            className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit location"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {isOwner() && location.type !== 'main' && (
                            <button
                              onClick={() => handleDeleteLocation(location)}
                              className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete location"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-6 pb-6">
                    <div className="space-y-4">
                      {/* Address */}
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{location.address.street}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {location.address.city}, {location.address.state} {location.address.zipCode}
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      {(location.contact.phone || location.contact.manager) && (
                        <div className="space-y-3">
                          {location.contact.phone && (
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{location.contact.phone}</div>
                              </div>
                            </div>
                          )}

                          {location.contact.manager && (
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-500">Manager</div>
                                <div className="text-sm font-medium text-gray-900 truncate">{location.contact.manager}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Features */}
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                          {location.settings.features.inventory && (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
                              <span className="text-xs mr-1">📦</span>
                              <span className="text-xs font-medium">Inventory</span>
                            </div>
                          )}
                          {location.settings.features.pos && (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-green-700">
                              <span className="text-xs mr-1">💳</span>
                              <span className="text-xs font-medium">POS</span>
                            </div>
                          )}
                          {location.settings.features.expenses && (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700">
                              <span className="text-xs mr-1">💰</span>
                              <span className="text-xs font-medium">Expenses</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
          </div>
        </div>

        {/* Enterprise Modal - Create/Edit Location */}
        {(showCreateModal || editingLocation) && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {editingLocation ? 'Edit Location' : 'Add New Location'}
                      </h2>
                      <p className="text-blue-100 text-sm">
                        {editingLocation ? `Update ${editingLocation.name}` : 'Create a new business location'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingLocation(null);
                      resetForm();
                    }}
                    className="flex items-center justify-center w-10 h-10 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="max-h-[calc(95vh-180px)] overflow-y-auto">
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  console.log('🏢 Form submitted!');
                  editingLocation ? handleUpdateLocation() : handleCreateLocation();
                }} className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Basic Information */}
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mr-3">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          Basic Information
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Location Name*
                            </label>
                            <input
                              type="text"
                              required
                              value={locationForm.name}
                              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Enter location name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Location Type*
                            </label>
                            <select
                              value={locationForm.type}
                              onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value as Location['type'] })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="main">Main Location</option>
                              <option value="branch">Branch</option>
                              <option value="warehouse">Warehouse</option>
                              <option value="kiosk">Kiosk</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mr-3">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          Contact Information
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={locationForm.contact.phone}
                              onChange={(e) => setLocationForm({ 
                                ...locationForm, 
                                contact: { ...locationForm.contact, phone: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Contact number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Manager Name
                            </label>
                            <input
                              type="text"
                              value={locationForm.contact.manager}
                              onChange={(e) => setLocationForm({ 
                                ...locationForm, 
                                contact: { ...locationForm.contact, manager: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Manager name"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Address & Features */}
                    <div className="space-y-6">
                      <div className="bg-orange-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg mr-3">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          Address Details
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={locationForm.address.street}
                              onChange={(e) => setLocationForm({ 
                                ...locationForm, 
                                address: { ...locationForm.address, street: e.target.value }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Street address"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                value={locationForm.address.city}
                                onChange={(e) => setLocationForm({ 
                                  ...locationForm, 
                                  address: { ...locationForm.address, city: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="City"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                State
                              </label>
                              <input
                                type="text"
                                value={locationForm.address.state}
                                onChange={(e) => setLocationForm({ 
                                  ...locationForm, 
                                  address: { ...locationForm.address, state: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="State"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                ZIP
                              </label>
                              <input
                                type="text"
                                value={locationForm.address.zipCode}
                                onChange={(e) => setLocationForm({ 
                                  ...locationForm, 
                                  address: { ...locationForm.address, zipCode: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="ZIP"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mr-3">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          Enabled Features
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(locationForm.settings.features).map(([feature, enabled]) => (
                            <label key={feature} className="flex items-center p-3 bg-white rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-25 transition-colors">
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
                                className="w-5 h-5 text-purple-600 border-purple-300 rounded focus:ring-purple-500 mr-3"
                              />
                              <div className="flex items-center">
                                <span className="text-sm mr-2">
                                  {feature === 'inventory' && '📦'}
                                  {feature === 'pos' && '💳'}
                                  {feature === 'expenses' && '💰'}
                                </span>
                                <span className="text-sm font-medium text-gray-900 capitalize">{feature}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Location will be automatically synced with branch management
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setEditingLocation(null);
                          resetForm();
                        }}
                        className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 font-semibold shadow-lg"
                      >
                        {editingLocation ? 'Update Location' : 'Create Location'}
                      </button>
                    </div>
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
