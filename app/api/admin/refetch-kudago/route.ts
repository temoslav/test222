import { NextRequest, NextResponse } from 'next/server'
import { KudaGoParser } from '@/lib/parsers/kudago'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    
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
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      
      console.log(`Successfully inserted ${events.length} events`)
    }
    
    return NextResponse.json({ 
      success: true, 
      count: events.length,
      events: events.map(e => ({ title: e.title.slice(0, 30), price: e.price }))
    })
  } catch (error) {
    console.error('Error re-fetching KudaGo events:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 })
  }
}
