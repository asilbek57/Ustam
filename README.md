# Ustam — the freelance marketplace of services

Ustam connects people in Tashkent with home-service masters (air conditioners, washing machines, fridges, TVs, stoves and more) at honest, verifiable prices.

- **Clients** describe a problem in Russian, Uzbek or English. AI finds the service, shows the real market price range and recommends masters for their district.
- **Masters** register, build a profile and receive requests. They chat with clients, run their orders and keep their finances in one cabinet.

Market data comes only from `shared/data/servicesDatabase.json`: real OLX.uz listings and service-centre price lists. Nothing is invented: no fake masters, ratings, reviews or prices.

React 18 · TypeScript · Vite · Supabase (Postgres, Auth, Storage, Realtime) · Yandex Maps · Node/Express (optional AI chat server)

---

## Features

| For clients | For masters |
|---|---|
| AI service recognition (RU / UZ / EN) and market price range | Sign up as a master and publish a profile: photo, bio, field, experience, phone, Telegram |
| Masters ranked by real facts: services, district, arrival time, stated price, verified phone | Own prices per service, with the OLX market range shown next to them |
| Price check: below market, fair, or above market | Districts served and a workshop point on the map |
| Map with the client's point and masters' points | Orders: new → accepted → in progress → done, plus manual orders |
| "Message the master" chat opens right on the master's page; no account needed | Finances: revenue, profit (price − parts), average check, unpaid amounts, 6-month chart, CSV export |
| A request to a master opens a chat with the order details | Live chat with clients and unread badges |

Interface: light and dark theme, RU / UZ / EN, desktop and mobile, motion design that respects `prefers-reduced-motion`.

---

## Quick start (demo mode, no backend)

Requires **Node 22.6+**.

```bash
npm install
npm run dev          # http://localhost:5173
```

Without Supabase keys the site runs entirely in the browser:

- The catalog comes from the JSON file.
- Accounts, orders and chats live in `localStorage` and sync instantly between tabs.
- Each tab remembers its own login, so you can test a client and a master in two tabs.

```bash
npm test             # data, matcher, translations, finances, map, master profile
npm run build        # type-check + production build to dist/
npm run dev:all      # site + optional AI chat server (see below)
```

---

## Connect Supabase

All data the site uses is in **one file: [`supabase/setup.sql`](supabase/setup.sql)**:

- schema, Row Level Security, triggers, realtime and the photo bucket;
- **8 categories, 53 services and 21 masters** from `servicesDatabase.json`.

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query →** paste `supabase/setup.sql` → **Run**.
   - The script is safe to run again: it updates the catalog and keeps accounts, orders and chats.
3. **Authentication → Sign In / Providers**:
   - **Email**: on. "Confirm email" can stay on; users confirm, then sign in.
   - **Allow anonymous sign-ins**: on. This lets visitors message a master without registering.
4. **Authentication → URL Configuration → Site URL**: your site address, for example `https://<user>.github.io/<repo>/`.
5. Copy `.env.example` to `.env`, then fill in the values from **Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

6. `npm run dev`. The site now reads from Supabase.

### What lives where

| Table | Contents | Who can read |
|---|---|---|
| `meta`, `categories`, `services`, `masters`, `master_services`, `master_prices` | Catalog from `servicesDatabase.json` | Everyone |
| `profiles` | Account: role, name, phone. Created by a trigger on sign-up | The owner |
| `master_profiles` | Masters registered on Ustam | Everyone, once published; the owner always |
| `jobs` | Requests and manual orders | That client and that master |
| `conversations`, `messages` | Chat | The two participants |

Storage bucket `avatars` holds master photos; each user can write only to their own folder.

### Updating the data

1. Replace `shared/data/servicesDatabase.json`, keeping the same format.
2. Run `npm run sql`. This rebuilds `supabase/seed.sql` (data only) and `supabase/setup.sql` (everything).
3. Run `seed.sql` in the SQL Editor. Or simply run `setup.sql` again.

With the Supabase CLI you can use `supabase/migrations/*` and `supabase/seed.sql` instead (`supabase link`, then `supabase db push`).

---

## Yandex Maps

1. Get a free key at [developer.tech.yandex.ru](https://developer.tech.yandex.ru), product **"JavaScript API и HTTP Геокодер"**.
2. In the key settings, allow your domains: `localhost` and your production domain.
3. Add the key to `.env`:

```env
VITE_YANDEX_MAPS_KEY=your-key
```

Without a key, or if Yandex can't load, the site shows a built-in schematic map of Tashkent's districts with the same features.

---

## Publish on GitHub Pages

The repository includes two workflows:

- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request: tests, type-check, build, and a check that `supabase/*.sql` matches the data file.
- **Deploy** (`.github/workflows/deploy.yml`) builds and publishes the site to GitHub Pages on every push to `main`.

Setup:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_YANDEX_MAPS_KEY`. All three are public browser keys; security comes from RLS.
3. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`.

The app uses hash routing (`/#/masters`), so it works from any sub-folder or static host: Pages, Netlify, Vercel, or an S3 bucket.

---

## Optional: AI chat server

The assistant works offline from the database. To answer with a real LLM and search OLX.uz live, run `server/`, for example with the included `Dockerfile` on Render, Railway or a VPS.

1. Add **one** key to `.env`: `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` or `XAI_API_KEY`.
2. Set `ALLOWED_ORIGINS` to your site address.
3. Point the site to the server with `VITE_CHAT_API=https://your-server/api/chat`.

The model has tools (`find_service`, `list_services`, `get_price_info`, `find_masters`, `analyze_market`). Its system prompt forbids inventing prices, masters or ratings.

---

## Project structure

```
shared/                         shared by the site and the server
  data/servicesDatabase.json    ← the single data source
  normalize.js                  adapter: categories, services, merged masters, prices from listings
  matcher.js                    RU/UZ/EN text understanding, districts
  catalogI18n.js                UZ/EN names of services and districts
src/
  domain/                       pure business logic: pricing, AI ranking, geo, master profile, finances
  data/                         Repository → LocalRepository (browser) | SupabaseRepository
  state/                        auth, preferences (language, theme, district), booking
  ui/pages/                     pages; pages/pro/* is the master cabinet
  ui/components/                layout, map, chat, motion, cards
supabase/
  setup.sql                     ← everything in one file (generated)
  migrations/                   catalog + marketplace schema
  seed.sql                      data only (generated)
server/                         Express: /api/chat (SSE + tools), /api/market (OLX.uz)
scripts/build_sql.mjs           JSON → seed.sql + setup.sql
tests/                          node:test
```

## Security notes

- Only public keys go to the browser (`VITE_*`). LLM keys stay on the server. `.env` is git-ignored.
- Every user table has Row Level Security. Clients see only their own orders and chats, and masters see only theirs. Only accounts with the master role can create a master profile.
- Demo mode stores accounts in the browser (salted SHA-256). It is for showing the product; use Supabase in production.

## License

MIT, see [LICENSE](LICENSE).
