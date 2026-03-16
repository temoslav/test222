-- Remove dangerous API items policy
-- This policy allows anyone to inject data - SECURITY RISK

DROP POLICY IF EXISTS "items_insert_api_source" ON items;
DROP POLICY IF EXISTS "items_delete_api_source" ON items;
