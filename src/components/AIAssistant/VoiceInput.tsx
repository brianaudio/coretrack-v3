'use client'

import React, { useState, useRef, useEffect } from 'react'

interface VoiceInputProps {
  onVoiceInput: (text: string) => void
  isListening?: boolean
  className?: string
}

export default function VoiceInput({ onVoiceInput, isListening = false, className = '' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setIsSupported(true)
        recognitionRef.current = new SpeechRecognition()
        
        // Configure speech recognition
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'
        
        // Handle results
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }
          
          setTranscript(interimTranscript || finalTranscript)
          
          if (finalTranscript) {
            onVoiceInput(finalTranscript)
            setTranscript('')
            setIsRecording(false)
          }
        }
        
        // Handle errors
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
          setTranscript('')
        }
        
        // Handle end
        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onVoiceInput])

  const startRecording = () => {
    if (!isSupported || !recognitionRef.current) return
    
    try {
      setIsRecording(true)
      setTranscript('')
      recognitionRef.current.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
    setTranscript('')
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (!isSupported) {
    return null // Hide if not supported
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleRecording}
        disabled={isListening}
        className={`p-2 rounded-full transition-all duration-200 ${
          isRecording
            ? 'bg-red-500 text-white animate-pulse shadow-lg'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        <svg 
          className="w-4 h-4" 
          fill={isRecording ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
          />
        </svg>
      </button>
      
      {/* Voice transcript preview */}
      {transcript && (
        <div className="absolute bottom-full right-0 mb-2 max-w-xs">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm text-blue-800 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Listening...</span>
            </div>
            <div className="mt-1 text-xs text-blue-600 italic">
              "{transcript}"
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
