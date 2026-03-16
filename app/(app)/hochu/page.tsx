import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WishlistGrid from '@/components/wishlist/WishlistGrid'
import type { SwipeItem } from '@/types'

interface SearchParams {
  success?: string
}

export default async function WishlistPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Show success message if payment was successful
  if (searchParams.success === 'true') {
    return (
      <main style={{ 
        minHeight: '100vh', 
        background: '#F7F7F5',
        padding: '60px 16px 80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          textAlign: 'center',
          maxWidth: 320
        }}>
          <div style={{ 
            fontSize: 64, 
            marginBottom: 24,
            opacity: 0.8
          }}>
            ✅
          </div>
          <h2 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 28,
            fontWeight: 700,
            color: '#0F0F0F',
            margin: '0 0 16px',
            lineHeight: 1.3
          }}>
            Заказ оформлен!
          </h2>
          <p style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 16,
            color: '#6B6B6B',
            margin: '0 0 32px',
            lineHeight: 1.5
          }}>
            Спасибо за покупку! Мы отправили подтверждение на вашу почту.
          </p>
          <a
            href="/hochu"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#FF4D4D',
              color: '#FFFFFF',
              borderRadius: 100,
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            Вернуться к желаниям
          </a>
        </div>
      </main>
    )
  }

  // Fetch wishlist items with full item data
  const { data: wishlistData, error } = await supabase
    .from('wishlist')
    .select(`
      *,
      items (
        id, title, description, price, currency, category, type,
        image_urls, external_url, city, source, starts_at, ends_at,
        seller_id, brand, is_active, created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Wishlist error:', error)
    return <div>Ошибка загрузки</div>
  }

  // Transform to SwipeItem format
  const wishlistItems: SwipeItem[] = wishlistData
    ?.filter(item => item.items) // Filter out items without item data
    .map(item => ({
      id: item.items.id,
      type: item.items.type as SwipeItem['type'],
      title: item.items.title,
      description: item.items.description,
      price: item.items.price ? Number(item.items.price) : null,
      currency: item.items.currency,
      category: item.items.category,
      brand: item.items.brand,
      city: item.items.city,
      image_urls: item.items.image_urls || [],
      imageUrl: item.items.image_urls?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
      external_url: item.items.external_url,
    })) || []

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: '#F7F7F5',
      padding: '16px 0 80px'
    }}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '0 16px' }}>
        <WishlistGrid items={wishlistItems} />
      </div>
    </main>
  )
}
