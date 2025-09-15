'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useBranch } from '@/lib/context/BranchContext'
import { chatService } from '@/lib/ai/chatService'
import VoiceInput from './VoiceInput'

// File Attachment Component
const FileAttachmentDisplay = ({ attachment }: { attachment: FileAttachment }) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <div className="relative">
          <img 
            src={attachment.url} 
            alt={attachment.name}
            className="w-12 h-12 object-cover rounded-lg"
          />
        </div>
      )
    }
    
    // Document icons based on file type
    const iconClass = "w-8 h-8"
    if (type.includes('pdf')) {
      return <div className={`${iconClass} bg-red-100 text-red-600 rounded flex items-center justify-center text-xs font-bold`}>PDF</div>
    }
    if (type.includes('word') || type.includes('document')) {
      return <div className={`${iconClass} bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold`}>DOC</div>
    }
    if (type.includes('excel') || type.includes('spreadsheet')) {
      return <div className={`${iconClass} bg-green-100 text-green-600 rounded flex items-center justify-center text-xs font-bold`}>XLS</div>
    }
    if (type.includes('text')) {
      return <div className={`${iconClass} bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-bold`}>TXT</div>
    }
    
    // Default file icon
    return (
      <div className={`${iconClass} bg-gray-100 text-gray-600 rounded flex items-center justify-center`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex items-center space-x-3 p-2 bg-gray-50/80 rounded-lg border border-gray-200/50 backdrop-blur-sm">
      {getFileIcon(attachment.type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
      </div>
    </div>
  )
}

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
          {/* File Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.attachments.map((attachment: FileAttachment) => (
                <FileAttachmentDisplay key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}
          
          {/* Message Content */}
          {message.content && (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
          )}
          
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
  attachments?: FileAttachment[]
}

interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  base64?: string
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
  const { selectedBranch } = useBranch()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    
    // Context-aware welcome messages with personality
    if (currentPath.includes('/inventory')) {
      contextualWelcome = `Hey there! 👋 I see you're in the inventory section - one of my favorite places! I can help you add new items, figure out what's running low, set up those super helpful alerts, or explain your inventory reports. What's going on with your stock today?`;
    } else if (currentPath.includes('/pos')) {
      contextualWelcome = `Oooh, POS time! 💰 I love helping with sales stuff!\n\nI can totally help you with:\n• Getting those orders processed smoothly\n• Sorting out payments (all types!)\n• Handling those tricky refunds\n• Making your menu look amazing\n• Understanding what's selling best\n\nWhat's happening at the register today?`;
    } else if (currentPath.includes('/analytics') || currentPath.includes('/capital-intelligence')) {
      contextualWelcome = `Analytics! 📊 This is where the magic happens! I get SO excited about data because it tells such cool stories about your business.\n\nI can break down:\n• Those Capital Intelligence insights (they're amazing!)\n• How your sales are trending\n• Which inventory items are your superstars\n• Your financial KPIs in plain English\n• What's coming next for your business\n\nWhat numbers are you curious about?`;
    } else if (currentPath.includes('/settings')) {
      contextualWelcome = `Settings mode! ⚙️ Let's get your business running exactly how you want it!\n\nI can help you with:\n• Adding team members (building that dream team!)\n• Getting your business details just right\n• Sorting out billing stuff\n• Making sure everything's secure\n• Customizing your experience\n\nWhat would you like to set up or change?`;
    } else {
      contextualWelcome = `Hey ${userContext?.userName || 'there'}! 👋 Welcome to CoreTrack! I'm your AI business buddy and I'm genuinely excited to help you succeed!\n\n📦 **Inventory Magic**\nKeep track of everything, never run out of your bestsellers!\n\n� **POS Power**\nServe customers faster, process payments like a pro!\n\n📊 **Analytics Insights**\nTurn your data into "aha!" moments that grow your business!\n\n👥 **Team Building**\nGet your crew organized and working together smoothly!\n\nSo... what's on your mind today? What part of your business should we dive into first? ☕`;
    }

    const welcomeMessage: Message = {
      id: `welcome-${Date.now()}`,
      content: contextualWelcome,
      sender: 'ai',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      handleFiles(Array.from(files))
    }
  }

  const handleFiles = async (files: File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_TYPES = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text files
      'text/plain', 'text/csv',
      // Other common business files
      'application/json', 'application/xml'
    ]

    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
        return false
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`File type "${file.type}" is not supported.`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    const newAttachments: FileAttachment[] = []

    for (const file of validFiles) {
      try {
        const base64 = await fileToBase64(file)
        const attachment: FileAttachment = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          base64
        }
        newAttachments.push(attachment)
      } catch (error) {
        console.error('Error processing file:', error)
        alert(`Error processing file "${file.name}"`)
      }
    }

    setAttachments(prev => [...prev, ...newAttachments])
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === attachmentId)
      if (attachment?.url) {
        URL.revokeObjectURL(attachment.url)
      }
      return prev.filter(a => a.id !== attachmentId)
    })
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    }

    // Add user message and clear input
    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    const currentAttachments = [...attachments]
    setInputValue('')
    setAttachments([])
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
        tenantId: userContext?.tenantId || profile?.tenantId || '',
        branchId: selectedBranch?.id || profile?.primaryBranch || ''
      }

      console.log('🤖 AI Chat Context:', context) // Debug log to see what's being passed

      // Call Enhanced AI service for much better responses
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

        {/* Enhanced Input Area with File Upload */}
        <div 
          className={`border-t border-white/20 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-xl p-4 transition-all duration-200 ${
            isDragging ? 'bg-blue-50/80 border-blue-300/50' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 space-y-2 max-h-32 overflow-y-auto">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-2 bg-white/70 rounded-lg border border-gray-200/50">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileAttachmentDisplay attachment={attachment} />
                  </div>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="ml-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                    title="Remove file"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drag and Drop Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-50/90 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-blue-700 font-medium">Drop files here to upload</p>
                <p className="text-blue-600 text-sm">Images, PDFs, Documents supported</p>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-3 bg-white/80 hover:bg-white/90 border border-gray-200/50 rounded-2xl transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md backdrop-blur-sm"
              title="Upload files (Images, PDFs, Documents)"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={attachments.length > 0 ? "Tell me about these files! 😊" : "Hey! What's on your mind today? ☕"}
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
              disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
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

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.xml"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* AI Status Footer */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>AI is ready to help • Supports file uploads</span>
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
