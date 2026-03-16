import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STRIPE_PLANS } from '@/lib/plans'
import SubscriptionManager from '@/components/seller/SubscriptionManager'
import type { SubscriptionTier } from '@/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { success?: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, business_name, description, city, category, subscription_status, subscription_tier, items_count, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!seller) redirect('/onboarding')

  const { data: recentItems } = await supabase
    .from('items')
    .select('id, title, price, currency, type, category, is_active, created_at')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const justSubscribed = searchParams.success === 'true'

  const tier = seller.subscription_tier as SubscriptionTier | null
  const plan = tier ? STRIPE_PLANS[tier] : null
  const isActive = seller.subscription_status === 'active' || seller.subscription_status === 'trialing'
  const itemsCount = (seller.items_count as number) ?? 0
  const itemsLimit = plan ? plan.items_limit : 0

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl font-bold text-[#0F0F0F]">
          {seller.business_name as string}
        </h1>
        <p className="text-[#6B6B6B] text-sm mt-1">
          {seller.city as string} · {seller.category as string}
        </p>
      </div>

      {/* Success toast */}
      {justSubscribed && (
        <div className="bg-[#0F0F0F] text-white rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-semibold text-sm">Подписка активирована!</p>
            <p className="text-white/70 text-xs mt-0.5">Теперь добавляйте товары в ленту Swipely.</p>
          </div>
        </div>
      )}

      {/* No subscription — show plan cards */}
      {!isActive ? (
        <div>
          <div className="mb-5">
            <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#0F0F0F]">
              Выберите тариф
            </h2>
            <p className="text-[#6B6B6B] text-sm mt-1">
              Чтобы добавлять товары в ленту, оформите подписку.
            </p>
          </div>
          <SubscriptionManager
            hasCustomer={!!(seller.stripe_customer_id as string | null)}
            currentTier={null}
            isActive={false}
          />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Товаров размещено"
              value={String(itemsCount)}
              sub={itemsLimit === Infinity ? 'Безлимит' : `из ${itemsLimit}`}
            />
            <StatCard
              label="Тариф"
              value={plan?.name ?? '—'}
              sub={plan ? `₽${plan.price_rub.toLocaleString('ru-RU')}/мес` : ''}
              accent
            />
          </div>

          {/* Items limit progress (only for finite limits) */}
          {itemsLimit !== Infinity && (
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex justify-between text-[13px] font-medium text-[#0F0F0F] mb-2">
                <span>Использование лимита</span>
                <span>{itemsCount} / {itemsLimit}</span>
              </div>
              <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F0F0F] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (itemsCount / (itemsLimit as number)) * 100)}%` }}
                />
              </div>
              {itemsCount >= (itemsLimit as number) && (
                <p className="text-[#FF4D4D] text-[12px] mt-2 font-medium">
                  Лимит достигнут — обновите тариф для добавления новых товаров.
                </p>
              )}
            </div>
          )}

          {/* Subscription management */}
          <SubscriptionManager
            hasCustomer={!!(seller.stripe_customer_id as string | null)}
            currentTier={tier}
            isActive={true}
          />

          {/* Recent items */}
          {recentItems && recentItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[15px] text-[#0F0F0F]">Последние товары</h2>
                <a href="/items" className="text-[13px] font-medium text-[#6B6B6B] hover:text-[#0F0F0F] transition-colors">
                  Все товары →
                </a>
              </div>
              <div className="space-y-2">
                {recentItems.map((item) => (
                  <div
                    key={item.id as string}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F0F0F] truncate">{item.title as string}</p>
                      <p className="text-[12px] text-[#6B6B6B] mt-0.5">{item.category as string}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      {item.price != null && (
                        <span className="font-['DM_Mono'] text-[13px] font-medium text-[#0F0F0F]">
                          ₽{Number(item.price).toLocaleString('ru-RU')}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          item.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-[#F0F0F0] text-[#6B6B6B]'
                        }`}
                      >
                        {item.is_active ? 'Активен' : 'Скрыт'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${
        accent ? 'bg-[#0F0F0F] text-white' : 'bg-white text-[#0F0F0F]'
      }`}
    >
      <p className={`text-[12px] font-medium mb-1 ${accent ? 'text-white/60' : 'text-[#6B6B6B]'}`}>
        {label}
      </p>
      <p className={`font-['Playfair_Display'] text-2xl font-bold ${accent ? 'text-white' : 'text-[#0F0F0F]'}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-[12px] mt-0.5 ${accent ? 'text-white/60' : 'text-[#6B6B6B]'}`}>{sub}</p>
      )}
    </div>
  )
}
