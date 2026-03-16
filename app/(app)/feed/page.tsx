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
  
  let query = supabase
    .from('items')
    .select(`
      id, title, description, price, currency,
      image_urls, external_url, city, source,
      starts_at, ends_at, type, is_active,
      item_enrichments (
        category_slug,
        tags,
        mood,
        price_tier
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  let categorySlugs: string[] = []
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('price_min, price_max, interests')
      .eq('id', user.id)
      .single()

    const priceMin = profile?.price_min ?? 0
    const priceMax = profile?.price_max ?? 500000

    // Map interests to category slugs
    categorySlugs = profile?.interests
      ?.map((i: string) => INTEREST_TO_SLUG[i])
      ?.filter(Boolean) ?? []

    if (categorySlugs.length > 0) {
      query = query.not('item_enrichments', 'is', null)
    }

    if (priceMin > 0 || priceMax < 500000) {
      // Apply client-side filtering since we already fetched items
      const { data: items } = await query
      const filteredItems = items?.filter(item => 
        !item.price || (item.price >= priceMin && item.price <= priceMax)
      ) ?? []
      
      const swipeItems: SwipeItem[] = filteredItems.map((item: any) => ({
        id: item.id,
        type: item.type as SwipeItem['type'],
        title: item.title,
        description: item.description,
        price: item.price ? Number(item.price) : null,
        currency: item.currency,
        category: item.item_enrichments?.[0]?.category_slug ?? 'other',
        brand: (item as any).brand,
        city: item.city,
        image_urls: item.image_urls || [],
        imageUrl: item.image_urls?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
        external_url: item.external_url,
        enrichment: item.item_enrichments?.[0],
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
  }

  // Default case - no user or no price filtering
  const { data: items } = await query
  
  // Transform to SwipeItem format
  const swipeItems: SwipeItem[] = (items ?? []).map((item: any) => ({
    id: item.id,
    type: item.type as SwipeItem['type'],
    title: item.title,
    description: item.description,
    price: item.price ? Number(item.price) : null,
    currency: item.currency,
    category: item.item_enrichments?.[0]?.category_slug ?? 'other',
    brand: (item as any).brand,
    city: item.city,
    image_urls: item.image_urls || [],
    imageUrl: item.image_urls?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
    external_url: item.external_url,
    enrichment: item.item_enrichments?.[0],
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
