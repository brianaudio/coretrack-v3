const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Cache Firebase data and API calls
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-firestore',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    // Cache CoreTrack pages for offline access
    {
      urlPattern: /^https:\/\/coretrack-v3\.vercel\.app\/(inventory|pos|purchase-orders|expenses).*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'coretrack-pages',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
        }
      }
    },
    // Cache static assets with cache first strategy
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    // General network-first with offline fallback
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
        networkTimeoutSeconds: 10, // Fall back to cache after 10 seconds
      },
    },
  ],
  buildExcludes: [/app-build-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable ESLint during builds
  },
}

module.exports = nextConfig;
