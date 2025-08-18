'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { chatService } from '@/lib/ai/chatService'

// Temporary inline components to avoid import issues
const MessageBubble = ({ message }: { message: any }) => (
  <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-lg ${
      message.sender === 'user' 
        ? 'bg-primary-500 text-white' 
        : 'bg-gray-100 text-gray-900'
    }`}>
      <div className="text-sm">{message.content}</div>
    </div>
  </div>
)

const QuickActions = ({ onActionClick, userRole = 'staff' }: { onActionClick: (action: string) => void, userRole?: string }) => (
  <div className="border-t border-gray-200 p-4">
    <h4 className="text-xs font-medium text-gray-500 mb-2">Quick Help</h4>
    <div className="flex flex-wrap gap-2">
      <button 
        onClick={() => onActionClick('How do I add inventory items?')}
        className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full hover:bg-blue-100"
      >
        Add Inventory
      </button>
      <button 
        onClick={() => onActionClick('How to process orders?')}
        className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full hover:bg-green-100"
      >
        Process Orders
      </button>
      <button 
        onClick={() => onActionClick('How to manage team members?')}
        className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full hover:bg-purple-100"
      >
        Team Management
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
    const welcomeMessage: Message = {
      id: `welcome-${Date.now()}`,
      content: `Hi there! 👋 I'm your CoreTrack AI assistant!\n\nI'm here to help you with:\n• Understanding features\n• Managing inventory\n• Processing orders\n• Team management\n• Business insights\n\nWhat would you like to know about your ${userContext?.businessType || 'business'}?`,
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px]">
      {/* Mobile backdrop */}
      <div 
        className="md:hidden absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Chat Panel */}
      <div className="absolute inset-x-4 bottom-4 top-4 md:inset-0 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  {/* CoreTrack Logo */}
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
                <p className="text-primary-100 text-sm">Your business assistant</p>
              </div>
            </div>
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <QuickActions onActionClick={handleQuickAction} userRole={userContext?.userRole || profile?.role || 'staff'} />
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about CoreTrack..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[48px]"
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
        </div>
      </div>
    </div>
  )
}
