// Sprint 4: pgvector-based recommendation algorithm
// Three-layer signal system as per CLAUDE.md section 5

import { createClient } from '@/lib/supabase/server'
import type { SwipeItem } from '@/types'

export async function getRecommendations(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<SwipeItem[]> {
  const supabase = createClient()
  
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

  if (error) throw error

  const enriched = items?.filter(i => 
    i.content_tags && i.content_tags.length > 0
  ) ?? []

  return enriched.map(item => ({
    id: item.id,
    type: item.type ?? 'event',
    title: item.title,
    description: item.description,
    price: item.price,
    currency: item.currency,
    category: item.category_slug,
    brand: null,
    city: item.city,
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
}

export const INTERACTION_WEIGHTS = {
  swipe_right: 1.0,
  save: 2.0,
  share: 3.0,
  view_detail: 0.5,
  external_click: 1.5,
  swipe_left: -1.0,
} as const

export const DWELL_TIME_BONUS = {
  long: 0.3,   // > 5s
  short: -0.3, // < 1s
} as const

export const EXPLORATION_RATIO = 0.2 // 20% new categories
