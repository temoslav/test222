#!/usr/bin/env node

// Timepad API test script - just test API connectivity
// Usage: node scripts/sync-timepad-test.mjs

const TIMEPAD_BASE_URL = 'https://api.timepad.ru/v1'

// Load environment variables
const TIMEPAD_API_KEY = process.env.TIMEPAD_API_KEY

if (!TIMEPAD_API_KEY) {
  console.error('❌ TIMEPAD_API_KEY is required in .env.local')
  console.log('Current .env.local variables:')
  console.log('TIMEPAD_API_KEY =', TIMEPAD_API_KEY ? 'SET' : 'MISSING')
  process.exit(1)
}

async function testTimepadAPI() {
  console.log('🚀 Testing Timepad API connectivity...')
  console.log(`📍 City: Moscow`)
  console.log(`📅 Events from: ${new Date().toISOString()}`)
  console.log(`🔑 API Key: ${TIMEPAD_API_KEY ? 'Present' : 'Missing'}`)
  console.log('')

  try {
    const params = new URLSearchParams({
      city: 'moskva',
      limit: '10',
      skip: '0',
      fields: 'id,name,description_short,starts_at,ends_at,location,poster_image,url,categories,is_registration_open',
      starts_at_min: new Date().toISOString(),
    })

    console.log(`📡 Request: ${TIMEPAD_BASE_URL}/events?${params.toString()}`)
    
    const response = await fetch(`${TIMEPAD_BASE_URL}/events?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TIMEPAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    console.log(`📊 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:')
      console.error('Status:', response.status)
      console.error('Response:', errorText)
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - check TIMEPAD_API_KEY')
      } else if (response.status === 403) {
        console.error('🚫 Access forbidden - API key may be invalid or expired')
      } else if (response.status === 429) {
        console.error('⏱️ Rate limit exceeded - try again later')
      }
      
      process.exit(1)
    }

    const data = await response.json()
    
    console.log('✅ API request successful!')
    console.log(`📊 Found ${data.events?.length || 0} events`)
    console.log(`📊 Total available: ${data.total || 0}`)
    
    if (data.events && data.events.length > 0) {
      console.log('')
      console.log('📋 Sample events:')
      data.events.slice(0, 3).forEach((event, i) => {
        console.log(`${i + 1}. ${event.name}`)
        console.log(`   📅 ${new Date(event.starts_at).toLocaleDateString()}`)
        console.log(`   📍 ${event.location?.city || 'No location'}`)
        console.log(`   🖼️ ${event.poster_image?.uploadcare_url ? 'Has image' : 'No image'}`)
        console.log(`   🔗 ${event.url}`)
        console.log('')
      })
    }

    return data

  } catch (error) {
    console.error('❌ Network error:', error.message)
    process.exit(1)
  }
}

// Test pagination
async function testPagination() {
  console.log('🔄 Testing pagination...')
  
  try {
    const params = new URLSearchParams({
      city: 'moskva',
      limit: '5',
      skip: '0',
      fields: 'id,name,starts_at',
      starts_at_min: new Date().toISOString(),
    })

    const response = await fetch(`${TIMEPAD_BASE_URL}/events?${params}`, {
      headers: {
        'Authorization': `Bearer ${TIMEPAD_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ Page 1: ${data.events?.length || 0} events`)

    // Test second page
    const params2 = new URLSearchParams({
      city: 'moskva',
      limit: '5',
      skip: '5',
      fields: 'id,name,starts_at',
      starts_at_min: new Date().toISOString(),
    })

    const response2 = await fetch(`${TIMEPAD_BASE_URL}/events?${params2}`, {
      headers: {
        'Authorization': `Bearer ${TIMEPAD_API_KEY}`,
      },
    })

    if (!response2.ok) {
      throw new Error(`API Error: ${response2.status}`)
    }

    const data2 = await response2.json()
    console.log(`✅ Page 2: ${data2.events?.length || 0} events`)

  } catch (error) {
    console.error('❌ Pagination test failed:', error.message)
  }
}

// Run tests
async function main() {
  await testTimepadAPI()
  await testPagination()
  console.log('🎉 All tests completed successfully!')
}

main().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
