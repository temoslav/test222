import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Check items table schema
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'items' })
    
    if (schemaError) {
      // Fallback: check columns directly
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .limit(1)
      
      if (error) {
        return NextResponse.json({ 
          error: 'Cannot access items table',
          details: error.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({
        message: 'Items table accessible',
        sample_columns: data.length > 0 ? Object.keys(data[0]) : [],
      })
    }
    
    return NextResponse.json({
      schema,
      message: 'Schema retrieved successfully'
    })
  } catch (err) {
    console.error('Schema check error:', err)
    return NextResponse.json({ 
      error: 'Schema check failed',
      details: (err as Error).message 
    }, { status: 500 })
  }
}
