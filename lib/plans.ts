// Client-safe plan definitions (no server imports)
// stripe.ts imports these and re-exports STRIPE_PLANS for server-side usage.

export const STRIPE_PLANS = {
  start: {
    name: 'Старт',
    price_rub: 1990,
    items_limit: 10,
    features: ['До 10 позиций'],
  },
  business: {
    name: 'Бизнес',
    price_rub: 4990,
    items_limit: 50,
    features: ['До 50 позиций', 'Аналитика'],
  },
  brand: {
    name: 'Бренд',
    price_rub: 12000,
    items_limit: Infinity,
    features: ['Безлимит', 'Приоритет в ленте', 'Аналитика'],
  },
  premium_user: {
    name: 'Premium',
    price_rub: 299,
    items_limit: 0,
    features: ['Без рекламы', 'Расширенные фильтры', 'Персональные подборки'],
  },
} as const
