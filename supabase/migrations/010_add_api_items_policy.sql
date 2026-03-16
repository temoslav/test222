-- Add policy for API-inserted items (KudaGo, etc.)
-- These items have seller_id = null and source = 'api' or 'kudago'

create policy "items_insert_api_source"
  on items for insert
  with check (
    seller_id is null 
    and source in ('api', 'kudago', 'parsed')
  );

-- Allow deletion of API items for admin operations
create policy "items_delete_api_source"
  on items for delete
  using (
    seller_id is null 
    and source in ('api', 'kudago', 'parsed')
  );
