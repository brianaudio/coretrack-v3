export default function TestPage() {
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg">
        <h1 className="text-4xl font-bold text-black">🔥 TEST PAGE - ROUTING WORKS! 🔥</h1>
        <p className="text-lg text-gray-700 mt-4">
          If you see this, the routing is working and this is the main page.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Time: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}
