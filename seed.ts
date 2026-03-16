import { createClient } from '@supabase/supabase-js'
import { KudaGoParser } from './lib/parsers/kudago'

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass RLS for seeding
  )

  console.log('Fetching events from KudaGo...')
  const parser = new KudaGoParser()
  const events = await parser.fetch({ city: 'msk', fetchAll: false })
  
  if (!events || events.length === 0) {
    console.log('No items found.')
    return
  }

  // Transform ParsedItem to ItemInsert format
  const items = events.map(e => ({
    source: e.source,
    type: e.type,
    title: e.title,
    description: e.description,
    price: e.price,
    currency: e.currency,
    image_urls: e.image_urls,
    external_url: e.external_url,
    city: e.city,
    location: e.location,
    external_id: e.external_id,
    brand: 'KudaGo',
    seller_id: null,
    status: 'active' as const,
    is_active: true,
    starts_at: e.starts_at?.toISOString(),
    ends_at: e.ends_at?.toISOString(),
  }))

  console.log(`Fetched ${items.length} events. Inserting to Supabase...`)

  const { data, error } = await supabase
    .from('items')
    .insert(items)

  if (error) {
    console.error('Error inserting items:', error)
  } else {
    console.log('Successfully seeded items!')
  }
}

seed()
