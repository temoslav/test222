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

const BASE_URL = 'https://kudago.com/public-api/v1.4'

function parsePrice(priceStr) {
  if (!priceStr || priceStr.trim() === '') return null
  if (priceStr.toLowerCase().includes('бесплатно')) return null
  const match = priceStr.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

async function fetchKudaGoPage(page, retries = 3) {
  const url = new URL(`${BASE_URL}/events/`)
  url.searchParams.set('location', 'msk')
  url.searchParams.set('page_size', '100')
  url.searchParams.set('page', String(page))
  url.searchParams.set('fields', 
    'id,title,description,price,images,site_url,place,dates,categories')
  url.searchParams.set('expand', 'images,place')
  url.searchParams.set('actual_since', 
    String(Math.floor(Date.now() / 1000)))
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${retries} for page ${page}...`)
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Swipely-Bot/1.0'
        }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (err) {
      console.error(`  Attempt ${attempt} failed:`, err.message)
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
}

async function main() {
  console.log('Starting KudaGo sync...')
  
  let page = 1
  let totalFetched = 0
  let totalIngested = 0
  let hasMore = true
  
  while (hasMore) {
    console.log(`Fetching page ${page}...`)
    
    const data = await fetchKudaGoPage(page)
    const events = data.results ?? []
    
    if (!events.length) break
    
    const rawItems = events.map(e => ({
      source: 'kudago',
      external_id: `kudago_${e.id}`,
      raw_data: e,
      fetched_at: new Date().toISOString(),
      processed: false,
    }))
    
    const items = events.map(e => ({
      external_id: `kudago_${e.id}`,
      source: 'kudago',
      type: 'event',
      title: e.title,
      description: e.description?.replace(/<[^>]+>/g, '') ?? null,
      price: parsePrice(e.price),
      currency: 'RUB',
      image_urls: e.images?.map(i => i.image) ?? [],
      external_url: e.site_url ?? '',
      city: 'msk',
      location: e.place ? {
        lat: e.place.coords?.lat ?? 0,
        lng: e.place.coords?.lon ?? 0,
        address: e.place.address ?? '',
      } : null,
      starts_at: e.dates?.[0]?.start && e.dates[0].start > 0
        ? new Date(e.dates[0].start * 1000).toISOString() 
        : null,
      ends_at: e.dates?.[0]?.end && e.dates[0].end > 0
        ? new Date(e.dates[0].end * 1000).toISOString()
        : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }))
    
    // Batch upsert
    const { error: rawError } = await supabase
      .from('raw_events')
      .upsert(rawItems, { onConflict: 'source,external_id' })
    
    if (rawError) console.error('Raw error:', rawError.message)
    
    const { data: inserted, error: itemsError } = await supabase
      .from('items')
      .upsert(items, { onConflict: 'external_id,source' })
      .select('id')
    
    if (itemsError) {
      console.error('Items error:', itemsError.message)
    } else {
      totalIngested += inserted?.length ?? 0
      console.log(`Page ${page}: ingested ${inserted?.length ?? 0} items`)
    }
    
    totalFetched += events.length
    hasMore = data.next !== null
    page++
    
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log(`\nDone! Fetched: ${totalFetched}, Ingested: ${totalIngested}`)
  
  // Verify
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'kudago')
  
  console.log(`Items in database: ${count}`)
}

main().catch(console.error)
