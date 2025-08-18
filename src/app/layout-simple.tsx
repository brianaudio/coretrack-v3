import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoreTrack - Business Inventory Management',
  description: 'Complete inventory management system for businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
