'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import FallbackComponent from './FallbackComponent'
import DashboardOverview from './modules/DashboardOverview'
import TeamManagement from './modules/TeamManagement'
import DevTools from './DevTools'
import ProfessionalFooter from './ProfessionalFooter'
import ShiftDashboard from './ShiftManagement/ShiftDashboard'
import InventoryCenter from './modules/InventoryCenter'
import POS from './modules/POS'
import Expenses from './modules/Expenses'
import MenuBuilder from './modules/MenuBuilder'
import PurchaseOrders from './modules/PurchaseOrders'
import LocationManagement from './modules/LocationManagement'
import SettingsPage from '../app/settings/page'
import FirebaseDebugger from './FirebaseDebugger'
import ShiftStatusBar from './ShiftManagement/ShiftStatusBar'
import InventoryDiscrepancy from './modules/InventoryDiscrepancy'
import { useUser } from '../lib/rbac/UserContext'
import { hasPermission, getAllowedModules, ModulePermission } from '../lib/rbac/permissions'
import ConnectionStatus from './ui/ConnectionStatus'
import { BranchProvider } from '../lib/context/BranchContext'

export type ModuleType = 'dashboard' | 'inventory' | 'pos' | 'purchase-orders' | 'menu-builder' | 'expenses' | 'team-management' | 'location-management' | 'settings' | 'discrepancy-monitoring'

interface DashboardProps {
  onLogout?: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { currentRole, currentUser } = useUser()
  const [activeModule, setActiveModule] = useState<ModuleType>('pos')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Get allowed modules for current user role (calculate even if no role yet)
  const allowedModules = getAllowedModules(currentRole)

  // Auto-redirect to first allowed module if current module is not accessible
  useEffect(() => {
    if (currentRole && !hasPermission(currentRole, activeModule as ModulePermission)) {
      const firstAllowedModule = allowedModules[0]
      if (firstAllowedModule) {
        setActiveModule(firstAllowedModule as ModuleType)
      }
    }
  }, [currentRole, activeModule, allowedModules])

  // If no user role is set, show loading or redirect to auth
  if (!currentRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    )
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'pos':
        return <POS />
      case 'inventory':
        return <InventoryCenter />
      case 'purchase-orders':
        return <PurchaseOrders />
      case 'menu-builder':
        return <MenuBuilder />
      case 'dashboard':
        return <DashboardOverview />
      case 'expenses':
        return <Expenses />
      case 'team-management':
        return (
          <div className="space-y-6">
            <TeamManagement />
            <ShiftDashboard />
          </div>
        )
      case 'location-management':
        return <LocationManagement />
      case 'discrepancy-monitoring':
        return <InventoryDiscrepancy />
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
          currentRole={currentRole}
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
