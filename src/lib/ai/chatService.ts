// Gemini Pro AI Chat Service for CoreTrack
// Enterprise-grade AI assistant with context awareness and learning capabilities

import { AIDataService } from './dataService'

interface ChatContext {
  userRole?: string
  businessType?: string
  currentPage?: string
  tenantId?: string
  subscriptionPlan?: string
}

interface ChatMessage {
  content: string
  context: ChatContext
}

interface AIResponse {
  response: string
  confidence: number
  suggestions?: string[]
}

interface RateLimitInfo {
  requestCount: number
  lastReset: number
  dailyCount: number
  lastDayReset: number
  isBlocked: boolean
  blockUntil?: number
}

interface PerTenantRateLimit {
  [tenantId: string]: RateLimitInfo
}

class ChatService {
  private readonly geminiApiKey: string
  private readonly primaryModel = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  private readonly fallbackModel = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'
  private knowledgeBase = new Map<string, string>()
  private conversationHistory: Array<{ user: string, ai: string }> = []
  
  // Per-tenant rate limiting
  private tenantRateLimits: PerTenantRateLimit = {}
  private readonly MAX_REQUESTS_PER_MINUTE = 12  // Per tenant
  private readonly MAX_REQUESTS_PER_DAY = 400    // Per tenant
  private readonly ENTERPRISE_DAILY_LIMIT = 1000 // Higher limit for Enterprise
  private requestQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false
  
  // Automatic cleanup schedule
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL_MS = 3600000 // 1 hour
  private readonly TENANT_INACTIVE_THRESHOLD = 86400000 * 7 // 7 days

  constructor() {
    // In production, this would come from environment variables
    this.geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    this.initializeKnowledgeBase()
    this.startAutomaticCleanup()
  }

