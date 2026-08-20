#!/usr/bin/env node
//
// Builds and maintains the local Irish golf course catalogue (golf_courses).
//
// Why this exists: api.golfcourseapi.com removed location.latitude/longitude
// from its responses, which broke the forecast entirely (the tee-time lookup
// is keyed on coordinates). It also rate limits at 50 requests/day. So we
// discover courses once, geocode their street addresses ourselves, and serve
// search from Supabase instead of hitting that API at runtime.
//
// Everything here is resumable. Discovery marks each search term 'done' in
// course_seed_queries; geocoding only touches rows without coordinates; and
// every upstream request is counted in course_api_usage against the daily
// budget. Re-running a command never repeats work that already succeeded.
//
// Usage:
//   node scripts/seed-courses.mjs status
//   node scripts/seed-courses.mjs seed-queries
//   node scripts/seed-courses.mjs discover [--budget 50] [--dry-run]
//   node scripts/seed-courses.mjs geocode  [--limit 200] [--retry-failed]
//   node scripts/seed-courses.mjs probe
//
// Typical first run:
//   seed-queries  ->  discover  ->  geocode  ->  (next day) discover -> geocode

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { IRISH_COURSE_QUERIES } from "./irish-course-queries.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const API_BASE = "https://api.golfcourseapi.com/v1";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// golfcourseapi's documented free-tier allowance.
const DEFAULT_DAILY_BUDGET = 50;

// Nominatim's usage policy is 1 request/second, absolute max. Be a good
// citizen — this is a one-off backfill, not a hot path.
const GEOCODE_DELAY_MS = 1100;

// Republic of Ireland bounding box. A geocode landing outside this is wrong
// (usually a same-named town in the US or UK), and a wrong coordinate means a
// wrong forecast, which is worse than no forecast. Reject rather than store.
const IE_BBOX = { minLat: 51.4, maxLat: 55.45, minLon: -10.7, maxLon: -5.9 };

// Only ingest courses the upstream API tags as Ireland. Northern Ireland comes
// back as country "United Kingdom" and is deliberately out of scope for now;
// widening this also means widening IE_BBOX.
const TARGET_COUNTRY = "Ireland";

const MAX_GEOCODE_ATTEMPTS = 3;

