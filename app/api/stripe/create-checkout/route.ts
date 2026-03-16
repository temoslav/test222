import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getPriceIdForTier } from '@/lib/stripe'
import { z } from 'zod'

const subscriptionSchema = z.object({
  tier: z.enum(['start', 'business', 'brand']),
})

const cartSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await req.json()
  
  // Check if this is a cart checkout (has items) or subscription checkout (has tier)
  const isCartCheckout = body && typeof body === 'object' && 'items' in body
  const isSubscriptionCheckout = body && typeof body === 'object' && 'tier' in body

  if (isCartCheckout) {
    const result = cartSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { items } = result.data

    // Create line items for Stripe
    const line_items = items.map(item => ({
      price_data: {
        currency: 'rub',
        product_data: {
          name: `Товар #${item.id}`,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }))

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email || undefined,
      mode: 'payment',
      line_items,
      success_url: `${appUrl}/hochu?success=true`,
      cancel_url: `${appUrl}/hochu`,
      metadata: { user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  }

  if (isSubscriptionCheckout) {
    const result = subscriptionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { tier } = result.data

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, stripe_customer_id, business_name')
      .eq('user_id', user.id)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller account not found' }, { status: 404 })
    }

    let customerId = seller.stripe_customer_id as string | null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: seller.business_name as string,
        metadata: { seller_id: seller.id as string, user_id: user.id },
      })
      customerId = customer.id

      const { error: updateError } = await supabase
        .from('sellers')
        .update({ stripe_customer_id: customerId })
        .eq('id', seller.id)

      if (updateError) {
        console.error('Failed to save stripe_customer_id:', updateError)
        return NextResponse.json({ error: 'Failed to create billing account' }, { status: 500 })
      }
    }

    let priceId: string
    try {
      priceId = getPriceIdForTier(tier)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Price not configured'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: { seller_id: seller.id as string, tier },
    })

    return NextResponse.json({ url: session.url })
  }

  return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
}
