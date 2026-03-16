-- Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  created_at timestamptz default now(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS for wishlist
alter table wishlist enable row level security;

-- Create wishlist policy
create policy "users manage own wishlist"
on wishlist for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
