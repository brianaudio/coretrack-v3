'use client'

export default function ResetPage() {
  const handleReset = () => {
    // Clear all local storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear any cached auth state
    if (typeof window !== 'undefined') {
      // Clear any Firebase cached data
      window.location.reload()
    }
  }

  const handleHardReset = () => {
    // Clear everything and redirect to root
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-8 text-red-600">🔄 System Reset</h1>
        
        <p className="text-gray-600 mb-8">
          Use this page to clear cached Firebase auth states and permissions issues.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleReset}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            🔄 Soft Reset (Clear Cache & Reload)
          </button>
          
          <button 
            onClick={handleHardReset}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
          >
            🔥 Hard Reset (Clear Everything & Go Home)
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>After reset, try the profile fixer again:</p>
          <a href="/profile-fixer" className="text-blue-600 hover:underline">
            /profile-fixer
          </a>
        </div>
      </div>
    </div>
  )
}
