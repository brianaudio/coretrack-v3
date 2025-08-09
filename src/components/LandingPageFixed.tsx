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

  useEffect(() => {
    trackPageView()
    const cleanup = trackScrollDepth()
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto-rotate features
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 6)
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
              <CoreTrackLogo className="h-8 w-8" />
              <span className="text-xl font-semibold">CoreTrack</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => handleSignIn('Navigation')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => handleGetStarted('Navigation')}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Apple Style */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute top-40 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Inventory Management
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Reimagined
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Stop losing money to theft, waste, and human error. CoreTrack's AI-powered platform 
              gives you complete control over your inventory with real-time tracking and intelligent insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                onClick={() => handleGetStarted('Hero')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 shadow-2xl"
              >
                Start Free Trial
              </button>
              <button 
                onClick={() => handleGetStarted('Hero', 'Watch Demo')}
                className="border border-white/20 hover:border-white/40 px-8 py-4 rounded-xl text-lg font-semibold transition-all backdrop-blur-sm"
              >
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase - Apple Style */}
      <section id="features" className="py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Every feature designed to solve real problems faced by restaurant and retail business owners
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105 ${
                  currentFeature === index ? 'ring-2 ring-blue-500/50' : ''
                }`}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 text-2xl`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">{feature.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="text-sm text-gray-500 flex items-center">
                      <span className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-3"></span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CEO Story - Apple Style */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-16 border border-white/20 shadow-2xl">
            <div className="max-w-4xl mx-auto text-center">
              {/* Avatar with Glow Effect */}
              <div className="relative mb-12">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse-slow"></div>
                  <span className="text-4xl relative z-10">👨‍💼</span>
                </div>
              </div>
              
              {/* Catchy Hook */}
              <div className="mb-8">
                <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                  From Nurse to Tech Entrepreneur
                </h3>
                <p className="text-blue-400 text-lg font-medium">The Story Behind CoreTrack</p>
              </div>
              
              {/* Main Quote with Better Typography */}
              <blockquote className="text-xl md:text-2xl font-light text-gray-200 mb-12 leading-relaxed space-y-6">
                <p className="animate-float">
                  "I was a nurse who dared to dream beyond the hospital walls, starting with an online bike business 
                  that grew into a physical store by 2021, which naturally led me into the food industry in 2023 
                  where I opened my first restaurant, followed by a second one that changed everything."
                </p>
                
                <p className="text-red-400 font-medium animate-float" style={{animationDelay: '0.5s'}}>
                  "Managing two food businesses revealed the harsh reality that passion alone wasn't enough—inventory 
                  was disappearing overnight, costs were spiraling beyond control, and simple staff errors were 
                  costing me thousands while I scrambled with outdated systems and endless spreadsheets."
                </p>
                
                <p className="text-2xl md:text-3xl font-semibold text-white animate-float" style={{animationDelay: '1s'}}>
                  "While everyone talks about AI being the future of restaurant management, 
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    they're already behind—AI is happening right now.
                  </span>"
                </p>
                
                <p className="text-xl text-green-400 font-medium animate-float" style={{animationDelay: '1.5s'}}>
                  "CoreTrack isn't just proof that the future is here, it's the solution born from real pain, 
                  real problems, and real experience in the trenches of food business management."
                </p>
              </blockquote>
              
              {/* Enhanced Attribution */}
              <div className="border-t border-gradient-to-r from-transparent via-white/20 to-transparent pt-8">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-500"></div>
                  <cite className="text-xl font-semibold text-white">Brian D. Basa</cite>
                  <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-500"></div>
                </div>
                <p className="text-gray-400 text-sm">Founder & CEO • Nurse Turned Tech Entrepreneur</p>
                <p className="text-blue-400 text-xs mt-2 font-medium">
                  "Solving real problems with real experience"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Apple Style */}
      <section id="pricing" className="py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Choose your plan
              </span>
            </h2>
            <p className="text-xl text-gray-400">Simple, transparent pricing that grows with your business</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <p className="text-gray-400 mb-6">Perfect for small businesses</p>
                <div className="text-4xl font-bold text-white mb-2">$29</div>
                <p className="text-gray-500">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Up to 1,000 products
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  1 location
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Basic reporting
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Email support
                </li>
              </ul>
              
              <button 
                onClick={() => handleGetStarted('Pricing', 'Choose Starter', 'starter')}
                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg transition-colors"
              >
                Choose Starter
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-gradient-to-b from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/50 transform scale-105 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                <p className="text-gray-400 mb-6">For growing businesses</p>
                <div className="text-4xl font-bold text-white mb-2">$79</div>
                <p className="text-gray-500">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Up to 10,000 products
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Up to 5 locations
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Advanced analytics
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Priority support
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  API access
                </li>
              </ul>
              
              <button 
                onClick={() => handleGetStarted('Pricing', 'Choose Professional', 'professional')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-lg transition-all transform hover:scale-105"
              >
                Choose Professional
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                <p className="text-gray-400 mb-6">For large-scale operations</p>
                <div className="text-4xl font-bold text-white mb-2">$199</div>
                <p className="text-gray-500">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Unlimited products
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Unlimited locations
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Custom integrations
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Dedicated support
                </li>
                <li className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  White-label options
                </li>
              </ul>
              
              <button 
                onClick={() => handleGetStarted('Pricing', 'Choose Enterprise', 'enterprise')}
                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg transition-colors"
              >
                Choose Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="flex items-center space-x-3 mb-8 md:mb-0">
              <CoreTrackLogo className="h-8 w-8" />
              <span className="text-xl font-semibold">CoreTrack</span>
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
