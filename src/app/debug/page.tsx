'use client';

import { useAuth } from '../../lib/context/AuthContext';
import AuthDebugger from '../../components/debug/AuthDebugger';

export default function DebugPage() {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
        <p>Please log in to access the debugger.</p>
      </div>
    );
  }

  return <AuthDebugger />;
}
