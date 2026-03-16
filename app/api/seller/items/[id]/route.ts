import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const itemUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().positive().optional().nullable(),
  currency: z.string().optional(),
  type: z.enum(['product', 'event', 'place']).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  image_urls: z.array(z.string().url()).max(5).optional(),
  external_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
})

type RouteContext = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const { id } = params

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

  const body: unknown = await req.json()
  const result = itemUpdateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('items')
    .update(result.data)
    .eq('id', id)
    .eq('seller_id', seller.id)
    .select('id, title, price, currency, type, category, is_active, updated_at')
    .single()

  if (error) {
    console.error('Failed to update item:', error)
    return NextResponse.json({ error: 'Не удалось обновить товар' }, { status: 500 })
  }

  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const { id } = params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, items_count')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !seller) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('seller_id', seller.id)

  if (error) {
    console.error('Failed to delete item:', error)
    return NextResponse.json({ error: 'Не удалось удалить товар' }, { status: 500 })
  }

  const currentCount = (seller.items_count as number) ?? 0
  await supabase
    .from('sellers')
    .update({ items_count: Math.max(0, currentCount - 1) })
    .eq('id', seller.id)

  return NextResponse.json({ success: true })
}
