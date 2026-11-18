-- =====================================================================
-- Ustam — catalog schema for servicesDatabase.json (OLX.uz Tashkent price base)
-- Part of supabase/setup.sql (built by `npm run sql`). Safe to run again.
-- No ratings / reviews tables: the source has none, nothing is invented.
-- =====================================================================

-- Source metadata (one row): city, currency, update date, disclaimer, districts
create table if not exists meta (
  id              int primary key default 1 check (id = 1),
  city            text not null,
  currency        text not null default 'UZS',
  currency_symbol text not null default 'сум',
  updated_at      date not null,
  disclaimer      text not null default '',
  districts       text[] not null default '{}'
);

create table if not exists categories (
  id         text primary key,           -- 'air-conditioners'
  title      text not null,              -- 'Кондиционеры'
  icon       text not null default '',
  sort_order int  not null default 0
);

create table if not exists services (
  id           text primary key,         -- 'ac-install-standard'
  category_id  text not null references categories(id) on delete cascade,
  name         text not null,
  price_from   int  not null check (price_from >= 0),
  price_to     int,                      -- null = "от X" (no upper bound in the source)
  unit         text not null default '',
  description  text not null default '',
  warranty     text not null default '—',
  districts    text[] not null default '{}',
  source_olx   text,
  source_web   text,
  source_note  text not null default '',
  sort_order   int  not null default 0
);
create index if not exists services_category_idx on services(category_id);

-- Real masters and service centres (from OLX listings). Verified = phone confirmed.
create table if not exists masters (
  id               text primary key,
  name             text not null,
  title            text not null default '',
  type             text not null check (type in ('private', 'center')),
  category_ids     text[] not null default '{}',
  districts        text[] not null default '{}',
  location         text,
  experience_years int  not null default 0,
  experience_label text,
  response_time    text,
  response_minutes int  not null default 240,
  url              text,
  olx_listing_id   text,
  note             text not null default '',
  verified         boolean not null default false,
  phone            text,
  phone_display    text,
  verified_at      date,
  sort_order       int not null default 0
);

create table if not exists master_services (
  master_id  text references masters(id) on delete cascade,
  service_id text references services(id) on delete cascade,
  primary key (master_id, service_id)
);

-- Prices REALLY stated for a master: verified price list or the listing text
create table if not exists master_prices (
  master_id  text references masters(id) on delete cascade,
  service_id text references services(id) on delete cascade,
  price_from int not null,
  price_to   int,
  source     text not null check (source in ('verified', 'listing')),
  primary key (master_id, service_id)
);

-- ---------- Row Level Security ---------------------------------------
alter table meta            enable row level security;
alter table categories      enable row level security;
alter table services        enable row level security;
alter table masters         enable row level security;
alter table master_services enable row level security;
alter table master_prices   enable row level security;

drop policy if exists "read meta" on meta;
create policy "read meta" on meta            for select using (true);
drop policy if exists "read categories" on categories;
create policy "read categories" on categories      for select using (true);
drop policy if exists "read services" on services;
create policy "read services" on services        for select using (true);
drop policy if exists "read masters" on masters;
create policy "read masters" on masters         for select using (true);
drop policy if exists "read master_services" on master_services;
create policy "read master_services" on master_services for select using (true);
drop policy if exists "read master_prices" on master_prices;
create policy "read master_prices" on master_prices   for select using (true);
