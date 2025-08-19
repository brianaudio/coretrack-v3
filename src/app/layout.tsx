import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '../lib/context/AuthContext'
import { BranchProvider } from '../lib/context/BranchContext'
import { ShiftProvider } from '../lib/context/ShiftContext'
import { SubscriptionProvider } from '../lib/context/SubscriptionContext'
import { UserPermissionsProvider } from '../lib/context/UserPermissionsContext'
import { BusinessSettingsProvider } from '../lib/context/BusinessSettingsContext'
import { MenuPOSSyncProvider } from '../lib/context/MenuPOSSyncContext'
import { UserProvider } from '../lib/rbac/UserContext'
import { ToastProvider } from '../components/ui/Toast'
import { HelpProvider } from '../lib/context/HelpContext'
import ErrorBoundary from '../components/ErrorBoundary'
import DataInitializer from '../components/DataInitializer'
import TrialExpirationHandler from '../components/TrialExpirationHandler'
import AIAssistant from '../components/AIAssistant'
import SimpleOnboarding from '../components/onboarding/SimpleOnboarding'
import HelpModal from '../components/HelpModal'

export const metadata: Metadata = {
  title: 'CoreTrack - Business Inventory Management',
  description: 'Complete inventory management system for businesses with offline capabilities',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CoreTrack',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="h-full bg-surface-50">
        <DataInitializer />
        <ErrorBoundary>
          <AuthProvider>
            <BranchProvider>
              <ShiftProvider>
                <UserProvider>
                  <BusinessSettingsProvider>
                    <SubscriptionProvider>
                      <UserPermissionsProvider>
                        <MenuPOSSyncProvider>
                          <HelpProvider>
                            <ToastProvider>
                              <TrialExpirationHandler>
                                <SimpleOnboarding />
                                {children}
                                <AIAssistant />
                                <HelpModal />
                              </TrialExpirationHandler>
                            </ToastProvider>
                          </HelpProvider>
                        </MenuPOSSyncProvider>
                      </UserPermissionsProvider>
                    </SubscriptionProvider>
                  </BusinessSettingsProvider>
                </UserProvider>
              </ShiftProvider>
            </BranchProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
