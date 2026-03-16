-- ============================================================
-- 001_initial_schema.sql
-- Swipely initial database schema
-- Run: supabase db push  OR  supabase migration up
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
-- pgvector enabled in 003_vectors.sql after initial setup

-- ============================================================
-- profiles
-- Extends auth.users — created automatically on signup via trigger
-- ============================================================
create table if not exists profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  city                  text,
  age_group             text check (age_group in ('18-24', '25-34', '35-44', '45+')),
  gender                text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  stripe_customer_id    text unique,
  subscription_status   text not null default 'free'
                          check (subscription_status in ('free', 'premium')),
  -- taste_vector added in 003_vectors.sql after pgvector is enabled
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- sellers
-- Business accounts — linked to auth.users
-- ============================================================
create table if not exists sellers (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  business_name         text not null,
  description           text,
  logo_url              text,
  city                  text,
  category              text,
  stripe_customer_id    text unique,
  subscription_status   text check (subscription_status in ('active', 'canceled', 'past_due', 'trialing')),
  subscription_tier     text check (subscription_tier in ('start', 'business', 'brand')),
  items_count           integer not null default 0,
  created_at            timestamptz not null default now()
);

create unique index sellers_user_id_idx on sellers(user_id);

-- ============================================================
-- items
-- Products, events, and places — the content of the feed
-- ============================================================
create table if not exists items (
  id              uuid primary key default uuid_generate_v4(),
  source          text not null check (source in ('uploaded', 'parsed', 'api')),
  type            text not null check (type in ('product', 'event', 'place')),
  title           text not null,
  description     text,
  price           numeric(12, 2),
  currency        text not null default 'RUB',
  image_urls      text[] not null default '{}',
  category        text,
  subcategory     text,
  brand           text,
  city            text,
  location        jsonb,              -- { lat, lng, address }
  external_url    text,
  seller_id       uuid references sellers(id) on delete set null,
  -- content_vector added in 003_vectors.sql
  is_active       boolean not null default true,
  starts_at       timestamptz,        -- for events
  ends_at         timestamptz,        -- for events
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger items_updated_at
  before update on items
  for each row execute procedure update_updated_at();

create index items_type_idx on items(type);
create index items_city_idx on items(city);
create index items_seller_idx on items(seller_id);
create index items_is_active_idx on items(is_active);
create index items_category_idx on items(category);

-- ============================================================
-- interactions
-- CORE TABLE: every user action on every item
-- Powers the personalization algorithm
-- ============================================================
create table if not exists interactions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  item_id         uuid not null references items(id) on delete cascade,
  action          text not null check (action in (
                    'swipe_right', 'swipe_left', 'save', 'share',
                    'view_detail', 'external_click'
                  )),
  dwell_time_ms   integer check (dwell_time_ms >= 0),
  swipe_speed     text check (swipe_speed in ('fast', 'medium', 'slow')),
  session_id      uuid,
  context         jsonb,              -- { time_of_day, day_of_week, city }
  created_at      timestamptz not null default now()
);

create index interactions_user_id_idx on interactions(user_id);
create index interactions_item_id_idx on interactions(item_id);
create index interactions_action_idx on interactions(action);
create index interactions_created_at_idx on interactions(created_at desc);
create index interactions_session_idx on interactions(session_id);

-- ============================================================
-- taste_snapshots
-- Weekly aggregated taste profile (analytics, not raw data)
-- ============================================================
create table if not exists taste_snapshots (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  week              date not null,            -- start of week (Monday)
  category_weights  jsonb not null default '{}',
  price_sensitivity jsonb not null default '{}',
  active_hours      jsonb not null default '{}',
  top_signals       jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  unique (user_id, week)
);

create index taste_snapshots_user_week_idx on taste_snapshots(user_id, week desc);

-- ============================================================
-- sessions
-- App sessions for analytics
-- ============================================================
create table if not exists sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  items_shown     integer not null default 0,
  swipes_right    integer not null default 0,
  swipes_left     integer not null default 0,
  saves           integer not null default 0,
  city            text,
  device_type     text
);

create index sessions_user_id_idx on sessions(user_id);
create index sessions_started_at_idx on sessions(started_at desc);
