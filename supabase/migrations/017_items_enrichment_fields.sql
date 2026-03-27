-- Add enrichment fields to items table for better categorization and filtering
-- Migration 017: Items enrichment fields

ALTER TABLE items
ADD COLUMN IF NOT EXISTS category_slug text,
ADD COLUMN IF NOT EXISTS mood text,
ADD COLUMN IF NOT EXISTS audience text[],
ADD COLUMN IF NOT EXISTS price_tier text check (price_tier in ('free','budget','medium','premium','luxury'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS items_category_slug_idx ON items(category_slug);
CREATE INDEX IF NOT EXISTS items_mood_idx ON items(mood);
CREATE INDEX IF NOT EXISTS items_price_tier_idx ON items(price_tier);

-- Add comments for documentation
COMMENT ON COLUMN items.category_slug IS 'Primary category slug from taxonomy for categorization';
COMMENT ON COLUMN items.mood IS 'Emotional mood or vibe of the item (e.g., relaxing, energetic, professional)';
COMMENT ON COLUMN items.audience IS 'Array of target audience segments (e.g., beginners, experts, families)';
COMMENT ON COLUMN items.price_tier IS 'Price tier classification: free, budget, medium, premium, luxury';
