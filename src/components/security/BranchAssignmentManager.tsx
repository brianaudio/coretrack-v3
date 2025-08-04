'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useUserPermissions } from '../../lib/context/UserPermissionsContext';
import { UserProfile } from '../../lib/firebase/auth';
import { Branch } from '../../lib/context/BranchContext';
import { validateBranchAccess, updateUserBranchAccess } from '../../lib/security/branchAccess';

interface BranchAssignmentManagerProps {
  branches: Branch[];
  onClose: () => void;
}

interface UserBranchAssignment {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  assignedBranches: string[];
  primaryBranch?: string;
  branchPermissions: {
    [locationId: string]: {
      canView: boolean;
      canEdit: boolean;
      canManage: boolean;
    }
  };
}

export default function BranchAssignmentManager({ branches, onClose }: BranchAssignmentManagerProps) {
  const { profile } = useAuth();
  const { isOwner, isManager } = useUserPermissions();
  const [users, setUsers] = useState<UserBranchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserBranchAssignment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Only owners and managers can access this component
  if (!isOwner() && !isManager()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Access Denied</h3>
          <p className="text-gray-600 mb-4">
            Only owners and managers can manage branch assignments.
          </p>
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual user loading from Firebase
      // This would fetch all users in the tenant and their branch assignments
      setUsers([]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserBranchAssignment) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveUserAssignments = async (updatedUser: UserBranchAssignment) => {
    try {
      if (!profile?.uid) return;

      await updateUserBranchAccess(
        profile.uid,
        updatedUser.userId,
        profile.tenantId,
        {
          assignedBranches: updatedUser.assignedBranches,
          primaryBranch: updatedUser.primaryBranch,
          branchPermissions: updatedUser.branchPermissions
        }
      );

      // Refresh users list
      await loadUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user branch assignments:', error);
      alert('Failed to update branch assignments');
    }
  };

  const getBranchName = (locationId: string) => {
    const branch = branches.find(b => b.id === locationId);
    return branch?.name || locationId;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Branch Access Management
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Manage which branches each user can access and their permission levels.
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No users found or feature not yet implemented.</p>
                  <p className="text-sm mt-2">
                    This component will show all team members and their branch assignments.
                  </p>
                </div>
              ) : (
                users.map(user => (
                  <div key={user.userId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{user.displayName}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit Access
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Assigned Branches:</p>
                      <div className="flex flex-wrap gap-2">
                        {user.assignedBranches.length === 0 ? (
                          <span className="text-sm text-gray-500">
                            {['owner', 'manager'].includes(user.role) ? 'All branches (by role)' : 'No branches assigned'}
                          </span>
                        ) : (
                          user.assignedBranches.map(locationId => (
                            <span
                              key={locationId}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {getBranchName(locationId)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Security Warning */}
        <div className="p-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-yellow-800">
              <strong>Security Note:</strong> Branch access controls are enforced at the database level. 
              Changes may take a few moments to take effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
