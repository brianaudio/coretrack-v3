import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '../lib/context/AuthContext'
import { SubscriptionProvider } from '../lib/context/SubscriptionContext'
import { UserPermissionsProvider } from '../lib/context/UserPermissionsContext'
import { BusinessSettingsProvider } from '../lib/context/BusinessSettingsContext'
import { UserProvider } from '../lib/rbac/UserContext'
import { ToastProvider } from '../components/ui/Toast'
import ErrorBoundary from '../components/ErrorBoundary'
import DataInitializer from '../components/DataInitializer'

export const metadata: Metadata = {
  title: 'CoreTrack - Business Inventory Management',
  description: 'Complete inventory management system for businesses',
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
    <html lang="en" className="h-full">
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
            <UserProvider>
              <BusinessSettingsProvider>
                <SubscriptionProvider>
                  <UserPermissionsProvider>
                    <ToastProvider>
                      {children}
                    </ToastProvider>
                  </UserPermissionsProvider>
                </SubscriptionProvider>
              </BusinessSettingsProvider>
            </UserProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
