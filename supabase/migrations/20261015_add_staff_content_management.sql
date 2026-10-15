create or replace function public.current_profile_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  description text,
  difficulty text not null default 'beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_id, name)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete set null,
  question text not null,
  question_type text not null default 'mcq',
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  explanation text,
  difficulty text not null default 'beginner',
  marks integer not null default 1 check (marks > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_subject_idx on public.topics(subject_id);
create index if not exists questions_topic_idx on public.questions(topic_id);
create index if not exists questions_created_by_idx on public.questions(created_by);

alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;

create policy subjects_read_authenticated on public.subjects for select to authenticated using (true);
create policy subjects_admin_write on public.subjects for all to authenticated using (public.current_profile_role()='admin') with check (public.current_profile_role()='admin');
create policy topics_read_authenticated on public.topics for select to authenticated using (true);
create policy topics_admin_write on public.topics for all to authenticated using (public.current_profile_role()='admin') with check (public.current_profile_role()='admin');
create policy questions_read_authenticated on public.questions for select to authenticated using (true);
create policy questions_staff_insert on public.questions for insert to authenticated with check (public.current_profile_role() in ('admin','teacher') and created_by = auth.uid());
create policy questions_staff_update on public.questions for update to authenticated using (public.current_profile_role() in ('admin','teacher') and (created_by = auth.uid() or public.current_profile_role()='admin')) with check (public.current_profile_role() in ('admin','teacher'));
create policy questions_admin_delete on public.questions for delete to authenticated using (public.current_profile_role()='admin');

insert into public.subjects(name,description) values
 ('Computer Science','Programming, algorithms, databases and computing fundamentals.'),
 ('Cyber Security','Security fundamentals, ethical hacking and defensive security.'),
 ('Mathematics','Problem solving, reasoning and mathematical foundations.')
on conflict (name) do nothing;
