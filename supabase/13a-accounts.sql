-- Qarbon · batch 13a (build 78): usernames and "Delete my account".
-- Paste all of this into Supabase → SQL Editor → New query, then press Run. Running it twice is safe.
-- Nothing secret is in here: these are only table shapes and privacy rules.

-- ===== usernames =====
-- One row per account: its @username (lowercase letters, numbers and _, 3 to 20), unique across everyone.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (username);

-- privacy rules (row level security): anyone signed in can look up usernames (to check one is free, and later
-- for friends and leaderboards); only you can add or change your own.
alter table public.profiles enable row level security;
drop policy if exists "signed-in can read usernames" on public.profiles;
create policy "signed-in can read usernames" on public.profiles for select to authenticated using (true);
drop policy if exists "add own username" on public.profiles;
create policy "add own username" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "change own username" on public.profiles;
create policy "change own username" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== delete my account =====
-- Removes the signed-in account's online save, username and the account itself. "security definer" lets it
-- remove the account (which normal requests can't), but it only ever touches the account that calls it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.qarbon_state where user_id = auth.uid();
  delete from public.profiles where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
