'use client'

interface CoreTrackLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showShadow?: boolean
  className?: string
}

const sizeMap = {
  sm: { container: 'w-8 h-8', icon: 'w-5 h-5', strokeWidth: '2.5' },
  md: { container: 'w-10 h-10', icon: 'w-6 h-6', strokeWidth: '2.5' },
  lg: { container: 'w-12 h-12', icon: 'w-7 h-7', strokeWidth: '2.5' },
  xl: { container: 'w-16 h-16', icon: 'w-9 h-9', strokeWidth: '2.5' }
}

export default function CoreTrackLogo({ 
  size = 'md', 
  showShadow = true, 
  className = '' 
}: CoreTrackLogoProps) {
  const { container, icon, strokeWidth } = sizeMap[size]
  
  return (
    <div className={`
      ${container} 
      bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 
      rounded-xl flex items-center justify-center 
      ${showShadow ? 'shadow-lg' : ''} 
      ${className}
    `}>
      <svg 
        className={`${icon} text-white`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        strokeWidth={strokeWidth}
      >
        {/* Core/Center circle representing the "Core" */}
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
        
        {/* Tracking lines/paths radiating outward */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v6M12 17v6"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M1 12h6M17 12h6"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
        
        {/* Small dots at the end of tracking lines */}
        <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="21" r="1" fill="currentColor" stroke="none"/>
        <circle cx="21" cy="12" r="1" fill="currentColor" stroke="none"/>
        <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
  )
}

// Named export for the icon only (without container)
export function CoreTrackIcon({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl', 
  className?: string 
}) {
  const { icon, strokeWidth } = sizeMap[size]
  
  return (
    <svg 
      className={`${icon} ${className}`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      strokeWidth={strokeWidth}
    >
      {/* Core/Center circle representing the "Core" */}
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
      
      {/* Tracking lines/paths radiating outward */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v6M12 17v6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12h6M17 12h6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
      
      {/* Small dots at the end of tracking lines */}
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="21" r="1" fill="currentColor" stroke="none"/>
      <circle cx="21" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}