// ---------------------------------------------------------------- env + setup

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  } catch {
    return; // fall back to whatever is already in process.env
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

loadEnv();

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const sb = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

// ------------------------------------------------------------- quota tracking

async function getUsedToday() {
  const { data, error } = await sb
    .from("course_api_usage")
    .select("request_count")
    .eq("usage_date", today())
    .maybeSingle();
  if (error) throw error;
  return data?.request_count ?? 0;
}

async function setUsedToday(count) {
  const { error } = await sb
    .from("course_api_usage")
    .upsert({ usage_date: today(), request_count: count });
  if (error) throw error;
}

// ------------------------------------------------------------------- commands

async function seedQueries() {
  const rows = IRISH_COURSE_QUERIES.map((query) => ({ query }));
  const { error } = await sb
    .from("course_seed_queries")
    .upsert(rows, { onConflict: "query", ignoreDuplicates: true });
  if (error) throw error;

  const { count } = await sb
    .from("course_seed_queries")
    .select("*", { count: "exact", head: true });

  console.log(
    `Work list now holds ${count} search terms (${rows.length} in the source list).`
  );
  await status();
}

async function discover() {
  const budget = Number(arg("--budget", DEFAULT_DAILY_BUDGET));
  const dryRun = arg("--dry-run", false) === true;

  const used = await getUsedToday();
  const remaining = Math.max(0, budget - used);

  if (remaining === 0) {
    console.log(
      `Daily budget spent (${used}/${budget}). Quota resets on the upstream side — try again tomorrow.`
    );
    return;
  }

  const { data: queries, error } = await sb
    .from("course_seed_queries")
    .select("query")
    .eq("status", "pending")
    .order("query")
    .limit(remaining);
  if (error) throw error;

  if (!queries.length) {
    console.log("No pending search terms left. Discovery is complete.");
    console.log(
      "Add more terms to scripts/irish-course-queries.mjs and re-run seed-queries to widen coverage."
    );
    return;
  }

  console.log(
    `Budget ${used}/${budget} used today. Running ${queries.length} search term(s).`
  );
  if (dryRun) {
    console.log("--dry-run: would search for:", queries.map((q) => q.query).join(", "));
    return;
  }

  const apiKey = required("GOLF_COURSE_API_KEY");
  let spent = used;
  let discovered = 0;
  let ignoredForeign = 0;

  for (const { query } of queries) {
    const url = `${API_BASE}/search?search_query=${encodeURIComponent(query)}`;

    let res;
    try {
      res = await fetch(url, { headers: { Authorization: `Key ${apiKey}` } });
    } catch (err) {
      console.error(`  ${query}: network error — ${err.message}`);
      await markQuery(query, "error", { error: err.message });
      continue;
    }

    // Count it the moment it leaves — a 429 still consumed an attempt.
    spent += 1;
    await setUsedToday(spent);

    if (res.status === 429) {
      // Leave the term pending so tomorrow's run picks it up untouched.
      console.log(
        `  ${query}: 429 rate limited — stopping here, term left pending.`
      );
      console.log(
        `\nUpstream cut us off after ${spent - used} request(s) this run.`
      );
      break;
    }

    if (!res.ok) {
      console.error(`  ${query}: HTTP ${res.status}`);
      await markQuery(query, "error", { error: `HTTP ${res.status}` });
      continue;
    }

    const body = await res.json();
    const all = body.courses ?? [];
    const irish = all.filter(
      (c) => (c.location ?? {}).country === TARGET_COUNTRY
    );
    ignoredForeign += all.length - irish.length;

    if (irish.length) {
      const rows = irish.map((c) => {
        const loc = c.location ?? {};
        return {
          // Namespaced: OSM ids and golfcourseapi ids are separate sequences.
          id: `gca:${c.id}`,
          source: "gca",
          source_ref: String(c.id),
          club_name: c.club_name,
          course_name: c.course_name ?? null,
          address: loc.address ?? null,
          city: loc.city ?? null,
          state: loc.state ?? null,
          country: loc.country ?? null,
          geocode_status: loc.address || loc.city ? "pending" : "no_address",
        };
      });

      // ignoreDuplicates matters: a course found again by a later search term
      // must not have its hard-won coordinates reset to null.
      const { error: upsertError } = await sb
        .from("golf_courses")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (upsertError) throw upsertError;
      discovered += rows.length;
    }

    await markQuery(query, "done", { results_count: irish.length });
    console.log(
      `  ${query}: ${irish.length} Irish course(s)` +
        (all.length - irish.length ? ` (${all.length - irish.length} non-Irish ignored)` : "")
    );
  }

  console.log(
    `\nDiscovered ${discovered} course row(s) this run; ignored ${ignoredForeign} non-Irish result(s).`
  );
  console.log(`Budget now ${spent}/${budget} for ${today()}.`);
  await status();
}

async function markQuery(query, status, extra = {}) {
  const { error } = await sb
    .from("course_seed_queries")
    .update({ status, ran_at: new Date().toISOString(), ...extra })
    .eq("query", query);
  if (error) throw error;
}

async function geocode() {
  const limit = Number(arg("--limit", 200));
  const retryFailed = arg("--retry-failed", false) === true;

  const statuses = retryFailed ? ["pending", "failed"] : ["pending"];

  const { data: courses, error } = await sb
    .from("golf_courses")
    .select("id, club_name, address, city, state, geocode_attempts")
    .is("latitude", null)
    .in("geocode_status", statuses)
    .lt("geocode_attempts", MAX_GEOCODE_ATTEMPTS)
    .order("id")
    .limit(limit);
  if (error) throw error;

  if (!courses.length) {
    console.log("Nothing to geocode — every discovered course has coordinates.");
    return;
  }

  const userAgent =
    process.env.GEOCODER_USER_AGENT ||
    "FairwayForecast/1.0 (course catalogue backfill)";

  console.log(
    `Geocoding ${courses.length} course(s) via Nominatim at ~1/sec (~${Math.ceil(
      (courses.length * GEOCODE_DELAY_MS) / 60000
    )} min). This does NOT touch the golfcourseapi budget.`
  );

  let ok = 0;
  let failed = 0;

  for (const course of courses) {
    // Most specific first, then progressively looser. The club name alone is
    // often enough — OSM has good coverage of Irish golf clubs.
    const candidates = [
      course.address,
      [course.club_name, course.city, "Ireland"].filter(Boolean).join(", "),
      [course.club_name, course.state, "Ireland"].filter(Boolean).join(", "),
    ].filter(Boolean);

    let hit = null;
    let lastError = null;

    for (const q of candidates) {
      await sleep(GEOCODE_DELAY_MS);
      try {
        const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=ie&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { "User-Agent": userAgent } });
        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          continue;
        }
        const results = await res.json();
        if (!results.length) {
          lastError = "no match";
          continue;
        }

        const lat = Number(results[0].lat);
        const lon = Number(results[0].lon);
        if (!inIreland(lat, lon)) {
          lastError = `outside Ireland (${lat}, ${lon})`;
          continue;
        }
        hit = { lat, lon };
        break;
      } catch (err) {
        lastError = err.message;
      }
    }

    if (hit) {
      const { error: updateError } = await sb
        .from("golf_courses")
        .update({
          latitude: hit.lat,
          longitude: hit.lon,
          geocode_status: "ok",
          geocode_provider: "nominatim",
          geocode_error: null,
          geocoded_at: new Date().toISOString(),
          geocode_attempts: course.geocode_attempts + 1,
        })
        .eq("id", course.id);
      if (updateError) throw updateError;
      ok += 1;
      console.log(`  ok    ${course.club_name} -> ${hit.lat}, ${hit.lon}`);
    } else {
      const { error: updateError } = await sb
        .from("golf_courses")
        .update({
          geocode_status: "failed",
          geocode_error: lastError,
          geocode_attempts: course.geocode_attempts + 1,
        })
        .eq("id", course.id);
      if (updateError) throw updateError;
      failed += 1;
      console.log(`  FAIL  ${course.club_name} (${lastError})`);
    }
  }

  console.log(`\nGeocoded ${ok}, failed ${failed}.`);
  if (failed) {
    console.log(
      "Failed rows keep their attempt count; re-run with --retry-failed to try again, " +
        `up to ${MAX_GEOCODE_ATTEMPTS} attempts each.`
    );
  }
  await status();
}

