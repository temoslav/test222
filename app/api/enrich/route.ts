import { enrichEvent } from '@/lib/ai/provider'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { batch_size = 10 } = await req.json()
  const supabase = createAdminClient()
  
  // Get unprocessed raw events
  const { data: unprocessed } = await supabase
    .from('raw_events')
    .select('source, external_id')
    .eq('processed', false)
    .limit(batch_size)
  
  if (!unprocessed?.length) {
    return Response.json({ success: true, processed: 0, 
      message: 'No items to enrich' })
  }
  
  // Get reference data
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
  
  let processed = 0
  
  for (const raw of unprocessed) {
    const { data: item } = await supabase
      .from('items')
      .select('id, title, description, price')
      .eq('external_id', raw.external_id)
      .eq('source', raw.source)
      .single()
    
    if (!item) continue
    
    const enrichment = await enrichEvent(
      item.title,
      item.description ?? '',
      item.price,
      categorySlugs,
      tagSlugs,
      audienceSlugs
    )
    
    await supabase.from('item_enrichments').upsert({
      item_id: item.id,
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
    
    await supabase.from('raw_events')
      .update({ processed: true, 
        processed_at: new Date().toISOString() })
      .eq('source', raw.source)
      .eq('external_id', raw.external_id)
    
    processed++
    await new Promise(r => setTimeout(r, 200))
  }
  
  const { count } = await supabase
    .from('raw_events')
    .select('*', { count: 'exact', head: true })
    .eq('processed', false)
  
  return Response.json({ 
    success: true, 
    processed,
    remaining: count ?? 0
  })
}
