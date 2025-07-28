# 🐛 CoreTrack Debugging Guide

## 🎯 Quick Reference for Debugging

### **When Something Goes Wrong**

1. **DON'T PANIC** - Every developer faces bugs daily
2. **Read the error message** - It usually tells you exactly what's wrong
3. **Check the browser console** - Press F12 and look at the Console tab
4. **Use our debugging tools** - We've built helpers to make this easier

---

## 🔧 **The 5-Step Debugging Process**

### **Step 1: Identify the Problem**
```
❌ "The app is broken"
✅ "Users can't login - getting 'Invalid credentials' error"
```

**Questions to ask:**
- What exactly isn't working?
- When did it start failing?
- What was the last change made?
- Can you reproduce it?

### **Step 2: Find the Error Location**
```typescript
// Look for error messages in:
1. Browser Console (F12 → Console)
2. Terminal/Command line output
3. Network tab (for API errors)
4. Application crashes/error boundaries
```

### **Step 3: Add Debug Logging**
```typescript
import { debugTrace, debugStep, debugError } from '../lib/utils/debugHelper'

const problemFunction = async (data) => {
  // Add this at the start of any function
  debugTrace('problemFunction', { inputData: data }, { 
    component: 'YourComponent' 
  })
  
  // Log important steps
  debugStep('Processing user data', { userId: data.id }, { 
    component: 'YourComponent' 
  })
  
  // Log when things go wrong
  if (!data.id) {
    debugError('Missing user ID', { data }, { 
      component: 'YourComponent' 
    })
  }
}
```

### **Step 4: Test Your Fix**
```typescript
// Before fixing:
const result = data.user.name // ❌ Crashes if data.user is undefined

// After fixing:
const result = data?.user?.name || 'Unknown' // ✅ Safe
```

### **Step 5: Clean Up**
- Remove debugging code that you don't need
- Keep useful logging for future debugging
- Document what you learned

---

## 🚨 **Common Errors & Solutions**

### **"Cannot read property 'X' of undefined"**
```typescript
❌ Problem:
const name = user.profile.name

✅ Solution:
const name = user?.profile?.name || 'Default'
// OR
if (user && user.profile) {
  const name = user.profile.name
}
```

### **"Cannot read property 'map' of undefined"**
```typescript
❌ Problem:
const items = data.items.map(item => item.name)

✅ Solution:
const items = (data.items || []).map(item => item.name)
// OR
const items = Array.isArray(data.items) ? data.items.map(item => item.name) : []
```

### **"Network Error" / "Failed to fetch"**
```typescript
// Check in Browser Dev Tools → Network tab:
1. Is the request being made?
2. What's the response status? (200=OK, 404=Not Found, 500=Server Error)
3. Check the request/response data

// Add error handling:
try {
  const response = await fetch('/api/data')
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const data = await response.json()
} catch (error) {
  debugError('API request failed', { error, url: '/api/data' })
}
```

### **"Maximum update depth exceeded"**
```typescript
❌ Problem (infinite loop):
const [count, setCount] = useState(0)
useEffect(() => {
  setCount(count + 1) // This runs every render!
})

✅ Solution:
useEffect(() => {
  setCount(prev => prev + 1)
}, []) // Add dependency array to run only once
```

---

## 🛠️ **Debugging Tools Cheat Sheet**

### **Browser Developer Tools**
```
F12 (or right-click → Inspect)
- Console: See JavaScript errors and our debug logs
- Network: Check API calls and responses
- Sources: Set breakpoints in code
- Application: Check localStorage, cookies, etc.
```

### **Our Custom Debug Helper**
```typescript
import { debugTrace, debugStep, debugError, debugTimer } from '../lib/utils/debugHelper'

// Trace function calls
debugTrace('functionName', { param1, param2 }, { component: 'ComponentName' })

// Log process steps
debugStep('Validating data', { isValid: true }, { component: 'ComponentName' })

// Log errors with context
debugError(error, { additionalContext }, { component: 'ComponentName' })

// Measure performance
const stopTimer = debugTimer('Database Query')
// ... do work ...
stopTimer()
```

### **Console Methods**
```typescript
console.log('Basic info')           // 📋 General information
console.error('Something failed')   // ❌ Errors
console.warn('Be careful')          // ⚠️ Warnings
console.table(arrayData)            // 📊 Data in table format
console.time('operation')           // ⏱️ Start timer
console.timeEnd('operation')        // ⏱️ End timer
debugger                           // 🛑 Pause execution here
```

---

## 📋 **Debugging Checklist**

### **Before You Start**
- [ ] Can you reproduce the error?
- [ ] Do you have the exact error message?
- [ ] Do you know which component/function is failing?

### **While Debugging**
- [ ] Added console.log or debug statements
- [ ] Checked browser console for errors
- [ ] Verified data types and values
- [ ] Tested edge cases (empty data, null values)

### **After Fixing**
- [ ] Tested the fix works
- [ ] Checked that you didn't break anything else
- [ ] Removed unnecessary debug code
- [ ] Added comments explaining the fix

---

## 🎯 **Real-World Example**

Let's debug a common CoreTrack issue:

```typescript
// ❌ Original problematic code
const InventoryComponent = () => {
  const [items, setItems] = useState([])
  
  useEffect(() => {
    loadInventory()
  }, [])
  
  const loadInventory = async () => {
    const data = await getInventoryItems()
    setItems(data.items)
  }
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

**Problem:** App crashes with "Cannot read property 'map' of undefined"

```typescript
// ✅ Debugged and fixed code
import { debugTrace, debugStep, debugError } from '../lib/utils/debugHelper'

const InventoryComponent = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    loadInventory()
  }, [])
  
  const loadInventory = async () => {
    debugTrace('loadInventory', {}, { component: 'InventoryComponent' })
    
    try {
      setLoading(true)
      debugStep('Fetching inventory data', {}, { component: 'InventoryComponent' })
      
      const data = await getInventoryItems()
      
      debugStep('Processing inventory response', { 
        hasData: !!data,
        hasItems: !!data?.items,
        itemCount: data?.items?.length || 0
      }, { component: 'InventoryComponent' })
      
      // ✅ Safe access with fallback
      const inventoryItems = data?.items || []
      setItems(inventoryItems)
      
    } catch (err) {
      debugError(err, { operation: 'loading inventory' }, { 
        component: 'InventoryComponent' 
      })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // ✅ Handle different states
  if (loading) return <div>Loading inventory...</div>
  if (error) return <div>Error: {error}</div>
  if (!items.length) return <div>No inventory items found</div>
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

**What we fixed:**
1. ✅ Added safe array access with fallback
2. ✅ Added loading and error states
3. ✅ Added comprehensive debugging
4. ✅ Added proper error handling
5. ✅ Added null checks before rendering

---

## 💡 **Pro Tips**

1. **Start Small**: Debug one thing at a time
2. **Be Systematic**: Follow the same process every time
3. **Read Error Messages**: They usually tell you exactly what's wrong
4. **Use TypeScript**: It catches many errors before they happen
5. **Test Edge Cases**: What happens with empty data? Null values? 
6. **Don't Guess**: Use logging to see what's actually happening
7. **Take Breaks**: If you're stuck, walk away for 5 minutes

---

## 🎓 **Practice Exercises**

Visit `/debug-techniques` in your browser to practice these debugging techniques with interactive examples!

Remember: **Every expert was once a beginner.** Debugging is a skill that improves with practice. Be patient with yourself and celebrate small victories! 🎉
