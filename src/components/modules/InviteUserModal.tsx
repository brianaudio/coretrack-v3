import React, { useState } from 'react';
import { inviteUserToTenant, UserRole } from '../../lib/firebase/userRoles';

interface InviteUserModalProps {
  tenantId: string;
  onClose: () => void;
}

const ROLES: UserRole[] = ['owner', 'manager', 'staff', 'viewer'];

const InviteUserModal: React.FC<InviteUserModalProps> = ({ tenantId, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      // RBAC DEV MODE - Skip Firebase call
      console.log('RBAC Dev Mode: Would invite', email, 'as', role);
      setTimeout(() => {
        onClose();
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to invite user.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Invite User</h2>
        <input
          type="email"
          placeholder="Email address"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <select
          className="w-full mb-3 p-2 border rounded"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="flex gap-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            onClick={handleInvite}
            disabled={loading}
          >
            {loading ? 'Inviting...' : 'Invite'}
          </button>
          <button
            className="bg-gray-200 px-4 py-2 rounded w-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
