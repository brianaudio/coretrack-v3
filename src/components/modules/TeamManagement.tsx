'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useUserPermissions } from '../../lib/context/UserPermissionsContext';
import { FeatureGate } from '../subscription/FeatureGate';
import { 
  TeamMember, 
  UserInvitation, 
  UserRole, 
  UserStatus, 
  DEFAULT_ROLE_PERMISSIONS 
} from '../../lib/types/user';
import {
  getTeamMembers,
  getPendingInvitations,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember
} from '../../lib/firebase/userManagement';
import { getLocations } from '../../lib/firebase/locationManagement';
import { Location } from '../../lib/types/location';

const TeamManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const { canManageUsers, isOwner } = useUserPermissions();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'staff' as UserRole,
    locationIds: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, [profile?.tenantId]);

  const loadData = async () => {
    if (!profile?.tenantId) return;

    try {
      setLoading(true);
      const [membersData, invitationsData, locationsData] = await Promise.all([
        getTeamMembers(profile.tenantId),
        getPendingInvitations(profile.tenantId),
        getLocations(profile.tenantId)
      ]);

      setTeamMembers(membersData);
      setInvitations(invitationsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading team data:', error);
      // Handle index errors gracefully
      if (error instanceof Error && error.message.includes('index')) {
        console.warn('Firebase index not ready yet. Some features may be limited.');
      }
      // Set fallback data
      setTeamMembers([]);
      setInvitations([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!profile?.tenantId || !user?.displayName) return;

    try {
      await inviteTeamMember(
        profile.tenantId,
        inviteForm.email,
        inviteForm.role,
        inviteForm.locationIds,
        user.uid,
        user.displayName
      );

      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'staff', locationIds: [] });
      await loadData();
    } catch (error) {
      console.error('Error inviting team member:', error);
    }
  };

  const handleUpdateMember = async (member: TeamMember, updates: Partial<TeamMember>) => {
    if (!profile?.tenantId) return;

    try {
      await updateTeamMember(profile.tenantId, member.uid, updates);
      await loadData();
      setEditingMember(null);
    } catch (error) {
      console.error('Error updating team member:', error);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!profile?.tenantId || !confirm(`Remove ${member.displayName} from the team?`)) return;

    try {
      await removeTeamMember(profile.tenantId, member.uid);
      await loadData();
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="teamManagement">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-surface-900">Team Management</h1>
          {canManageUsers() && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite Team Member
            </button>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900">Team Members ({teamMembers.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Locations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  {canManageUsers() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-surface-200">
                {teamMembers.map((member) => (
                  <tr key={member.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {member.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-surface-900">{member.displayName}</div>
                          <div className="text-sm text-surface-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                      {member.role === 'owner' ? 'All Locations' : `${member.locationIds.length} locations`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                      {member.lastLogin ? new Date(member.lastLogin.toDate()).toLocaleDateString() : 'Never'}
                    </td>
                    {canManageUsers() && member.role !== 'owner' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Pending Invitations ({invitations.length})</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-surface-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(invitation.role)}`}>
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                        {invitation.invitedByName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                        {new Date(invitation.expiresAt.toDate()).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Invite Team Member</h3>
              
              <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="colleague@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Role
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => (
                        role !== 'owner' && (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        )
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Locations Access
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {locations.map((location) => (
                        <label key={location.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={inviteForm.locationIds.includes(location.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteForm({
                                  ...inviteForm,
                                  locationIds: [...inviteForm.locationIds, location.id]
                                });
                              } else {
                                setInviteForm({
                                  ...inviteForm,
                                  locationIds: inviteForm.locationIds.filter(id => id !== location.id)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{location.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                  >
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 bg-surface-100 text-surface-700 py-2 rounded-lg hover:bg-surface-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
};

export default TeamManagement;
