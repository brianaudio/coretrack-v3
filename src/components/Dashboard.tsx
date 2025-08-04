'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import FallbackComponent from './FallbackComponent'
import DashboardOverview from './modules/DashboardOverview'
import EnhancedAnalytics from './modules/EnhancedAnalytics'
import EnhancedTeamManagement from './modules/EnhancedTeamManagement'
import DevTools from './DevTools'
import ProfessionalFooter from './ProfessionalFooter'
import ShiftDashboard from './ShiftManagement/ShiftDashboard'
import ShiftRequiredModal from './ShiftRequiredModal'
import InventoryCenter from './modules/InventoryCenter'
import POS from './modules/POS'  // Original POS
import POSEnhanced from './modules/POS_Enhanced'  // Enhanced POS with Add-ons and Offline
import Expenses from './modules/Expenses'
import MenuBuilder from './modules/MenuBuilder'
import PurchaseOrders from './modules/PurchaseOrders'
import LocationManagement from './modules/LocationManagement'
import SettingsPage from '../app/settings/page'
import FirebaseDebugger from './FirebaseDebugger'
import ShiftStatusBar from './ShiftManagement/ShiftStatusBar'
import InventoryDiscrepancy from './modules/InventoryDiscrepancy'
import BusinessReports from './modules/BusinessReports'
import { useAuth } from '../lib/context/AuthContext' // Use AuthContext instead of UserContext
import { useUser } from '../lib/rbac/UserContext' // Add UserContext for coordinated loading
import { hasPermission, getAllowedModules, ModulePermission } from '../lib/rbac/permissions'
import ConnectionStatus from './ui/ConnectionStatus'
import { BranchProvider } from '../lib/context/BranchContext'
import { useShift } from '../lib/context/ShiftContext'

export type ModuleType = 'dashboard' | 'inventory' | 'pos' | 'purchase-orders' | 'menu-builder' | 'expenses' | 'team-management' | 'location-management' | 'settings' | 'discrepancy-monitoring' | 'business-reports'

interface DashboardProps {
  onLogout?: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { profile, user, loading: authLoading } = useAuth() // Use AuthContext
  const { currentRole, loading: userLoading } = useUser() // Use coordinated UserContext
  const { isShiftActive, loading: shiftLoading } = useShift()
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Coordinated loading state
  const isLoading = authLoading || userLoading || shiftLoading

  // Get role from profile first, fallback to UserContext
  const effectiveRole = profile?.role || currentRole
  const currentUser = user ? {
    uid: user.uid,
    email: user.email || '',
    role: effectiveRole || 'staff'
  } : null

  // Get allowed modules for current user role (calculate even if no role yet)
  const allowedModules = getAllowedModules(effectiveRole)

  console.log('🔍 RBAC DEBUG - Dashboard:', {
    effectiveRole,
    currentUserEmail: currentUser?.email,
    allowedModules,
    activeModule,
    isLoading
  })

  // Auto-redirect to first allowed module if current module is not accessible
  useEffect(() => {
    if (effectiveRole && !hasPermission(effectiveRole, activeModule as ModulePermission)) {
      const firstAllowedModule = allowedModules[0]
      if (firstAllowedModule) {
        console.log('🔄 RBAC REDIRECT:', {
          from: activeModule,
          to: firstAllowedModule,
          reason: 'No permission for current module'
        })
        setActiveModule(firstAllowedModule as ModuleType)
      }
    }
  }, [effectiveRole, activeModule, allowedModules])

  // Show unified loading state while authentication initializes
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no user role is set, show loading or redirect to auth
  if (!effectiveRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    )
  }

  // If no active shift, show shift required modal
  if (!isShiftActive) {
    return <ShiftRequiredModal />
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'pos':
        return <POSEnhanced />
      case 'inventory':
        return <InventoryCenter />
      case 'purchase-orders':
        return <PurchaseOrders />
      case 'menu-builder':
        return <MenuBuilder />
      case 'dashboard':
        return <EnhancedAnalytics />
      case 'expenses':
        return <Expenses />
      case 'team-management':
        return (
          <div className="space-y-6">
            <EnhancedTeamManagement />
          </div>
        )
      case 'location-management':
        return <LocationManagement />
      case 'discrepancy-monitoring':
        return <InventoryDiscrepancy />
      case 'business-reports':
        return <BusinessReports />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <BranchProvider>
      <div className="h-screen flex bg-surface-50">
        <Sidebar 
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          allowedModules={allowedModules}
          currentRole={effectiveRole}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            activeModule={activeModule}
            onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
            onLogout={onLogout}
          />
          
          {/* Shift Status Bar (only for staff) */}
          <ShiftStatusBar />
          
          {/* Connection Status Bar */}
          <div className="px-6 py-2 bg-white border-b border-surface-200">
            <div className="flex items-center justify-between">
              <ConnectionStatus />
              <div className="text-xs text-surface-500">
                Logged in as {currentUser?.email} • {currentRole}
              </div>
            </div>
          </div>
          
          <main className="flex-1 overflow-auto bg-surface-50 main-scroll">
            <div className="p-6 pb-8 min-h-full">
              {renderModule()}
            </div>
            {/* Professional Footer */}
            <ProfessionalFooter />
          </main>
        </div>
        
        <DevTools />
      </div>
    </BranchProvider>
  )
}
