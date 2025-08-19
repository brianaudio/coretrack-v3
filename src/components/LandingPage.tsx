'use client'

import { useState, useEffect } from 'react'
import CoreTrackLogo from './CoreTrackLogo'
import PWAInstallButton from './PWAInstallButton';
import { trackButtonClick, trackPageView, trackScrollDepth } from '../lib/analytics';

interface LandingPageProps {
  onGetStarted: (selectedTier?: string) => void
  onSignIn: () => void
}

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)
  
  // Tier Selection Modal State
  const [showTierModal, setShowTierModal] = useState(false)
  const [pendingLocation, setPendingLocation] = useState('')
  
  // ROI Calculator State
  const [roiData, setRoiData] = useState({
    monthlyRevenue: 500000,
    locations: '1',
    staffCount: '16-30',
    wastePercentage: '21-30'
  })

  // Calculate ROI based on inputs
  const calculateROI = () => {
    const revenue = roiData.monthlyRevenue
    const locationMultiplier = {
      '1': 1,
      '2-5': 2.5,
      '6-15': 8,
      '16+': 20
    }[roiData.locations] || 1

    const wasteReduction = {
      '5-10': 0.05,
      '11-20': 0.15,
      '21-30': 0.25,
      '31+': 0.35
    }[roiData.wastePercentage] || 0.25

    const staffEfficiency = {
      '5-15': 5000,
      '16-30': 8000,
      '31-50': 12000,
      '51+': 20000
    }[roiData.staffCount] || 8000

    const wasteReductionSavings = (revenue * wasteReduction * 0.6) * locationMultiplier
    const theftPrevention = 12000 * locationMultiplier
    const laborEfficiency = staffEfficiency * locationMultiplier
    const coretrackCost = 199 * locationMultiplier

    const totalSavings = wasteReductionSavings + theftPrevention + laborEfficiency - coretrackCost
    const roi = ((totalSavings * 12) / (coretrackCost * 12)) * 100

    return {
      monthlySavings: Math.round(totalSavings),
      annualSavings: Math.round(totalSavings * 12),
      roi: Math.round(roi),
      wasteReductionSavings: Math.round(wasteReductionSavings),
      theftPrevention: Math.round(theftPrevention),
      laborEfficiency: Math.round(laborEfficiency),
      coretrackCost: Math.round(coretrackCost)
    }
  }

  const roiResults = calculateROI()

  useEffect(() => {
    trackPageView()
    const cleanup = trackScrollDepth()
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto-rotate features
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3)
    }, 4000)
    
    return () => {
      if (cleanup) cleanup()
      clearInterval(interval)
    }
  }, [])

  // PWA Install Prompt Handler
  useEffect(() => {
    // This is now handled by PWAInstallButton.tsx
    // but we can keep listeners for analytics or other purposes if needed.
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      // You could trigger an analytics event here
    }
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    }
  }, [])

  const handleGetStarted = (location: string, buttonText: string = 'Start Free Trial', selectedTier?: string) => {
    trackButtonClick(location, buttonText)
    
    if (selectedTier) {
      // Direct tier selection - proceed immediately
      localStorage.setItem('selectedTier', selectedTier)
      onGetStarted(selectedTier)
    } else {
      // No tier specified - show tier selection modal
      setPendingLocation(location)
      setShowTierModal(true)
    }
  }

  const handleTierSelection = (selectedTier: string) => {
    localStorage.setItem('selectedTier', selectedTier)
    setShowTierModal(false)
    setPendingLocation('')
    onGetStarted(selectedTier)
  }

  const handleSignIn = (location: string = 'Navigation') => {
    console.log('🔘 Sign In button clicked!', location)
    console.log('🔘 onSignIn function:', typeof onSignIn)
    trackButtonClick(location, 'Sign In')
    try {
      onSignIn()
      console.log('✅ onSignIn() called successfully')
    } catch (error) {
      console.error('❌ Error calling onSignIn():', error)
    }
  }

  const features = [
    {
      icon: '🕵️',
      title: 'Discrepancy Reporting',
      description: 'AI-powered detection of inventory discrepancies with automated investigation workflows',
      gradient: 'from-red-500 to-rose-600',
      details: ['Auto discrepancy detection', 'Real-time alerts', 'Investigation dashboard', 'Variance analysis']
    },
    {
      icon: '📚',
      title: 'Automated Business Reports',
      description: 'Daily, weekly, and monthly reports automatically generated and delivered to your inbox',
      gradient: 'from-green-500 to-teal-600',
      details: ['Automated scheduling', 'Custom report builder', 'Email delivery', 'Executive summaries']
    },
    {
      icon: '🔍',
      title: 'Advanced Shrinkage Analytics',
      description: 'Advanced analytics to identify shrinkage patterns and minimize inventory losses',
      gradient: 'from-purple-500 to-pink-600',
      details: ['Pattern recognition', 'Loss categorization', 'Theft alerts', 'Cost impact analysis']
    },
    {
      icon: '🍽️',
      title: 'AI Recipe Optimization',
      description: 'Intelligent cost analysis and portion recommendations to maximize profitability',
      gradient: 'from-yellow-500 to-orange-600',
      details: ['Cost optimization', 'Portion analysis', 'Profit maximization', 'Ingredient substitution']
    },
    {
      icon: '🎯',
      title: 'Predictive Ordering',
      description: 'AI-driven purchase recommendations based on sales patterns and seasonal trends',
      gradient: 'from-indigo-500 to-blue-600',
      details: ['Sales pattern analysis', 'Seasonal adjustments', 'Auto-ordering suggestions', 'Supplier optimization']
    },
    {
      icon: '🤖',
      title: 'AI Business Intelligence',
      description: 'Advanced machine learning algorithms that learn your business patterns and optimize operations',
      gradient: 'from-cyan-500 to-blue-600',
      details: ['Machine learning insights', 'Operational optimization', 'Predictive analytics', 'Smart recommendations']
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Apple-style Navigation */}
      <nav className="fixed top-0 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <CoreTrackLogo />
              <span className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CoreTrack
              </span>
            </div>
            <div className="flex items-center space-x-8">
              <div className="relative group">
                <button className="text-gray-300 hover:text-white text-sm font-medium transition-colors duration-200">
                  Contact the developer
                </button>
                {/* Dropdown menu */}
                <div className="absolute top-full left-0 mt-2 w-80 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="p-4">
                    <a
                      href="mailto:coretrackbusinesssolution@gmail.com?subject=CoreTrack Inquiry"
                      onClick={() => trackButtonClick('Navigation', 'Contact Developer Email')}
                      className="flex items-center space-x-4 p-3 hover:bg-white/10 rounded-xl transition-all duration-200 group/item"
                    >
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg group-hover/item:scale-110 transition-transform duration-200 flex-shrink-0">
                        <CoreTrackLogo size="sm" showShadow={false} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white group-hover/item:text-blue-200 transition-colors">Email</div>
                        <div className="text-xs text-gray-400 group-hover/item:text-gray-300 transition-colors truncate">coretrackbusinesssolution@gmail.com</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🚀 Direct Sign In button clicked!')
                  handleSignIn('Navigation')
                }}
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors duration-200 cursor-pointer hover:bg-white/10 px-3 py-2 rounded-lg"
                type="button"
              >
                Sign in
              </button>
              <PWAInstallButton />
              <button
                onClick={() => handleGetStarted('Navigation')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Apple Style */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <h1 className={`text-7xl md:text-8xl font-bold mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              Restaurant
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              management
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              reimagined
            </span>
          </h1>
          
          <p className={`text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            The most advanced platform for Philippine restaurants. 
            <br />
            Beautiful, powerful, and surprisingly simple.
          </p>

          <div className={`flex justify-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={() => handleGetStarted('Hero')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all duration-200 shadow-2xl hover:shadow-blue-500/25 hover:scale-105"
            >
              Start free trial
            </button>
          </div>
        </div>
      </section>

      {/* PWA Download Section - Enterprise Apple-Style Design */}
      <section id="pwa-install-section" className="py-32 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-green-600/5"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {/* Header Section */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-green-500/20 backdrop-blur-sm rounded-full border border-white/20 mb-8">
              <span className="text-2xl mr-3">📱</span>
              <span className="text-blue-400 font-semibold text-lg">Enterprise PWA Technology</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-white">Install </span>
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">CoreTrack</span>
              <br />
              <span className="text-white">as a Native App</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Experience enterprise-grade performance with offline capabilities. 
              Transform your browser into a dedicated business application.
            </p>
          </div>

          {/* Key Benefits Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-20">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">Instant loading and native performance</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">�</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Works Offline</h3>
              <p className="text-gray-400 text-sm">Continue operations without internet</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🏠</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Home Screen</h3>
              <p className="text-gray-400 text-sm">One-tap access from any device</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center group hover:bg-white/10 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">💾</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Auto-Sync</h3>
              <p className="text-gray-400 text-sm">Seamless data synchronization</p>
            </div>
          </div>

          {/* Installation Instructions - Clean Two-Column Layout */}
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            
            {/* Mobile/Tablet Installation */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -mr-16 -mt-16"></div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Mobile & Tablet</h3>
                    <p className="text-blue-400">iOS Safari • Android Chrome</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">1</div>
                    <div>
                      <p className="text-white font-medium mb-1">Open CoreTrack in your browser</p>
                      <p className="text-gray-400 text-sm">Navigate to your CoreTrack dashboard</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">2</div>
                    <div>
                      <p className="text-white font-medium mb-1">Tap the Share button</p>
                      <p className="text-gray-400 text-sm">Look for <span className="text-blue-400 font-medium">⬆️</span> in Safari or <span className="text-blue-400 font-medium">⋮</span> in Chrome</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">3</div>
                    <div>
                      <p className="text-white font-medium mb-1">Select "Add to Home Screen"</p>
                      <p className="text-gray-400 text-sm">Choose the home screen installation option</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">✓</div>
                    <div>
                      <p className="text-green-400 font-medium mb-1">CoreTrack app is ready!</p>
                      <p className="text-gray-400 text-sm">Launch directly from your home screen</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Installation */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full -mr-16 -mt-16"></div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">💻</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Desktop & Laptop</h3>
                    <p className="text-green-400">Chrome • Edge • Safari</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">1</div>
                    <div>
                      <p className="text-white font-medium mb-1">Open CoreTrack in Chrome/Edge</p>
                      <p className="text-gray-400 text-sm">Use a supported browser for installation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">2</div>
                    <div>
                      <p className="text-white font-medium mb-1">Click the Install button</p>
                      <p className="text-gray-400 text-sm">Look for <span className="text-green-400 font-medium">⬇️ Install</span> in the address bar</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">3</div>
                    <div>
                      <p className="text-white font-medium mb-1">Confirm installation</p>
                      <p className="text-gray-400 text-sm">Click "Install" in the popup dialog</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-1">✓</div>
                    <div>
                      <p className="text-green-400 font-medium mb-1">Launch as standalone app!</p>
                      <p className="text-gray-400 text-sm">No more browser tabs or distractions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Features Highlight */}
          <div className="bg-gradient-to-r from-blue-600/10 to-green-600/10 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 mb-12">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-4">Enterprise-Ready Features</h3>
              <p className="text-gray-300 text-lg max-w-3xl mx-auto">
                Built for businesses that demand reliability, security, and performance.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Secure Offline Storage</h4>
                <p className="text-gray-400 text-sm">Encrypted local data with automatic sync</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Real-time Analytics</h4>
                <p className="text-gray-400 text-sm">Live business insights and performance metrics</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏢</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Multi-location Support</h4>
                <p className="text-gray-400 text-sm">Seamless operation across all your venues</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-12 border border-white/20 max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Operations?</h3>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Install CoreTrack now and experience the future of restaurant management.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <PWAInstallButton />
                
                <div className="flex items-center space-x-2 text-gray-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span className="text-sm">No app store • No downloads • Install in seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Unique Features Showcase */}
      {/* Capital Intelligence Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-blue-600/10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-400/30">
                  <span className="text-2xl mr-3">🧠</span>
                  <span className="text-green-400 font-semibold">AI-Powered Analytics</span>
                </div>
                <h2 className="text-5xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    Capital Intelligence
                  </span>
                  <br />
                  <span className="text-white">Dashboard</span>
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Turn your inventory data into actionable financial insights. Our AI analyzes your capital efficiency, 
                  predicts cash flow bottlenecks, and recommends optimization strategies in real-time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">💰</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Capital Recovery</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">Track how quickly you recover investments</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-green-400">16</span>
                    <span className="text-sm text-gray-500">days avg</span>
                  </div>
                  <div className="text-xs text-green-400 mt-1">43% better than industry</div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Sales Velocity</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">Monitor purchase-to-sales conversion</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-purple-400">2.3x</span>
                    <span className="text-sm text-gray-500">velocity</span>
                  </div>
                  <div className="text-xs text-purple-400 mt-1">High Performance</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h4 className="text-white font-semibold mb-3">AI Recommendations</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-sm text-gray-300">Reduce slow-moving inventory by 15% → Save ₱50,000</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <p className="text-sm text-gray-300">Optimize reorder points → Improve recovery by 3 days</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-300">Focus marketing on high-velocity items → Increase velocity 2.1x</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Capital Efficiency Score</h3>
                    <span className="text-3xl font-bold text-green-400">84/100</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Inventory Capital Ratio</span>
                        <span className="text-green-400 font-semibold">42%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full" style={{width: '58%'}}></div>
                      </div>
                      <div className="text-xs text-green-400 mt-1">Efficient</div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Capital Recovery Time</span>
                        <span className="text-green-400 font-semibold">16 days</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full" style={{width: '80%'}}></div>
                      </div>
                      <div className="text-xs text-green-400 mt-1">Excellent</div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Purchase-to-Sales Velocity</span>
                        <span className="text-purple-400 font-semibold">2.3x</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full" style={{width: '90%'}}></div>
                      </div>
                      <div className="text-xs text-purple-400 mt-1">High Performance</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Reports Integration Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <h3 className="text-xl font-bold text-white">Automated Business Reports</h3>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">📊</span>
                        <span className="text-white font-semibold">Daily Sales</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400">₱45,250</div>
                      <div className="text-xs text-green-400">+12% from yesterday</div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">📈</span>
                        <span className="text-white font-semibold">Profit Margin</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">68%</div>
                      <div className="text-xs text-blue-400">Above target</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">🏪 Location Performance</span>
                      <span className="text-green-400">All Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">📧 Email Integration</span>
                      <span className="text-blue-400">Gmail Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">📱 SMS Alerts</span>
                      <span className="text-purple-400">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">☁️ Cloud Backup</span>
                      <span className="text-green-400">Auto-Sync</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 order-1 lg:order-2">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30">
                  <span className="text-2xl mr-3">📊</span>
                  <span className="text-blue-400 font-semibold">Automated Intelligence</span>
                </div>
                <h2 className="text-5xl font-bold leading-tight">
                  <span className="text-white">Business Reports</span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Integration
                  </span>
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Get comprehensive business insights delivered automatically. Our system integrates with your email, 
                  SMS, and cloud services to keep you informed about performance, trends, and opportunities.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">📧 Email Integration</h4>
                  <ul className="space-y-2 text-gray-400 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Daily sales summaries</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Weekly performance reports</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Alert notifications</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">📱 Real-time Alerts</h4>
                  <ul className="space-y-2 text-gray-400 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      <span>Low inventory warnings</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      <span>Revenue milestones</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                      <span>System status updates</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discrepancy Monitoring Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-600/10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30">
                  <span className="text-2xl mr-3">🔍</span>
                  <span className="text-red-400 font-semibold">Advanced Detection</span>
                </div>
                <h2 className="text-5xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    Discrepancy
                  </span>
                  <br />
                  <span className="text-white">Monitoring</span>
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Catch theft, fraud, and inventory errors before they become major losses. Our AI-powered system 
                  monitors every transaction, identifies suspicious patterns, and alerts you to potential issues in real-time.
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                  <h4 className="text-white font-semibold mb-4">🚨 Active Alerts</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg border border-red-400/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-white font-medium">High-value transaction</p>
                          <p className="text-red-400 text-sm">₱8,500 without manager approval</p>
                        </div>
                      </div>
                      <span className="text-red-400 text-sm">2 min ago</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-900/30 rounded-lg border border-orange-400/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <div>
                          <p className="text-white font-medium">Inventory mismatch</p>
                          <p className="text-orange-400 text-sm">Coffee beans: system vs physical</p>
                        </div>
                      </div>
                      <span className="text-orange-400 text-sm">15 min ago</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400 mb-2">12</div>
                      <div className="text-sm text-gray-400">Issues Detected</div>
                      <div className="text-xs text-red-400 mt-1">This month</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">₱124K</div>
                      <div className="text-sm text-gray-400">Losses Prevented</div>
                      <div className="text-xs text-green-400 mt-1">Last 3 months</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <h3 className="text-xl font-bold text-white">Security Dashboard</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-400 text-sm">All Systems Active</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">🔐 Transaction Monitoring</span>
                      <span className="text-green-400">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">📊 Inventory Auditing</span>
                      <span className="text-green-400">Real-time</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">🎯 Pattern Recognition</span>
                      <span className="text-blue-400">AI-Powered</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">⚡ Alert System</span>
                      <span className="text-purple-400">Instant</span>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">Risk Assessment</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300 text-sm">Internal Theft Risk</span>
                          <span className="text-green-400 text-sm">Low</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{width: '20%'}}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300 text-sm">Inventory Errors</span>
                          <span className="text-yellow-400 text-sm">Medium</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className="bg-yellow-400 h-2 rounded-full" style={{width: '45%'}}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300 text-sm">Process Violations</span>
                          <span className="text-green-400 text-sm">Low</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{width: '15%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wastage & Shrinkage Tracking Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <h3 className="text-xl font-bold text-white">Wastage Analytics</h3>
                    <div className="bg-purple-500/20 px-3 py-1 rounded-full">
                      <span className="text-purple-400 text-sm">Live Tracking</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 rounded-lg p-4 border border-red-400/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">🗑️</span>
                        <span className="text-white font-semibold">Today's Waste</span>
                      </div>
                      <div className="text-2xl font-bold text-red-400">₱2,340</div>
                      <div className="text-xs text-red-400">-23% from yesterday</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-lg p-4 border border-green-400/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">📉</span>
                        <span className="text-white font-semibold">Waste Ratio</span>
                      </div>
                      <div className="text-2xl font-bold text-green-400">4.2%</div>
                      <div className="text-xs text-green-400">Target: &lt;6%</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-white font-semibold">Top Waste Categories</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm">🥖</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">Baked Goods</p>
                            <p className="text-gray-400 text-sm">Expiry-based waste</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-bold">₱1,200</p>
                          <p className="text-xs text-gray-500">51% of total</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm">🥛</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">Dairy Products</p>
                            <p className="text-gray-400 text-sm">Temperature issues</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 font-bold">₱680</p>
                          <p className="text-xs text-gray-500">29% of total</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm">🥬</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">Fresh Produce</p>
                            <p className="text-gray-400 text-sm">Handling damage</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">₱460</p>
                          <p className="text-xs text-gray-500">20% of total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 order-1 lg:order-2">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 backdrop-blur-sm rounded-full border border-purple-400/30">
                  <span className="text-2xl mr-3">📊</span>
                  <span className="text-purple-400 font-semibold">Smart Analytics</span>
                </div>
                <h2 className="text-5xl font-bold leading-tight">
                  <span className="text-white">Wastage &</span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Shrinkage Tracking
                  </span>
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Turn waste into actionable insights. Our advanced tracking system monitors every item that leaves your 
                  inventory, categorizes losses, and provides AI-driven recommendations to minimize future waste.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🎯</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Smart Predictions</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">AI-powered waste forecasting</p>
                  <ul className="space-y-2 text-gray-400 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Expiry date tracking</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Demand pattern analysis</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Waste trend identification</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">💡</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Action Insights</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">Automated recommendations</p>
                  <ul className="space-y-2 text-gray-400 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                      <span>Order quantity optimization</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                      <span>Pricing strategy suggestions</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                      <span>Staff training alerts</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h4 className="text-white font-semibold mb-3">💰 Monthly Impact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-400">₱47K</div>
                    <div className="text-sm text-gray-300">Waste Reduction</div>
                    <div className="text-xs text-green-400">vs last month</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">23%</div>
                    <div className="text-sm text-gray-300">Efficiency Gain</div>
                    <div className="text-xs text-purple-400">industry benchmark</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CEO Testimony - Strategic Placement */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
        {/* Sophisticated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full border border-white/10 mb-6">
              <span className="text-2xl mr-3">💡</span>
              <span className="text-white font-semibold">From Real Pain to Real Solution</span>
            </div>
          </div>

          {/* Enhanced CEO Testimony Card */}
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-12 border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Subtle Pattern Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center">
                {/* Professional Avatar with Enhanced Design */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-40"></div>
                    <span className="text-3xl relative z-10">👨‍💼</span>
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
                </div>
                
                {/* Enhanced Story - Connects to Features */}
                <blockquote className="text-xl text-gray-200 mb-8 leading-relaxed max-w-4xl mx-auto">
                  <p className="text-2xl text-white font-semibold mb-4">
                    "Those exact problems you see tracked above? 
                    <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                      They're why CoreTrack exists.
                    </span>"
                  </p>
                  <p className="text-lg text-gray-300">
                    "Every algorithm, every alert, every insight comes from real experience running restaurants in the Philippines. 
                    This isn't just software—it's survival made simple."
                  </p>
                </blockquote>
                
                {/* Enhanced Attribution with Modern Layout */}
                <div className="mt-12">
                  {/* Main Attribution Card */}
                  <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-xl rounded-2xl p-8 border border-white/20 relative overflow-hidden">
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl"></div>
                    
                    <div className="relative z-10">
                      {/* Name and Title */}
                      <div className="text-center mb-6">
                        <cite className="text-3xl font-bold text-white block mb-2">Brian B.</cite>
                        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30 mb-3">
                          <span className="text-blue-400 font-semibold">Founder & CEO</span>
                        </div>
                        <p className="text-gray-300 font-medium">
                          Nurse → Tech Innovator → Restaurant Industry Expert
                        </p>
                      </div>
                      
                      {/* Modern Badge Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="group bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 p-4 rounded-xl border border-green-400/20 hover:border-green-400/40 transition-all duration-300 cursor-pointer">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                              🏥
                            </div>
                            <div className="text-center">
                              <div className="text-green-400 font-semibold text-sm">Healthcare</div>
                              <div className="text-green-300 text-xs">Background</div>
                            </div>
                          </div>
                        </div>

                        <div className="group bg-gradient-to-br from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 p-4 rounded-xl border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 cursor-pointer">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                              🍽️
                            </div>
                            <div className="text-center">
                              <div className="text-orange-400 font-semibold text-sm">Restaurant</div>
                              <div className="text-orange-300 text-xs">Owner</div>
                            </div>
                          </div>
                        </div>

                        <div className="group bg-gradient-to-br from-purple-500/10 to-violet-500/10 hover:from-purple-500/20 hover:to-violet-500/20 p-4 rounded-xl border border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 cursor-pointer">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-violet-400 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                              ⚡
                            </div>
                            <div className="text-center">
                              <div className="text-purple-400 font-semibold text-sm">Tech</div>
                              <div className="text-purple-300 text-xs">Innovator</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action Bridge */}
          <div className="text-center mt-12">
            <p className="text-lg text-gray-300 mb-6">
              Ready to see the solution that changed everything?
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-sm">Continue exploring the platform below</span>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-500"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase - Apple Style */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Powerful beyond measure.
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Simple beyond words.
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Every feature designed with obsessive attention to detail
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Feature showcase */}
            <div className="space-y-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`group p-8 rounded-3xl border transition-all duration-500 cursor-pointer ${
                    currentFeature === index
                      ? 'border-white/30 bg-white/10 backdrop-blur-sm shadow-2xl'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  onClick={() => setCurrentFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-4 group-hover:text-gray-300 transition-colors">
                    {feature.description}
                  </p>
                  {currentFeature === index && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                      {feature.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                          <span className="text-gray-300 text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Enhanced Visual showcase */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="bg-black rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-gray-500 text-sm font-mono">
                      CoreTrack Dashboard
                    </div>
                  </div>
                  <div className={`h-80 bg-gradient-to-r ${features[currentFeature].gradient} rounded-xl relative overflow-hidden transition-all duration-700 shadow-2xl`}>
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="relative h-full flex flex-col items-center justify-center">
                      <span className="text-8xl mb-4 animate-pulse">{features[currentFeature].icon}</span>
                      <div className="text-white/90 text-center">
                        <h4 className="text-xl font-semibold mb-2">{features[currentFeature].title}</h4>
                        <div className="w-16 h-1 bg-white/50 rounded mx-auto"></div>
                      </div>
                    </div>
                  </div>
                  {/* Feature indicator dots */}
                  <div className="flex justify-center space-x-2 mt-6">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentFeature(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          currentFeature === index ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase - Apple Style */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                See CoreTrack in action
              </span>
            </h2>
            <p className="text-xl text-gray-400">Experience the power of AI-driven inventory management</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Live Platform Preview */}
            <div className="space-y-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <h3 className="text-2xl font-semibold text-white mb-6 flex items-center">
                  <span className="text-3xl mr-3">📱</span>
                  Live Dashboard Preview
                </h3>
                <div className="bg-black rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Real-time Inventory Status</span>
                    <span className="text-green-400 text-sm">● Live</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Chicken Breast</span>
                      <span className="text-red-400">Low Stock (12 kg)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Rice (Jasmine)</span>
                      <span className="text-green-400">Good (45 kg)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Cooking Oil</span>
                      <span className="text-yellow-400">Moderate (8L)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <h3 className="text-2xl font-semibold text-white mb-6 flex items-center">
                  <span className="text-3xl mr-3">🤖</span>
                  AI Insights
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">💡 Suggestion: Order chicken breast now. Based on sales trends, you'll run out in 2 days.</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-300 text-sm">⚠️ Alert: Lettuce waste increased 15% this week. Check storage conditions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-8">
              {[
                {
                  icon: '🔍',
                  title: 'Smart Discrepancy Detection',
                  description: 'AI identifies unusual inventory movements and potential theft automatically',
                  color: 'from-red-500 to-pink-600'
                },
                {
                  icon: '📊',
                  title: 'Predictive Analytics',
                  description: 'Forecast demand and optimize ordering with machine learning algorithms',
                  color: 'from-blue-500 to-cyan-600'
                },
                {
                  icon: '📱',
                  title: 'Mobile-First Design',
                  description: 'Designed for iPad and mobile devices - manage anywhere, anytime',
                  color: 'from-green-500 to-emerald-600'
                },
                {
                  icon: '⚡',
                  title: 'Real-Time Sync',
                  description: 'All locations stay synchronized instantly with cloud-based architecture',
                  color: 'from-purple-500 to-violet-600'
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-white mb-2">{feature.title}</h4>
                      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Apple Style */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Choose your plan
              </span>
            </h2>
            <p className="text-xl text-gray-400">Transparent pricing. No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
              <h3 className="text-2xl font-semibold text-white mb-4">Starter</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">₱89</span>
                <span className="text-gray-400 text-lg">/month</span>
              </div>
              <p className="text-gray-400 mb-8">Perfect for small cafés and food stalls</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Basic Inventory Management
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Point of Sale (POS)
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Menu Builder
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  1 User • 1 Location
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Up to 20 Products
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Email Support
                </li>
              </ul>
              
              <button
                onClick={() => handleGetStarted('Pricing', 'Start Free Trial', 'starter')}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
              >
                Get started
              </button>
            </div>

            {/* Professional */}
            <div className="bg-gradient-to-b from-blue-500/20 to-purple-600/20 backdrop-blur-sm rounded-3xl p-8 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Professional</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">₱199</span>
                <span className="text-gray-400 text-lg">/month</span>
              </div>
              <p className="text-gray-400 mb-8">For growing restaurants and chains</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Everything in Starter plus:
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Purchase Orders & Expenses
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Advanced Analytics & Reports
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Multi-user Access (6 users)
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Barcode Scanning & Low Stock Alerts
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  2,500 Products • 2 Locations
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Priority Support
                </li>
              </ul>
              
              <button
                onClick={() => handleGetStarted('Pricing', 'Start Free Trial', 'professional')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg"
              >
                Get started
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
              <h3 className="text-2xl font-semibold text-white mb-4">Enterprise</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">₱349</span>
                <span className="text-gray-400 text-lg">/month</span>
              </div>
              <p className="text-gray-400 mb-8">Complete suite for large operations</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Everything in Professional plus:
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Custom Reports & API Access
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Accounting & E-commerce Integrations
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Automatic Reordering
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Unlimited Everything
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Phone Support & Dedicated Manager
                </li>
              </ul>
              
              <button
                onClick={() => handleGetStarted('Pricing', 'Start Free Trial', 'enterprise')}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-yellow-600/5"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Calculate your potential savings
              </span>
            </h2>
            <p className="text-xl text-gray-400">See how much CoreTrack can save your restaurant</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Calculator Inputs */}
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
              <h3 className="text-2xl font-semibold text-white mb-8 flex items-center">
                <span className="text-3xl mr-3">🧮</span>
                Restaurant Details
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Monthly Revenue</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">₱</span>
                    <input
                      type="number"
                      value={roiData.monthlyRevenue}
                      onChange={(e) => setRoiData({...roiData, monthlyRevenue: parseInt(e.target.value) || 0})}
                      placeholder="500,000"
                      className="w-full bg-black/50 border border-white/20 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Number of Locations</label>
                  <select 
                    value={roiData.locations}
                    onChange={(e) => setRoiData({...roiData, locations: e.target.value})}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="1">1 Location</option>
                    <option value="2-5">2-5 Locations</option>
                    <option value="6-15">6-15 Locations</option>
                    <option value="16+">16+ Locations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Staff Count</label>
                  <select 
                    value={roiData.staffCount}
                    onChange={(e) => setRoiData({...roiData, staffCount: e.target.value})}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="5-15">5-15 Staff</option>
                    <option value="16-30">16-30 Staff</option>
                    <option value="31-50">31-50 Staff</option>
                    <option value="51+">51+ Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Current Waste %</label>
                  <select 
                    value={roiData.wastePercentage}
                    onChange={(e) => setRoiData({...roiData, wastePercentage: e.target.value})}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="5-10">5-10% (Excellent)</option>
                    <option value="11-20">11-20% (Good)</option>
                    <option value="21-30">21-30% (Average)</option>
                    <option value="31+">31%+ (Needs Improvement)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-3xl p-8 border border-green-500/20">
                <h3 className="text-2xl font-semibold text-white mb-8 flex items-center">
                  <span className="text-3xl mr-3">💰</span>
                  Your Potential Savings
                </h3>
                
                <div className="space-y-6">
                  <div className="bg-black/30 rounded-2xl p-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-400 mb-2">₱{roiResults.monthlySavings.toLocaleString()}</div>
                      <div className="text-gray-300">Monthly Savings</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">₱{roiResults.annualSavings.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Annual Savings</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">{roiResults.roi.toLocaleString()}%</div>
                      <div className="text-gray-400 text-sm">ROI</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-300">Waste Reduction</span>
                      <span className="text-green-400 font-semibold">₱{roiResults.wasteReductionSavings.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-300">Theft Prevention</span>
                      <span className="text-green-400 font-semibold">₱{roiResults.theftPrevention.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-gray-300">Labor Efficiency</span>
                      <span className="text-green-400 font-semibold">₱{roiResults.laborEfficiency.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-white font-semibold">CoreTrack Cost</span>
                      <span className="text-red-400 font-semibold">-₱{roiResults.coretrackCost.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Based on Industry Averages:</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>• 15-45% reduction in food waste</p>
                  <p>• 80% reduction in inventory theft</p>
                  <p>• 30% improvement in operational efficiency</p>
                  <p>• 25% faster inventory management</p>
                </div>
              </div>

              <button
                onClick={() => handleGetStarted('ROI Calculator', 'Start Saving Today')}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 shadow-2xl hover:shadow-green-500/25 hover:scale-105"
              >
                Start Saving Today
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 to-slate-600/5"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Enterprise-grade security
              </span>
            </h2>
            <p className="text-xl text-gray-400">Your data is protected by industry-leading security measures</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: '🔐',
                title: 'Bank-Level Encryption',
                description: 'AES-256 encryption for data at rest and TLS 1.3 for data in transit',
                features: ['End-to-end encryption', '256-bit SSL certificates', 'Zero-knowledge architecture']
              },
              {
                icon: '☁️',
                title: 'Google Cloud Infrastructure',
                description: 'Built on Google\'s secure, reliable, and scalable cloud platform',
                features: ['99.99% uptime SLA', 'Auto-scaling infrastructure', 'Global CDN delivery']
              },
              {
                icon: '📋',
                title: 'Compliance Ready',
                description: 'Meets international standards for data protection and privacy',
                features: ['GDPR compliant', 'SOC 2 Type II', 'ISO 27001 standards']
              }
            ].map((security, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="text-5xl mb-6 text-center">{security.icon}</div>
                <h3 className="text-2xl font-semibold text-white mb-4 text-center">{security.title}</h3>
                <p className="text-gray-400 mb-6 text-center leading-relaxed">{security.description}</p>
                <ul className="space-y-2">
                  {security.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-3">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Additional Security Features */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">Additional Security Features</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '🔒', title: 'Multi-Factor Authentication', desc: 'SMS and app-based 2FA' },
                { icon: '👥', title: 'Role-Based Access', desc: 'Granular permission controls' },
                { icon: '📊', title: 'Audit Logging', desc: 'Complete activity tracking' },
                { icon: '🛡️', title: 'Data Backup', desc: 'Automated daily backups' },
                { icon: '🔍', title: 'Fraud Detection', desc: 'AI-powered anomaly detection' },
                { icon: '📱', title: 'Device Management', desc: 'Remote device access control' },
                { icon: '⚡', title: 'Real-time Monitoring', desc: '24/7 security monitoring' },
                { icon: '🌐', title: 'VPN Support', desc: 'Secure remote access' }
              ].map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h4 className="text-white font-semibold mb-2">{feature.title}</h4>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="text-center mt-16">
            <p className="text-gray-400 mb-8">Trusted by leading organizations worldwide</p>
            <div className="flex justify-center items-center space-x-8 opacity-50">
              <div className="text-2xl font-bold text-white">GOOGLE CLOUD</div>
              <div className="text-2xl font-bold text-white">Firebase</div>
              <div className="text-2xl font-bold text-white">SSL SECURE</div>
              <div className="text-2xl font-bold text-white">ISO 27001</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Apple Style */}
      <section className="py-32 bg-gradient-to-t from-black to-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              The future of restaurant management
            </span>
            <br />
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              is here
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Join thousands of restaurants already transforming their operations
          </p>
          <button
            onClick={() => handleGetStarted('Final CTA')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-4 rounded-full text-xl font-semibold transition-all duration-200 shadow-2xl hover:shadow-blue-500/25 hover:scale-105"
          >
            Start your journey today
          </button>
          <p className="text-gray-500 text-sm mt-6">14-day free trial • No credit card required</p>
        </div>
      </section>

      {/* Footer - Apple Style */}
      <footer className="border-t border-white/10 py-16 bg-black">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-8 md:mb-0">
              <CoreTrackLogo />
              <span className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CoreTrack
              </span>
            </div>
            <div className="flex space-x-8 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center">
            <p className="text-gray-500">
              © 2025 CoreTrack. Designed and built in the Philippines with ❤️
            </p>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            transform: translateX(0%);
          }
          50% {
            transform: translateX(-100%);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Tier Selection Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-black/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Modal Header */}
              <div className="text-center mb-8">
                <button
                  onClick={() => setShowTierModal(false)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full border border-white/20 mb-6">
                  <span className="text-2xl mr-3">🚀</span>
                  <span className="text-blue-400 font-semibold">Choose Your Plan</span>
                </div>
                
                <h2 className="text-4xl font-bold text-white mb-4">
                  Select Your <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Perfect Tier</span>
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Choose the plan that best fits your restaurant's needs. You can always upgrade later.
                </p>
              </div>

              {/* Tier Options */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Starter Tier */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-blue-400/50 transition-all duration-300 group cursor-pointer"
                     onClick={() => handleTierSelection('starter')}>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl">🌱</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                    <p className="text-gray-400 text-sm mb-4">Perfect for small cafés</p>
                    <div className="text-3xl font-bold text-blue-400 mb-4">₱89<span className="text-lg text-gray-500">/mo</span></div>
                    
                    <ul className="text-left space-y-2 text-gray-300 text-sm mb-6">
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        <span>Basic Inventory Management</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        <span>Point of Sale (POS)</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        <span>Menu Builder</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        <span>1 User • 1 Location</span>
                      </li>
                    </ul>
                    
                    <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 group-hover:scale-105">
                      Choose Starter
                    </button>
                  </div>
                </div>

                {/* Professional Tier */}
                <div className="bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-400/50 hover:border-green-400/70 transition-all duration-300 group cursor-pointer relative"
                     onClick={() => handleTierSelection('professional')}>
                  {/* Popular Badge */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl">🚀</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                    <p className="text-gray-400 text-sm mb-4">For growing restaurants</p>
                    <div className="text-3xl font-bold text-green-400 mb-4">₱199<span className="text-lg text-gray-500">/mo</span></div>
                    
                    <ul className="text-left space-y-2 text-gray-300 text-sm mb-6">
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>Everything in Starter plus:</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>Advanced Analytics</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>Multi-user Access (6 users)</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>2 Locations • 2,500 Products</span>
                      </li>
                    </ul>
                    
                    <button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 group-hover:scale-105">
                      Choose Professional
                    </button>
                  </div>
                </div>

                {/* Enterprise Tier */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all duration-300 group cursor-pointer"
                     onClick={() => handleTierSelection('enterprise')}>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl">👑</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                    <p className="text-gray-400 text-sm mb-4">Complete suite for large operations</p>
                    <div className="text-3xl font-bold text-purple-400 mb-4">₱349<span className="text-lg text-gray-500">/mo</span></div>
                    
                    <ul className="text-left space-y-2 text-gray-300 text-sm mb-6">
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span>Everything in Professional plus:</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span>Custom Reports & API Access</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span>Unlimited Everything</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span>Phone Support & Dedicated Manager</span>
                      </li>
                    </ul>
                    
                    <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 group-hover:scale-105">
                      Choose Enterprise
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="text-center mt-8 pt-6 border-t border-white/10">
                <p className="text-gray-400 text-sm">
                  ✅ 30-day free trial • ✅ No setup fees • ✅ Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}