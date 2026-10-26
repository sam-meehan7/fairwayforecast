# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (extends `eslint-config-next` core-web-vitals + TypeScript)
- `npm test` — `node --test` over `src/**/*.test.ts`, using Node's built-in type stripping (no test framework installed). Test files import the module under test with its `.ts` extension, so that module must have no extensionless runtime imports (type-only imports are fine).

No formatter is configured.

## Required environment variables

Routes assume these are set; many use the non-null assertion (`!`). The weather provider (Open-Meteo) needs no key.

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
- Weather comes from Open-Meteo (free, keyless, non-commercial tier; CC BY 4.0, credited in the footer). `getHourlyForecast` is two steps:
  - `fetchLocationSeries(lat, lng)` pulls the whole multi-day hourly series (`SERIES_DAYS`) for a location. It relies on `timezone=auto` (course's IANA zone, series starts at local midnight) and `models=best_match` (best regional model), and asks for `wind_speed_unit=kmh` so values arrive in °C, km/h and metres with no conversion. It takes only coordinates, so a per-location cache can sit in front of it.
  - `selectRoundWindow(series, date, teeTimeHour)` is pure: the five consecutive hours from the tee hour on the **course's** clock (half-hour tees floor to their hour). Covered by `weather.test.ts`, including both Irish clock-change days.
- Timestamps (`HourlyWeather.time`, `daily.sunrise/sunset`) are course-local ISO with offset, e.g. `2026-07-01T09:00-07:00`. Open-Meteo's own local strings use one fixed offset for the whole series and go an hour wrong across a clock change, so the app requests `timeformat=unixtime` and converts with `Intl` in the course's zone. Display hours with `localHour` / `formatLocalHour` / `formatLocalTime` from `weather.ts`, never `new Date(...).getHours()` or `toLocaleTimeString` (those use the viewer's zone).
- `is_day` comes straight from Open-Meteo. `weather_code` is a WMO code; `weather-utils.ts` maps it to icon/text, and 95/96/99 raise the lightning warning.
- `calculatePlayabilityScore` produces a 0–100 overall from temperature/wind/rain/visibility sub-scores with weights `0.25 / 0.30 / 0.30 / 0.15`. Thresholds and labels live in this file — adjust them together with the description helpers at the bottom. Wind ideal ≤13 km/h; temp ideal 18–25 °C.
- `/api/weather` sets `Cache-Control: s-maxage=1800, stale-while-revalidate=3600`. Anywhere downstream of this route, treat the response as the single source of truth for `RoundForecast` + `PlayabilityScore`.

**Course pages (SEO)** (`src/app/golf-weather/`): `/golf-weather` lists every course with coordinates; `/golf-weather/[slug]` server-renders a 7-day outlook (9 AM and 1 PM round scores per day, from one `fetchLocationSeries` call via `src/lib/course-outlook.ts`), nearby courses and `GolfCourse` JSON-LD. Pages are ISR (`revalidate = 10800`, rendered on first request) to cap Open-Meteo usage; a failed forecast throws so the last good page keeps serving. Slugs are derived from `club_name` at runtime in `src/lib/courses.ts` (not stored), so renaming a course in the catalogue changes its URL. `getCourseDirectory()` is `unstable_cache`d for a day and also feeds the sitemap and homepage. `src/app/page.tsx` is a server component wrapping the client `ForecastTool` (`src/components/forecast-tool.tsx`) and passes crawlable copy in as `children`. The day-score links on course pages open the tool through its shared-link params.

**AI summary** (`/api/summary`): cache key is `${courseName}|${date}|${teeTime}`, persisted in the Supabase `summary_cache` table with a 1-hour TTL enforced via `created_at >= now() - 1h` on read and `upsert` on write. Model is `claude-haiku-4-5`, max 300 tokens. Errors are swallowed on the client (`summaryError` just hides the block) — the rest of the page works without it.

**Auth** (`src/lib/auth.ts`): NextAuth JWT strategy. The `jwt` callback upserts a row into `profiles` keyed by email and stashes Google access/refresh tokens; `session.user.profileId` is the Supabase profile UUID. Sign-in always redirects to `/auth/success`. Module augmentation for `Session` and `JWT` lives in this file — keep new fields here so types stay aligned.

**Supabase clients** (`src/lib/supabase.ts`): two lazy singletons. `getSupabase()` for anon (RLS-respecting) and `getSupabaseAdmin()` for service-role. The `supabaseAdmin` Proxy export forwards every property access to the lazy admin client — use it freely; it won't construct the client at import time.

**Database** (`supabase/migrations/`): `profiles`, `clubs`, `golf_events` are defined in `001_initial_schema.sql`. The `summary_cache` table referenced by `/api/summary` is **not** in the migration and must be created out-of-band (`cache_key text primary key, summary text, created_at timestamptz`). RLS is commented out.

**Calendar/email scaffolding** (`src/lib/google-calendar.ts`, `src/lib/email.ts`, `src/emails/weather-notification.tsx`, `src/lib/anthropic.ts::detectGolfEvent`): the Google Calendar reader, Resend sender, React Email template, and the Haiku-based golf-event classifier are all wired up, but no route or cron currently invokes them. The recent commit `f7a8cb1 fix: remove cron routes` removed the trigger. Treat these as dormant infrastructure — don't assume notifications run.

## Conventions worth preserving

- Units are fixed at the API boundary in `weather.ts` (Open-Meteo is asked for km/h; °F conversion happens in `selectRoundWindow`); downstream code assumes km/h, m, and the temperature unit declared in `RoundForecast.units`. Don't re-convert in components.
- Icons via `lucide-react`; UI primitives are in `src/components/ui/` (shadcn-style — `button`, `card`). The styling system uses Tailwind v4 with CSS variables for `bg-background`, `text-foreground`, `border-border`, `shadow-shadow`, `bg-secondary-background`, and `font-heading`. Reuse these tokens rather than introducing new colors.
- `CourseMap` must stay dynamically imported with `ssr: false` — Leaflet touches `window` at import time.
