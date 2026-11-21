-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Adds friends and shared-habit streaks. Your existing data is not touched.

create table if not exists profiles(
  user_id uuid primary key references auth.users on delete cascade,
  code text unique not null,
  name text not null default 'Friend');
alter table profiles enable row level security;
drop policy if exists "profiles read" on profiles;
drop policy if exists "profiles insert own" on profiles;
drop policy if exists "profiles update own" on profiles;
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles insert own" on profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles update own" on profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists friends(
  a uuid not null references auth.users on delete cascade,
  b uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  primary key(a,b),
  check (a <> b));
alter table friends enable row level security;
drop policy if exists "friends read" on friends;
drop policy if exists "friends request" on friends;
drop policy if exists "friends accept" on friends;
drop policy if exists "friends delete" on friends;
create policy "friends read" on friends for select to authenticated using (auth.uid() in (a,b));
create policy "friends request" on friends for insert to authenticated with check (auth.uid() = a and status = 'pending');
create policy "friends accept" on friends for update to authenticated using (auth.uid() = b) with check (auth.uid() = b);
create policy "friends delete" on friends for delete to authenticated using (auth.uid() in (a,b));

create table if not exists shared(
  user_id uuid not null references auth.users on delete cascade,
  habit_id text not null,
  name text not null,
  emoji text,
  color text,
  type text default 'build',
  streak int default 0,
  best int default 0,
  done_today boolean default false,
  updated_at timestamptz default now(),
  primary key(user_id, habit_id));
alter table shared enable row level security;
drop policy if exists "shared read" on shared;
drop policy if exists "shared insert own" on shared;
drop policy if exists "shared update own" on shared;
drop policy if exists "shared delete own" on shared;
create policy "shared read" on shared for select to authenticated using (
  user_id = auth.uid() or exists(
    select 1 from friends f where f.status = 'accepted'
    and ((f.a = auth.uid() and f.b = shared.user_id) or (f.b = auth.uid() and f.a = shared.user_id))));
create policy "shared insert own" on shared for insert to authenticated with check (user_id = auth.uid());
create policy "shared update own" on shared for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shared delete own" on shared for delete to authenticated using (user_id = auth.uid());
