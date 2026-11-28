-- Phase 2 migration, created with the pinned Supabase CLI. Not yet applied.
-- Execute only against the explicitly designated disposable local test project.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- This narrowly scoped lookup needs access to auth.sessions. It exposes only
-- whether the caller's own signed session still exists, never session contents.
create function private.has_active_session() returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and coalesce((auth.jwt() ->> 'exp')::bigint, 0) > extract(epoch from now())
    and exists (
      select 1 from auth.sessions s
      where s.user_id = auth.uid()
        and s.id::text = auth.jwt() ->> 'session_id'
        and (s.not_after is null or s.not_after > now())
    );
$$;
revoke all on function private.has_active_session() from public, anon;
grant execute on function private.has_active_session() to authenticated;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table public.school_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_catalog.isfinite(starts_on) and pg_catalog.isfinite(ends_on) and ends_on >= starts_on),
  unique (owner_id, id)
);

create table public.grade_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null,
  period_id uuid,
  label text not null check (char_length(btrim(label)) between 1 and 200),
  value numeric(12,4) not null,
  scale_min numeric(12,4) not null,
  scale_max numeric(12,4) not null,
  weight numeric(12,4) check (weight > 0 and weight <= 1000000),
  recorded_on date not null,
  source text not null check (source in ('manual', 'imported', 'calculated', 'simulated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (value <> 'NaN'::numeric and scale_min <> 'NaN'::numeric and scale_max <> 'NaN'::numeric
    and scale_max > scale_min and value >= scale_min and value <= scale_max),
  check (pg_catalog.isfinite(recorded_on)),
  foreign key (owner_id, subject_id) references public.subjects(owner_id, id)
    on delete no action deferrable initially immediate,
  foreign key (owner_id, period_id) references public.school_periods(owner_id, id)
    on delete no action deferrable initially immediate
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid,
  period_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  due_at timestamptz,
  completed_at timestamptz,
  source text not null default 'manual' check (source = 'manual'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((due_at is null or pg_catalog.isfinite(due_at)) and (completed_at is null or pg_catalog.isfinite(completed_at))),
  foreign key (owner_id, subject_id) references public.subjects(owner_id, id)
    on delete no action deferrable initially immediate,
  foreign key (owner_id, period_id) references public.school_periods(owner_id, id)
    on delete no action deferrable initially immediate
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_catalog.isfinite(starts_at) and pg_catalog.isfinite(ends_at) and ends_at > starts_at),
  foreign key (owner_id, subject_id) references public.subjects(owner_id, id)
    on delete no action deferrable initially immediate
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid,
  period_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  scheduled_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_catalog.isfinite(scheduled_on)),
  foreign key (owner_id, subject_id) references public.subjects(owner_id, id)
    on delete no action deferrable initially immediate,
  foreign key (owner_id, period_id) references public.school_periods(owner_id, id)
    on delete no action deferrable initially immediate
);

create table public.user_settings (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  locale text not null default 'de-DE' check (locale in ('de-DE', 'pt-BR', 'en-US')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- IANA names validated against the server's time zone catalog, not a stale regex.
create function private.validate_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using errcode = '23514', message = 'Invalid timezone';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_timezone() from public, anon, authenticated;
create trigger calendar_timezone before insert or update on public.calendar_events
  for each row execute function private.validate_timezone();
create trigger settings_timezone before insert or update on public.user_settings
  for each row execute function private.validate_timezone();

-- No user_metadata is copied into privileges or ownership. Empty private profile.
create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function private.create_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.create_profile();

-- Owner indexes also support RLS, foreign keys and common chronological queries.
create index grades_owner_subject_period on public.grade_entries(owner_id, subject_id, period_id);
create index grades_owner_period on public.grade_entries(owner_id, period_id);
create index tasks_owner_due on public.tasks(owner_id, due_at, id);
create index tasks_owner_subject on public.tasks(owner_id, subject_id);
create index tasks_owner_period on public.tasks(owner_id, period_id);
create index events_owner_start on public.calendar_events(owner_id, starts_at, id);
create index events_owner_subject on public.calendar_events(owner_id, subject_id);
create index exams_owner_date on public.exams(owner_id, scheduled_on, id);
create index exams_owner_subject on public.exams(owner_id, subject_id);
create index exams_owner_period on public.exams(owner_id, period_id);

-- Profiles are provisioned by Auth and removed via account deletion, never through
-- the public API. Normal clients may only read and edit the optional display name.
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.profiles to service_role;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) and (select private.has_active_session()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select private.has_active_session()))
  with check (id = (select auth.uid()) and (select private.has_active_session()));
create trigger profiles_updated before update on public.profiles
  for each row execute function private.set_updated_at();

do $$
declare table_name text;
begin
  foreach table_name in array array['subjects', 'school_periods', 'grade_entries', 'tasks', 'calendar_events', 'exams', 'user_settings'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant select on public.%I to service_role', table_name);
    execute format('create policy owner_select on public.%I for select to authenticated using (owner_id = (select auth.uid()) and (select private.has_active_session()))', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check (owner_id = (select auth.uid()) and (select private.has_active_session()))', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using (owner_id = (select auth.uid()) and (select private.has_active_session())) with check (owner_id = (select auth.uid()) and (select private.has_active_session()))', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using (owner_id = (select auth.uid()) and (select private.has_active_session()))', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', table_name || '_updated', table_name);
  end loop;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles', 'subjects', 'school_periods', 'grade_entries', 'tasks', 'calendar_events', 'exams', 'user_settings'] loop
    execute format('alter table public.%I add constraint finite_audit_times check (pg_catalog.isfinite(created_at) and pg_catalog.isfinite(updated_at))', table_name);
  end loop;
end;
$$;

commit;
