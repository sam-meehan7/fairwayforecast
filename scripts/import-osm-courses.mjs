#!/usr/bin/env node
//
// Imports Irish golf courses from OpenStreetMap into golf_courses.
//
// This is the primary way to populate the catalogue. One Overpass request
// returns every course in the Republic of Ireland *with coordinates already
// attached*, so unlike the golfcourseapi path there is no geocoding step and
// no daily rate limit to work around.
//
// OSM data is ODbL. Attribution is already rendered on the map
// (src/components/course-map.tsx) via the tile layer credit.
//
// Usage:
//   node scripts/import-osm-courses.mjs --dry-run     # fetch + report, no writes
//   node scripts/import-osm-courses.mjs               # fetch + upsert
//   node scripts/import-osm-courses.mjs --json out.json
//
// Re-running is safe and is how you pick up upstream corrections: rows are
// upserted on their OSM id, so names and coordinates refresh in place and
// nothing is duplicated.

import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT =
  process.env.GEOCODER_USER_AGENT ||
  "FairwayForecast/1.0 (course catalogue import)";

// Republic of Ireland only. To include Northern Ireland this needs a second
// area (ISO3166-2 GB-NIR) — and the bbox check below widens with it.
const QUERY = `
[out:json][timeout:90];
area["ISO3166-1"="IE"][admin_level=2]->.ie;
(
  way["leisure"="golf_course"](area.ie);
  node["leisure"="golf_course"](area.ie);
  relation["leisure"="golf_course"](area.ie);
);
out center tags;
`;

// leisure=golf_course is also used for pitch & putt, footgolf and driving
// ranges. Those aren't 18-hole rounds anyone checks a tee-time forecast for,
// and they clutter autocomplete. ~114 of 442 named results are this.
const NOISE =
  /pitch\s*(and|&|n)?\s*putt|foot\s*golf|footee|driving\s*range|crazy\s*golf|mini\s*golf|adventure\s*golf|par\s*3\b/i;

// Sanity bound: anything outside the Republic is a tagging error and would
// produce a confidently wrong forecast, which is worse than no result.
const IE_BBOX = { minLat: 51.4, maxLat: 55.45, minLon: -10.7, maxLon: -5.9 };

// Two OSM elements (a node and a way, say) can describe the same club. Treat
// same-normalised-name entries within this radius as one course.
const DEDUPE_RADIUS_KM = 3;

// ---------------------------------------------------------------- env + setup

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

loadEnv();

const dryRun = process.argv.includes("--dry-run");
const jsonIndex = process.argv.indexOf("--json");
const jsonPath = jsonIndex === -1 ? null : process.argv[jsonIndex + 1];

// ------------------------------------------------------------------ pipeline

async function fetchCourses() {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ data: QUERY }),
  });

  if (!res.ok) {
    throw new Error(
      `Overpass returned HTTP ${res.status}. It throttles under load — wait a minute and retry.`
    );
  }
  return (await res.json()).elements ?? [];
}

