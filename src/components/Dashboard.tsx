'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import InventoryCenter from './modules/InventoryCenter'
import POS from './modules/POS'
import PurchaseOrders from './modules/PurchaseOrders'
import Expenses from './modules/Expenses'
import MenuBuilder from './modules/MenuBuilder'
import PaymentMonitoring from './modules/PaymentMonitoring'
import DashboardOverview from './modules/DashboardOverview'
import TeamManagement from './modules/TeamManagement'
import LocationManagement from './modules/LocationManagement'
import BusinessModeConfig from './modules/BusinessModeConfig'
import DevTools from './DevTools'
import DemoModeToggle from './testing/DemoModeToggle'

export type ModuleType = 'dashboard' | 'inventory' | 'pos' | 'purchase-orders' | 'expenses' | 'menu-builder' | 'payment-monitoring' | 'team-management' | 'location-management' | 'business-config'

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState<ModuleType>('pos')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardOverview />
      case 'inventory':
        return <InventoryCenter />
      case 'pos':
        return <POS />
      case 'purchase-orders':
        return <PurchaseOrders />
      case 'expenses':
        return <Expenses />
      case 'menu-builder':
        return <MenuBuilder />
      case 'payment-monitoring':
        return <PaymentMonitoring />
      case 'team-management':
        return <TeamManagement />
      case 'location-management':
        return <LocationManagement />
      case 'business-config':
        return <BusinessModeConfig />
      default:
        return <DashboardOverview />
    }
  }

  return (
    <div className="h-screen flex bg-surface-50">
      <Sidebar 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeModule={activeModule}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderActiveModule()}
        </main>
        
        {/* Global Footer */}
        <footer className="px-6 py-4 border-t border-gray-200 bg-white">
          <p className="text-center text-sm text-gray-500">
            Developed by: <span className="font-medium text-gray-700">CrmyFrst</span>
          </p>
        </footer>
      </div>
      
      <DevTools />
      <DemoModeToggle />
    </div>
  )
}
