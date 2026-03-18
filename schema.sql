-- Run this in the Supabase SQL Editor

-- Enable pgvector
create extension if not exists vector;

-- ─── candidates ───────────────────────────────────────────────────────────────
create table if not exists candidates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text,
  source          text default 'manual',
  raw_text        text,
  parsed          jsonb,
  credibility_score integer default 0,
  embedding       vector(1536),
  created_at      timestamptz default now()
);

-- ─── jobs ─────────────────────────────────────────────────────────────────────
create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  requirements jsonb,             -- structured AI scoring context
  embedding    vector(1536),
  created_at   timestamptz default now()
);

-- Migration for existing installations:
-- alter table jobs add column if not exists requirements jsonb;

-- ─── applications ─────────────────────────────────────────────────────────────
create table if not exists applications (
  id                   uuid primary key default gen_random_uuid(),
  candidate_id         uuid references candidates(id) on delete cascade,
  job_id               uuid references jobs(id) on delete cascade,
  match_score          integer default 0,
  credibility_score    integer default 0,
  interview_score      integer default 0,
  overall_score        integer default 0,
  status               text default 'inbox',
  interview_date       timestamptz,
  interview_room_url   text,
  video_url            text,
  transcript           text,
  analysis             jsonb,
  attention_events     jsonb,
  created_at           timestamptz default now()
);

-- ─── Semantic search function ─────────────────────────────────────────────────
create or replace function match_candidates(
  query_embedding vector(1536),
  match_count     int default 10
)
returns table (
  id         uuid,
  similarity float
)
language sql stable
as $$
  select
    id,
    1 - (embedding <=> query_embedding) as similarity
  from candidates
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists candidates_embedding_idx
  on candidates using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists jobs_embedding_idx
  on jobs using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- ─── Row Level Security (open for demo) ──────────────────────────────────────
alter table candidates enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;

create policy "open_read_candidates" on candidates for all using (true) with check (true);
create policy "open_read_jobs" on jobs for all using (true) with check (true);
create policy "open_read_applications" on applications for all using (true) with check (true);
