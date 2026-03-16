import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ItemsManager from '@/components/seller/ItemsManager'
import type { SellerItem } from '@/components/seller/ItemsManager'

export default async function ItemsPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, subscription_status, subscription_tier, items_count')
    .eq('user_id', user.id)
    .single()

  if (!seller) redirect('/onboarding')

  const isActive =
    seller.subscription_status === 'active' ||
    seller.subscription_status === 'trialing'

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-4xl mb-4">🔒</span>
        <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#0F0F0F] mb-2">
          Требуется подписка
        </h2>
        <p className="text-[#6B6B6B] text-sm max-w-xs mb-6">
          Чтобы добавлять товары в ленту Swipely, оформите подписку на странице обзора.
        </p>
        <a
          href="/dashboard"
          className="h-11 px-6 bg-[#0F0F0F] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center"
        >
          Выбрать тариф →
        </a>
      </div>
    )
  }

  const { data: rawItems } = await supabase
    .from('items')
    .select('id, title, description, price, currency, type, category, subcategory, brand, city, image_urls, external_url, is_active, starts_at, ends_at, created_at, updated_at')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })

  const items: SellerItem[] = (rawItems ?? []).map((i) => ({
    id: i.id as string,
    title: i.title as string,
    description: (i.description as string | null) ?? null,
    price: i.price != null ? Number(i.price) : null,
    currency: (i.currency as string) ?? 'RUB',
    type: i.type as SellerItem['type'],
    category: (i.category as string | null) ?? null,
    subcategory: (i.subcategory as string | null) ?? null,
    brand: (i.brand as string | null) ?? null,
    city: (i.city as string | null) ?? null,
    image_urls: (i.image_urls as string[]) ?? [],
    external_url: (i.external_url as string | null) ?? null,
    is_active: i.is_active as boolean,
    starts_at: (i.starts_at as string | null) ?? null,
    ends_at: (i.ends_at as string | null) ?? null,
    created_at: i.created_at as string,
    updated_at: i.updated_at as string,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#0F0F0F]">Мои товары</h1>
        <p className="text-[#6B6B6B] text-sm mt-1">
          Управляйте позициями в ленте Swipely
        </p>
      </div>
      <ItemsManager initialItems={items} />
    </div>
  )
}
