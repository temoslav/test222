CREATE TABLE IF NOT EXISTS raw_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  raw_data jsonb not null,
  fetched_at timestamptz default now(),
  processed boolean default false,
  processed_at timestamptz,
  UNIQUE(source, external_id)
);

CREATE INDEX raw_events_unprocessed_idx 
  ON raw_events(processed, fetched_at) 
  WHERE processed = false;

ALTER TABLE raw_events ENABLE ROW LEVEL SECURITY;
-- No public access — only service_role
