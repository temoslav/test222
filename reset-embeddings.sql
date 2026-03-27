-- Reset all semantic vectors to NULL so we can embed all 1162 tags
-- Run this in Supabase SQL Editor before running embed-taxonomy.mjs

UPDATE tags SET semantic_vector = NULL WHERE domain IS NOT NULL;

-- Verify reset
SELECT COUNT(*) FROM tags WHERE domain IS NOT NULL AND semantic_vector IS NULL;
