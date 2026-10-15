create table if not exists public.saved_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  topic text not null,
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, subject, topic)
);

create index if not exists saved_topics_user_created_idx on public.saved_topics(user_id, created_at desc);
create index if not exists saved_topics_user_topic_idx on public.saved_topics(user_id, topic);

alter table public.saved_topics enable row level security;
create policy saved_topics_select_own on public.saved_topics for select to authenticated using (user_id = auth.uid());
create policy saved_topics_insert_own on public.saved_topics for insert to authenticated with check (user_id = auth.uid());
create policy saved_topics_update_own on public.saved_topics for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_topics_delete_own on public.saved_topics for delete to authenticated using (user_id = auth.uid());

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_id uuid,
  title text not null,
  subtitle text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bookmarks_user_created_idx on public.bookmarks(user_id, created_at desc);
create index if not exists bookmarks_user_kind_idx on public.bookmarks(user_id, kind);

alter table public.bookmarks enable row level security;
create policy bookmarks_select_own on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy bookmarks_insert_own on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy bookmarks_update_own on public.bookmarks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bookmarks_delete_own on public.bookmarks for delete to authenticated using (user_id = auth.uid());
