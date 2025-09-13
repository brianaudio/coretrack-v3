'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { chatService } from '@/lib/ai/chatService'
import VoiceInput from './VoiceInput'

// Enhanced message bubble with reactions and feedback
const MessageBubble = ({ message, onReaction }: { message: any, onReaction?: (messageId: string, reaction: 'helpful' | 'not_helpful') => void }) => (
  <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl backdrop-blur-sm transition-all duration-200 ${
      message.sender === 'user' 
        ? 'bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white shadow-lg border border-white/20' 
        : 'bg-white/80 text-gray-900 shadow-md border border-gray-200/50'
    }`}>
      {message.isTyping ? (
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      ) : (
        <>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
          
          {/* AI Message Reactions */}
          {message.sender === 'ai' && !message.isTyping && onReaction && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/30">
              <div className="flex space-x-2">
                <button
                  onClick={() => onReaction(message.id, 'helpful')}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
                  title="Mark as helpful"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  <span>Helpful</span>
                </button>
                <button
                  onClick={() => onReaction(message.id, 'not_helpful')}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                  title="Mark as not helpful"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                  <span>Not helpful</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {/* Message timestamp */}
      <div className={`text-xs mt-1 opacity-70 ${
        message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
      }`}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
)

const QuickActions = ({ onActionClick, userRole = 'staff' }: { onActionClick: (action: string) => void, userRole?: string }) => (
  <div className="border-t border-white/10 p-4 bg-gradient-to-r from-gray-50/50 to-white/30 backdrop-blur-sm">
    <h4 className="text-xs font-medium text-gray-600 mb-3 flex items-center">
      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
      Quick Help
    </h4>
    <div className="grid grid-cols-1 gap-2">
      <button 
        onClick={() => onActionClick('How do I add inventory items?')}
        className="px-3 py-2 bg-gradient-to-r from-blue-50/80 to-blue-100/60 text-blue-700 text-xs rounded-xl hover:from-blue-100/90 hover:to-blue-200/70 transition-all duration-200 text-left backdrop-blur-sm border border-blue-200/30 shadow-sm"
      >
        📦 Add Inventory Items
      </button>
      <button 
        onClick={() => onActionClick('How to process POS orders?')}
        className="px-3 py-2 bg-gradient-to-r from-green-50/80 to-green-100/60 text-green-700 text-xs rounded-xl hover:from-green-100/90 hover:to-green-200/70 transition-all duration-200 text-left backdrop-blur-sm border border-green-200/30 shadow-sm"
      >
        🛒 Process POS Orders
      </button>
      <button 
        onClick={() => onActionClick('Show me today\'s sales analytics')}
        className="px-3 py-2 bg-gradient-to-r from-purple-50/80 to-purple-100/60 text-purple-700 text-xs rounded-xl hover:from-purple-100/90 hover:to-purple-200/70 transition-all duration-200 text-left backdrop-blur-sm border border-purple-200/30 shadow-sm"
      >
        📊 Sales Analytics
      </button>
      <button 
        onClick={() => onActionClick('How to manage team members?')}
        className="px-3 py-2 bg-gradient-to-r from-orange-50/80 to-orange-100/60 text-orange-700 text-xs rounded-xl hover:from-orange-100/90 hover:to-orange-200/70 transition-all duration-200 text-left backdrop-blur-sm border border-orange-200/30 shadow-sm"
      >
        👥 Team Management
      </button>
    </div>
  </div>
)

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
}

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onNewMessage: () => void
  userContext?: {
    userRole: string
    businessType: string
    tenantId: string
    userName: string
  }
}

export default function ChatPanel({ isOpen, onClose, onNewMessage, userContext }: ChatPanelProps) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      
      // Add welcome message if first time opening
      if (messages.length === 0) {
        addWelcomeMessage()
      }
    }
  }, [isOpen])

  const addWelcomeMessage = () => {
    const currentPath = window.location.pathname;
    let contextualWelcome = '';
    
    // Context-aware welcome messages
    if (currentPath.includes('/inventory')) {
      contextualWelcome = `I see you're in the Inventory section! 📦\n\nI can help you with:\n• Adding new inventory items\n• Managing stock levels\n• Setting up reorder points\n• Understanding inventory analytics\n• Bulk import/export\n\nWhat would you like to know about inventory management?`;
    } else if (currentPath.includes('/pos')) {
      contextualWelcome = `Welcome to the POS system! �\n\nI can guide you through:\n• Processing customer orders\n• Managing payment methods\n• Handling refunds and returns\n• Customizing your menu\n• Understanding sales reports\n\nHow can I help with your POS operations?`;
    } else if (currentPath.includes('/analytics') || currentPath.includes('/capital-intelligence')) {
      contextualWelcome = `Great! You're exploring Analytics! 📊\n\nI can explain:\n• Capital Intelligence insights\n• Sales performance metrics\n• Inventory turnover analysis\n• Financial KPIs\n• Trend forecasting\n\nWhat analytics would you like me to explain?`;
    } else if (currentPath.includes('/settings')) {
      contextualWelcome = `You're in Settings! ⚙️\n\nI can help with:\n• Team member management\n• Business configuration\n• Billing and subscriptions\n• Security settings\n• System preferences\n\nWhat settings need assistance?`;
    } else {
      contextualWelcome = `Welcome to CoreTrack! 🚀\n\nI'm your AI business assistant, ready to help with:\n\n📦 **Inventory Management**\n• Stock tracking & reorder alerts\n• Supplier management\n\n🛒 **Point of Sale**\n• Order processing & payments\n• Menu customization\n\n📊 **Analytics & Intelligence**\n• Sales performance insights\n• Business KPIs & trends\n\n👥 **Team & Operations**\n• Staff management\n• Business settings\n\nWhat would you like to explore first, ${userContext?.userName || 'there'}?`;
    }

    const welcomeMessage: Message = {
      id: `welcome-${Date.now()}`,
      content: contextualWelcome,
      sender: 'ai',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    // Add user message and clear input
    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Show typing indicator
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      // Get current page context for better responses
      const currentPage = window.location.pathname
      const context = {
        userRole: userContext?.userRole || profile?.role || 'staff',
        businessType: userContext?.businessType || 'general',
        currentPage,
        tenantId: userContext?.tenantId || profile?.tenantId || ''
      }

      // Call AI service
      const aiResponse = await chatService.sendMessage(currentInput, context)
      
      // Remove typing indicator and add AI response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping)
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        }
        return [...withoutTyping, aiMessage]
      })

      onNewMessage()
    } catch (error) {
      console.error('AI Chat Error:', error)
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping)
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 😊",
          sender: 'ai',
          timestamp: new Date()
        }
        return [...withoutTyping, errorMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (action: string) => {
    setInputValue(action)
    setTimeout(() => handleSendMessage(), 100)
  }

  const handleVoiceInput = (text: string) => {
    setInputValue(text)
    // Auto-send voice input after a short delay
    setTimeout(() => handleSendMessage(), 500)
  }

  const handleMessageReaction = (messageId: string, reaction: 'helpful' | 'not_helpful') => {
    // Log feedback for AI improvement
    console.log(`Message ${messageId} marked as ${reaction}`)
    
    // Could send feedback to analytics service
    // analytics.track('ai_message_feedback', { messageId, reaction, userContext })
    
    // Update message to show feedback was received
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, userFeedback: reaction }
        : msg
    ))
  }

  const exportConversation = () => {
    const conversationData = {
      timestamp: new Date().toISOString(),
      user: userContext?.userName || 'User',
      tenantId: userContext?.tenantId || '',
      messages: messages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
        feedback: (msg as any).userFeedback || null
      }))
    }
    
    const dataStr = JSON.stringify(conversationData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `coretrack-ai-chat-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const clearConversation = () => {
    setMessages([])
    addWelcomeMessage()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px]">
      {/* Mobile backdrop */}
      <div 
        className="md:hidden absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat Panel with Enhanced Glassmorphism */}
      <div className="absolute inset-x-4 bottom-4 top-4 md:inset-0 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 flex flex-col overflow-hidden">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 backdrop-blur-xl px-6 py-4 text-white border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  {/* Enhanced CoreTrack Logo */}
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                  <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                    <path d="M12 1v6M12 17v6"/>
                    <path d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24"/>
                    <path d="M1 12h6M17 12h6"/>
                    <path d="M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                  </g>
                  <g fill="currentColor">
                    <circle cx="12" cy="3" r="1"/>
                    <circle cx="12" cy="21" r="1"/>
                    <circle cx="21" cy="12" r="1"/>
                    <circle cx="3" cy="12" r="1"/>
                  </g>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">CoreTrack AI</h3>
                <p className="text-white/80 text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Online & Ready
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Chat Menu Options */}
              {messages.length > 1 && (
                <>
                  <button
                    onClick={exportConversation}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    title="Export conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={clearConversation}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    title="Start new conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area with Enhanced Background */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-gray-50/80 to-white/60 backdrop-blur-sm">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onReaction={handleMessageReaction}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <QuickActions onActionClick={handleQuickAction} userRole={userContext?.userRole || profile?.role || 'staff'} />
        )}

        {/* Enhanced Input Area */}
        <div className="border-t border-white/20 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl p-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about CoreTrack..."
                className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm placeholder-gray-500 shadow-sm"
                disabled={isLoading}
              />
              {/* Voice Input Button */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <VoiceInput
                  onVoiceInput={handleVoiceInput}
                  isListening={isLoading}
                  className="ml-1"
                />
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[48px] shadow-lg hover:shadow-blue-500/25 backdrop-blur-sm border border-white/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          {/* AI Status Footer */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>AI is ready to help</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Powered by Gemini Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
