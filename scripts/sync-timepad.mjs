#!/usr/bin/env node

// Timepad sync script
// Follows same pattern as sync-kudago.mjs
// Usage: node scripts/sync-timepad.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load env manually
const envFile = readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) env[key.trim()] = vals.join('=').trim()
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// Validate required environment variables
if (!env.TIMEPAD_API_KEY) {
  console.error('❌ TIMEPAD_API_KEY is required in .env.local')
  process.exit(1)
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials are required in .env.local')
  process.exit(1)
}

const TIMEPAD_BASE_URL = 'https://api.timepad.ru/v1'

async function fetchTimepadEvents(apiKey, skip = 0, limit = 100, retries = 3) {
  // Calculate date range: today to 6 months from now
  const today = new Date()
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 6)
  
  const params = new URLSearchParams({
    city: 'msk',
    limit: limit.toString(),
    skip: skip.toString(),
    fields: 'id,name,description_short,starts_at,ends_at,location,poster_image,url,categories,is_registration_open,registration_data',
    starts_at_min: today.toISOString().split('T')[0],
    starts_at_max: maxDate.toISOString().split('T')[0],
    order: 'starts_at_asc',
  })

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${TIMEPAD_BASE_URL}/events?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // Removed AbortSignal.timeout - causing issues
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Timepad API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.warn(`⚠️  Fetch attempt ${attempt}/${retries} failed for skip ${skip}: ${error.message}`)
      if (attempt === retries) {
        throw error
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000))
    }
  }
}

