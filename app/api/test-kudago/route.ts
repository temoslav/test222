import { NextRequest, NextResponse } from 'next/server'
import { KudaGoParser } from '@/lib/parsers/kudago'

export async function POST(req: NextRequest) {
  try {
    const parser = new KudaGoParser()
    
    // Just fetch 5 events to test connectivity
    const response = await fetch('https://kudago.com/public-api/v1.4/events/?location=msk&page_size=5&page=1&fields=id,title,description,price,images,site_url,place,dates,categories&expand=images,place&actual_since=' + Math.floor(Date.now() / 1000), {
      signal: AbortSignal.timeout(15000)
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }, { status: 500 })
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      results: data.results?.length || 0,
      next: data.next,
      sample: data.results?.slice(0, 2).map((e: any) => ({
        id: e.id,
        title: e.title,
        price: e.price,
        hasImages: !!e.images?.length
      }))
    })
  } catch (err) {
    console.error('Test error:', err)
    return NextResponse.json({ 
      error: 'Connection failed',
      details: (err as Error).message 
    }, { status: 500 })
  }
}