function inIreland(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= IE_BBOX.minLat &&
    lat <= IE_BBOX.maxLat &&
    lon >= IE_BBOX.minLon &&
    lon <= IE_BBOX.maxLon
  );
}

async function status() {
  const countWhere = async (table, apply) => {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };

  const [totalQ, pendingQ, doneQ, errorQ] = await Promise.all([
    countWhere("course_seed_queries"),
    countWhere("course_seed_queries", (q) => q.eq("status", "pending")),
    countWhere("course_seed_queries", (q) => q.eq("status", "done")),
    countWhere("course_seed_queries", (q) => q.eq("status", "error")),
  ]);

  const [totalC, okC, pendingC, failedC, noAddrC] = await Promise.all([
    countWhere("golf_courses"),
    countWhere("golf_courses", (q) => q.eq("geocode_status", "ok")),
    countWhere("golf_courses", (q) => q.eq("geocode_status", "pending")),
    countWhere("golf_courses", (q) => q.eq("geocode_status", "failed")),
    countWhere("golf_courses", (q) => q.eq("geocode_status", "no_address")),
  ]);

  const used = await getUsedToday();

  console.log(`
--- catalogue status ------------------------------------------
  search terms   ${doneQ} done / ${pendingQ} pending / ${errorQ} error   (${totalQ} total)
  courses        ${totalC} discovered
                 ${okC} geocoded and searchable
                 ${pendingC} awaiting geocode
                 ${failedC} geocode failed
                 ${noAddrC} no address from upstream
  api budget     ${used}/${DEFAULT_DAILY_BUDGET} used on ${today()} (UTC)
---------------------------------------------------------------`);
}

// Spends up to 3 requests checking whether a paginated list endpoint exists.
// If one does, discovery gets dramatically cheaper than one search term at a
// time — worth the 3 requests to find out before burning days of budget.
async function probe() {
  const apiKey = required("GOLF_COURSE_API_KEY");
  const candidates = ["/courses?page=1", "/courses", "/courses?page=1&per_page=100"];

  let spent = await getUsedToday();
  for (const path of candidates) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    spent += 1;
    await setUsedToday(spent);

    let hint = "";
    if (res.ok) {
      const body = await res.json();
      const courses = body.courses ?? body.data ?? [];
      hint = ` — ${Array.isArray(courses) ? courses.length : "?"} course(s), keys: ${Object.keys(body).join(", ")}`;
    }
    console.log(`  GET ${path} -> HTTP ${res.status}${hint}`);
    if (res.status === 429) break;
  }
  console.log(
    "\nIf any of the above returned a list, discovery can page through it instead of " +
      "spending one request per search term."
  );
}

// ----------------------------------------------------------------------- main

const command = process.argv[2];
const commands = { "seed-queries": seedQueries, discover, geocode, status, probe };

if (!commands[command]) {
  console.error(
    `Usage: node scripts/seed-courses.mjs <${Object.keys(commands).join("|")}> [options]`
  );
  process.exit(1);
}

commands[command]().catch((err) => {
  console.error("\nFailed:", err.message ?? err);
  process.exit(1);
});
