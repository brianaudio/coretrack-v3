import React, { useState, useEffect } from 'react';
import { TenantUser } from '../../lib/firebase/userRoles';
import AddUserModal from './AddUserModal';
import UserCredentialsModal from './UserCredentialsModal';

interface UserManagementProps {
  tenantId?: string;
  currentUserRole?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ 
  tenantId = 'demo-tenant', 
  currentUserRole = 'owner' 
}) => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'manager';

  // Load users from Firebase
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        // TODO: Implement Firebase user fetching
        // For now, start with empty array until Firebase integration
        setUsers([]);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [tenantId]);

  const handleInviteSuccess = (credentials: any) => {
    // Update local user list with new user data
    const newUser: TenantUser = {
      uid: credentials.uid || Date.now().toString(),
      email: credentials.email,
      role: credentials.role || 'staff',
      status: 'active'
    };
    
    setUsers(prev => [...prev, newUser]);
    setNewUserCredentials(credentials);
    setShowAddUserModal(false);
    setShowCredentialsModal(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'invited': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage team members and their permissions</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Team Member
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {user.uid}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {canManageUsers && user.role !== 'owner' && (
                      <button className="text-blue-600 hover:text-blue-900 mr-4">
                        Edit
                      </button>
                    )}
                    {user.status === 'invited' && (
                      <button className="text-green-600 hover:text-green-900">
                        Resend Invite
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddUserModal && (
        <AddUserModal
          tenantId={tenantId}
          onClose={() => setShowAddUserModal(false)}
          onUserAdded={handleInviteSuccess}
        />
      )}

      {showCredentialsModal && newUserCredentials && (
        <UserCredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => {
            setShowCredentialsModal(false);
            setNewUserCredentials(null);
          }}
          userCredentials={newUserCredentials}
        />
      )}
    </div>
  );
};

export default UserManagement;
