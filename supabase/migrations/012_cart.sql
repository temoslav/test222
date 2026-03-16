-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  quantity integer default 1,
  added_at timestamptz default now(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS for cart_items
alter table cart_items enable row level security;

-- Create cart policy
create policy "users manage own cart"
on cart_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
