-- STEP 2: Clean database from old bad tags
-- Run these commands in Supabase SQL Editor

-- Delete all tag relations (foreign key dependency)
DELETE FROM tag_relations;

-- Delete content tags
DELETE FROM content_tags;

-- Delete all v2 taxonomy tags (keep legacy tags where domain IS NULL)
DELETE FROM tags WHERE domain IS NOT NULL;

-- Verify cleanup
SELECT COUNT(*) FROM tags WHERE domain IS NOT NULL; -- should show 0
SELECT COUNT(*) FROM tag_relations; -- should show 0
SELECT COUNT(*) FROM content_tags; -- should show 0
