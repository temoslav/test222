-- Popularity counters for items
ALTER TABLE items 
  ADD COLUMN IF NOT EXISTS wishlist_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS items_wishlist_idx 
  ON items(wishlist_count DESC);

-- Enrichment signals in interactions (for Sprint C taste training)
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS category_slug text,
  ADD COLUMN IF NOT EXISTS item_tags text[];

-- Safe wishlist counter functions
CREATE OR REPLACE FUNCTION increment_wishlist_count(p_item_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE items SET wishlist_count = wishlist_count + 1
  WHERE id = p_item_id;
$$;

CREATE OR REPLACE FUNCTION decrement_wishlist_count(p_item_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE items SET wishlist_count = GREATEST(0, wishlist_count - 1)
  WHERE id = p_item_id;
$$;
