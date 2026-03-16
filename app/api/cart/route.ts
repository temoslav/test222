import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

const cartAddSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
})

const cartUpdateSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1),
})

const cartRemoveSchema = z.object({
  item_id: z.string().uuid(),
})

// GET - Get user's cart with full item data and total sum
export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      items (
        id, title, description, price, currency, category, type,
        image_urls, external_url, city, source, starts_at, ends_at,
        seller_id, brand, is_active, created_at
      )
    `)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate total sum
  const total = data?.reduce((sum, item) => {
    const price = item.items?.price || 0
    return sum + (price * item.quantity)
  }, 0) || 0

  return NextResponse.json({ 
    data,
    total,
    count: data?.length || 0
  })
}

// POST - Add item to cart
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = cartAddSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { item_id, quantity } = result.data

  const { data, error } = await supabase
    .from('cart_items')
    .upsert({ user_id: user.id, item_id, quantity })
    .select(`
      *,
      items (
        id, title, description, price, currency, category, type,
        image_urls, external_url, city, source, starts_at, ends_at,
        seller_id, brand, is_active, created_at
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// DELETE - Remove item from cart
export async function DELETE(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = cartRemoveSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { item_id } = result.data

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
    .eq('item_id', item_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH - Update item quantity in cart
export async function PATCH(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = cartUpdateSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { item_id, quantity } = result.data

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .select(`
      *,
      items (
        id, title, description, price, currency, category, type,
        image_urls, external_url, city, source, starts_at, ends_at,
        seller_id, brand, is_active, created_at
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
