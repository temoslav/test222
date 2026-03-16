import { KudaGoParser } from '@/lib/parsers/kudago'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { source = 'kudago', fetchAll = false } = await req.json()
  
  try {
    if (source === 'kudago') {
      const parser = new KudaGoParser()
      const items = await parser.fetch({ city: 'msk', fetchAll })
      
      // Only store raw + normalized — NO AI enrichment here
      const supabase = createAdminClient()
      let ingested = 0
      
      for (const item of items) {
        // Save raw
        await supabase.from('raw_events').upsert({
          source: item.source,
          external_id: item.external_id,
          raw_data: item.raw_data,
          fetched_at: new Date().toISOString(),
          processed: false,
        }, { onConflict: 'source,external_id' })
        
        // Save to items
        const { data: upsertedItem, error } = await supabase.from('items').upsert({
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

        if (error) {
          console.error('Items upsert error:', JSON.stringify(error))
        } else {
          ingested++
        }
      }
      
      return Response.json({ 
        success: true, 
        fetched: items.length,
        ingested,
        source,
        note: 'AI enrichment runs separately via /api/enrich'
      })
    }
    
    return Response.json({ error: 'Unknown source' }, { status: 400 })
  } catch (err) {
    console.error('Sync error:', err)
    return Response.json({ error: 'Sync failed' }, { status: 500 })
  }
}
