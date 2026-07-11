-- Licenses & lifetime-paywall support for Satrio's Family Finance.
--
-- IMPORTANT: this migration grandfathers in every user that already exists
-- in auth.users at migration time (paid = true), so nobody currently using
-- the app gets locked out by this rollout. Only NEW signups after this
-- migration start out unpaid and must redeem a license key.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paid boolean not null default false,
  license_key text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: user can read own row"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Backfill: everyone who already has an account is grandfathered in as paid.
insert into public.profiles (user_id, paid)
select id, true from auth.users
on conflict (user_id) do nothing;

-- New signups after this migration start unpaid by default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, paid)
  values (new.id, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  product text not null check (product in ('online','offline')),
  email text,
  scalev_order_id text,
  scalev_variant_id text,
  status text not null default 'unused' check (status in ('unused','redeemed')),
  device_fingerprint text,
  user_id uuid references auth.users(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.licenses enable row level security;
-- No client-facing policies on purpose: licenses are only ever read/written
-- by the scalev-webhook and redeem-license Edge Functions using the service
-- role key, which bypasses RLS. Anon/authenticated clients get zero direct access.
