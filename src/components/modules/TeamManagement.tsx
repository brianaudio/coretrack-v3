'use client';

import React from 'react';

const TeamManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-8 py-8">
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-600 mt-2">Manage your team members and permissions</p>
        </div>
      </div>
      
      <div className="p-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">Team Management module is being updated for production deployment.</p>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
