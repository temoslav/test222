import { createClient } from '@/lib/supabase/server'
import FeedContainer from '@/components/feed/FeedContainer'
import type { SwipeItem } from '@/types'

const INTEREST_TO_SLUG: Record<string, string> = {
  '🎵 Музыка': 'music',
  '🎨 Искусство': 'art',
  '🎭 Театр': 'theatre',
  '🏋️ Спорт': 'sport',
  '📚 Образование': 'education',
  '🍕 Еда': 'food',
  '🎉 Вечеринки': 'party',
  '👶 Детям': 'kids',
  '🖼️ Выставки': 'exhibition',
  '🎪 Фестивали': 'festival',
  '💼 Бизнес': 'business',
}

export default async function FeedPage() {
  const supabase = createClient()
  
  // Debug auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
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
    .range(0, 19)

  if (error) {
    console.error('Feed page error:', error)
  }

  // Filter out items where content_tags array is empty
  const enrichedItems = items?.filter(item => 
    item.content_tags && item.content_tags.length > 0
  ) ?? []
  
  // Transform to SwipeItem format
  const swipeItems: SwipeItem[] = enrichedItems.map((item: any) => ({
    id: item.id,
    type: item.type as SwipeItem['type'] ?? 'event',
    title: item.title,
    description: item.description,
    price: item.price ? Number(item.price) : null,
    currency: item.currency,
    category: item.category_slug ?? 'other',
    brand: (item as any).brand,
    city: item.city,
    image_urls: item.image_urls || [],
    imageUrl: item.image_urls?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
    external_url: item.external_url,
    starts_at: item.starts_at,
    ends_at: item.ends_at,
    enrichment: {
      category_slug: item.category_slug,
      tags: item.content_tags.map((t: any) => t.tag_slug),
      mood: item.mood,
      price_tier: item.price_tier
    }
  }))
  
  return (
    <main
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        height: 'calc(100dvh - 80px)',
        background: '#000',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <FeedContainer initialItems={swipeItems} />
    </main>
  )
}
