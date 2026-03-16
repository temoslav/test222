CREATE TABLE IF NOT EXISTS item_enrichments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade unique,
  category_slug text references categories(slug),
  tags text[],
  audience_slugs text[],
  mood text,
  price_tier text, -- 'free' | 'budget' | 'medium' | 'premium'
  ai_confidence float,
  ai_model text,
  enriched_at timestamptz default now(),
  needs_reenrichment boolean default false
);

CREATE INDEX enrichments_item_idx ON item_enrichments(item_id);
CREATE INDEX enrichments_category_idx ON item_enrichments(category_slug);

ALTER TABLE item_enrichments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read enrichments" ON item_enrichments
  FOR SELECT USING (true);
