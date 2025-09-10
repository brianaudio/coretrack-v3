import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'CoreTrack Vision - Mobile Analytics',
  description: 'Real-time business intelligence for coffee shop owners',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CoreTrack Vision',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function VisionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {children}
    </div>
  )
}
