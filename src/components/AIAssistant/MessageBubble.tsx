'use client'

import { FC } from 'react'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
}

interface MessageBubbleProps {
  message: Message
}

const MessageBubble: FC<MessageBubbleProps> = ({ message }) => {
  const { content, sender, timestamp, isTyping = false } = message

  if (isTyping) {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
          🤖
        </div>
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-200 max-w-xs">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-3 max-w-xs lg:max-w-sm ${sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
          sender === 'user' 
            ? 'bg-gray-500' 
            : 'bg-primary-500'
        }`}>
          {sender === 'user' ? '👤' : '🤖'}
        </div>

        {/* Message Content */}
        <div className={`rounded-2xl px-4 py-3 shadow-sm border ${
          sender === 'user'
            ? 'bg-primary-600 text-white rounded-tr-sm border-primary-600'
            : 'bg-white text-gray-900 rounded-tl-sm border-gray-200'
        }`}>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs mt-2 ${
            sender === 'user' ? 'text-primary-100' : 'text-gray-500'
          }`}>
            {timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
