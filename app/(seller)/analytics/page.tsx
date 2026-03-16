import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsView from '@/components/seller/AnalyticsView'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, business_name, subscription_status')
    .eq('user_id', user.id)
    .single()

  if (!seller) redirect('/onboarding')

  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)

  // Fetch all seller item IDs
  const { data: sellerItems } = await supabase
    .from('items')
    .select('id, title, category, image_urls')
    .eq('seller_id', seller.id)

  const itemIds = (sellerItems ?? []).map(i => i.id as string)

  // Fetch interactions for those items in the last 30 days
  const interactions = itemIds.length > 0
    ? (await supabase
        .from('interactions')
        .select('action, item_id, created_at')
        .in('item_id', itemIds)
        .gte('created_at', since.toISOString())
      ).data ?? []
    : []

  // Build daily series (last 30 days)
  const days: Record<string, { views: number; likes: number; clicks: number; saves: number }> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    days[d.toISOString().slice(0, 10)] = { views: 0, likes: 0, clicks: 0, saves: 0 }
  }

  const totals = { views: 0, likes: 0, clicks: 0, saves: 0 }
  const perItem: Record<string, { views: number; likes: number; clicks: number; saves: number }> = {}

  for (const row of interactions) {
    const day = (row.created_at as string).slice(0, 10)
    const itemId = row.item_id as string
    const action = row.action as string

    if (days[day]) {
      if (action === 'view_detail')      { days[day].views++;  totals.views++ }
      else if (action === 'swipe_right') { days[day].likes++;  totals.likes++ }
      else if (action === 'external_click') { days[day].clicks++; totals.clicks++ }
      else if (action === 'save')        { days[day].saves++;  totals.saves++ }
    }

    if (!perItem[itemId]) perItem[itemId] = { views: 0, likes: 0, clicks: 0, saves: 0 }
    if (action === 'view_detail')      perItem[itemId].views++
    else if (action === 'swipe_right') perItem[itemId].likes++
    else if (action === 'external_click') perItem[itemId].clicks++
    else if (action === 'save')        perItem[itemId].saves++
  }

  // Top items by total engagements
  const topItems = (sellerItems ?? [])
    .map(item => {
      const s = perItem[item.id as string] ?? { views: 0, likes: 0, clicks: 0, saves: 0 }
      return {
        id: item.id as string,
        title: item.title as string,
        category: (item.category as string | null) ?? '',
        imageUrl: ((item.image_urls as string[])?.[0]) ?? '',
        ...s,
        total: s.views + s.likes + s.clicks + s.saves,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const dailySeries = Object.entries(days).map(([date, counts]) => ({ date, ...counts }))

  return (
    <AnalyticsView
      businessName={seller.business_name as string}
      totals={totals}
      dailySeries={dailySeries}
      topItems={topItems}
    />
  )
}
