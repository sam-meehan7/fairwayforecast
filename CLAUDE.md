# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (extends `eslint-config-next` core-web-vitals + TypeScript)

There is no test suite and no formatter configured.

## Required environment variables

Routes assume these are set; many use the non-null assertion (`!`):

- `TOMORROW_API_KEY` — tomorrow.io weather forecast
- `GOLF_COURSE_API_KEY` — api.golfcourseapi.com course search
- `ANTHROPIC_API_KEY` — used by `src/lib/anthropic.ts` (calendar golf-event detection, Haiku 3) and `src/app/api/summary/route.ts` (forecast prose, Haiku 4.5)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL` — NextAuth Google provider (requests `calendar.readonly` scope, offline access)
- `RESEND_API_KEY`, `FROM_EMAIL` — `src/lib/email.ts`
- `NEXT_PUBLIC_GA_ID` — optional; gates Google Analytics injection in `layout.tsx`

## Architecture

Next.js 16 App Router (React 19, Tailwind v4, TS strict). Path alias `@/*` → `src/*`.

**Single-page user flow** (`src/app/page.tsx`, client component): course autocomplete → date/tee-time picker → `GET /api/weather` → render `WeatherDashboard` + lazy-loaded `CourseMap` (Leaflet, `ssr: false` is required) + fire-and-forget `POST /api/summary` for AI prose. The page also rehydrates state from `?name&lat&lng&date&t` query params (shared links) on mount and clears them via `history.replaceState`.

**Weather pipeline** (`src/lib/weather.ts` → `src/lib/scoring.ts`):
- `getHourlyForecast` calls tomorrow.io with `timesteps=1h,1d`, filters hourly entries to `[teeTimeHour, teeTimeHour + 5)` on the target date, and converts wind m/s → km/h, visibility km → m. `is_day` is derived from the daily sunrise/sunset.
- `calculatePlayabilityScore` produces a 0–100 overall from temperature/wind/rain/visibility sub-scores with weights `0.25 / 0.30 / 0.30 / 0.15`. Thresholds and labels live in this file — adjust them together with the description helpers at the bottom. Wind ideal ≤13 km/h; temp ideal 18–25 °C.
- `/api/weather` sets `Cache-Control: s-maxage=1800, stale-while-revalidate=3600`. Anywhere downstream of this route, treat the response as the single source of truth for `RoundForecast` + `PlayabilityScore`.

**AI summary** (`/api/summary`): cache key is `${courseName}|${date}|${teeTime}`, persisted in the Supabase `summary_cache` table with a 1-hour TTL enforced via `created_at >= now() - 1h` on read and `upsert` on write. Model is `claude-haiku-4-5`, max 300 tokens. Errors are swallowed on the client (`summaryError` just hides the block) — the rest of the page works without it.

**Auth** (`src/lib/auth.ts`): NextAuth JWT strategy. The `jwt` callback upserts a row into `profiles` keyed by email and stashes Google access/refresh tokens; `session.user.profileId` is the Supabase profile UUID. Sign-in always redirects to `/auth/success`. Module augmentation for `Session` and `JWT` lives in this file — keep new fields here so types stay aligned.

**Supabase clients** (`src/lib/supabase.ts`): two lazy singletons. `getSupabase()` for anon (RLS-respecting) and `getSupabaseAdmin()` for service-role. The `supabaseAdmin` Proxy export forwards every property access to the lazy admin client — use it freely; it won't construct the client at import time.

**Database** (`supabase/migrations/`): `profiles`, `clubs`, `golf_events` are defined in `001_initial_schema.sql`. The `summary_cache` table referenced by `/api/summary` is **not** in the migration and must be created out-of-band (`cache_key text primary key, summary text, created_at timestamptz`). RLS is commented out.

**Calendar/email scaffolding** (`src/lib/google-calendar.ts`, `src/lib/email.ts`, `src/emails/weather-notification.tsx`, `src/lib/anthropic.ts::detectGolfEvent`): the Google Calendar reader, Resend sender, React Email template, and the Haiku-based golf-event classifier are all wired up, but no route or cron currently invokes them. The recent commit `f7a8cb1 fix: remove cron routes` removed the trigger. Treat these as dormant infrastructure — don't assume notifications run.

## Conventions worth preserving

- Units conversion happens at the API boundary in `weather.ts`; downstream code assumes km/h, m, and the temperature unit declared in `RoundForecast.units`. Don't re-convert in components.
- Icons via `lucide-react`; UI primitives are in `src/components/ui/` (shadcn-style — `button`, `card`). The styling system uses Tailwind v4 with CSS variables for `bg-background`, `text-foreground`, `border-border`, `shadow-shadow`, `bg-secondary-background`, and `font-heading`. Reuse these tokens rather than introducing new colors.
- `CourseMap` must stay dynamically imported with `ssr: false` — Leaflet touches `window` at import time.
