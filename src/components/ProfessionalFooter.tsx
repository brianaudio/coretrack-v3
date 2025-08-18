import React from 'react'
import { useBusinessSettings } from '../lib/context/BusinessSettingsContext'

interface ProfessionalFooterProps {
  className?: string
}

const ProfessionalFooter: React.FC<ProfessionalFooterProps> = ({ className = '' }) => {
  const { settings } = useBusinessSettings()
  
  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Clean Attribution */}
            <div className="text-sm text-gray-500">Powered by CoreTrack</div>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span>v3.0.0</span>
            <span>Enterprise Edition</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default ProfessionalFooter
