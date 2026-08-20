import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { GolfCourseResult } from "@/lib/types";

// Autocomplete reads from our own catalogue rather than api.golfcourseapi.com.
// That API stopped returning coordinates (which the forecast is keyed on) and
// rate limits at 50 requests/day — a limit ordinary typing can reach, and it
// fails by returning an empty list rather than an error. The catalogue is
// populated out-of-band by scripts/seed-courses.mjs.

const RESULT_LIMIT = 8;

// PostgREST's `or` filter is comma/parenthesis delimited, so those characters
// in user input would corrupt the filter expression. `%` and `_` are ilike
// wildcards and would widen the match unexpectedly.
function sanitize(query: string): string {
  return query.replace(/[,()%_*\\]/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q");

  if (!raw || raw.trim().length < 2) {
    return NextResponse.json({ courses: [] });
  }

  const query = sanitize(raw);
  if (query.length < 2) {
    return NextResponse.json({ courses: [] });
  }

  // Service-role client, consistent with every other server-side Supabase read
  // here (track-search, summary, clubs). RLS is disabled by design, and the
  // anon role can't read golf_courses; the key never leaves this route.
  const supabase = getSupabaseAdmin();

  // Only rows with coordinates are selectable — a course we can't locate can't
  // be forecast, so surfacing it would just reproduce the dead end users hit
  // when the upstream API dropped its lat/lng fields.
  const { data, error } = await supabase
    .from("golf_courses")
    .select(
      "id, club_name, course_name, address, city, state, country, latitude, longitude"
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .or(`club_name.ilike.%${query}%,city.ilike.%${query}%`)
    .limit(RESULT_LIMIT * 3);

  if (error) {
    console.error("Course search failed:", error.message);
    return NextResponse.json(
      { error: "Course search is temporarily unavailable." },
      { status: 500 }
    );
  }

  const needle = query.toLowerCase();

  // Rank in-process: clubs whose name starts with what was typed are almost
  // always what the user meant, and shorter names beat longer ones containing
  // the same token ("Cork Golf Club" before "East Cork Golf Club").
  const courses: GolfCourseResult[] = (data ?? [])
    .sort((a, b) => {
      const aStarts = a.club_name.toLowerCase().startsWith(needle) ? 0 : 1;
      const bStarts = b.club_name.toLowerCase().startsWith(needle) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (a.club_name.length !== b.club_name.length) {
        return a.club_name.length - b.club_name.length;
      }
      return a.club_name.localeCompare(b.club_name);
    })
    .slice(0, RESULT_LIMIT)
    .map((c) => ({
      id: c.id,
      club_name: c.club_name,
      course_name: c.course_name ?? "",
      latitude: c.latitude === null ? null : Number(c.latitude),
      longitude: c.longitude === null ? null : Number(c.longitude),
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      country: c.country ?? "",
    }));

  return NextResponse.json({ courses });
}
