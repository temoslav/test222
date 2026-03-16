/**
 * scripts/sync-subscription.ts
 *
 * Manually syncs a Stripe subscription into the Supabase sellers table.
 *
 * Usage:
 *   npx tsx scripts/sync-subscription.ts <email>
 *   npx tsx scripts/sync-subscription.ts --sub <subscription_id>
 *
 * Requires STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import * as fs from 'fs'
import * as path from 'path'

// ─── Load .env.local manually (tsx doesn't load it automatically) ─────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

// ─── Validate env ─────────────────────────────────────────────────────────────
const required = ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌  Missing env var: ${key}`)
    process.exit(1)
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' as 'rts' as any })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ─── Price ID → tier map ──────────────────────────────────────────────────────
function getTier(priceId: string): string | null {
  const map: Record<string, string> = {}
  if (process.env.STRIPE_PRICE_START)    map[process.env.STRIPE_PRICE_START]    = 'start'
  if (process.env.STRIPE_PRICE_BUSINESS) map[process.env.STRIPE_PRICE_BUSINESS] = 'business'
  if (process.env.STRIPE_PRICE_BRAND)    map[process.env.STRIPE_PRICE_BRAND]    = 'brand'
  return map[priceId] ?? null
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage:')
    console.error('  npx tsx scripts/sync-subscription.ts <email>')
    console.error('  npx tsx scripts/sync-subscription.ts --sub <subscription_id>')
    process.exit(1)
  }

  let sub: Stripe.Subscription
  let stripeCustomerId: string

  if (args[0] === '--sub') {
    // ── Mode 1: subscription ID provided directly ─────────────────────────────
    const subId = args[1]
    if (!subId) { console.error('❌  Provide a subscription ID after --sub'); process.exit(1) }

    console.log(`🔍  Fetching subscription ${subId} from Stripe...`)
    sub = await stripe.subscriptions.retrieve(subId)
    stripeCustomerId = sub.customer as string
    console.log(`    customer: ${stripeCustomerId}  status: ${sub.status}`)

  } else {
    // ── Mode 2: email provided → find customer on Stripe ─────────────────────
    const email = args[0]
    console.log(`🔍  Searching Stripe for customer with email: ${email}`)

    const customers = await stripe.customers.list({ email, limit: 5 })
    if (customers.data.length === 0) {
      console.error(`❌  No Stripe customer found for email: ${email}`)
      process.exit(1)
    }

    const customer = customers.data[0]
    stripeCustomerId = customer.id
    console.log(`    Found customer: ${stripeCustomerId} (${(customer as any).email})`)

    // Find most recent active subscription for this customer
    const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 5 })
    if (subs.data.length === 0) {
      // Try trialing
      const trialing = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'trialing', limit: 5 })
      if (trialing.data.length === 0) {
        console.error(`❌  No active/trialing subscription found for customer ${stripeCustomerId}`)
        process.exit(1)
      }
      sub = trialing.data[0]
    } else {
      sub = subs.data[0]
    }
    console.log(`    Subscription: ${sub.id}  status: ${sub.status}`)
  }

  // ── Resolve tier ──────────────────────────────────────────────────────────
  const priceId = sub.items.data[0]?.price.id
  const tier = priceId ? getTier(priceId) : null
  const dbStatus = sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'canceled'

  console.log(`    Price ID: ${priceId ?? 'none'}`)
  console.log(`    Tier:     ${tier ?? '⚠️  unrecognised price — will set tier to null'}`)
  console.log(`    DB status will be set to: ${dbStatus}`)

  // ── Find seller in DB ─────────────────────────────────────────────────────
  // Try by stripe_customer_id first
  let { data: seller } = await supabase
    .from('sellers')
    .select('id, user_id, business_name, stripe_customer_id, subscription_status, subscription_tier')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (!seller) {
    // Fall back: look up Stripe customer email → profiles.email → seller
    console.log(`⚠️  No seller found by stripe_customer_id. Looking up by customer email...`)
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer
    const customerEmail = stripeCustomer.email

    if (!customerEmail) {
      console.error('❌  Stripe customer has no email. Cannot find seller.')
      process.exit(1)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle()

    if (!profile) {
      console.error(`❌  No profile found for email: ${customerEmail}`)
      process.exit(1)
    }

    const { data: sellerByUser } = await supabase
      .from('sellers')
      .select('id, user_id, business_name, stripe_customer_id, subscription_status, subscription_tier')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (!sellerByUser) {
      console.error(`❌  No seller record found for user ${profile.id}`)
      process.exit(1)
    }

    seller = sellerByUser
  }

  console.log(`\n📦  Seller: "${seller.business_name}" (id: ${seller.id})`)
  console.log(`    Before: status=${seller.subscription_status}  tier=${seller.subscription_tier}  customer=${seller.stripe_customer_id}`)

  // ── Update DB ─────────────────────────────────────────────────────────────
  const { error } = await supabase
    .from('sellers')
    .update({
      stripe_customer_id: stripeCustomerId,
      subscription_status: dbStatus,
      subscription_tier: tier,
    })
    .eq('id', seller.id)

  if (error) {
    console.error('❌  DB update failed:', error.message)
    process.exit(1)
  }

  console.log(`    After:  status=${dbStatus}  tier=${tier}  customer=${stripeCustomerId}`)
  console.log('\n✅  Sync complete — reload the seller dashboard to verify.')
}

main().catch(err => {
  console.error('❌  Unexpected error:', err)
  process.exit(1)
})
