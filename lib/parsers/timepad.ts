// Timepad API parser for Moscow events
// Follows same pattern as kudago.ts
// Source: https://api.timepad.ru/v1

import { createAdminClient } from '@/lib/supabase/admin'

const TIMEPAD_BASE_URL = 'https://api.timepad.ru/v1'

export interface TimepadEvent {
  id: number
  name: string
  description_short: string | null
  description: string | null
  starts_at: string
  ends_at: string | null
  location: {
    city: string | null
    address: string | null
    coordinates: {
      lat: number | null
      lon: number | null
    } | null
  } | null
  poster_image: {
    uploadcare_url: string | null
  } | null
  url: string
  categories: Array<{
    id: number
    name: string
  }>
  registration_data?: {
    price_max: number | null
    price_min: number | null
    sale_ends_at: string | null
    tickets_total: number | null
    is_registration_open: boolean
  }
  is_registration_open: boolean
  created_at: string
  updated_at: string
}

export interface TimepadResponse {
  values: TimepadEvent[]  // Timepad API uses 'values' not 'events'
  total: number
  limit: number
  skip: number
}

export async function fetchTimepadEvents(
  apiKey: string,
  skip: number = 0,
  limit: number = 100
): Promise<TimepadResponse> {
  // Calculate date range: today to 6 months from now
  const today = new Date()
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 6)
  
  const params = new URLSearchParams({
    city: 'msk',
    limit: limit.toString(),
    skip: skip.toString(),
    fields: 'id,name,description_short,starts_at,ends_at,location,poster_image,url,categories,is_registration_open,registration_data',
    starts_at_min: today.toISOString().split('T')[0], // YYYY-MM-DD format
    starts_at_max: maxDate.toISOString().split('T')[0],
    order: 'starts_at_asc', // Nearest events first
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
  return data as TimepadResponse
}

export async function fetchAllTimepadEvents(
  apiKey: string,
  maxMonths: number = 3
): Promise<TimepadEvent[]> {
  let allEvents: TimepadEvent[] = []
  let skip = 0
  const limit = 100
  
  // Calculate max date (6 months from now for filtering)
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + maxMonths)

  while (true) {
    try {
      const response = await fetchTimepadEvents(apiKey, skip, limit)
      
      // Filter events: valid date range AND year <= 2030 AND Moscow city (skip placeholder events)
      const validEvents = response.values.filter((event: TimepadEvent) => {
        const eventDate = new Date(event.starts_at)
        const eventYear = eventDate.getFullYear()
        
        return eventDate <= maxDate && 
               eventYear <= 2030 &&
               (event.location?.city === 'Москва' || event.location?.city === 'москва')
      })

      allEvents = allEvents.concat(validEvents)
      console.log(`Page ${skip/limit}: ${validEvents.length} valid / ${response.values.length} total | Collected: ${allEvents.length} / ${response.total}`)
      
      // Stop conditions
      if (response.values.length < limit) break  // last page
      if (skip + limit >= response.total) break   // fetched everything

      // Rate limiting: 300ms delay between pages
      await new Promise(resolve => setTimeout(resolve, 300))
      skip += limit
    } catch (error) {
      console.error(`Timepad: Error fetching skip ${skip}:`, error)
      break
    }
  }

  console.log('✅ Done. Total events fetched:', allEvents.length)
  return allEvents
}

export function mapTimepadEventToRawEvent(event: TimepadEvent) {
  return {
    external_id: event.id.toString(),
    source: 'timepad',
    title: event.name,
    description: event.description_short || event.description || '',
    image_urls: event.poster_image?.uploadcare_url 
      ? [event.poster_image.uploadcare_url] 
      : [],
    external_url: event.url,
    city: 'Moscow', // Standardized city name
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    raw_data: event,
  }
}

export async function upsertTimepadEvents(events: TimepadEvent[]) {
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
    price: event.registration_data?.price_min ?? null, // Use price from registration_data
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

export async function syncTimepadEvents(options: {
  apiKey: string
  maxMonths?: number
}): Promise<{
  fetched: number
  new: number
  updated: number
  errors: number
  lastSync: string
}> {
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
