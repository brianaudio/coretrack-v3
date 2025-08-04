'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

// Simple role definitions - enterprise ready but easy to understand  
type StaffRole = 'owner' | 'manager' | 'supervisor' | 'cashier' | 'kitchen'

interface LocalTeamMember {
  id: string
  name: string
  email: string
  role: StaffRole
  status: 'active' | 'inactive'
  joinDate: string
  phone?: string
  avatar?: string
  lastActive?: string
}

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    description: 'Full system access',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '👑',
    permissions: ['All Features']
  },
  manager: {
    label: 'Manager',
    description: 'Full operations access',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👨‍💼',
    permissions: ['Staff Management', 'Reports', 'Settings']
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Manage shifts & basic reports',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '👥',
    permissions: ['Shift Management', 'Basic Reports']
  },
  cashier: {
    label: 'Cashier',
    description: 'POS access & basic inventory',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '💰',
    permissions: ['Point of Sale', 'View Inventory']
  },
  kitchen: {
    label: 'Kitchen Staff',
    description: 'Menu & inventory management',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '👨‍🍳',
    permissions: ['Menu Builder', 'Inventory Updates']
  }
}

export default function EnhancedTeamManagement() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  
  const [teamMembers, setTeamMembers] = useState<LocalTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<LocalTeamMember | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<LocalTeamMember | null>(null)
  const [activeTab, setActiveTab] = useState<'team' | 'roles' | 'activity'>('team')
  
  const [editFormData, setEditFormData] = useState<{
    name: string
    email: string
    role: string
    phone: string
  }>({
    name: '',
    email: '',
    role: '',
    phone: ''
  })
  
  const [addFormData, setAddFormData] = useState<{
    name: string
    email: string
    role: string
    phone: string
  }>({
    name: '',
    email: '',
    role: 'cashier',
    phone: ''
  })

  // Load team members from Firebase
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!profile?.tenantId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const membersRef = collection(db, `tenants/${profile.tenantId}/teamMembers`)
        const snapshot = await getDocs(membersRef)
        
        const members = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LocalTeamMember[]
        
        setTeamMembers(members)
      } catch (error) {
        console.error('Error loading team members:', error)
        // Load fallback data
        setTeamMembers([
          {
            id: '1',
            name: 'John Doe',
            email: 'john@restaurant.com',
            role: 'owner',
            status: 'active',
            joinDate: '2024-01-15',
            phone: '+1234567890',
            lastActive: '2 minutes ago'
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    loadTeamMembers()
  }, [profile?.tenantId])

  // Add member to Firebase
  const handleAddMember = async () => {
    if (addFormData.name.trim() && addFormData.email.trim() && profile?.tenantId) {
      try {
        const newMember: Omit<LocalTeamMember, 'id'> = {
          name: addFormData.name.trim(),
          email: addFormData.email.trim(),
          role: addFormData.role as StaffRole,
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0],
          phone: addFormData.phone.trim(),
          lastActive: 'Just added'
        }

        // Add to Firebase
        const membersRef = collection(db, `tenants/${profile.tenantId}/teamMembers`)
        const docRef = await addDoc(membersRef, newMember)
        
        // Add to local state
        setTeamMembers(prev => [...prev, { id: docRef.id, ...newMember }])
        setShowAddModal(false)
        setAddFormData({ name: '', email: '', role: 'cashier', phone: '' })
      } catch (error) {
        console.error('Error adding team member:', error)
        alert('Failed to add team member. Please try again.')
      }
    }
  }

  // Update member in Firebase
  const handleUpdateMember = async () => {
    if (editingMember && profile?.tenantId) {
      try {
        const memberRef = doc(db, `tenants/${profile.tenantId}/teamMembers`, editingMember.id)
        await updateDoc(memberRef, {
          name: editFormData.name,
          email: editFormData.email,
          role: editFormData.role,
          phone: editFormData.phone
        })

        // Update local state
        const updatedMember = {
          ...editingMember,
          name: editFormData.name,
          email: editFormData.email,
          role: editFormData.role as StaffRole,
          phone: editFormData.phone
        }
        
        setTeamMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))
        setEditingMember(null)
        setEditFormData({ name: '', email: '', role: '', phone: '' })
      } catch (error) {
        console.error('Error updating team member:', error)
        alert('Failed to update team member. Please try again.')
      }
    }
  }

  // Delete member from Firebase
  const confirmDeleteMember = async () => {
    if (showDeleteConfirm && profile?.tenantId) {
      try {
        const memberRef = doc(db, `tenants/${profile.tenantId}/teamMembers`, showDeleteConfirm.id)
        await deleteDoc(memberRef)
        
        // Remove from local state
        setTeamMembers(prev => prev.filter(m => m.id !== showDeleteConfirm.id))
        setShowDeleteConfirm(null)
      } catch (error) {
        console.error('Error deleting team member:', error)
        alert('Failed to remove team member. Please try again.')
      }
    }
  }

  const handleEditMember = (member: LocalTeamMember) => {
    setEditingMember(member)
    setEditFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      phone: member.phone || ''
    })
  }

  const handleDeleteMember = (member: LocalTeamMember) => {
    setShowDeleteConfirm(member)
  }

  const handleCancelEdit = () => {
    setEditingMember(null)
    setEditFormData({ name: '', email: '', role: '', phone: '' })
  }

  const handleCancelAdd = () => {
    setShowAddModal(false)
    setAddFormData({ name: '', email: '', role: 'cashier', phone: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></div>
        Inactive
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Team Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-gray-900">{teamMembers.length}</div>
          <div className="text-sm text-gray-600">Total Members</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-green-600">{teamMembers.filter(m => m.status === 'active').length}</div>
          <div className="text-sm text-gray-600">Active Members</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-blue-600">{Object.keys(ROLE_CONFIG).length}</div>
          <div className="text-sm text-gray-600">Roles Available</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-2xl font-bold text-purple-600">{teamMembers.filter(m => m.role === 'owner').length}</div>
          <div className="text-sm text-gray-600">Owners</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'team', label: 'Team Members', icon: '👥' },
              { id: 'roles', label: 'Role Permissions', icon: '🔑' },
              { id: 'activity', label: 'Recent Activity', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Team Members Tab */}
        {activeTab === 'team' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {member.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{ROLE_CONFIG[member.role].icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ROLE_CONFIG[member.role].label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ROLE_CONFIG[member.role].description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.lastActive}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditMember(member)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteMember(member)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Role Permissions Tab */}
        {activeTab === 'roles' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => (
                <div key={roleKey} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color.replace('text-', 'bg-').replace('border-', '')}`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{config.label}</h3>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Permissions:</h4>
                    {config.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">{permission}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {teamMembers.filter(m => m.role === roleKey).length} team member(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Team Activity</h3>
            <div className="space-y-4">
              {[
                { user: 'Sarah Johnson', action: 'logged in to POS system', time: '5 minutes ago', type: 'login' },
                { user: 'Mike Chen', action: 'processed 15 orders', time: '1 hour ago', type: 'activity' },
                { user: 'John Doe', action: 'updated menu prices', time: '2 hours ago', type: 'update' },
                { user: 'Sarah Johnson', action: 'completed shift handover', time: '3 hours ago', type: 'shift' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {activity.type === 'login' && '🔐'}
                      {activity.type === 'activity' && '📊'}
                      {activity.type === 'update' && '✏️'}
                      {activity.type === 'shift' && '🔄'}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={addFormData.role}
                  onChange={(e) => setAddFormData({...addFormData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!addFormData.name.trim() || !addFormData.email.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Update Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Remove Team Member</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to remove <strong>{showDeleteConfirm.name}</strong> from your team? 
                They will lose access to the system immediately.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
