import { createClient } from '@/lib/supabase/server'
import SavedGrid from '@/components/saved/SavedGrid'

export default async function SavedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F7F7F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>❤️</div>
        <h2 style={{ 
          fontFamily: 'Playfair Display',
          fontSize: 24,
          color: '#0F0F0F',
          marginBottom: 8,
        }}>
          Сохраняйте понравившееся
        </h2>
        <p style={{
          fontFamily: 'DM Sans',
          fontSize: 15,
          color: '#6B6B6B',
          marginBottom: 32,
        }}>
          Свайпайте вправо и добавляйте в избранное
        </p>
        <a href="/login" style={{
          display: 'block',
          width: '100%',
          maxWidth: 320,
          height: 52,
          background: '#0F0F0F',
          color: 'white',
          borderRadius: 14,
          fontFamily: 'DM Sans',
          fontSize: 16,
          fontWeight: 500,
          textDecoration: 'none',
          lineHeight: '52px',
          marginBottom: 12,
        }}>
          Войти
        </a>
        <a href="/signup" style={{
          display: 'block',
          width: '100%',
          maxWidth: 320,
          height: 52,
          background: 'white',
          color: '#0F0F0F',
          border: '1px solid #EBEBEB',
          borderRadius: 14,
          fontFamily: 'DM Sans',
          fontSize: 16,
          fontWeight: 500,
          textDecoration: 'none',
          lineHeight: '52px',
        }}>
          Зарегистрироваться
        </a>
      </div>
    )
  }

  const { data: saved } = await supabase
    .from('interactions')
    .select(`
      id,
      created_at,
      item_id,
      items (
        id, title, description, price, currency,
        category, brand, city, image_urls, external_url
      )
    `)
    .eq('user_id', user.id)
    .eq('action', 'save')
    .order('created_at', { ascending: false })

  const items = (saved ?? [])
    .map(row => {
      const item = Array.isArray(row.items) ? row.items[0] : row.items
      if (!item) return null
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        currency: item.currency,
        category: item.category,
        brand: item.brand,
        city: item.city,
        imageUrl: item.image_urls?.[0] ?? '',
        external_url: item.external_url,
      }
    })
    .filter(Boolean)

  return <SavedGrid items={items as NonNullable<(typeof items)[number]>[]} />
}
