#!/usr/bin/env node

// Timepad sync script - standalone version
// Usage: node scripts/sync-timepad-standalone.mjs

import { createAdminClient } from '../lib/supabase/admin.js'

const TIMEPAD_BASE_URL = 'https://api.timepad.ru/v1'

export async function fetchTimepadEvents(
  apiKey,
  page = 0,
  limit = 100
) {
  const params = new URLSearchParams({
    city: 'moskva',
    limit: limit.toString(),
    skip: page.toString(),
    fields: 'id,name,description_short,starts_at,ends_at,location,poster_image,url,categories,is_registration_open',
    starts_at_min: new Date().toISOString(),
  })

  const response = await fetch(`${TIMEPAD_BASE_URL}/events?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Timepad API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data
}

export async function fetchAllTimepadEvents(
  apiKey,
  maxMonths = 3
) {
  const allEvents = []
  let page = 0
  const limit = 100
  
  // Calculate max date (3 months from now)
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + maxMonths)

  while (true) {
    try {
      const response = await fetchTimepadEvents(apiKey, page, limit)
      
      // Stop if no more events
      if (response.events.length === 0) {
        console.log('Timepad: No more events to fetch')
        break
      }

      // Filter events that are too far in the future
      const validEvents = response.events.filter(event => {
        const eventDate = new Date(event.starts_at)
        return eventDate <= maxDate
      })

      allEvents.push(...validEvents)
      console.log(`Timepad: Fetched ${validEvents.length} events (page ${page})`)

      // Stop if we got less than limit (last page)
      if (response.events.length < limit) {
        break
      }

      // Rate limiting: 300ms delay between pages
      await new Promise(resolve => setTimeout(resolve, 300))
      page++
    } catch (error) {
      console.error(`Timepad: Error fetching page ${page}:`, error)
      break
    }
  }

  return allEvents
}

export function mapTimepadEventToRawEvent(event) {
  return {
    external_id: event.id.toString(),
    source: 'timepad',
    title: event.name,
    description: event.description_short || event.description || '',
    image_urls: event.poster_image?.uploadcare_url 
      ? [event.poster_image.uploadcare_url] 
      : [],
    external_url: event.url,
    city: 'Moscow',
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    raw_data: event,
  }
}

export async function upsertTimepadEvents(events) {
  const supabase = createAdminClient()
  
  const rawEvents = events.map(mapTimepadEventToRawEvent)
  
  // Upsert into raw_events table
  const { data: upsertedData, error: upsertError } = await supabase
    .from('raw_events')
    .upsert(rawEvents, {
      onConflict: 'external_id,source',
      ignoreDuplicates: false, // Update existing records
    })
    .select()

  if (upsertError) {
    console.error('Timepad: Error upserting raw events:', upsertError)
    throw upsertError
  }

  // Normalize and upsert into items table
  const items = events.map(event => ({
    source: 'timepad',
    type: 'event',
    title: event.name,
    description: event.description_short || event.description || '',
    price: null, // Timepad doesn't provide price in basic API
    currency: 'RUB',
    image_urls: event.poster_image?.uploadcare_url 
      ? [event.poster_image.uploadcare_url] 
      : [],
    category: 'События', // Will be updated by AI enrichment
    subcategory: null,
    brand: null,
    city: 'Moscow',
    location: event.location?.coordinates 
      ? {
          lat: event.location.coordinates.lat || null,
          lng: event.location.coordinates.lon || null,
          address: event.location?.address || null,
        }
      : null,
    external_url: event.url,
    seller_id: null, // API source
    is_active: true,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    external_id: event.id.toString(), // For deduplication
  }))

  const { data: itemsData, error: itemsError } = await supabase
    .from('items')
    .upsert(items, {
      onConflict: 'external_id,source',
      ignoreDuplicates: false,
    })
    .select()

  if (itemsError) {
    console.error('Timepad: Error upserting items:', itemsError)
    throw itemsError
  }

  return {
    rawEvents: upsertedData || [],
    items: itemsData || [],
    totalEvents: events.length,
  }
}

export async function syncTimepadEvents(options) {
  const { apiKey, maxMonths = 3 } = options
  
  try {
    // Fetch all events from Timepad
    const events = await fetchAllTimepadEvents(apiKey, maxMonths)
    
    if (events.length === 0) {
      return {
        fetched: 0,
        new: 0,
        updated: 0,
        errors: 0,
        lastSync: new Date().toISOString(),
      }
    }

    // Upsert events into database
    const result = await upsertTimepadEvents(events)
    
    // Count new vs updated
    const newCount = result.rawEvents.length
    const updatedCount = result.totalEvents - newCount
    
    return {
      fetched: result.totalEvents,
      new: newCount,
      updated: updatedCount,
      errors: 0,
      lastSync: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Timepad sync failed:', error)
    return {
      fetched: 0,
      new: 0,
      updated: 0,
      errors: 1,
      lastSync: new Date().toISOString(),
    }
  }
}

// Load environment variables manually for standalone script
const env = {
  TIMEPAD_API_KEY: process.env.TIMEPAD_API_KEY,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

// Validate required environment variables
if (!env.TIMEPAD_API_KEY) {
  console.error('❌ TIMEPAD_API_KEY is required in .env.local')
  process.exit(1)
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials are required in .env.local')
  process.exit(1)
}

async function main() {
  console.log('🚀 Starting Timepad sync...')
  console.log(`📍 City: Moscow`)
  console.log(`📅 Events from: ${new Date().toISOString()}`)
  console.log(`📅 Events until: ${new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString()}`)
  console.log('')

  try {
    const result = await syncTimepadEvents({
      apiKey: env.TIMEPAD_API_KEY,
      maxMonths: 3,
    })

    console.log('✅ Timepad sync completed!')
    console.log(`📊 Results:`)
    console.log(`   Fetched: ${result.fetched} events`)
    console.log(`   New: ${result.new} events`)
    console.log(`   Updated: ${result.updated} events`)
    console.log(`   Errors: ${result.errors}`)
    console.log(`   Last sync: ${result.lastSync}`)

    if (result.errors > 0) {
      console.log('⚠️  Some errors occurred during sync')
      process.exit(1)
    }

    if (result.fetched === 0) {
      console.log('ℹ️  No events found')
    }

  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

// Run the sync
main()
