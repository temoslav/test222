-- Create function to get similar tags for an item using pgvector
-- Migration 018: Similar tags function

CREATE OR REPLACE FUNCTION get_similar_tags(item_id uuid, tag_limit integer DEFAULT 30)
RETURNS TABLE(slug text, tag text) AS $$
BEGIN
  RETURN QUERY
  SELECT t.slug, t.tag
  FROM tags t
  CROSS JOIN items i
  WHERE i.id = item_id
  AND t.domain IS NOT NULL
  AND t.semantic_vector IS NOT NULL
  ORDER BY t.semantic_vector <=> i.content_vector
  LIMIT tag_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_similar_tags IS 'Returns the most semantically similar tags for a given item using vector similarity';
