'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { X, Copy, RotateCcw, Calculator as CalculatorIcon, Check } from 'lucide-react'

interface CalculatorState {
  display: string
  previousValue: number | null
  operation: string | null
  waitingForNewValue: boolean
}

const FloatingCalculator = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false) // Track if user actually dragged
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [copied, setCopied] = useState(false)
  const calculatorRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<CalculatorState>({
    display: '0',
    previousValue: null,
    operation: null,
    waitingForNewValue: false,
  })

  // Calculator functions
  const handleNumber = useCallback((num: string) => {
    setState(prev => ({
      ...prev,
      display: prev.waitingForNewValue || prev.display === '0' ? num : prev.display + num,
      waitingForNewValue: false,
    }))
  }, [])

  const handleOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(state.display)

    if (state.previousValue === null) {
      setState(prev => ({
        ...prev,
        previousValue: inputValue,
        waitingForNewValue: true,
        operation: nextOperation,
      }))
    } else if (state.operation) {
      const currentValue = state.previousValue || 0
      const newValue = calculate(currentValue, inputValue, state.operation)

      setState(prev => ({
        ...prev,
        display: String(newValue),
        previousValue: newValue,
        waitingForNewValue: true,
        operation: nextOperation,
      }))
    }
  }, [state])

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue
      case '−':
        return firstValue - secondValue
      case '×':
        return firstValue * secondValue
      case '÷':
        return firstValue / secondValue
      default:
        return secondValue
    }
  }

  const handleEquals = useCallback(() => {
    if (state.previousValue !== null && state.operation) {
      const inputValue = parseFloat(state.display)
      const newValue = calculate(state.previousValue, inputValue, state.operation)

      setState({
        display: String(newValue),
        previousValue: null,
        operation: null,
        waitingForNewValue: true,
      })
    }
  }, [state])

  const handleClear = useCallback(() => {
    setState({
      display: '0',
      previousValue: null,
      operation: null,
      waitingForNewValue: false,
    })
  }, [])

  const handleBackspace = useCallback(() => {
    setState(prev => ({
      ...prev,
      display: prev.display.length > 1 ? prev.display.slice(0, -1) : '0',
    }))
  }, [])

  const handleDecimal = useCallback(() => {
    setState(prev => ({
      ...prev,
      display: prev.display.includes('.') ? prev.display : prev.display + '.',
      waitingForNewValue: false,
    }))
  }, [])

  // Copy to clipboard functionality
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(state.display)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Touch-friendly drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      const touch = e.touches[0]
      setIsDragging(true)
      setHasDragged(false) // Reset drag flag
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setHasDragged(false) // Reset drag flag
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const maxWidth = isExpanded ? 260 : 60  // Updated for wider calculator
        const maxHeight = isExpanded ? 340 : 60  // Updated for taller calculator
        const newX = Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - maxWidth, e.clientX - dragStart.x))
        const newY = Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - maxHeight, e.clientY - dragStart.y))
        
        // Check if position actually changed to determine if user dragged
        if (newX !== position.x || newY !== position.y) {
          setHasDragged(true)
        }
        
        setPosition({
          x: newX,
          y: newY,
        })
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        const touch = e.touches[0]
        const maxWidth = isExpanded ? 260 : 60  // Updated for wider calculator
        const maxHeight = isExpanded ? 340 : 60  // Updated for taller calculator
        const newX = Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - maxWidth, touch.clientX - dragStart.x))
        const newY = Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - maxHeight, touch.clientY - dragStart.y))
        
        // Check if position actually changed to determine if user dragged
        if (newX !== position.x || newY !== position.y) {
          setHasDragged(true)
        }
        
        setPosition({
          x: newX,
          y: newY,
        })
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragStart, isExpanded])

  if (!isVisible) {
    return null
  }

  return (
    <>
      <div
        ref={calculatorRef}
        className="fixed z-50 select-none transition-all duration-300 ease-out"
        style={{
          left: position.x,
          top: position.y,
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Floating Circle or Expanded Calculator */}
        <div 
          className={`
            bg-white/95 backdrop-blur-xl shadow-2xl shadow-black/20 border border-white/20 overflow-hidden transition-all duration-300 ease-out
            ${isExpanded ? 'rounded-[24px]' : 'rounded-full w-16 h-16 cursor-pointer hover:scale-110 active:scale-95'}
          `}
          onClick={() => {
            // Only expand if user hasn't dragged the calculator
            if (!isExpanded && !hasDragged) {
              setIsExpanded(true)
            }
          }}
        >
          {!isExpanded ? (
            /* Collapsed Circle */
            <div className="drag-handle w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-move touch-manipulation">
              <CalculatorIcon className="w-7 h-7" />
            </div>
          ) : (
            /* Expanded Calculator */
            <>
              {/* Header */}
              <div className="drag-handle px-5 py-3 bg-gradient-to-b from-gray-50/80 to-transparent border-b border-gray-200/50 cursor-move touch-manipulation">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500 rounded-full shadow-lg">
                      <CalculatorIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">Calculator</span>
                  </div>
                  
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 rounded-full hover:bg-red-100 active:bg-red-200 transition-colors touch-manipulation"
                    title="Collapse"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Display */}
              <div className="px-5 py-4 bg-gradient-to-b from-gray-50/30 to-white/30">
                <div 
                  className="bg-gray-900/5 rounded-xl p-5 backdrop-blur-sm border border-gray-200/30 cursor-pointer hover:bg-gray-900/10 active:bg-gray-900/15 transition-colors touch-manipulation"
                  onClick={copyToClipboard}
                  title="Tap to copy"
                >
                  <div className="text-right">
                    <div className="text-2xl font-light text-gray-900 font-mono tracking-tight">
                      {state.display}
                    </div>
                    {state.operation && state.previousValue && (
                      <div className="text-xs text-gray-500 mt-1">
                        {state.previousValue} {state.operation}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end mt-2">
                    {copied ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Wider Button Grid */}
              <div className="px-4 py-3 bg-gradient-to-b from-white/50 to-gray-50/50">
                <div className="grid grid-cols-4 gap-3">
                  {/* Row 1 */}
                  <button
                    onClick={handleClear}
                    className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-xl h-12 text-sm font-medium text-gray-800 transition-all active:scale-95 shadow-sm touch-manipulation"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm flex items-center justify-center touch-manipulation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOperation('÷')}
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl h-12 font-medium text-white transition-all active:scale-95 shadow-sm text-lg touch-manipulation"
                  >
                    ÷
                  </button>
                  <button
                    onClick={() => handleOperation('×')}
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl h-12 font-medium text-white transition-all active:scale-95 shadow-sm text-lg touch-manipulation"
                  >
                    ×
                  </button>

                  {/* Row 2 */}
                  <button
                    onClick={() => handleNumber('7')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    7
                  </button>
                  <button
                    onClick={() => handleNumber('8')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    8
                  </button>
                  <button
                    onClick={() => handleNumber('9')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    9
                  </button>
                  <button
                    onClick={() => handleOperation('−')}
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl h-12 font-medium text-white transition-all active:scale-95 shadow-sm text-lg touch-manipulation"
                  >
                    −
                  </button>

                  {/* Row 3 */}
                  <button
                    onClick={() => handleNumber('4')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    4
                  </button>
                  <button
                    onClick={() => handleNumber('5')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    5
                  </button>
                  <button
                    onClick={() => handleNumber('6')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    6
                  </button>
                  <button
                    onClick={() => handleOperation('+')}
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl h-12 font-medium text-white transition-all active:scale-95 shadow-sm text-lg touch-manipulation"
                  >
                    +
                  </button>

                  {/* Row 4 */}
                  <button
                    onClick={() => handleNumber('1')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    1
                  </button>
                  <button
                    onClick={() => handleNumber('2')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    2
                  </button>
                  <button
                    onClick={() => handleNumber('3')}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    3
                  </button>
                  <button
                    onClick={handleEquals}
                    className="row-span-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl font-medium text-white transition-all active:scale-95 shadow-sm text-lg touch-manipulation"
                  >
                    =
                  </button>

                  {/* Row 5 */}
                  <button
                    onClick={() => handleNumber('0')}
                    className="col-span-2 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 touch-manipulation"
                  >
                    0
                  </button>
                  <button
                    onClick={handleDecimal}
                    className="bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl h-12 font-medium text-gray-800 transition-all active:scale-95 shadow-sm border border-gray-200/50 text-lg touch-manipulation"
                  >
                    .
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default FloatingCalculator
