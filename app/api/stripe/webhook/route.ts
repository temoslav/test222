import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { stripe, getTierForPriceId } from '@/lib/stripe'

// Uses service_role to bypass RLS — this is a trusted server-to-server webhook
function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// IMPORTANT: Always verify webhook signature — never trust client data (CLAUDE.md section 8)
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const supabase = getAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Handle subscription payments (existing logic)
        if (session.mode === 'subscription') {
          const sellerId = session.metadata?.seller_id
          if (!sellerId || !session.customer || !session.subscription) break

          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0]?.price.id
          const tier = priceId ? getTierForPriceId(priceId) : null

          const { error } = await supabase
            .from('sellers')
            .update({
              stripe_customer_id: session.customer as string,
              subscription_status: 'active',
              subscription_tier: tier,
            })
            .eq('id', sellerId)

          if (error) {
            console.error('DB update failed for checkout.session.completed:', error)
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
          }
        }
        
        // Handle one-time payments (cart checkout)
        if (session.mode === 'payment') {
          const userId = session.metadata?.user_id
          if (userId) {
            // Clear user's cart after successful payment
            const { error } = await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', userId)
            
            if (error) {
              console.error('Failed to clear cart after payment:', error)
            }
          }
        }
        
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const tier = priceId ? getTierForPriceId(priceId) : null

        const rawStatus = subscription.status
        const dbStatus =
          rawStatus === 'active' || rawStatus === 'trialing'
            ? rawStatus
            : rawStatus === 'past_due'
            ? 'past_due'
            : 'canceled'

        // Update sellers table (B2B subscriptions)
        await supabase
          .from('sellers')
          .update({ subscription_status: dbStatus, subscription_tier: tier })
          .eq('stripe_customer_id', customerId)

        // Update profiles table (B2C premium subscriptions)
        const profileStatus = dbStatus === 'active' || dbStatus === 'trialing' ? 'premium' : 'free'
        await supabase
          .from('profiles')
          .update({ subscription_status: profileStatus })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('sellers')
          .update({ subscription_status: 'canceled', subscription_tier: null })
          .eq('stripe_customer_id', customerId)

        await supabase
          .from('profiles')
          .update({ subscription_status: 'free' })
          .eq('stripe_customer_id', customerId)

        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler threw:', err)
    return NextResponse.json({ error: 'Internal error processing webhook' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
