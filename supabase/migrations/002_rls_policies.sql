-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security for all Swipely tables
-- RULE: every table has RLS — no exceptions (CLAUDE.md section 8)
-- ============================================================

-- ============================================================
-- profiles: users can only read/update their own profile
-- ============================================================
alter table profiles enable row level security;

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy: profile is created by trigger on auth.users
-- No delete policy: cascade handles this when auth.users deleted

-- ============================================================
-- sellers: each user manages their own seller account
-- ============================================================
alter table sellers enable row level security;

create policy "sellers_select_own"
  on sellers for select
  using (auth.uid() = user_id);

create policy "sellers_insert_own"
  on sellers for insert
  with check (auth.uid() = user_id);

create policy "sellers_update_own"
  on sellers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sellers_delete_own"
  on sellers for delete
  using (auth.uid() = user_id);

-- ============================================================
-- items: public can read active items; sellers manage their own
-- ============================================================
alter table items enable row level security;

-- Anyone (including anon) can see active items in the feed
create policy "items_select_active_public"
  on items for select
  using (is_active = true);

-- Sellers can see all their own items including inactive
create policy "items_select_own_seller"
  on items for select
  using (
    auth.uid() is not null
    and seller_id in (
      select id from sellers where user_id = auth.uid()
    )
  );

-- Sellers can insert items (within their subscription limit — enforced app-side)
create policy "items_insert_own_seller"
  on items for insert
  with check (
    seller_id in (
      select id from sellers where user_id = auth.uid()
    )
  );

create policy "items_update_own_seller"
  on items for update
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()
    )
  )
  with check (
    seller_id in (
      select id from sellers where user_id = auth.uid()
    )
  );

create policy "items_delete_own_seller"
  on items for delete
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()
    )
  );

-- ============================================================
-- interactions: users record/read only their own interactions
-- ============================================================
alter table interactions enable row level security;

create policy "interactions_select_own"
  on interactions for select
  using (auth.uid() = user_id);

create policy "interactions_insert_own"
  on interactions for insert
  with check (auth.uid() = user_id);

-- No update/delete — interactions are immutable audit log

-- ============================================================
-- taste_snapshots: private to each user
-- ============================================================
alter table taste_snapshots enable row level security;

create policy "taste_snapshots_select_own"
  on taste_snapshots for select
  using (auth.uid() = user_id);

create policy "taste_snapshots_insert_own"
  on taste_snapshots for insert
  with check (auth.uid() = user_id);

create policy "taste_snapshots_update_own"
  on taste_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- sessions: private to each user
-- ============================================================
alter table sessions enable row level security;

create policy "sessions_select_own"
  on sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- NOTE: service_role key bypasses RLS for admin operations.
--       Only use service_role in Edge Functions with explicit auth checks.
--       Never expose service_role to the browser (CLAUDE.md section 8).
-- ============================================================
