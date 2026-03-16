import { createClient } from '@/lib/supabase/server'
import ProfileEditor from '@/components/profile/ProfileEditor'
import type { Profile, Seller } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('Profile auth check:', user?.id ?? 'NOT AUTHENTICATED')
  
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
        <div style={{ fontSize: 48, marginBottom: 24 }}>👤</div>
        <h2 style={{ 
          fontFamily: 'Playfair Display',
          fontSize: 24,
          color: '#0F0F0F',
          marginBottom: 8,
        }}>
          Войдите в аккаунт
        </h2>
        <p style={{
          fontFamily: 'DM Sans',
          fontSize: 15,
          color: '#6B6B6B',
          marginBottom: 32,
        }}>
          Чтобы настроить профиль и получать персональные рекомендации
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
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
        <div style={{ fontSize: 48, marginBottom: 24 }}>⚙️</div>
        <h2 style={{ 
          fontFamily: 'Playfair Display',
          fontSize: 24,
          color: '#0F0F0F',
          marginBottom: 8,
        }}>
          Профиль не найден
        </h2>
        <p style={{
          fontFamily: 'DM Sans',
          fontSize: 15,
          color: '#6B6B6B',
          marginBottom: 32,
        }}>
          Пожалуйста, завершите регистрацию
        </p>
        <a href="/onboarding" style={{
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
        }}>
          Завершить регистрацию
        </a>
      </div>
    )
  }

  let seller: Seller | null = null
  let monthStats = { views: 0, likes: 0, clicks: 0 }

  if (profile.role === 'seller') {
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .single()
    seller = sellerData ?? null

    if (seller) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: sellerItems } = await supabase
        .from('items')
        .select('id')
        .eq('seller_id', seller.id)

      const itemIds = (sellerItems ?? []).map(i => i.id)

      if (itemIds.length > 0) {
        const { data: stats } = await supabase
          .from('interactions')
          .select('action')
          .in('item_id', itemIds)
          .gte('created_at', startOfMonth.toISOString())

        if (stats) {
          monthStats.views  = stats.filter(s => s.action === 'view_detail').length
          monthStats.likes  = stats.filter(s => s.action === 'swipe_right').length
          monthStats.clicks = stats.filter(s => s.action === 'external_click').length
        }
      }
    }
  }

  return (
    <ProfileEditor
      profile={profile as Profile}
      seller={seller}
      monthStats={monthStats}
    />
  )
}
