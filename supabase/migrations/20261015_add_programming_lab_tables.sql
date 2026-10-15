create table if not exists public.programming_languages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  version text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.programming_topics (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.programming_languages(id) on delete cascade,
  name text not null,
  slug text not null,
  difficulty text not null default 'beginner',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(language_id, slug)
);

create table if not exists public.programming_challenges (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.programming_topics(id) on delete cascade,
  title text not null,
  prompt text not null,
  starter_code text,
  expected_output text,
  difficulty text not null default 'beginner',
  created_at timestamptz not null default now()
);

create table if not exists public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid references public.programming_challenges(id) on delete set null,
  language text not null,
  code text not null,
  status text not null default 'submitted',
  output text,
  error_message text,
  execution_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists programming_topics_language_idx on public.programming_topics(language_id);
create index if not exists programming_challenges_topic_idx on public.programming_challenges(topic_id);
create index if not exists code_submissions_user_idx on public.code_submissions(user_id, created_at desc);

alter table public.programming_languages enable row level security;
alter table public.programming_topics enable row level security;
alter table public.programming_challenges enable row level security;
alter table public.code_submissions enable row level security;

create policy programming_languages_read on public.programming_languages for select to authenticated using (active = true);
create policy programming_topics_read on public.programming_topics for select to authenticated using (true);
create policy programming_challenges_read on public.programming_challenges for select to authenticated using (true);
create policy code_submissions_select_own on public.code_submissions for select to authenticated using (user_id = auth.uid());
create policy code_submissions_insert_own on public.code_submissions for insert to authenticated with check (user_id = auth.uid());

insert into public.programming_languages (name, slug, version) values
('JavaScript','javascript','ES2023'),
('Python','python','3.x'),
('C','c','C17'),
('C++','cpp','C++17'),
('Java','java','17')
on conflict (slug) do nothing;

insert into public.programming_topics (language_id,name,slug,difficulty,sort_order)
select l.id, x.name, x.slug, x.difficulty, x.sort_order
from public.programming_languages l
cross join (values
  ('Variables & Data Types','variables','beginner',1),
  ('Conditions','conditions','beginner',2),
  ('Loops','loops','beginner',3),
  ('Functions','functions','beginner',4),
  ('Arrays & Collections','collections','intermediate',5),
  ('Problem Solving','problem-solving','intermediate',6)
) as x(name,slug,difficulty,sort_order)
where l.slug in ('javascript','python')
on conflict (language_id,slug) do nothing;

insert into public.programming_challenges (topic_id,title,prompt,starter_code,expected_output,difficulty)
select t.id,'Sum two numbers','Read two numbers and output their sum.','// Write your solution here\n','7','beginner'
from public.programming_topics t
join public.programming_languages l on l.id=t.language_id
where l.slug='javascript' and t.slug='variables'
  and not exists (select 1 from public.programming_challenges c where c.topic_id=t.id and c.title='Sum two numbers');
