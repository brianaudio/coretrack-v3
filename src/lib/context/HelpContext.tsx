'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface HelpContextValue {
  showHelp: (moduleName: string) => void
  isHelpVisible: boolean
  currentModule: string | null
  hideHelp: () => void
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined)

export function useHelp() {
  const context = useContext(HelpContext)
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider')
  }
  return context
}

interface HelpProviderProps {
  children: ReactNode
}

export function HelpProvider({ children }: HelpProviderProps) {
  const [isHelpVisible, setIsHelpVisible] = useState(false)
  const [currentModule, setCurrentModule] = useState<string | null>(null)

  const showHelp = (moduleName: string) => {
    setCurrentModule(moduleName)
    setIsHelpVisible(true)
  }

  const hideHelp = () => {
    setIsHelpVisible(false)
    setCurrentModule(null)
  }

  return (
    <HelpContext.Provider value={{ showHelp, isHelpVisible, currentModule, hideHelp }}>
      {children}
    </HelpContext.Provider>
  )
}
