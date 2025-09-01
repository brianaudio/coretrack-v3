'use client';

import React, { useState } from 'react';
import AddUserModal from './AddUserModal';
import { useToast } from '../ui/Toast';

// RBAC DEV MODE - Simplified Team Management with mock data
const TeamManagement: React.FC = () => {
  const [loading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { addToast } = useToast();

  // Mock team data for RBAC dev mode
  const mockTeamMembers = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@restaurant.com',
      role: 'Manager',
      location: 'Main Branch',
      status: 'Active',
      lastLogin: '2 hours ago'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@restaurant.com',
      role: 'Staff',
      location: 'Downtown Branch',
      status: 'Active',
      lastLogin: '30 minutes ago'
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike@restaurant.com',
      role: 'Staff',
      location: 'Main Branch',
      status: 'Inactive',
      lastLogin: '3 days ago'
    }
  ];

  const mockLocations = ['Main Branch', 'Downtown Branch', 'Mall Branch'];

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
    <div className="min-h-screen bg-slate-50">
      {/* Corporate Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Gradient Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>

              {/* Title Section */}
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Team Management</h1>
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                    👥 Team Active
                  </span>
                  <span className="text-slate-600">Manage team members across locations</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={() => setShowInviteModal(true)}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-cyan-700 flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add Team Member
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 space-y-8">
        {/* RBAC Dev Mode Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
            <p className="text-green-800 font-medium">
              RBAC Development Mode - Team Management with Mock Data
            </p>
          </div>
        </div>

        {/* Team Members Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
          </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockTeamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.role === 'Manager' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add User Modal */}
        {showInviteModal && (
          <AddUserModal
            tenantId="production-tenant"
            onClose={() => setShowInviteModal(false)}
            onUserAdded={(user) => {
              console.log('User added:', user);
              addToast(`Team member ${user.fullName} has been added successfully!`, 'success');
              // In a real implementation, you would refresh the team list here
              setShowInviteModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
