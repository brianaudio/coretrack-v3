export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CoreTrack</h1>
        <p className="text-lg text-gray-600 mb-8">Business Inventory Management System</p>
        
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Demo Login</h2>
            <p className="text-sm text-gray-600 mb-4">
              Email: demo@coretrack.dev<br />
              Password: SecureDemo123!
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Go to Login
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Features</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Inventory Management</li>
              <li>• Point of Sale (POS)</li>
              <li>• Multi-tenant Architecture</li>
              <li>• Real-time Updates</li>
              <li>• iPad Optimized</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
