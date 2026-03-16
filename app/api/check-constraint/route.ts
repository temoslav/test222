import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Check existing sources in the table
    const { data: existingSources } = await supabase
      .from('items')
      .select('source')
      .not('source', 'is', null)
    
    const uniqueSources = Array.from(new Set(existingSources?.map(item => item.source) || []))
    
    // Try to find the check constraint definition
    const { data: constraints } = await supabase
      .from('pg_constraint')
      .select('conname, consrc')
      .eq('conname', 'items_source_check')
      .single()
    
    return NextResponse.json({
      existing_sources: uniqueSources,
      constraint_info: constraints,
      message: 'Source constraint analysis complete'
    })
  } catch (err) {
    console.error('Constraint analysis error:', err)
    return NextResponse.json({ 
      error: 'Constraint analysis failed',
      details: (err as Error).message 
    }, { status: 500 })
  }
}
