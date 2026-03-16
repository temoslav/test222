// Re-fetch KudaGo events with fixed price parser
import { KudaGoParser } from '@/lib/parsers/kudago'
import { createClient } from '@/lib/supabase/server'

export async function reFetchKudaGoEvents() {
  const supabase = await createClient()
  
  console.log('Deleting existing KudaGo items...')
  await supabase
    .from('items')
    .delete()
    .in('source', ['kudago', 'api'])
  
  console.log('Fetching fresh KudaGo events...')
  const parser = new KudaGoParser()
  const events = await parser.fetch({ city: 'msk', fetchAll: false })
  
  console.log(`Found ${events.length} events with prices:`, 
    events.map(e => ({ title: e.title.slice(0, 30), price: e.price })))
  
  if (events.length > 0) {
    // Transform ParsedItem to ItemInsert format
    const itemsToInsert = events.map(e => ({
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
    
    const { error } = await supabase
      .from('items')
      .insert(itemsToInsert)
    
    if (error) {
      console.error('Failed to insert events:', error)
      return { success: false, error }
    }
    
    console.log(`Successfully inserted ${events.length} events`)
  }
  
  return { success: true, count: events.length }
}

// Run the function
reFetchKudaGoEvents().then(console.log).catch(console.error)
