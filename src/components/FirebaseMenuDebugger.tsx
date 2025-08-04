'use client'

import React, { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/context/AuthContext'

const FirebaseMenuDebugger: React.FC = () => {
  const { user } = useAuth()
  const [menuData, setMenuData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkMenuCollections = async () => {
    if (!user?.tenantId) {
      setError('No tenant ID available')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Checking for menu data in tenant:', user.tenantId)
      
      // Check different possible collection names and paths
      const collections = [
        // Tenant-specific collections
        `tenants/${user.tenantId}/menuItems`,
        `tenants/${user.tenantId}/menu`,
        `tenants/${user.tenantId}/menuBuilder`,
        `tenants/${user.tenantId}/menus`,
        `tenants/${user.tenantId}/items`,
        
        // Global collections with tenant filter
        `menuItems`,
        `menu`,
        `menus`,
        `items`,
        
        // Branch-specific collections
        `branches/${user.tenantId}/menuItems`,
        `branches/${user.tenantId}/menu`,
        
        // User-specific collections
        `users/${user.uid}/menuItems`,
        `users/${user.uid}/menu`,
        
        // Legacy collections
        `restaurants/${user.tenantId}/menuItems`,
        `restaurants/${user.tenantId}/menu`,
      ]

      const allData: any[] = []

      for (const collectionPath of collections) {
        try {
          console.log('🔍 Checking collection:', collectionPath)
          const collectionRef = collection(db, collectionPath)
          const snapshot = await getDocs(collectionRef)
          
          if (!snapshot.empty) {
            const docs = snapshot.docs.map(doc => ({
              id: doc.id,
              collection: collectionPath,
              data: doc.data()
            }))
            
            console.log(`📋 Found ${docs.length} items in ${collectionPath}:`, docs)
            allData.push(...docs)
          } else {
            console.log(`📭 No items found in ${collectionPath}`)
          }
        } catch (collectionError) {
          console.log(`❌ Error checking ${collectionPath}:`, collectionError)
        }
      }

      setMenuData(allData)
      
      if (allData.length === 0) {
        setError('No menu items found in any collection. Your menus might be stored in a different structure.')
      }
      
    } catch (err) {
      console.error('❌ Error checking menu data:', err)
      setError(`Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const checkLocalStorage = () => {
    console.log('🔍 Checking localStorage for menu data...')
    const localData: Array<{key: string, data: any, collection: string}> = []
    
    // Check common localStorage keys that might contain menu data
    const keysToCheck = [
      'menuItems',
      'menu',
      'coretrack_menu',
      'coretrack_menuItems',
      'menuBuilder',
      'savedMenus',
      'recipes',
      'items'
    ]

    for (const key of keysToCheck) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          localData.push({
            key,
            data: parsed,
            collection: 'localStorage'
          })
          console.log(`📋 Found localStorage data for key "${key}":`, parsed)
        } catch (e) {
          console.log(`❌ Error parsing localStorage data for key "${key}":`, e)
        }
      }
    }

    // Also check all localStorage keys for anything that might contain menu data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('menu') || key.includes('item') || key.includes('recipe'))) {
        if (!keysToCheck.includes(key)) {
          const data = localStorage.getItem(key)
          if (data) {
            try {
              const parsed = JSON.parse(data)
              localData.push({
                key,
                data: parsed,
                collection: 'localStorage'
              })
              console.log(`📋 Found additional localStorage data for key "${key}":`, parsed)
            } catch (e) {
              // Skip non-JSON data
            }
          }
        }
      }
    }

    if (localData.length > 0) {
      setMenuData(prev => [...prev, ...localData])
      console.log(`✅ Found ${localData.length} items in localStorage`)
    } else {
      console.log('📭 No menu data found in localStorage')
    }
  }

  useEffect(() => {
    if (user?.tenantId) {
      checkMenuCollections()
    }
  }, [user?.tenantId])

  if (!user) {
    return <div className="p-4 bg-yellow-100 rounded">⚠️ No user logged in</div>
  }

  return (
    <div className="p-6 bg-white border rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">🔍 Firebase Menu Debugger</h3>
      
      <div className="mb-4">
        <p><strong>Tenant ID:</strong> {user.tenantId}</p>
        <p><strong>User ID:</strong> {user.uid}</p>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={checkMenuCollections}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Firebase Collections'}
        </button>
        
        <button
          onClick={checkLocalStorage}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Check Local Storage
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      {menuData.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">📋 Found Menu Items ({menuData.length}):</h4>
          <div className="space-y-3">
            {menuData.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <strong className="text-blue-600">{item.data.name || 'Unnamed Item'}</strong>
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">{item.collection}</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <p><strong>ID:</strong> {item.id}</p>
                  <p><strong>Category:</strong> {item.data.category || 'N/A'}</p>
                  <p><strong>Price:</strong> ₱{item.data.price || 'N/A'}</p>
                  <p><strong>Description:</strong> {item.data.description || 'N/A'}</p>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500">View Full Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                    {JSON.stringify(item.data, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FirebaseMenuDebugger