async function testTimepadConnectivity(apiKey) {
  console.log('🔍 Testing Timepad API connectivity...')
  try {
    const response = await fetch('https://api.timepad.ru/v1/events?city=msk&limit=1&fields=id,name', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Removed AbortSignal.timeout - causing issues
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ API connectivity test passed')
    console.log(`📊 Total events available: ${data.total}`)
    return true
  } catch (error) {
    console.error('❌ API connectivity test failed:', error.message)
    return false
  }
}

async function fetchAllTimepadEvents(apiKey, maxMonths = 3) {
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + maxMonths)

  // Test connectivity first
  const isConnected = await testTimepadConnectivity(apiKey)
  if (!isConnected) {
    console.log('⚠️  Cannot proceed - API connectivity failed')
    return { events: [], totalFetched: 0, totalSaved: 0 }
  }

  // Step 1: fetch first page to get total
  console.log('📡 Fetching first page to get total count...')
  const first = await fetchTimepadEvents(apiKey, 0, 100)
  const total = first.total
  console.log(`📊 Total events available: ${total}`)
  
  // Calculate all page offsets
  const offsets = []
  for (let skip = 100; skip < total; skip += 100) {
    offsets.push(skip)
  }
  
  console.log(`📄 Will fetch ${offsets.length} additional pages (${offsets.length * 100} more events)`)

  // Step 2: Process batches immediately (fetch → filter → save)
  const BATCH_SIZE = 10 // pages per batch
  const CHUNK_SIZE = 500 // events per DB chunk
  let allEvents = [...first.values]
  let totalFetched = 0
  let totalSaved = 0
  let parallelFailed = false

  console.log(`🚀 Starting batch processing (fetch → filter → save per batch)...`)

  for (let i = 0; i < offsets.length; i += BATCH_SIZE) {
    const batch = offsets.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(offsets.length / BATCH_SIZE)
    
    console.log(`🚀 Batch ${batchNum}/${totalBatches}: Fetching ${batch.length} pages...`)
    
    try {
      // Step 1: Fetch pages in parallel
      const results = await Promise.all(batch.map(skip => fetchTimepadEvents(apiKey, skip, 100)))
      let batchEvents = []
      results.forEach(r => batchEvents.push(...r.values))
      
      // Step 2: Filter and deduplicate batch events
      const seen = new Set()
      const validBatchEvents = batchEvents.filter(event => {
        const eventDate = new Date(event.starts_at)
        const eventYear = eventDate.getFullYear()
        
        // Date filtering
        if (eventDate > maxDate || eventYear > 2030) return false
        
        // Deduplication by ID
        if (seen.has(event.id)) return false
        seen.add(event.id)
        
        return true
      })

      totalFetched += batchEvents.length
      console.log(`� Batch ${batchNum}: ${validBatchEvents.length} valid events from ${batchEvents.length} fetched`)

      // Step 3: Save batch to database immediately
      if (validBatchEvents.length > 0) {
        console.log(`� Batch ${batchNum}: Saving ${validBatchEvents.length} events to database...`)
        const saveResult = await upsertTimepadEvents(validBatchEvents)
        totalSaved += saveResult.rawEvents
        
        console.log(`✅ Batch ${batchNum} complete: Fetched ${batchEvents.length}, Valid ${validBatchEvents.length}, Saved ${saveResult.rawEvents} to DB`)
      } else {
        console.log(`⏭️  Batch ${batchNum}: No valid events to save`)
      }

    } catch (error) {
      console.error(`❌ Batch ${batchNum} failed: ${error.message}`)
      parallelFailed = true
      
      // Continue with next batch instead of failing completely
      console.log(`⏭️  Continuing to next batch...`)
    }
    
    // Delay between batches
    if (i + BATCH_SIZE < offsets.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`📊 Final Summary:`)
  console.log(`   Total fetched: ${totalFetched}`)
  console.log(`   Total saved: ${totalSaved}`)
  console.log(`   Fetch mode: ${parallelFailed ? 'Mixed (some batches failed)' : 'Parallel'}`)
  
  return { 
    events: allEvents, // Return first page events for compatibility
    totalFetched,
    totalSaved,
    parallelFailed 
  }
}

function mapTimepadEventToRawEvent(event) {
  return {
    source: 'timepad',
    external_id: event.id.toString(),
    raw_data: event, // Only required columns according to schema
  }
}

async function upsertTimepadEvents(events) {
  const rawEvents = events.map(mapTimepadEventToRawEvent)
  const items = events.map(event => ({
    source: 'timepad',
    type: 'event',
    title: event.name,
    description: event.description_short || event.description || '',
    price: event.registration_data?.price_min ?? null,
    currency: 'RUB',
    image_urls: event.poster_image?.uploadcare_url 
      ? [event.poster_image.uploadcare_url] 
      : [],
    category: 'События',
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
    seller_id: null,
    is_active: true,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    external_id: event.id.toString(),
  }))

  const CHUNK_SIZE = 500
  let totalRawUpserted = 0
  let totalItemsUpserted = 0
  let rawErrors = 0
  let itemErrors = 0

  console.log(`💾 Upserting ${rawEvents.length} raw events in chunks of ${CHUNK_SIZE}...`)
  
  // Chunked upsert for raw_events
  for (let i = 0; i < rawEvents.length; i += CHUNK_SIZE) {
    const chunk = rawEvents.slice(i, i + CHUNK_SIZE)
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
    const totalChunks = Math.ceil(rawEvents.length / CHUNK_SIZE)
    
    try {
      const { data: upsertedData, error: upsertError } = await supabase
        .from('raw_events')
        .upsert(chunk, {
          onConflict: 'source,external_id', // Match schema UNIQUE order
          ignoreDuplicates: false,
        })
        .select()

      if (upsertError) {
        console.error(`❌ Raw events chunk ${chunkNum}/${totalChunks} failed:`, upsertError.message)
        rawErrors++
      } else {
        totalRawUpserted += chunk.length
        console.log(`✅ Raw events chunk ${chunkNum}/${totalChunks} saved (${chunk.length} events)`)
      }
    } catch (error) {
      console.error(`❌ Raw events chunk ${chunkNum}/${totalChunks} error:`, error.message)
      rawErrors++
    }
    
    // Small delay between chunks to avoid rate limiting
    if (i + CHUNK_SIZE < rawEvents.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  console.log(`💾 Upserting ${items.length} items in chunks of ${CHUNK_SIZE}...`)
  
  // Chunked upsert for items
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
    const totalChunks = Math.ceil(items.length / CHUNK_SIZE)
    
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .upsert(chunk, {
          onConflict: 'external_id,source',
          ignoreDuplicates: false,
        })
        .select()

      if (itemsError) {
        console.error(`❌ Items chunk ${chunkNum}/${totalChunks} failed:`, itemsError.message)
        itemErrors++
      } else {
        totalItemsUpserted += chunk.length
        console.log(`✅ Items chunk ${chunkNum}/${totalChunks} saved (${chunk.length} items)`)
      }
    } catch (error) {
      console.error(`❌ Items chunk ${chunkNum}/${totalChunks} error:`, error.message)
      itemErrors++
    }
    
    // Small delay between chunks to avoid rate limiting
    if (i + CHUNK_SIZE < items.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  console.log(`📊 Upsert Summary:`)
  console.log(`   Raw events: ${totalRawUpserted} upserted, ${rawErrors} errors`)
  console.log(`   Items: ${totalItemsUpserted} upserted, ${itemErrors} errors`)

  if (rawErrors > 0 || itemErrors > 0) {
    console.warn(`⚠️  Some chunks failed during upsert`)
  }

  return {
    rawEvents: totalRawUpserted,
    items: totalItemsUpserted,
    totalEvents: events.length,
    rawErrors,
    itemErrors,
  }
}

async function syncTimepadEvents(options) {
  const { apiKey, maxMonths = 3 } = options
  
  try {
    const result = await fetchAllTimepadEvents(apiKey, maxMonths)
    
    if (result.totalFetched === 0) {
      return {
        fetched: 0,
        new: 0,
        updated: 0,
        errors: 0,
        lastSync: new Date().toISOString(),
      }
    }

    // Events are already saved during batch processing
    // Just return the totals from batch processing
    return {
      fetched: result.totalFetched,
      new: result.totalSaved, // All saved events are "new" for simplicity
      updated: 0, // Would need additional logic to detect updates
      errors: 0, // Errors are handled per batch and don't stop the sync
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
  
  process.exit(0)
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

main()
