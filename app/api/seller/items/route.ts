import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STRIPE_PLANS } from '@/lib/plans'
import { z } from 'zod'
import type { SubscriptionTier } from '@/types'

const itemCreateSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().positive('Цена должна быть положительной').optional().nullable(),
  currency: z.string().default('RUB'),
  type: z.enum(['product', 'event', 'place']),
  category: z.string().min(1, 'Выберите категорию'),
  subcategory: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  city: z.string().min(1, 'Укажите город'),
  image_urls: z.array(z.string().url('Неверный формат ссылки на изображение')).max(5).default([]),
  external_url: z.string().url('Неверный формат ссылки').optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  const { data: items, error } = await supabase
    .from('items')
    .select('id, title, description, price, currency, type, category, subcategory, brand, city, image_urls, external_url, is_active, starts_at, ends_at, created_at, updated_at')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch seller items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, subscription_tier, items_count, subscription_status')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  const status = seller.subscription_status as string | null
  if (status !== 'active' && status !== 'trialing') {
    return NextResponse.json(
      { error: 'Для добавления товаров необходима активная подписка' },
      { status: 403 }
    )
  }

  const tier = seller.subscription_tier as SubscriptionTier | null
  const limit = tier ? STRIPE_PLANS[tier].items_limit : 0
  const count = (seller.items_count as number) ?? 0

  if (limit !== Infinity && count >= limit) {
    return NextResponse.json(
      { error: `Лимит товаров для вашего тарифа (${limit}) достигнут` },
      { status: 403 }
    )
  }

  const body: unknown = await req.json()
  const result = itemCreateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const d = result.data

  const { data: item, error: insertError } = await supabase
    .from('items')
    .insert({
      source: 'uploaded',
      type: d.type,
      title: d.title,
      description: d.description ?? null,
      price: d.price ?? null,
      currency: d.currency,
      image_urls: d.image_urls,
      category: d.category,
      subcategory: d.subcategory ?? null,
      brand: d.brand ?? null,
      city: d.city,
      external_url: d.external_url ?? null,
      seller_id: seller.id,
      is_active: true,
      starts_at: d.starts_at ?? null,
      ends_at: d.ends_at ?? null,
    })
    .select('id, title, description, price, currency, type, category, subcategory, brand, city, image_urls, external_url, is_active, starts_at, ends_at, created_at, updated_at')
    .single()

  if (insertError) {
    console.error('Failed to insert item:', insertError)
    return NextResponse.json({ error: 'Не удалось добавить товар' }, { status: 500 })
  }

  await supabase
    .from('sellers')
    .update({ items_count: count + 1 })
    .eq('id', seller.id)

  return NextResponse.json({ item }, { status: 201 })
}
