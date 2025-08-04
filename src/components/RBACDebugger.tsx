// RBAC Debug Tester
// Add this temporarily to test the permissions system

import { useAuth } from '../lib/context/AuthContext'
import { getAllowedModules, hasPermission } from '../lib/rbac/permissions'

export default function RBACDebugger() {
  const { profile } = useAuth()
  
  const currentRole = profile?.role || null
  const allowedModules = getAllowedModules(currentRole)
  
  const allModules = [
    'pos',
    'inventory', 
    'purchase-orders',
    'menu-builder',
    'dashboard',
    'expenses',
    'team-management',
    'location-management',
    'settings',
    'discrepancy-monitoring',
    'business-reports'
  ]
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-red-500 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-red-600 mb-2">🔍 RBAC Debug</h3>
      <div className="space-y-2 text-xs">
        <div>
          <strong>Current Role:</strong> {currentRole || 'No role'}
        </div>
        <div>
          <strong>User Email:</strong> {profile?.email || 'No email'}
        </div>
        <div>
          <strong>Allowed Modules:</strong>
          <ul className="ml-2">
            {allowedModules.map(module => (
              <li key={module} className="text-green-600">✅ {module}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Denied Modules:</strong>
          <ul className="ml-2">
            {allModules.filter(module => !hasPermission(currentRole, module as any)).map(module => (
              <li key={module} className="text-red-600">❌ {module}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
