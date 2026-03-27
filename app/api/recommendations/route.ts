import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('Auth in recommendations:', user?.id ?? 'NOT AUTHENTICATED')

  const { data: items, error } = await supabase
    .from('items')
    .select(`
      id, title, description, price, currency,
      image_urls, external_url, city, source,
      starts_at, ends_at, type, is_active,
      category_slug, mood, price_tier,
      wishlist_count, view_count,
      content_tags (
        tag_slug,
        confidence_score
      )
    `)
    .eq('is_active', true)
    .not('content_tags', 'is', null)
    .order('wishlist_count', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }

  const enrichedItems = items?.filter(item => 
    item.content_tags && item.content_tags.length > 0
  ) ?? []

  return NextResponse.json({
    data: enrichedItems.map(item => ({
      id: item.id,
      type: item.type ?? 'event',
      title: item.title,
      description: item.description,
      price: item.price,
      currency: item.currency,
      category: item.category_slug,
      image_urls: item.image_urls ?? [],
      imageUrl: item.image_urls?.[0] ?? null,
      external_url: item.external_url,
      starts_at: item.starts_at,
      ends_at: item.ends_at,
      enrichment: {
        category_slug: item.category_slug,
        tags: item.content_tags.map(t => t.tag_slug),
        mood: item.mood,
        price_tier: item.price_tier
      }
    }))
  })
}
