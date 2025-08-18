'use client'

interface TutorialOverlayProps {
  show: boolean
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onComplete: () => void
}

const steps = [
  { title: "Welcome to CoreTrack POS! 👋", content: "Let's take a quick tour" },
  { title: "Browse Menu Items 🍕", content: "Click items to add to cart" },
  { title: "Search & Filter 🔍", content: "Find items quickly" },
  { title: "View Your Cart 🛒", content: "Review and checkout" },
  { title: "You're Ready! 🎉", content: "Start taking orders" }
]

export default function TutorialOverlay({ show, currentStep, onNext, onPrev, onComplete }: TutorialOverlayProps) {
  if (!show) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold mb-2">{step.title}</h2>
          <p className="text-gray-600">{step.content}</p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{currentStep + 1} of {steps.length}</span>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button onClick={onPrev} className="px-4 py-2 text-gray-600">Back</button>
            )}
            <button 
              onClick={isLastStep ? onComplete : onNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              {isLastStep ? 'Start' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}