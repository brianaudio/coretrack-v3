// Background Reset Worker
// This service worker helps ensure automatic resets can happen in the background

self.addEventListener('install', (event) => {
  console.log('🔧 Reset Service Worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('✅ Reset Service Worker activated')
  event.waitUntil(clients.claim())
})

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SCHEDULE_RESET':
      scheduleReset(data)
      break
    case 'CANCEL_RESET':
      cancelReset()
      break
    default:
      console.log('Unknown message type:', type)
  }
})

let resetTimeoutId = null

function scheduleReset(scheduleData) {
  // Cancel any existing reset
  if (resetTimeoutId) {
    clearTimeout(resetTimeoutId)
  }
  
  const { time, enabled } = scheduleData
  if (!enabled) return
  
  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  
  // Calculate next reset time
  const nextReset = new Date()
  nextReset.setHours(hours, minutes, 0, 0)
  
  if (nextReset <= now) {
    nextReset.setDate(nextReset.getDate() + 1)
  }
  
  const msUntilReset = nextReset.getTime() - now.getTime()
  
  console.log(`🕒 Reset scheduled for ${nextReset.toLocaleString()} (in ${Math.floor(msUntilReset / 1000 / 60)} minutes)`)
  
  resetTimeoutId = setTimeout(() => {
    performBackgroundReset()
  }, msUntilReset)
}

function cancelReset() {
  if (resetTimeoutId) {
    clearTimeout(resetTimeoutId)
    resetTimeoutId = null
    console.log('🚫 Scheduled reset cancelled')
  }
}

async function performBackgroundReset() {
  console.log('🔄 Service Worker: Attempting background reset...')
  
  try {
    // Check if any client is open and can perform the reset
    const clients = await self.clients.matchAll()
    
    if (clients.length > 0) {
      // Send message to all open clients to perform reset
      clients.forEach(client => {
        client.postMessage({
          type: 'PERFORM_RESET',
          timestamp: new Date().toISOString()
        })
      })
      console.log('✅ Reset signal sent to open clients')
    } else {
      console.log('⚠️ No open clients - reset will be performed when app is next opened')
      // Store a flag that reset is needed
      await self.caches.open('reset-flags').then(cache => {
        cache.put('/reset-needed', new Response(new Date().toISOString()))
      })
    }
    
  } catch (error) {
    console.error('❌ Background reset failed:', error)
  }
  
  // Reschedule for next day
  scheduleReset({ time: '03:00', enabled: true })
}