function point(el) {
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  if (typeof el.lat === "number") return { lat: el.lat, lon: el.lon };
  return null;
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

const normalise = (name) =>
  name
    .toLowerCase()
    .replace(/\b(golf|club|links|course|the|and|&|gc)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function transform(elements) {
  const stats = { total: elements.length, unnamed: 0, noCoords: 0, noise: 0, outOfBounds: 0 };
  const kept = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name) {
      stats.unnamed += 1;
      continue;
    }
    const pt = point(el);
    if (!pt) {
      stats.noCoords += 1;
      continue;
    }
    if (NOISE.test(name)) {
      stats.noise += 1;
      continue;
    }
    if (!inIreland(pt.lat, pt.lon)) {
      stats.outOfBounds += 1;
      continue;
    }

    const street = [tags["addr:housenumber"], tags["addr:street"]]
      .filter(Boolean)
      .join(" ");

    // At multi-course clubs, OSM often names each course ("Old Course",
    // "The Montgomerie") and puts the club in `operator`. Searching "Lahinch"
    // must find those, so promote a club-like operator to club_name and keep
    // the course label as course_name. Guarded so a corporate operator
    // ("Comer Brothers") doesn't clobber a real course name.
    const op = tags.operator?.trim();
    const nameIsClub = /\b(golf|club|links)\b/i.test(name);
    const nameIsSubCourse = /\b(course|links)\b/i.test(name);
    const opIsClub = op && /\b(golf|club|links)\b/i.test(op);
    const useOperator = op && !nameIsClub && (opIsClub || nameIsSubCourse);

    kept.push({
      id: `osm:${el.type}/${el.id}`,
      source: "osm",
      source_ref: `${el.type}/${el.id}`,
      club_name: useOperator ? op : name,
      course_name: useOperator ? name : null,
      address: street || null,
      city: tags["addr:city"] ?? null,
      state: tags["addr:county"] ?? null,
      country: "Ireland",
      latitude: pt.lat,
      longitude: pt.lon,
      geocode_status: "ok",
      geocode_provider: "osm",
      geocoded_at: new Date().toISOString(),
      _tagCount: Object.keys(tags).length,
    });
  }

  // Collapse duplicates, preferring the richer record (more OSM tags usually
  // means the mapped polygon rather than a bare point).
  const byName = new Map();
  let deduped = 0;
  for (const course of kept) {
    const key = normalise(course.club_name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, course);
      continue;
    }
    const near =
      distanceKm(
        { lat: existing.latitude, lon: existing.longitude },
        { lat: course.latitude, lon: course.longitude }
      ) <= DEDUPE_RADIUS_KM;

    if (!near) {
      // Same name, genuinely different places — keep both.
      byName.set(`${key}:${course.id}`, course);
      continue;
    }
    deduped += 1;
    if (course._tagCount > existing._tagCount) byName.set(key, course);
  }

  stats.deduped = deduped;
  const courses = [...byName.values()].map(({ _tagCount, ...rest }) => rest);
  courses.sort((a, b) => a.club_name.localeCompare(b.club_name));
  return { courses, stats };
}

async function upsert(courses) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (checked env and .env.local)."
    );
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // This is a full snapshot of OSM's Irish courses, so any osm-source row no
  // longer present here is stale — a course removed upstream, or an id dropped
  // when two courses merged during dedupe. Remove those before writing so the
  // catalogue doesn't accumulate orphans across re-runs. Rows from other
  // sources (gca:) are left untouched.
  const keepIds = new Set(courses.map((c) => c.id));
  const { data: existing, error: listError } = await sb
    .from("golf_courses")
    .select("id")
    .eq("source", "osm");
  if (listError) throw new Error(listError.message);

  const stale = (existing ?? []).map((r) => r.id).filter((id) => !keepIds.has(id));
  if (stale.length) {
    const { error: delError } = await sb
      .from("golf_courses")
      .delete()
      .in("id", stale);
    if (delError) throw new Error(delError.message);
    console.log(`  removed ${stale.length} stale osm row(s)`);
  }

  // Chunked so a large import doesn't hit request size limits.
  const SIZE = 100;
  let written = 0;
  for (let i = 0; i < courses.length; i += SIZE) {
    const chunk = courses.slice(i, i + SIZE);
    const { error } = await sb
      .from("golf_courses")
      .upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(error.message);
    written += chunk.length;
    process.stdout.write(`\r  upserted ${written}/${courses.length}`);
  }
  process.stdout.write("\n");
  return written;
}

async function main() {
  console.log("Querying Overpass for Irish golf courses...");
  const elements = await fetchCourses();
  const { courses, stats } = transform(elements);

  console.log(`
  raw elements      ${stats.total}
  unnamed           ${stats.unnamed}  (skipped)
  missing coords    ${stats.noCoords}  (skipped)
  pitch&putt etc.   ${stats.noise}  (skipped)
  outside Ireland   ${stats.outOfBounds}  (skipped)
  duplicates merged ${stats.deduped}
  -----------------------------
  importable        ${courses.length} courses`);

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify(courses, null, 2));
    console.log(`\nWrote ${jsonPath}`);
  }

  console.log("\nSample:");
  for (const c of courses.slice(0, 8)) {
    console.log(
      `  ${c.club_name.slice(0, 38).padEnd(40)} ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`
    );
  }

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    return;
  }

  console.log("\nWriting to golf_courses...");
  const written = await upsert(courses);
  console.log(`Done — ${written} courses in the catalogue.`);
}

main().catch((err) => {
  console.error("\nFailed:", err.message ?? err);
  process.exit(1);
});
