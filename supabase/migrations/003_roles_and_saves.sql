-- ============================================================
-- 003_roles_and_saves.sql
-- Adds role system, user preferences, and saved items
-- Run: supabase db push  OR paste into Supabase SQL editor
-- ============================================================

-- ── profiles: new columns ───────────────────────────────────
alter table profiles
  add column if not exists role               text not null default 'buyer'
    check (role in ('buyer', 'seller')),
  add column if not exists display_name       text,
  add column if not exists avatar_url         text,
  add column if not exists interests          text[] not null default '{}',
  add column if not exists onboarding_complete boolean not null default false;

-- ── Update signup trigger to read role from Supabase metadata ─
-- Call supabase.auth.signUp({ options: { data: { role: 'buyer'|'seller' } } })
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  );
  return new;
end;
$$;

-- ── items: add status for pending seller items ───────────────
alter table items
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending', 'draft'));

-- Only show status='active' items in the public feed
drop policy if exists "items_select_active_public" on items;
create policy "items_select_active_public"
  on items for select
  using (is_active = true and status = 'active');

-- ── saved_items: explicit saves (bookmarks) ──────────────────
create table if not exists saved_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  item_id     uuid not null references items(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists saved_items_user_id_idx on saved_items(user_id);
create index if not exists saved_items_item_id_idx on saved_items(item_id);

alter table saved_items enable row level security;

create policy "saved_items_all_own"
  on saved_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Storage bucket for avatars ───────────────────────────────
-- Run manually in Supabase dashboard → Storage:
--   Create bucket "avatars" with public = true
--   Policy: authenticated users can upload to avatars/{user_id}/*
