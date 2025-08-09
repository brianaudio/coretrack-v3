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
      icon: '�️',
      title: 'Discrepancy Reporting',
      description: 'AI-powered detection of inventory discrepancies with automated investigation workflows',
      gradient: 'from-red-500 to-rose-600',
      details: ['Auto discrepancy detection', 'Real-time alerts', 'Investigation dashboard', 'Variance analysis']
    },
    {
      icon: '�',
      title: 'Automated Business Reports',
      description: 'Daily, weekly, and monthly reports automatically generated and delivered to your inbox',
      gradient: 'from-green-500 to-teal-600',
      details: ['Automated scheduling', 'Custom report builder', 'Email delivery', 'Executive summaries']
    },
    {
      icon: '�',
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

          <div className={`flex flex-col sm:flex-row gap-6 justify-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={() => handleGetStarted('Hero')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all duration-200 shadow-2xl hover:shadow-blue-500/25 hover:scale-105"
            >
              Start free trial
            </button>
            <button
              onClick={() => handleSignIn('Hero')}
              className="border border-white/20 hover:border-white/40 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all duration-200 backdrop-blur-sm hover:bg-white/5"
            >
              Watch demo
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
          <p className="text-gray-400 text-sm">Founder & CEO • Nurse Turned Tech Innovator</p>
          <p className="text-blue-400 text-xs mt-2 font-medium">
            "Solving real problems with real experience"
          </p>
        </div>
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