import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '../lib/context/AuthContext'
import { SubscriptionProvider } from '../lib/context/SubscriptionContext'
import { UserPermissionsProvider } from '../lib/context/UserPermissionsContext'
import { DemoModeProvider } from '../lib/context/DemoModeContext'
import { BusinessSettingsProvider } from '../lib/context/BusinessSettingsContext'

export const metadata: Metadata = {
  title: 'CoreTrack - Business Inventory Management',
  description: 'Complete inventory management system for restaurants and businesses',
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
        <AuthProvider>
          <SubscriptionProvider>
            <BusinessSettingsProvider>
              <DemoModeProvider>
                <UserPermissionsProvider>
                  {children}
                </UserPermissionsProvider>
              </DemoModeProvider>
            </BusinessSettingsProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
