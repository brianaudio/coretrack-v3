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
            {/* Business Name Showcase */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
                </svg>
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">{settings.businessName}</div>
                <div className="text-sm text-gray-500">Powered by CoreTrack</div>
              </div>
            </div>
            
            {/* CoreTrack Branding */}
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-6">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              </div>
              <span className="font-semibold text-gray-700 text-sm">CoreTrack Professional</span>
            </div>
            
            <div className="text-sm text-gray-500">
              © 2025 CrmyFrst. All rights reserved.
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>System Online</span>
            </span>
            <span>v3.0.0</span>
            <span>Enterprise Edition</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default ProfessionalFooter
