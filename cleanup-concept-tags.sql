-- Clean database of fake concept tags
-- Run these commands in Supabase SQL Editor

-- Step 1: Delete all tag relations (foreign key dependency)
DELETE FROM tag_relations;

-- Step 2: Delete content tags
DELETE FROM content_tags;

-- Step 3: Delete fake concept tags
DELETE FROM tags WHERE slug LIKE '%concept%';

-- Step 4: Verify cleanup
SELECT COUNT(*) FROM tags; -- should show ~228 (18 legacy + 210 real v2 tags)
SELECT COUNT(*) FROM tag_relations; -- should show 0

-- Additional verification: check no concept tags remain
SELECT COUNT(*) FROM tags WHERE slug LIKE '%concept%'; -- should show 0
