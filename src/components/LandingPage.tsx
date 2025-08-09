'use client'

import { useState, useEffect } from 'react'
import CoreTrackLogo from './CoreTrackLogo'
import { trackButtonClick, trackPageView, trackScrollDepth } from '../lib/analytics'

interface LandingPageProps {
  onGetStarted: (selectedTier?: string) => void
  onSignIn: () => void
}

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)
  
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

  const handleGetStarted = (location: string, buttonText: string = 'Start Free Trial', selectedTier?: string) => {
    trackButtonClick(location, buttonText)
    if (selectedTier) {
      localStorage.setItem('selectedTier', selectedTier)
    }
    onGetStarted(selectedTier)
  }

  const handleSignIn = (location: string = 'Navigation') => {
    trackButtonClick(location, 'Sign In')
    onSignIn()
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
                    <a
                      href="tel:+639619941111"
                      onClick={() => trackButtonClick('Navigation', 'Contact Developer Phone')}
                      className="flex items-center space-x-4 p-3 hover:bg-white/10 rounded-xl transition-all duration-200 group/item"
                    >
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover/item:scale-110 transition-transform duration-200 flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white group-hover/item:text-green-200 transition-colors">Call/Text</div>
                        <div className="text-xs text-gray-400 group-hover/item:text-gray-300 transition-colors">+63 961 994 1111</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleSignIn('Navigation')}
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors duration-200"
              >
                Sign in
              </button>
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

      {/* CEO Story - Sleek & Concise */}
<section className="py-20 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
  {/* Background Elements */}
  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
  
  <div className="max-w-4xl mx-auto px-6 relative z-10">
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
      <div className="text-center">
        {/* Compact Avatar */}
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-30"></div>
          <span className="text-2xl relative z-10">👨‍💼</span>
        </div>
        
        {/* Condensed Story */}
        <blockquote className="text-lg text-gray-200 mb-6 leading-relaxed">
          <p className="mb-4">
            "From nurse to restaurant owner, I experienced firsthand the chaos of managing inventory with spreadsheets. 
            Staff errors cost thousands, theft went undetected, and passion wasn't enough."
          </p>
          <p className="text-xl text-white font-semibold">
            "CoreTrack was born from real pain, solving real problems with 
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> AI that works today</span>."
          </p>
        </blockquote>
        
        {/* Minimal Attribution */}
        <div className="border-t border-white/10 pt-6">
          <cite className="text-lg font-semibold text-white">Brian D. Basa</cite>
          <p className="text-gray-400 text-sm mt-1">Founder & CEO • Nurse Turned Tech Innovator</p>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Demo Section */}
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
            {/* Interactive Demo */}
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
    </div>
  )
}