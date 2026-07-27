-- ==========================================================
-- VITTAM — Auth setup
-- Run this in Supabase SQL Editor BEFORE running the app.
-- Project → SQL Editor → New query → paste → Run
-- ==========================================================

-- STEP 1: Profiles table
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  role       text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz default now()
);

-- STEP 2: Auto-insert a profile row whenever a new auth user is created.
-- The trigger reads full_name from user metadata (set during signUp).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- STEP 3: IMPORTANT — disable email confirmation so signUp works immediately:
--   Supabase Dashboard → Authentication → Settings → Email Auth
--   → uncheck "Confirm email" → Save

-- STEP 4: After disabling email confirmation, visit:
--   http://localhost:3000/setup   (local)  OR
--   https://vittam-starter.vercel.app/setup  (production)
-- to create the demo admin account automatically.

-- Demo credentials (created by /setup endpoint):
--   Email:    admin@vittam.edu
--   Password: VittamAdmin2026
--   Role:     admin
