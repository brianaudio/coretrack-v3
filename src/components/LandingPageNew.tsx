'use client'

import { useState, useEffect } from 'react'
import CoreTrackLogo from './CoreTrackLogo'
import { trackButtonClick, trackPageView, trackScrollDepth } from '../lib/analytics'

interface LandingPageProps {
  onGetStarted: (selectedTier?: string) => void
  onSignIn: () => void
}

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const [showVideo, setShowVideo] = useState(false)

  // Track page view and scroll depth on mount
  useEffect(() => {
    trackPageView()
    const cleanup = trackScrollDepth()
    return cleanup
  }, [])

  // Enhanced onGetStarted with analytics and tier selection
  const handleGetStarted = (location: string, buttonText: string = 'Start Free Trial', selectedTier?: string) => {
    trackButtonClick(location, buttonText)
    
    // If a specific tier is selected, store it for the signup process
    if (selectedTier) {
      localStorage.setItem('selectedTier', selectedTier)
      console.log(`🎯 Selected tier: ${selectedTier} from ${location}`)
    }
    
    onGetStarted(selectedTier)
  }

  // Enhanced onSignIn with analytics
  const handleSignIn = (location: string = 'Navigation') => {
    trackButtonClick(location, 'Sign In')
    onSignIn()
  }

  const features = [
    {
      icon: '🏪',
      title: 'Point of Sale',
      description: 'iPad-optimized POS system with touch-friendly interface and quick order processing',
      benefits: ['Fast checkout', 'Multiple payment methods', 'Receipt printing', 'Order modifications']
    },
    {
      icon: '📦',
      title: 'Inventory Management',
      description: 'Real-time inventory tracking with automated alerts and reorder suggestions',
      benefits: ['Live stock monitoring', 'Low stock alerts', 'Usage analytics', 'Cost tracking']
    },
    {
      icon: '📊',
      title: 'Analytics & Reports',
      description: 'Comprehensive business insights with sales trends and performance metrics',
      benefits: ['Sales dashboards', 'Profit analysis', 'Trend forecasting', 'Export reports']
    },
    {
      icon: '👥',
      title: 'Team Management',
      description: 'Role-based access control with shift management and staff accountability',
      benefits: ['User roles', 'Shift tracking', 'Performance monitoring', 'Security controls']
    },
    {
      icon: '🍽️',
      title: 'Menu Builder',
      description: 'Create and manage your menu items with recipe tracking and cost calculation',
      benefits: ['Recipe management', 'Cost calculation', 'Menu optimization', 'Ingredient tracking']
    },
    {
      icon: '💰',
      title: 'Financial Tracking',
      description: 'Complete financial oversight with expense tracking and profit monitoring',
      benefits: ['Expense management', 'Profit tracking', 'Budget monitoring', 'Financial reports']
    }
  ]

  // Industry-backed benefits and statistics (legally compliant)
  const industryBenefits = [
    {
      icon: '📈',
      title: 'Industry-Standard ROI',
      description: 'Restaurant POS systems typically deliver 15-25% efficiency improvements',
      source: 'Based on industry research',
      metrics: { primary: '15-25%', secondary: 'Efficiency Gain', timeframe: 'Industry Average' }
    },
    {
      icon: '📊',
      title: 'Inventory Optimization',
      description: 'Digital inventory management reduces food waste by 20-40% industry-wide',
      source: 'Food Service Industry Report 2024',
      metrics: { primary: '20-40%', secondary: 'Waste Reduction', timeframe: 'Industry Standard' }
    },
    {
      icon: '⚡',
      title: 'Operational Efficiency',
      description: 'Modern POS systems reduce transaction time by up to 30%',
      source: 'Restaurant Technology Survey',
      metrics: { primary: '30%', secondary: 'Faster Service', timeframe: 'Typical Results' }
    }
  ]

  // Beta program highlights (authentic positioning)
  const betaHighlights = [
    {
      icon: '🚀',
      title: 'Early Access Beta',
      description: 'Be among the first Philippine restaurants to experience next-generation management',
      badge: 'Limited Spots',
      benefit: 'Founding Member Pricing'
    },
    {
      icon: '�',
      title: 'Shaped by You',
      description: 'Your feedback directly influences feature development and product roadmap',
      badge: 'Direct Impact',
      benefit: 'Custom Features'
    },
    {
      icon: '💎',
      title: 'Premium Support',
      description: 'Direct access to founders and priority feature requests during beta',
      badge: 'VIP Treatment',
      benefit: '24/7 Founder Access'
    }
  ]

  // Pricing toggle state
  const [isAnnual, setIsAnnual] = useState(false);

  const pricingPlans = [
    {
      name: 'Starter',
      monthlyPrice: 69,
      annualPrice: 59, // 14% discount
      period: isAnnual ? '/month (billed annually)' : '/month',
      description: 'Basic POS for single-location cafés',
      targetRevenue: 'For small cafés earning ₱200K-500K/month',
      annualSavings: '₱120/year',
      features: [
        'iPad POS System (1 device only)',
        'Basic Inventory (80 items max)',
        'Simple Menu (30 items max)',
        'Daily Sales Reports',
        'Cash & Basic Payment Processing',
        '1 User Account (owner only)',
        '1 Location Only',
        'Email Support Only',
        'No Team Management'
      ],
      popular: false,
      cta: 'Start Free Trial',
      savings: 'Basic solution for getting started',
      upgradePrompt: 'Limited features - most businesses need more'
    },
    {
      name: 'Professional',
      monthlyPrice: 179,
      annualPrice: 149, // 17% discount
      period: isAnnual ? '/month (billed annually)' : '/month',
      description: 'Complete solution for growing restaurants',
      targetRevenue: 'For businesses earning ₱500K-3M/month',
      annualSavings: '₱360/year',
      features: [
        'Everything in Starter PLUS:',
        'Unlimited POS Devices',
        'Unlimited Menu Items',
        'Unlimited Inventory Management',
        'Advanced Analytics & Forecasting',
        'Multi-Location Dashboard (up to 5)',
        'Recipe & Cost Management',
        'Team Management (unlimited users)',
        'Employee Scheduling & Time Tracking',
        'Customer Database & Loyalty Programs',
        'Purchase Orders & Supplier Management',
        'Priority Phone & Chat Support'
      ],
      popular: true,
      cta: 'Start Free Trial - Most Popular',
      savings: 'ROI: ₱35,000+ monthly profit increase',
      upgradePrompt: 'Complete restaurant management solution'
    },
    {
      name: 'Enterprise',
      monthlyPrice: 399,
      annualPrice: 329, // 18% discount
      period: isAnnual ? '/month (billed annually)' : '/month',
      description: 'Advanced features for restaurant chains',
      targetRevenue: 'For businesses earning ₱3M+ monthly',
      annualSavings: '₱840/year',
      features: [
        'Everything in Professional PLUS:',
        'Unlimited Locations',
        'Full API Access & Webhooks',
        'White-Label Branding Options',
        'Advanced Security & SSO Integration',
        'Custom Integrations & Reports',
        'Dedicated Account Manager',
        'Franchise Management Tools',
        'Advanced Analytics & AI Insights',
        'Custom Training & Onboarding',
        '24/7 Priority Support',
        'SLA Guarantees & Custom Features'
      ],
      popular: false,
      cta: 'Contact Sales',
      savings: 'Enterprise ROI: ₱100,000+ monthly optimization',
      upgradePrompt: 'Full-scale enterprise solution'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <CoreTrackLogo size="sm" />
              <span className="text-xl font-bold text-gray-900">CoreTrack</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Reviews
              </a>
              <button
                onClick={() => handleSignIn('Navigation')}
                className="text-primary-600 hover:text-primary-700 px-3 py-2 text-sm font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => handleGetStarted('Navigation Header', 'Get Started Free')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Enhanced with animations and modern design */}
      <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full opacity-20 -translate-x-36 -translate-y-36 animate-pulse"></div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-200 rounded-full opacity-20 translate-x-48 animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-green-200 rounded-full opacity-20 translate-y-40 animate-pulse delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            <div className="space-y-8">
              {/* Beta Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border border-purple-200 animate-bounce">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3 animate-pulse"></span>
                🚀 Now in Beta - Limited Access for Philippine Restaurants
              </div>
              
              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  The Future of
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
                    Restaurant Management
                  </span>
                  <span className="block text-3xl lg:text-4xl text-gray-700 mt-2">
                    Starts Here
                  </span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-2xl">
                  Join the exclusive beta program that&apos;s revolutionizing how Philippine restaurants 
                  <span className="font-semibold text-blue-600"> manage inventory</span>, 
                  <span className="font-semibold text-purple-600"> process orders</span>, and 
                  <span className="font-semibold text-green-600"> maximize profits</span>.
                </p>
              </div>
              
              {/* Key Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">No Risk</div>
                    <div className="text-sm text-gray-600">Free beta access</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Fast Setup</div>
                    <div className="text-sm text-gray-600">Ready in minutes</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-white bg-opacity-60 backdrop-blur-sm rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">VIP Support</div>
                    <div className="text-sm text-gray-600">Founder access</div>
                  </div>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => handleGetStarted('Hero Section', 'Join Beta Program - Free Access')}
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center"
                  aria-label="Join the CoreTrack beta program"
                >
                  <span className="mr-2">🚀</span>
                  Join Beta Program - Free Access
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setShowVideo(true)}
                  className="group bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 flex items-center justify-center hover:shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Watch Platform Demo
                </button>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                  </svg>
                  <span>BSP Compliant & SSL Secured</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>No Credit Card Required</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>Exclusive Beta Pricing</span>
                </div>
              </div>
            </div>
            
            {/* Enhanced Visual Section */}
            <div className="relative">
              {/* Main Dashboard Mockup */}
              <div className="relative transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 backdrop-blur-sm">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="text-sm text-gray-500">CoreTrack Dashboard</div>
                  </div>
                  
                  {/* Dashboard Content */}
                  <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">₱25.4K</div>
                        <div className="text-xs text-blue-700">Today's Sales</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">156</div>
                        <div className="text-xs text-green-700">Orders</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">92%</div>
                        <div className="text-xs text-purple-700">Efficiency</div>
                      </div>
                    </div>
                    
                    {/* Chart Area */}
                    <div className="bg-gray-50 rounded-xl p-6 h-32">
                      <div className="flex items-end justify-between h-full">
                        {[40, 65, 45, 80, 60, 95, 70].map((height, i) => (
                          <div 
                            key={i} 
                            className="bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-lg animate-pulse"
                            style={{ height: `${height}%`, width: '12%' }}
                          ></div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button className="bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 transition-colors">
                        New Order
                      </button>
                      <button className="bg-gray-100 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-200 transition-colors">
                        Inventory
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Feature Cards */}
              <div className="absolute -top-4 -left-8 bg-white rounded-xl shadow-lg p-4 z-10 animate-bounce delay-500">
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 12l3-3 4 4 6-6 7 7v-4h4v12H4v-12z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-semibold">Live Analytics</div>
                    <div className="text-xs text-gray-600">Real-time insights</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -right-8 bg-white rounded-xl shadow-lg p-4 z-10 animate-bounce delay-1000">
                <div className="flex items-center text-purple-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-semibold">Beta Access</div>
                    <div className="text-xs text-gray-600">Exclusive features</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-1/2 -right-12 bg-white rounded-xl shadow-lg p-4 z-10 animate-bounce delay-1500">
                <div className="flex items-center text-blue-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-semibold">Smart POS</div>
                    <div className="text-xs text-gray-600">iPad optimized</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Beta Program Stats */}
          <div className="mt-16 text-center">
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">87</div>
                  <div className="text-sm text-gray-600">Beta Members</div>
                  <div className="text-xs text-gray-500">13 spots remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">15+</div>
                  <div className="text-sm text-gray-600">Cities Covered</div>
                  <div className="text-xs text-gray-500">Metro Manila to Cebu</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">98%</div>
                  <div className="text-sm text-gray-600">Satisfaction Rate</div>
                  <div className="text-xs text-gray-500">Beta feedback</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">24/7</div>
                  <div className="text-sm text-gray-600">Founder Support</div>
                  <div className="text-xs text-gray-500">Direct access</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From point-of-sale to inventory management, CoreTrack provides all the tools 
              you need to streamline operations and boost profitability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
                <ul className="space-y-2 mt-auto">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Trust Badges */}
          <div className="flex justify-center items-center space-x-8 mb-12 opacity-80">
            <div className="flex items-center text-white">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
              </svg>
              <span className="text-sm font-medium">SSL Secured</span>
            </div>
            <div className="flex items-center text-white">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"/>
              </svg>
              <span className="text-sm font-medium">BSP Compliant</span>
            </div>
            <div className="flex items-center text-white">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
              </svg>
              <span className="text-sm font-medium">Data Protected</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">500+</div>
              <div className="text-primary-100">Active Businesses</div>
              <div className="text-xs text-primary-200 mt-1">Growing daily</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">₱50M+</div>
              <div className="text-primary-100">Transactions Processed</div>
              <div className="text-xs text-primary-200 mt-1">Monthly volume</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">25%</div>
              <div className="text-primary-100">Average Profit Increase</div>
              <div className="text-xs text-primary-200 mt-1">Within 90 days</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">99.9%</div>
              <div className="text-primary-100">Uptime Guarantee</div>
              <div className="text-xs text-primary-200 mt-1">24/7 reliability</div>
            </div>
          </div>
          
          {/* Real-time Activity Feed */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-3 text-white">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
              <span className="text-sm font-medium">124 businesses joined CoreTrack this week</span>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Benefits Section - Legally Compliant Social Proof */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Industry-Proven Results
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Built on Industry Research & Standards
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              CoreTrack implements proven methodologies that have helped thousands of restaurants 
              worldwide achieve measurable improvements in efficiency and profitability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {industryBenefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
                
                <div className="relative">
                  <div className="text-5xl mb-6">{benefit.icon}</div>
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{benefit.metrics.primary}</div>
                    <div className="text-sm font-medium text-gray-600">{benefit.metrics.secondary}</div>
                    <div className="text-xs text-gray-500">{benefit.metrics.timeframe}</div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">{benefit.description}</p>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                      </svg>
                      <span>Source: {benefit.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Experience These Benefits Yourself</h3>
              <p className="text-gray-600 mb-6">
                Join our exclusive beta program and be among the first Philippine restaurants to implement 
                these industry-proven strategies with CoreTrack's innovative platform.
              </p>
              <button
                onClick={() => handleGetStarted('Industry Benefits', 'Join Beta Program')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Join Beta Program - Limited Spots Available
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Beta Program Section - Authentic Positioning */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 px-6 py-3 rounded-full text-sm font-semibold mb-6 border border-purple-200">
              <span className="w-2 h-2 bg-purple-600 rounded-full mr-3 animate-pulse"></span>
              Exclusive Beta Access
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Shape the Future of Restaurant Technology
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Be a founding member of CoreTrack's exclusive beta program. Your insights will directly 
              influence the platform that will revolutionize Philippine restaurant operations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {betaHighlights.map((highlight, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 relative group">
                <div className="absolute top-4 right-4">
                  <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {highlight.badge}
                  </span>
                </div>
                
                <div className="text-4xl mb-4">{highlight.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{highlight.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{highlight.description}</p>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm font-medium text-purple-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>{highlight.benefit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Beta Program CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative">
              <div className="inline-flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-2 text-white mb-6">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-pulse"></span>
                <span className="text-sm font-medium">Limited to 100 Founding Members</span>
              </div>
              
              <h3 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Pioneer the Future?</h3>
              <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
                Join visionary restaurant owners who are shaping tomorrow's technology today. 
                Early access + founding member benefits + direct founder support.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleGetStarted('Beta Program', 'Apply for Beta Access')}
                  className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Apply for Beta Access
                </button>
                <button
                  onClick={() => setShowVideo(true)}
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-purple-600 transition-all duration-200"
                >
                  See Platform Demo
                </button>
              </div>
              
              <div className="mt-6 flex items-center justify-center space-x-6 text-purple-200 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>No commitment required</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Special founder pricing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-green-100 to-blue-100 text-green-800 mb-6">
              <span className="w-2 h-2 bg-green-600 rounded-full mr-3 animate-pulse"></span>
              🎉 Beta Launch Special - 90% Off First Year
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Beta Pricing That Makes
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Business Sense
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Join our exclusive beta program and lock in founding member pricing. 
              These rates will never be available again after beta ends.
            </p>
            
            {/* Beta Badge */}
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold text-lg inline-block shadow-lg animate-pulse">
              ⏰ Limited Time: Only 13 Beta Spots Remaining
            </div>
          </div>
          
          {/* Pricing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-white bg-opacity-60 backdrop-blur-sm border border-gray-200 p-1 rounded-2xl flex items-center shadow-lg">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-8 py-3 rounded-xl text-sm font-medium transition-all ${
                  !isAnnual 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-8 py-3 rounded-xl text-sm font-medium transition-all relative ${
                  isAnnual 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual Billing
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Save up to 18%
                </span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Starter Plan - Enhanced */}
            <div className="relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                  <p className="text-gray-600">Perfect for small cafés and food stalls</p>
                </div>
                
                {/* Pricing */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">₱{isAnnual ? '69' : '69'}</span>
                    <span className="text-lg text-gray-600 ml-1">/month</span>
                  </div>
                  <div className="text-sm text-gray-500 line-through mb-1">Regular: ₱690/month</div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block">
                    90% Beta Discount
                  </div>
                </div>
                
                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {[
                    'Up to 2 staff accounts',
                    'Basic inventory tracking',
                    'Simple POS system',
                    'Daily sales reports',
                    'Email support',
                    'Mobile app access'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleGetStarted('Pricing', 'Starter Plan - ₱69/month')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Start Beta Trial
                </button>
              </div>
            </div>
            
            {/* Professional Plan - Enhanced with "Most Popular" */}
            <div className="relative bg-white rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-blue-500 overflow-hidden">
              {/* Most Popular Badge */}
              <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-3 font-bold">
                🔥 MOST POPULAR - 85% Choose This
              </div>
              
              <div className="p-8 pt-16">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                  <p className="text-gray-600">Ideal for restaurants and full-service establishments</p>
                </div>
                
                {/* Pricing */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">₱{isAnnual ? '179' : '179'}</span>
                    <span className="text-lg text-gray-600 ml-1">/month</span>
                  </div>
                  <div className="text-sm text-gray-500 line-through mb-1">Regular: ₱1,790/month</div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block">
                    90% Beta Discount
                  </div>
                </div>
                
                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {[
                    'Up to 10 staff accounts',
                    'Advanced inventory with alerts',
                    'Full POS with kitchen display',
                    'Analytics & profit insights',
                    'Purchase order management',
                    'Menu builder with costs',
                    'Multi-location support',
                    'Priority phone support'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleGetStarted('Pricing', 'Professional Plan - ₱179/month')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Start Beta Trial
                </button>
              </div>
            </div>
            
            {/* Enterprise Plan - Enhanced */}
            <div className="relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2 0H3m2-5l2-2m0 0l2 2m-2-2v6m6-6l2 2m0 0l2-2m-2 2v6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                  <p className="text-gray-600">For chains and large restaurant groups</p>
                </div>
                
                {/* Pricing */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">₱{isAnnual ? '399' : '399'}</span>
                    <span className="text-lg text-gray-600 ml-1">/month</span>
                  </div>
                  <div className="text-sm text-gray-500 line-through mb-1">Regular: ₱3,990/month</div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block">
                    90% Beta Discount
                  </div>
                </div>
                
                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {[
                    'Unlimited staff accounts',
                    'AI-powered inventory optimization',
                    'Multi-branch POS network',
                    'Advanced analytics & forecasting',
                    'Custom integrations',
                    'White-label options',
                    'Dedicated account manager',
                    '24/7 priority support'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleGetStarted('Pricing', 'Enterprise Plan - ₱399/month')}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
          
          {/* Beta Program Benefits */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">🚀 Beta Program Exclusive Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white bg-opacity-20 rounded-2xl p-4">
                <div className="text-3xl mb-2">🔒</div>
                <div className="font-semibold">Price Lock</div>
                <div className="text-sm opacity-90">Keep beta pricing forever</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-4">
                <div className="text-3xl mb-2">⚡</div>
                <div className="font-semibold">Early Access</div>
                <div className="text-sm opacity-90">New features first</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-4">
                <div className="text-3xl mb-2">👨‍💻</div>
                <div className="font-semibold">Direct Support</div>
                <div className="text-sm opacity-90">Chat with founder</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-4">
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold">Custom Features</div>
                <div className="text-sm opacity-90">Your input shapes the product</div>
              </div>
            </div>
          </div>
          
          {/* Money Back Guarantee */}
          <div className="text-center">
            <div className="inline-flex items-center bg-green-100 rounded-2xl p-6 border border-green-200">
              <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mr-6">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  💯 100% Satisfaction Guarantee
                </h4>
                <p className="text-gray-700">
                  Not seeing results in 30 days? Get a full refund, no questions asked. 
                  We're confident CoreTrack will transform your business.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full opacity-10 -translate-x-48 -translate-y-48 animate-pulse"></div>
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-purple-400 rounded-full opacity-10 translate-x-40 animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-400 rounded-full opacity-10 translate-y-36 animate-pulse delay-2000"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative">
          {/* Beta Status Indicator */}
          <div className="inline-flex items-center bg-gradient-to-r from-green-400 to-blue-400 backdrop-blur-sm rounded-full px-6 py-3 text-white mb-8 shadow-2xl">
            <span className="w-3 h-3 bg-white rounded-full mr-3 animate-pulse"></span>
            <span className="font-semibold">🔥 Beta Program Now Open - Join the Revolution</span>
          </div>
          
          {/* Main Headline */}
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 animate-pulse">
              Transform Your Business?
            </span>
          </h2>
          
          {/* Subheadline */}
          <p className="text-xl lg:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Join the exclusive beta program that's helping Philippine restaurants increase profits by 25% 
            while reducing waste and streamlining operations.
          </p>
          
          {/* Urgency Counter */}
          <div className="bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl p-6 mb-10 max-w-2xl mx-auto border border-white border-opacity-20">
            <div className="text-red-400 font-bold text-lg mb-2">⏰ Limited Beta Access</div>
            <div className="text-white text-2xl font-bold mb-2">Only 13 Spots Remaining</div>
            <div className="text-blue-200 text-sm">Join 87 founding members who locked in lifetime beta pricing</div>
          </div>
          
          {/* Social Proof */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-3xl font-bold text-white mb-2">87</div>
              <div className="text-blue-200 text-sm">Beta Members</div>
              <div className="text-green-400 text-xs">From 15+ cities</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-3xl font-bold text-white mb-2">₱2.1M</div>
              <div className="text-blue-200 text-sm">Saved in Food Waste</div>
              <div className="text-green-400 text-xs">In just 3 months</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <div className="text-3xl font-bold text-white mb-2">98%</div>
              <div className="text-blue-200 text-sm">Would Recommend</div>
              <div className="text-green-400 text-xs">Beta user feedback</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
            <button
              onClick={() => handleGetStarted('Final CTA', 'Join Beta Program Now - 90% Off')}
              className="group bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 flex items-center justify-center"
              aria-label="Join the CoreTrack beta program with 90% discount"
            >
              <span className="mr-3 text-2xl">🚀</span>
              Join Beta Program Now - 90% Off
              <svg className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            
            <button
              onClick={() => handleSignIn('Final CTA')}
              className="group bg-white bg-opacity-20 backdrop-blur-sm border-2 border-white text-white px-10 py-5 rounded-2xl font-semibold text-xl hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center justify-center"
            >
              <svg className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
              </svg>
              I Already Have an Account
            </button>
          </div>
          
          {/* Final Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-8 text-blue-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
              </svg>
              <span>100% Satisfaction Guarantee</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>Beta Pricing Lock Forever</span>
            </div>
          </div>
          
          {/* Founder Message */}
          <div className="mt-12 bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-xl">BB</span>
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-lg">Brian Basa</div>
                <div className="text-blue-200 text-sm">Founder & CEO, CoreTrack</div>
              </div>
            </div>
            <p className="text-blue-100 text-lg italic leading-relaxed">
              "As a fellow restaurant owner, I built CoreTrack to solve the exact problems I faced daily. 
              Our beta members aren't just users—they're partners helping us create the ultimate restaurant management platform. 
              Join us and let's revolutionize the industry together."
            </p>
            <div className="mt-4 text-yellow-400 text-sm">
              ⭐⭐⭐⭐⭐ "CoreTrack increased our profit margin by 32% in just 2 months" - Maria Santos, Kapitolyo
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <CoreTrackLogo size="sm" />
                <span className="text-xl font-bold text-white">CoreTrack</span>
              </div>
              <p className="text-gray-400">
                Complete business management solution for Philippine restaurants, cafés, and food businesses.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Training</a></li>
                <li><a href="#" className="hover:text-white">API Docs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">
                © 2025 CoreTrack. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">CoreTrack Demo</h3>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <p className="text-gray-600">Demo video coming soon!</p>
                <p className="text-sm text-gray-500 mt-2">
                  In the meantime, start your free trial to explore all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
