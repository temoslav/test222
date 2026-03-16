-- Create function to get unenriched items using LEFT JOIN
CREATE OR REPLACE FUNCTION get_unenriched_items(batch_size integer)
RETURNS TABLE(id uuid, title text, description text, price numeric)
LANGUAGE sql
AS $$
  SELECT i.id, i.title, i.description, i.price
  FROM items i
  LEFT JOIN item_enrichments ie ON ie.item_id = i.id
  WHERE i.source = 'kudago'
  AND i.is_active = true
  AND ie.id IS NULL
  LIMIT batch_size;
$$;
