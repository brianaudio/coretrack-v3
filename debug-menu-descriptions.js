// Debug script to check menu items
import { getMenuItems } from '../src/lib/firebase/menuBuilder'

const checkMenuItems = async () => {
  try {
    console.log('🔍 Checking menu items...')
    
    // Use your tenant ID from the logs
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'
    const locationId = 'location_BLbvD7gDm0xGTW5E7dXA'
    
    const items = await getMenuItems(tenantId, locationId)
    
    console.log('📊 Menu Items Analysis:')
    console.log(`Total items: ${items.length}`)
    
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`)
      console.log(`   Description: "${item.description || 'NO DESCRIPTION'}"`)
      console.log(`   Has description: ${!!item.description}`)
      console.log(`   Length: ${item.description?.length || 0}`)
      console.log('---')
    })
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkMenuItems()
