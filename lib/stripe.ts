import Stripe from 'stripe'
import type { SubscriptionTier } from '@/types'
export { STRIPE_PLANS } from '@/lib/plans'

// IMPORTANT: STRIPE_SECRET_KEY is server-only — NEVER expose to client
// Only import this in server components or API routes

let _stripe: Stripe | null = null

// Lazily initialised so that importing this module does not crash when
// STRIPE_SECRET_KEY is absent (e.g. during non-Stripe server rendering).
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  })
  return _stripe
}

// Convenience alias — callers that previously used `stripe` directly keep working.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Returns the Stripe Price ID for a given seller subscription tier.
// Requires STRIPE_PRICE_START / STRIPE_PRICE_BUSINESS / STRIPE_PRICE_BRAND env vars.
export function getPriceIdForTier(tier: SubscriptionTier): string {
  const map: Record<SubscriptionTier, string | undefined> = {
    start: process.env.STRIPE_PRICE_START,
    business: process.env.STRIPE_PRICE_BUSINESS,
    brand: process.env.STRIPE_PRICE_BRAND,
  }
  const priceId = map[tier]
  if (!priceId) {
    throw new Error(`Missing STRIPE_PRICE_${tier.toUpperCase()} environment variable`)
  }
  return priceId
}

// Maps a Stripe Price ID back to a subscription tier.
// Returns null if the price ID is not recognised.
export function getTierForPriceId(priceId: string): SubscriptionTier | null {
  const map: Partial<Record<string, SubscriptionTier>> = {}
  if (process.env.STRIPE_PRICE_START) map[process.env.STRIPE_PRICE_START] = 'start'
  if (process.env.STRIPE_PRICE_BUSINESS) map[process.env.STRIPE_PRICE_BUSINESS] = 'business'
  if (process.env.STRIPE_PRICE_BRAND) map[process.env.STRIPE_PRICE_BRAND] = 'brand'
  return map[priceId] ?? null
}
