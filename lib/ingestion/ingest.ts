import { createAdminClient } from '../supabase/admin'
import { enrichEvent } from '../ai/provider'

export interface ParsedItem {
  external_id: string
  source: string
  type: 'event' | 'product' | 'place'
  title: string
  description: string | null
  price: number | null
  currency: string
  image_urls: string[]
  external_url: string
  city: string
  location: { lat: number; lng: number; address: string } | null
  raw_categories: string[]
  starts_at: Date | null
  ends_at: Date | null
  raw_data: Record<string, unknown>
}

export async function ingestItems(items: ParsedItem[]): Promise<void> {
  const supabase = createAdminClient()
  
  // Get reference data from DB (not hardcoded)
  const [
    { data: categories },
    { data: tags },
    { data: audiences }
  ] = await Promise.all([
    supabase.from('categories').select('slug').eq('is_active', true),
    supabase.from('tags').select('slug'),
    supabase.from('audiences').select('slug'),
  ])
  
  const categorySlugs = categories?.map((c: any) => c.slug) ?? []
  const tagSlugs = tags?.map((t: any) => t.slug) ?? []
  const audienceSlugs = audiences?.map((a: any) => a.slug) ?? []
  
  for (const item of items) {
    try {
      // 1. Save to raw_events
      await supabase.from('raw_events').upsert({
        source: item.source,
        external_id: item.external_id,
        raw_data: item.raw_data,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'source,external_id' })
      
      // 2. Upsert to items
      const { data: upsertedItem, error } = await supabase
        .from('items')
        .upsert({
          external_id: item.external_id,
          source: item.source,
          type: item.type,
          title: item.title,
          description: item.description,
          price: item.price,
          currency: item.currency,
          image_urls: item.image_urls,
          external_url: item.external_url,
          city: item.city,
          location: item.location,
          starts_at: item.starts_at?.toISOString(),
          ends_at: item.ends_at?.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'external_id,source' })
        .select('id')
        .single()
      
      if (error || !upsertedItem) continue
      
      // 3. Check if enrichment needed
      const { data: existing } = await supabase
        .from('item_enrichments')
        .select('id, needs_reenrichment')
        .eq('item_id', upsertedItem.id)
        .single()
      
      if (existing && !existing.needs_reenrichment) continue
      
      // 4. Enrich with AI
      const enrichment = await enrichEvent(
        item.title,
        item.description ?? '',
        item.price,
        categorySlugs,
        tagSlugs,
        audienceSlugs
      )
      
      // 5. Save enrichment
      await supabase.from('item_enrichments').upsert({
        item_id: upsertedItem.id,
        category_slug: enrichment.category_slug,
        tags: enrichment.tags,
        audience_slugs: enrichment.audience_slugs,
        mood: enrichment.mood,
        price_tier: enrichment.price_tier,
        ai_confidence: enrichment.confidence,
        ai_model: 'llama-3.3-70b-versatile',
        enriched_at: new Date().toISOString(),
        needs_reenrichment: false,
      }, { onConflict: 'item_id' })
      
      // 6. Mark raw as processed
      await supabase.from('raw_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('source', item.source)
        .eq('external_id', item.external_id)
        
      // Rate limit protection for AI
      await new Promise(r => setTimeout(r, 100))
      
    } catch (err) {
      console.error(`Failed to ingest ${item.external_id}:`, err)
    }
  }
}
