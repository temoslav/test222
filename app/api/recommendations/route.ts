import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('Auth in recommendations:', user?.id ?? 'NOT AUTHENTICATED')

  let query = supabase
    .from('items')
    .select('id, title, description, price, currency, category, type, image_urls, external_url, city, source, starts_at, ends_at, seller_id, is_active')
    .eq('is_active', true)

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('interests, price_min, price_max')
      .eq('id', user.id)
      .single()

    const priceMin = profile?.price_min ?? 0
    const priceMax = profile?.price_max ?? 500000

    console.log('Budget from DB:', priceMin, '-', priceMax)

    if (priceMax < 500000 || priceMin > 0) {
      query = query.or(
        `price.is.null,and(price.gte.${priceMin},price.lte.${priceMax})` 
      )
    }
  }

  const { data: items, error } = await query
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Recommendations error:', error)
    return Response.json([], { status: 500 })
  }

  return Response.json(items ?? [])
}