  // Automatic cleanup and reset schedule
  private startAutomaticCleanup(): void {
    // Start cleanup interval for inactive tenants
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTenants()
    }, this.CLEANUP_INTERVAL_MS)
    
    console.log('🔄 Automatic rate limit cleanup scheduled (every hour)')
  }

  private cleanupInactiveTenants(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    Object.keys(this.tenantRateLimits).forEach(tenantId => {
      const rateLimit = this.tenantRateLimits[tenantId]
      
      // Check if tenant has been inactive for more than threshold
      const lastActivity = Math.max(rateLimit.lastReset, rateLimit.lastDayReset)
      if (now - lastActivity > this.TENANT_INACTIVE_THRESHOLD) {
        delete this.tenantRateLimits[tenantId]
        cleanedCount++
      }
    })
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive tenant rate limits`)
    }
  }

  // Cleanup on instance destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('🔄 Automatic cleanup stopped')
    }
  }

  // Rate limiting methods - Per Tenant
  private getTenantRateLimit(tenantId: string, subscriptionPlan?: string): RateLimitInfo {
    if (!this.tenantRateLimits[tenantId]) {
      this.tenantRateLimits[tenantId] = {
        requestCount: 0,
        lastReset: Date.now(),
        dailyCount: 0,
        lastDayReset: Date.now(),
        isBlocked: false
      }
    }
    return this.tenantRateLimits[tenantId]
  }

  private getTenantDailyLimit(subscriptionPlan?: string): number {
    // Enterprise subscribers get higher limits
    if (subscriptionPlan === 'enterprise') {
      return this.ENTERPRISE_DAILY_LIMIT
    }
    return this.MAX_REQUESTS_PER_DAY
  }

  private checkRateLimit(tenantId: string, subscriptionPlan?: string): { canProceed: boolean; waitTime?: number } {
    const now = Date.now()
    const rateLimit = this.getTenantRateLimit(tenantId, subscriptionPlan)
    const dailyLimit = this.getTenantDailyLimit(subscriptionPlan)
    
    // Reset counters if needed
    if (now - rateLimit.lastReset > 60000) { // 1 minute
      rateLimit.requestCount = 0
      rateLimit.lastReset = now
    }
    
    if (now - rateLimit.lastDayReset > 86400000) { // 24 hours
      rateLimit.dailyCount = 0
      rateLimit.lastDayReset = now
    }
    
    // Check if blocked
    if (rateLimit.isBlocked && rateLimit.blockUntil) {
      if (now < rateLimit.blockUntil) {
        return { canProceed: false, waitTime: rateLimit.blockUntil - now }
      } else {
        rateLimit.isBlocked = false
        rateLimit.blockUntil = undefined
      }
    }
    
    // Check limits
    if (rateLimit.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      rateLimit.isBlocked = true
      rateLimit.blockUntil = now + (60000 - (now - rateLimit.lastReset))
      return { canProceed: false, waitTime: rateLimit.blockUntil - now }
    }
    
    if (rateLimit.dailyCount >= dailyLimit) {
      rateLimit.isBlocked = true
      rateLimit.blockUntil = now + (86400000 - (now - rateLimit.lastDayReset))
      return { canProceed: false, waitTime: rateLimit.blockUntil - now }
    }
    
    return { canProceed: true }
  }
  
  private incrementRateLimit(tenantId: string): void {
    const rateLimit = this.getTenantRateLimit(tenantId)
    rateLimit.requestCount++
    rateLimit.dailyCount++
  }
  
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue) return
    
    this.isProcessingQueue = true
    
    while (this.requestQueue.length > 0) {
      // Note: For queue processing, we'd need tenant context
      // This is more complex in a per-tenant system
      const request = this.requestQueue.shift()
      if (request) {
        try {
          await request()
          // Small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error('Request queue processing error:', error)
        }
      }
    }
    
    this.isProcessingQueue = false
  }

  private initializeKnowledgeBase() {
    this.knowledgeBase = new Map([
      // Inventory Management - More conversational
      ['add inventory', 'Hey! Adding inventory is super easy! 😊 Just go to Inventory Center → hit that "Add Item" button → fill out the basics (name, price, how many you have). Pro tip: Use the barcode scanner if you have one - saves tons of time! Want me to walk you through setting up categories too?'],
      ['low stock', 'Running low on items? No worries! 📉 Check your Inventory Center and look for those red warning icons - those are your low stock alerts. You can also filter by "Low Stock" to see everything at once. Smart tip: Set custom thresholds so you never run out of your bestsellers!'],
      ['inventory reports', 'Want to see how your inventory is doing? 📊 Head to Reports → Inventory Reports. I recommend checking Stock Levels (what you have now), Movement (what\'s selling fast), and Valuation (what it\'s all worth). These reports are gold for making smart business decisions!'],

      // POS Operations - Filipino context
      ['process order', 'Processing orders is a breeze! 💨 Pick your items → add to cart → choose payment (cash, card, or GCash - very convenient!) → boom, done! CoreTrack automatically updates your inventory so you always know what you have. Perfect for busy days!'],
      ['payment methods', 'We support all the popular payment methods here in the Philippines! 💳 Cash (of course!), Credit/Debit cards, GCash, PayMongo, and bank transfers. You can turn these on/off in Settings → Payment Methods based on what works for your customers.'],
      ['gcash payment', 'GCash is super popular with Filipino customers! 📱 To accept GCash payments, just enable it in your payment settings. Customers love the convenience, and you get faster payments. Win-win!'],

      // Team Management - Filipino workplace culture
      ['add team member', 'Growing your team? Awesome! 👥 Go to Team Management → "Add Team Member" → enter their info → pick their role (Staff for basic access, Manager for more control, Owner for everything). They\'ll get their login details via email. Remember to orient them properly!'],
      ['team roles', 'Here\'s how roles work: Staff (perfect for cashiers and frontline), Manager (for supervisors who handle operations), Owner (that\'s you - full control!). You can customize permissions if needed. Good delegation makes your business run smoother!'],

      // Business Growth Tips
      ['increase sales', 'Want to boost sales? 🚀 Here are some proven tactics: 1) Track your bestsellers in Reports and promote them more, 2) Set up combo deals in POS, 3) Use low stock alerts to never miss sales, 4) Train your team on upselling. Small changes, big results!'],
      ['customer retention', 'Keeping customers coming back is cheaper than finding new ones! 💝 Try: loyalty programs, consistent quality, friendly service, and remember their preferences. CoreTrack\'s customer history helps you personalize their experience!'],

      // Getting Started - Encouraging
      ['getting started', 'Welcome to CoreTrack! You\'re going to love how much easier this makes running your business! 🎉 Start with these 4 steps: 1) Add your products/menu items, 2) Set up your team accounts, 3) Configure your payment methods, 4) Process your first order. Need help with any of these? I\'m here for you!'],
      ['support', 'Stuck on something? No problem! 🤝 You can reach our Filipino support team at support@coretrack.ph or chat with us. We understand local business needs and we\'re here to help you succeed. Your success is our success!']
    ])
  }

  private getContextualPrompt(message: string, context: ChatContext, realData?: string): string {
    const { userRole, businessType, currentPage } = context

    // Get conversation history for context
    const recentHistory = this.conversationHistory.slice(-3).map(h => 
      `User: ${h.user}\nAI: ${h.ai}`
    ).join('\n\n')

    let systemPrompt = `You are CoreTrack AI - I'm your dedicated business assistant for CoreTrack, an inventory and POS system designed for Filipino businesses.

I'm here to help you succeed with professional guidance and insights based on your actual business data.

ABOUT ME:
- I understand the unique challenges of Filipino businesses across all industries
- I provide clear, professional guidance without unnecessary casualness
- I give specific, actionable advice based on your real business data
- I maintain a helpful yet professional tone at all times

YOUR BUSINESS CONTEXT:
- Role: ${userRole === 'owner' ? 'Business Owner' : userRole === 'manager' ? 'Manager' : 'Team Member'}
- Business Type: ${businessType === 'restaurant' ? 'Restaurant/Food Service' : businessType === 'retail' ? 'Retail Store' : 'Business'}
- Current Location: ${currentPage || 'CoreTrack Dashboard'}

MY CAPABILITIES:
🏪 Inventory Management - Item tracking, stock levels, supplier management, preventing stockouts
📱 POS Operations - Order processing, payment handling (cash, card, GCash), customer management  
👥 Team Management - Staff coordination, role assignments, performance tracking
� Financial Analytics - Revenue analysis, expense tracking, profit/loss insights
� Business Intelligence - Data-driven insights, growth recommendations, market analysis
� System Support - Feature guidance, troubleshooting, workflow optimization

MY PROFESSIONAL APPROACH:
- I provide clear, step-by-step guidance when needed
- I give context-aware recommendations based on your actual data
- I share relevant insights for the Filipino business environment
- I maintain a professional but approachable communication style
- I remember our conversation context for better assistance
- I focus on actionable solutions that drive business results

RECENT CONVERSATION:
${recentHistory}

${realData ? `CURRENT BUSINESS DATA:\n${realData}\n\n` : ''}CURRENT QUESTION: "${message}"

I'm ready to provide you with professional guidance and actionable insights. How can I assist you today?`

    return systemPrompt
  }

  private async callGeminiAPI(prompt: string, tenantId: string, subscriptionPlan?: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Check rate limit before making request
    const rateLimitCheck = this.checkRateLimit(tenantId, subscriptionPlan)
    if (!rateLimitCheck.canProceed) {
      const waitTimeSeconds = rateLimitCheck.waitTime ? Math.ceil(rateLimitCheck.waitTime / 1000) : 60
      throw new Error(`Rate limit exceeded. Please wait ${waitTimeSeconds} seconds before trying again.`)
    }

    const rateLimit = this.getTenantRateLimit(tenantId)
    
    // Try primary model first, fallback to secondary if overloaded
    const modelsToTry = [this.primaryModel, this.fallbackModel]
    
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelUrl = modelsToTry[i]
      const modelName = modelUrl.includes('flash') ? 'Flash' : 'Pro'
      
      try {
        console.log(`🔑 Trying Gemini ${modelName} model for tenant ${tenantId}... (Rate limit: ${rateLimit.requestCount}/${this.MAX_REQUESTS_PER_MINUTE})`)
        console.log('🌐 API URL:', modelUrl)
        
        const response = await fetch(`${modelUrl}?key=${this.geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 800  // Reduced to save quota
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        })

        console.log(`📡 ${modelName} API Response Status:`, response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ ${modelName} API Error Response:`, errorText)
          
          // Handle rate limit errors specifically
          if (response.status === 429) {
            rateLimit.isBlocked = true
            rateLimit.blockUntil = Date.now() + 300000 // Block for 5 minutes
            throw new Error(`API quota exceeded. Please wait 5 minutes before trying again.`)
          }
          
          // If this is a 503 (overloaded) and we have more models to try, continue to next
          if (response.status === 503 && i < modelsToTry.length - 1) {
            console.log(`⏭️ ${modelName} model overloaded, trying next model...`)
            continue
          }
          
          throw new Error(`Gemini ${modelName} API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          console.log(`✅ Successfully got response from ${modelName} model for tenant ${tenantId}`)
          this.incrementRateLimit(tenantId) // Only increment on successful response
          return data.candidates[0].content.parts[0].text
        }
        
        throw new Error(`Invalid response from Gemini ${modelName} API`)
        
      } catch (error: any) {
        console.error(`${modelName} API call failed:`, error)
        
        // Handle quota/rate limit errors
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          rateLimit.isBlocked = true
          rateLimit.blockUntil = Date.now() + 300000 // Block for 5 minutes
          throw error
        }
        
        // If this is the last model and we still have errors, throw
        if (i === modelsToTry.length - 1) {
          throw error
        }
        
        // If 503 error, try next model
        if (error.message?.includes('503') || error.message?.includes('overloaded')) {
          console.log(`⏭️ ${modelName} model overloaded, trying next model...`)
          continue
        }
        
        // For other errors, throw immediately
        throw error
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('All Gemini models failed')
  }

  private findKnowledgeBaseMatch(message: string): string | null {
    const lowerMessage = message.toLowerCase()
    
    for (const [key, response] of Array.from(this.knowledgeBase.entries())) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return response
      }
    }
    
    return null
  }

  async sendMessage(message: string, context: ChatContext): Promise<string> {
    try {
      // Initialize data service for real CoreTrack data
      const dataService = new AIDataService(context)
      
      // Get relevant business data based on user's question
      const contextualData = await dataService.getContextualData(message)
      
      // First, check knowledge base for quick responses
      const quickResponse = this.findKnowledgeBaseMatch(message)
      if (quickResponse && Math.random() > 0.5) { // 50% chance to use quick response to save API quota
        // Enhance quick response with real data if available
        if (contextualData) {
          return `${contextualData}\n\n---\n\n${quickResponse}`
        }
        return quickResponse
      }

      // Check if API key is configured
      if (!this.geminiApiKey || this.geminiApiKey === 'your_gemini_api_key_here') {
        console.log('🔑 No Gemini API key configured, using knowledge base fallback with real data')
        
        // Enhanced fallback with real data
        const fallbackResponse = this.findKnowledgeBaseMatch(message)
        if (fallbackResponse) {
          if (contextualData) {
            return `${contextualData}\n\n---\n\n${fallbackResponse}`
          }
          return fallbackResponse
        }

        // Smart fallback based on message content with real data
        if (message.toLowerCase().includes('inventory')) {
          const inventoryData = await dataService.getInventorySummary()
          return `${inventoryData}\n\n---\n\n📦 **Inventory Help**\n\nTo manage inventory in CoreTrack:\n\n1. **Add Items**: Go to Inventory Center → Click "Add Item"\n2. **Track Stock**: View current stock levels and get low-stock alerts\n3. **Reports**: Generate inventory reports for insights\n\n💡 *Need more help? Contact support@coretrack.ph*`
        }
        
        if (message.toLowerCase().includes('pos') || message.toLowerCase().includes('order') || message.toLowerCase().includes('sales')) {
          const salesData = await dataService.getSalesSummary()
          return `${salesData}\n\n---\n\n💳 **POS & Orders Help**\n\n1. **Process Orders**: Select items → Add to cart → Choose payment\n2. **Payment Methods**: Cash, Card, GCash supported\n3. **Refunds**: Go to Transaction History → Select order → Refund\n\n✨ *The system automatically updates inventory after each sale!*`
        }
        
        if (message.toLowerCase().includes('financial') || message.toLowerCase().includes('expenses') || message.toLowerCase().includes('profit') || message.toLowerCase().includes('money')) {
          const financialData = await dataService.getFinancialSummary()
          return `${financialData}\n\n---\n\n💰 **Financial Management Help**\n\n1. **Track Expenses**: Go to Expenses → Add New Expense\n2. **View Reports**: Check Financial Reports for profit/loss analysis\n3. **Budget Planning**: Set expense categories and monthly budgets\n4. **Cash Flow**: Monitor revenue vs expenses trends\n\n📈 *Keep track of your finances to ensure sustainable growth*`
        }
        
        if (message.toLowerCase().includes('team')) {
          const teamData = await dataService.getTeamSummary()
          return `${teamData}\n\n---\n\n👥 **Team Management Help**\n\n1. **Add Members**: Team Management → Add Team Member\n2. **Roles**: Staff (basic), Manager (full access), Owner (complete)\n3. **Permissions**: Customize access levels per role\n\n🔐 *New members receive login credentials via email*`
        }
        
        if (message.toLowerCase().includes('overview') || message.toLowerCase().includes('summary')) {
          return await dataService.getBusinessOverview()
        }
        
        return `👋 **Welcome to CoreTrack!**\n\nI'm here to help! Try asking about:\n\n📦 **Inventory**: "How to add inventory items?"\n💳 **Orders**: "How to process payments?"\n👥 **Team**: "How to add team members?"\n📊 **Reports**: "How to generate reports?"\n\n💡 *For full AI responses, add your Gemini API key to .env.local*`
      }

      // Check rate limit before making AI request
      const tenantId = context.tenantId || 'default'
      const subscriptionPlan = context.subscriptionPlan || 'basic'
      const rateLimitCheck = this.checkRateLimit(tenantId, subscriptionPlan)
      if (!rateLimitCheck.canProceed) {
        const waitTimeSeconds = rateLimitCheck.waitTime ? Math.ceil(rateLimitCheck.waitTime / 1000) : 60
        
        // Use enhanced fallback with real data when rate limited
        console.log(`🚫 Rate limited for tenant ${tenantId}, using enhanced fallback response`)
        
        const fallbackResponse = this.findKnowledgeBaseMatch(message)
        if (fallbackResponse) {
          if (contextualData) {
            return `${contextualData}\n\n---\n\n${fallbackResponse}\n\n⏱️ *AI responses temporarily limited. Full AI will be available in ${waitTimeSeconds} seconds.*`
          }
          return `${fallbackResponse}\n\n⏱️ *AI responses temporarily limited. Please wait ${waitTimeSeconds} seconds for full AI assistance.*`
        }
        
        // Smart contextual fallback when rate limited
        if (contextualData) {
          return `${contextualData}\n\n---\n\n⏱️ **AI Temporarily Limited**\n\nI've provided your latest business data above. Full AI responses will be available in ${waitTimeSeconds} seconds.\n\nFor immediate help:\n📞 Contact support@coretrack.ph\n📖 Check our help documentation`
        }
        
        return `⏱️ **AI Response Limit Reached**\n\nTo ensure quality service, AI responses are temporarily limited. Please wait ${waitTimeSeconds} seconds.\n\nIn the meantime:\n📦 Use the search function for inventory\n💳 Check the POS system for orders\n📊 View reports for analytics\n📞 Contact support@coretrack.ph for urgent help`
      }

      // Create enhanced prompt with real data
      const enhancedPrompt = this.getContextualPrompt(message, context, contextualData)
      const response = await this.callGeminiAPI(enhancedPrompt, tenantId, subscriptionPlan)

      // Store conversation for learning (in production, save to database)
      this.conversationHistory.push({
        user: message,
        ai: response
      })

      // Keep only recent conversations in memory
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10)
      }

      return response
    } catch (error: any) {
      console.error('Chat service error:', error)
      
      // Handle rate limiting errors gracefully
      if (error.message?.includes('Rate limit') || error.message?.includes('quota')) {
        const contextualData = await new AIDataService(context).getContextualData(message)
        const fallbackResponse = this.findKnowledgeBaseMatch(message)
        
        if (fallbackResponse) {
          if (contextualData) {
            return `${contextualData}\n\n---\n\n${fallbackResponse}\n\n⏱️ *${error.message}*`
          }
          return `${fallbackResponse}\n\n⏱️ *${error.message}*`
        }
        
        if (contextualData) {
          return `${contextualData}\n\n---\n\n⏱️ **${error.message}**\n\nI've provided your latest business data above. Please try again in a few minutes for full AI assistance.`
        }
        
        return `⏱️ **${error.message}**\n\nDon't worry! You can still:\n📦 Manage inventory in the Inventory Center\n💳 Process orders in the POS system\n📊 Check reports and analytics\n📞 Contact support@coretrack.ph for immediate help`
      }
      
      // Fallback to knowledge base for other errors
      const fallbackResponse = this.findKnowledgeBaseMatch(message)
      if (fallbackResponse) {
        return fallbackResponse
      }

      // Ultimate fallback
      return "I'm having trouble connecting right now, but I'm here to help! 😊 Try asking about inventory management, POS operations, or team setup. You can also check our help documentation or contact support@coretrack.ph for immediate assistance."
    }
  }

  // Enterprise features for learning and analytics
  async logInteraction(message: string, response: string, context: ChatContext) {
    // In production, log to analytics service
    console.log('Chat interaction logged:', {
      message,
      response,
      context,
      timestamp: new Date().toISOString()
    })
  }

  async getBusinessInsights(tenantId: string): Promise<string[]> {
    // In production, analyze chat patterns for business insights
    return [
      "Your team frequently asks about inventory - consider providing training materials",
      "POS questions spike during lunch hours - ensure staff are prepared",
      "Refund questions suggest reviewing return policy with customers"
    ]
  }
  
  // Rate limit status methods for monitoring - Per Tenant with automatic tracking
  getRateLimitStatus(tenantId: string): {
    requestsThisMinute: number
    requestsToday: number
    maxPerMinute: number
    maxPerDay: number
    isBlocked: boolean
    nextResetIn?: number
    lastActivity: string
    tenantAge: string
  } {
    const now = Date.now()
    const rateLimit = this.getTenantRateLimit(tenantId)
    const nextMinuteReset = 60000 - (now - rateLimit.lastReset)
    const nextDayReset = 86400000 - (now - rateLimit.lastDayReset)
    
    const lastActivity = Math.max(rateLimit.lastReset, rateLimit.lastDayReset)
    const tenantAge = now - Math.min(rateLimit.lastReset, rateLimit.lastDayReset)
    
    return {
      requestsThisMinute: rateLimit.requestCount,
      requestsToday: rateLimit.dailyCount,
      maxPerMinute: this.MAX_REQUESTS_PER_MINUTE,
      maxPerDay: this.MAX_REQUESTS_PER_DAY,
      isBlocked: rateLimit.isBlocked,
      nextResetIn: Math.min(nextMinuteReset, nextDayReset),
      lastActivity: new Date(lastActivity).toISOString(),
      tenantAge: this.formatDuration(tenantAge)
    }
  }
  
  // Get overview of all tenant rate limits
  getAllTenantsStatus(): {
    totalTenants: number
    activeTenants: number
    blockedTenants: number
    totalRequestsToday: number
    oldestTenant: string
  } {
    const tenantIds = Object.keys(this.tenantRateLimits)
    const now = Date.now()
    let activeTenants = 0
    let blockedTenants = 0
    let totalRequestsToday = 0
    let oldestActivity = now
    
    tenantIds.forEach(tenantId => {
      const rateLimit = this.tenantRateLimits[tenantId]
      const lastActivity = Math.max(rateLimit.lastReset, rateLimit.lastDayReset)
      
      // Count active tenants (activity within last 24 hours)
      if (now - lastActivity < 86400000) {
        activeTenants++
      }
      
      if (rateLimit.isBlocked) {
        blockedTenants++
      }
      
      totalRequestsToday += rateLimit.dailyCount
      
      if (lastActivity < oldestActivity) {
        oldestActivity = lastActivity
      }
    })
    
    return {
      totalTenants: tenantIds.length,
      activeTenants,
      blockedTenants,
      totalRequestsToday,
      oldestTenant: tenantIds.length > 0 ? new Date(oldestActivity).toISOString() : 'None'
    }
  }
  
  // Helper method to format duration
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
  
  // Emergency reset for specific tenant (for development/testing only)
  resetRateLimit(tenantId: string): void {
    this.tenantRateLimits[tenantId] = {
      requestCount: 0,
      lastReset: Date.now(),
      dailyCount: 0,
      lastDayReset: Date.now(),
      isBlocked: false
    }
    console.log(`🔄 Rate limit manually reset for tenant ${tenantId}`)
  }
  
  // Reset all rate limits (emergency use only)
  resetAllRateLimits(): void {
    this.tenantRateLimits = {}
    console.log('🔄 All rate limits manually reset')
  }
}

export const chatService = new ChatService()
