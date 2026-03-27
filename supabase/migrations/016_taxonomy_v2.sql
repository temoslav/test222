-- Migration: Tags v2 with semantic metadata
-- Adds comprehensive taxonomy structure with relations and content tagging
CREATE EXTENSION IF NOT EXISTS vector;
-- Add new columns to existing tags table (preserve existing data)
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS tag text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS cluster text,
ADD COLUMN IF NOT EXISTS tag_type text,
ADD COLUMN IF NOT EXISTS intent_type text,
ADD COLUMN IF NOT EXISTS emotional_signal text,
ADD COLUMN IF NOT EXISTS lifecycle_stage text,
ADD COLUMN IF NOT EXISTS accessibility_level text,
ADD COLUMN IF NOT EXISTS decay_factor float default 0.5,
ADD COLUMN IF NOT EXISTS global_relevance_score float default 0.5,
ADD COLUMN IF NOT EXISTS cross_domain_power float default 0.5,
ADD COLUMN IF NOT EXISTS usage_count integer default 0,
ADD COLUMN IF NOT EXISTS semantic_vector vector(512);

-- Enhance categories table with hierarchy support
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS parent_slug text,
ADD COLUMN IF NOT EXISTS level integer default 1;

-- Create tag relations table for semantic connections
CREATE TABLE IF NOT EXISTS tag_relations (
  tag_slug text references tags(slug),
  related_tag_slug text references tags(slug),
  relation_type text check (relation_type in ('similar','complementary','next_step','opposite')),
  strength float,
  primary key (tag_slug, related_tag_slug, relation_type)
);

-- Create content tagging table for AI-enriched content assignments
CREATE TABLE IF NOT EXISTS content_tags (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null,
  content_type text not null check (content_type in ('event','product','education')),
  tag_slug text references tags(slug),
  confidence_score float not null,
  source text not null check (source in ('ai','manual','behavioral')),
  model_version text,
  enriched_at timestamptz default now()
);

-- Enable RLS for new tables
ALTER TABLE tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

-- Create read policies for public access
CREATE POLICY "public read tag_relations" ON tag_relations FOR SELECT USING (true);
CREATE POLICY "public read content_tags" ON content_tags FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tags_category_idx ON tags(category);
CREATE INDEX IF NOT EXISTS tags_domain_idx ON tags(domain);
CREATE INDEX IF NOT EXISTS tags_type_idx ON tags(tag_type);
CREATE INDEX IF NOT EXISTS tags_usage_count_idx ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS tags_relevance_score_idx ON tags(global_relevance_score DESC);

CREATE INDEX IF NOT EXISTS content_tags_content_idx ON content_tags(content_id, content_type);
CREATE INDEX IF NOT EXISTS content_tags_tag_idx ON content_tags(tag_slug);
CREATE INDEX IF NOT EXISTS content_tags_confidence_idx ON content_tags(confidence_score DESC);
CREATE INDEX IF NOT EXISTS content_tags_enriched_at_idx ON content_tags(enriched_at DESC);

CREATE INDEX IF NOT EXISTS tag_relations_tag_idx ON tag_relations(tag_slug);
CREATE INDEX IF NOT EXISTS tag_relations_related_idx ON tag_relations(related_tag_slug);
CREATE INDEX IF NOT EXISTS tag_relations_type_idx ON tag_relations(relation_type);
CREATE INDEX IF NOT EXISTS tag_relations_strength_idx ON tag_relations(strength DESC);

-- Add foreign key constraints for categories hierarchy
ALTER TABLE categories ADD CONSTRAINT categories_parent_fk 
  FOREIGN KEY (parent_slug) REFERENCES categories(slug) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON TABLE tags IS 'Enhanced tags table with semantic metadata and AI enrichment support';
COMMENT ON TABLE tag_relations IS 'Semantic relationships between tags (similar, complementary, next_step, opposite)';
COMMENT ON TABLE content_tags IS 'AI-generated tag assignments for content with confidence scoring';
COMMENT ON COLUMN tags.semantic_vector IS 'Voyage AI embedding vector (512) for semantic similarity search';
COMMENT ON COLUMN tags.usage_count IS 'Incremented on user interactions with tagged content';
COMMENT ON COLUMN content_tags.confidence_score IS 'AI model confidence in tag assignment (0-1)';
COMMENT ON COLUMN content_tags.source IS 'Tag assignment source: ai, manual, or behavioral';
