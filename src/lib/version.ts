/**
 * CoreTrack Version Information
 * 
 * This file contains the current version information for CoreTrack.
 * Update this when creating new releases.
 */

export const VERSION = '3.11.0'
export const VERSION_NAME = 'Capital Intelligence'
export const RELEASE_DATE = '2025-09-02'

export const getVersionString = () => `v${VERSION}`
export const getFullVersionString = () => `v${VERSION} - ${VERSION_NAME}`

// Version history for reference
export const VERSION_HISTORY = [
  { version: '3.11.0', name: 'Capital Intelligence', date: '2025-09-02', description: 'Complete Capital Intelligence design system implementation with surgical precision spacing' },
  { version: '3.10.0', name: 'Previous Release', date: '2025-08-XX', description: 'Previous features and improvements' },
  // Add previous versions as needed
] as const
