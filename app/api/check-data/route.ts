import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Check raw_events
    const { count: rawCount } = await supabase
      .from('raw_events')
      .select('*', { count: 'exact', head: true })
    
    // Check items
    const { count: itemCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'kudago')
    
    // Get a sample item
    const { data: sample } = await supabase
      .from('items')
      .select('id, title, price, external_id')
      .eq('source', 'kudago')
      .limit(3)
    
    return NextResponse.json({
      raw_events: rawCount || 0,
      items: itemCount || 0,
      sample_items: sample || []
    })
  } catch (err) {
    console.error('Check error:', err)
    return NextResponse.json({ 
      error: 'Database check failed',
      details: (err as Error).message 
    }, { status: 500 })
  }
}
