-- =====================================================================
-- Ustam marketplace: accounts, master profiles, orders (jobs), chat.
-- Runs after the catalog migration. Safe to run again.
-- Uses Supabase Auth (auth.users / auth.uid()), Storage ("avatars"), Realtime.
--
-- Guests: a visitor can message a master without registering. The site signs
-- them in anonymously (Authentication → Sign In / Providers → "Allow anonymous
-- sign-ins"), so every chat still belongs to a real auth.uid() and RLS applies.
-- =====================================================================

-- ---------- accounts ----------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'client' check (role in ('client', 'master')),
  name         text not null default '',
  email        text not null default '',
  phone        text,
  telegram     text,
  is_anonymous boolean not null default false,
  created_at   timestamptz not null default now()
);

-- A profile is created for every new auth user (incl. anonymous guests) from
-- the metadata the site passes on sign-up: { role, name, phone }.
-- Works with "Confirm email" on: no client-side insert is needed.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email, phone, is_anonymous)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'master' then 'master' else 'client' end,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), case when coalesce(new.is_anonymous, false) then 'Гость' else '' end),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- registered masters (public when published) ----------
create table if not exists master_profiles (
  id               text primary key default ('m-' || replace(gen_random_uuid()::text, '-', '')),
  user_id          uuid not null unique references profiles(id) on delete cascade,
  name             text not null,
  title            text not null default '',
  bio              text not null default '',
  type             text not null default 'private' check (type in ('private', 'center')),
  category_ids     text[] not null default '{}',
  service_ids      text[] not null default '{}',
  prices           jsonb not null default '[]',   -- [{serviceId, priceFrom, priceTo}]
  districts        text[] not null default '{}',
  lat              double precision,
  lng              double precision,
  location_label   text,
  workshop_address text,
  experience_years int not null default 0 check (experience_years between 0 and 80),
  response_time    text not null default '',
  phone            text not null default '',
  telegram         text,
  photo_url        text,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- orders ----------
create table if not exists jobs (
  id             text primary key default ('job-' || replace(gen_random_uuid()::text, '-', '')),
  master_id      text not null,               -- master_profiles.id or an OLX master id (masters.id)
  master_name    text not null,
  master_user_id uuid references profiles(id) on delete set null,  -- set for masters registered on Ustam
  client_id      uuid references profiles(id) on delete set null,  -- null for a master's manual order
  client_name    text not null default '',
  client_phone   text,
  category_id    text references categories(id) on delete set null,
  service_ids    text[] not null default '{}',
  title          text not null default '',
  description    text not null default '',
  district       text,
  address        text not null default '',
  lat            double precision,
  lng            double precision,
  scheduled_at   timestamptz,
  visit_type     text not null default 'home' check (visit_type in ('home', 'workshop')),
  estimate_from  int not null default 0,
  estimate_to    int,
  price          int check (price is null or price >= 0),
  parts_cost     int not null default 0 check (parts_cost >= 0),
  payment_method text check (payment_method in ('cash', 'card', 'transfer')),
  paid           boolean not null default false,
  status         text not null default 'new' check (status in ('new', 'accepted', 'in_progress', 'done', 'cancelled')),
  source         text not null default 'platform' check (source in ('platform', 'manual')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index if not exists jobs_master_user_idx on jobs(master_user_id);
create index if not exists jobs_master_idx on jobs(master_id);
create index if not exists jobs_client_idx on jobs(client_id);

-- ---------- chat ----------
-- master_user_id is null for OLX masters (not on Ustam yet): the message is kept
-- and the client sees the master's phone.
create table if not exists conversations (
  id              text primary key default ('c-' || replace(gen_random_uuid()::text, '-', '')),
  client_id       uuid not null references profiles(id) on delete cascade,
  client_name     text not null default '',
  master_user_id  uuid references profiles(id) on delete cascade,
  master_id       text not null,               -- master_profiles.id or masters.id
  master_name     text not null,
  job_id          text references jobs(id) on delete set null,
  last_message    text not null default '',
  last_message_at timestamptz not null default now(),
  unread_for      uuid[] not null default '{}',
  unique (client_id, master_id)
);
create index if not exists conversations_master_user_idx on conversations(master_user_id);

create table if not exists messages (
  id              text primary key default ('msg-' || replace(gen_random_uuid()::text, '-', '')),
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null check (length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);

-- Keep the conversation preview + unread flags up to date on every new message
create or replace function on_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c conversations; other uuid;
begin
  select * into c from conversations where id = new.conversation_id;
  other := case when new.sender_id = c.client_id then c.master_user_id else c.client_id end;
  update conversations set
    last_message    = left(new.body, 300),
    last_message_at = new.created_at,
    unread_for      = array(select distinct x from unnest(array_remove(unread_for, new.sender_id) || other) as x where x is not null)
  where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists messages_after_insert on messages;
create trigger messages_after_insert after insert on messages
  for each row execute function on_new_message();

-- Mark a conversation as read by the current user
create or replace function mark_read(conv text) returns void
language sql security definer set search_path = public as $$
  update conversations set unread_for = array_remove(unread_for, auth.uid())
  where id = conv and auth.uid() in (client_id, master_user_id);
$$;

-- ---------- Row Level Security ----------
alter table profiles        enable row level security;
alter table master_profiles enable row level security;
alter table jobs            enable row level security;
alter table conversations   enable row level security;
alter table messages        enable row level security;

-- profiles: you see and edit only yourself (public master info lives in master_profiles)
drop policy if exists "own profile read" on profiles;
create policy "own profile read"   on profiles for select using (id = auth.uid());
drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles for insert with check (id = auth.uid());
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- master profiles: published ones are public; only a master account edits its own
drop policy if exists "published masters are public" on master_profiles;
create policy "published masters are public" on master_profiles for select using (published or user_id = auth.uid());
drop policy if exists "owner inserts" on master_profiles;
create policy "owner inserts" on master_profiles for insert with check (
  user_id = auth.uid() and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master'));
drop policy if exists "owner updates" on master_profiles;
create policy "owner updates" on master_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- jobs: visible to its client and its master.
-- A client creates a request for themself; a master creates manual orders for themself.
drop policy if exists "job parties read" on jobs;
create policy "job parties read" on jobs for select using (auth.uid() in (client_id, master_user_id));
drop policy if exists "client creates job" on jobs;
create policy "client creates job" on jobs for insert with check (
  (client_id = auth.uid() and source = 'platform') or (master_user_id = auth.uid() and source = 'manual'));
drop policy if exists "parties update job" on jobs;
create policy "parties update job" on jobs for update using (auth.uid() in (client_id, master_user_id));
drop policy if exists "master deletes manual job" on jobs;
create policy "master deletes manual job" on jobs for delete using (master_user_id = auth.uid() and source = 'manual');

-- chat: only the two participants
drop policy if exists "participants read conv" on conversations;
create policy "participants read conv" on conversations for select using (auth.uid() in (client_id, master_user_id));
drop policy if exists "client opens conv" on conversations;
create policy "client opens conv" on conversations for insert with check (client_id = auth.uid());
drop policy if exists "participants update conv" on conversations;
create policy "participants update conv" on conversations for update using (auth.uid() in (client_id, master_user_id));
drop policy if exists "participants read msgs" on messages;
create policy "participants read msgs" on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.client_id, c.master_user_id)));
drop policy if exists "participants send msgs" on messages;
create policy "participants send msgs" on messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.client_id, c.master_user_id)));

-- ---------- Realtime ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['messages', 'conversations', 'jobs', 'master_profiles'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ---------- Storage: profile photos (public bucket, folder = user id) ----------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
    drop policy if exists "avatar public read" on storage.objects;
    create policy "avatar public read" on storage.objects for select using (bucket_id = 'avatars');
    drop policy if exists "avatar owner write" on storage.objects;
    create policy "avatar owner write" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
    drop policy if exists "avatar owner update" on storage.objects;
    create policy "avatar owner update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;
