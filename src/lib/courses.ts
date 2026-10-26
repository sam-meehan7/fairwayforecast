import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

// A course with a public page at /golf-weather/[slug]. Only courses with
// coordinates get one — without them there's no forecast to show.
export interface CourseListing {
  id: string;
  slug: string;
  club_name: string;
  city: string | null;
  latitude: number;
  longitude: number;
}

export const SITE_URL = "https://www.fairwayforecast.app";

export function coursePath(course: Pick<CourseListing, "slug">): string {
  return `/golf-weather/${course.slug}`;
}

export function embedPath(course: Pick<CourseListing, "slug">): string {
  return `/embed/${course.slug}`;
}

// The homepage tool picks up these params as a shared link and fetches the
// forecast for that exact tee time.
export function toolHref(
  course: CourseListing,
  date?: string,
  teeHour?: number
): string {
  const params = new URLSearchParams({
    name: course.club_name,
    lat: String(course.latitude),
    lng: String(course.longitude),
  });
  if (date) params.set("date", date);
  if (teeHour !== undefined) params.set("t", String(teeHour));
  return `/?${params.toString()}`;
}

// "Baile Átha Cliath G.C." → "baile-atha-cliath-g-c". Slugs are derived from
// the club name rather than stored, so a rename in OSM moves the URL.
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadCourseDirectory(): Promise<CourseListing[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("golf_courses")
    .select("id, source_ref, club_name, city, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("club_name");

  if (error) {
    throw new Error(`Course directory query failed: ${error.message}`);
  }

  const rows = data ?? [];
  const nameCounts = new Map<string, number>();
  for (const row of rows) {
    const slug = slugify(row.club_name);
    nameCounts.set(slug, (nameCounts.get(slug) ?? 0) + 1);
  }

  // Same-named clubs (OSM has a few) are told apart by their OSM id, which is
  // stable across re-imports; unique names keep the clean slug.
  return rows.map((row) => {
    const base = slugify(row.club_name);
    const suffix = String(row.source_ref).replace(/\D/g, "");
    return {
      id: row.id,
      slug: nameCounts.get(base)! > 1 ? `${base}-${suffix}` : base,
      club_name: row.club_name,
      city: row.city,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    };
  });
}

// The catalogue only changes when the OSM import is re-run, so a day is fine.
export const getCourseDirectory = unstable_cache(
  loadCourseDirectory,
  ["course-directory"],
  { revalidate: 86400 }
);

export async function getCourseBySlug(
  slug: string
): Promise<CourseListing | null> {
  const courses = await getCourseDirectory();
  return courses.find((c) => c.slug === slug) ?? null;
}

function distanceKm(
  a: Pick<CourseListing, "latitude" | "longitude">,
  b: Pick<CourseListing, "latitude" | "longitude">
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestCourses(
  course: CourseListing,
  all: CourseListing[],
  count: number
): (CourseListing & { distanceKm: number })[] {
  return all
    .filter((c) => c.id !== course.id)
    .map((c) => ({ ...c, distanceKm: distanceKm(course, c) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}
