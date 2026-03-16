import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Try to select one item to see the structure
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .limit(1)
    
    if (error) {
      return NextResponse.json({ 
        error: 'Cannot access items table',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }
    
    // Also try to check if seller_id is required by attempting an insert
    const testItem = {
      external_id: 'test_123',
      source: 'test',
      type: 'event',
      title: 'Test Event',
      description: null,
      price: null,
      currency: 'RUB',
      image_urls: [],
      external_url: '',
      city: 'msk',
      location: null,
      starts_at: null,
      ends_at: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }
    
    const { error: insertError } = await supabase
      .from('items')
      .insert(testItem)
      .select('id')
      .single()
    
    // Clean up test item
    if (!insertError) {
      await supabase
        .from('items')
        .delete()
        .eq('external_id', 'test_123')
        .eq('source', 'test')
    }
    
    return NextResponse.json({
      sample_columns: data.length > 0 ? Object.keys(data[0]) : [],
      sample_data: data,
      insert_error: insertError ? {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details
      } : null,
      message: 'Items table analysis complete'
    })
  } catch (err) {
    console.error('Analysis error:', err)
    return NextResponse.json({ 
      error: 'Analysis failed',
      details: (err as Error).message 
    }, { status: 500 })
  }
}
