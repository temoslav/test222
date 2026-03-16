// All shared TypeScript types for Swipely
// No `any` — strict mode enforced

export type UserRole = 'buyer' | 'seller'
export type ItemType = 'product' | 'event' | 'place'
export type ItemSource = 'uploaded' | 'parsed' | 'api'
export type ItemStatus = 'active' | 'pending' | 'draft'
export type SubscriptionStatus = 'free' | 'premium' | 'active' | 'canceled' | 'past_due' | 'trialing'
export type SubscriptionTier = 'start' | 'business' | 'brand'
export type SwipeAction = 'swipe_right' | 'swipe_left' | 'save' | 'share' | 'view_detail' | 'external_click'
export type SwipeDirection = 'left' | 'right'
export type SwipeSpeed = 'fast' | 'medium' | 'slow'

export interface Profile {
  id: string
  email: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  city: string | null
  age_group: string | null
  gender: string | null
  interests: string[]
  price_min: number
  price_max: number
  onboarding_complete: boolean
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  taste_vector: number[] | null
  created_at: string
  updated_at: string
}

export interface SavedItem {
  id: string
  user_id: string
  item_id: string
  created_at: string
  item?: Item
}

export interface Item {
  id: string
  source: ItemSource
  status: ItemStatus
  type: ItemType
  title: string
  description: string | null
  price: number | null
  currency: string
  image_urls: string[]
  category: string | null
  subcategory: string | null
  brand: string | null
  city: string | null
  location: { lat: number; lng: number; address: string } | null
  external_url: string | null
  seller_id: string | null
  content_vector?: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Seller {
  id: string
  user_id: string
  business_name: string
  description: string | null
  logo_url: string | null
  city: string | null
  category: string | null
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus | null
  subscription_tier: SubscriptionTier | null
  items_count: number
  created_at: string
}

export interface Interaction {
  id: string
  user_id: string
  item_id: string
  action: SwipeAction
  dwell_time_ms: number | null
  swipe_speed: SwipeSpeed | null
  session_id: string | null
  context: {
    time_of_day?: string
    day_of_week?: string
    city?: string
  } | null
  created_at: string
}

export interface TasteSnapshot {
  id: string
  user_id: string
  week: string
  category_weights: Record<string, number>
  price_sensitivity: { min: number; max: number; sweet_spot: number }
  active_hours: Record<string, number>
  top_signals: Record<string, unknown>
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  items_shown: number
  swipes_right: number
  swipes_left: number
  saves: number
  city: string | null
  device_type: string | null
}

// SwipeCard display item (subset of Item for UI)
export interface SwipeItem {
  id: string
  type: ItemType
  title: string
  description: string | null
  price: number | null
  currency: string
  category: string | null
  brand: string | null
  city: string | null
  image_urls: string[]
  imageUrl?: string // deprecated fallback
  external_url?: string | null
  starts_at?: string | null
  ends_at?: string | null
  enrichment?: {
    category_slug: string
    tags: string[]
    mood: string
    price_tier: string
  }
}
