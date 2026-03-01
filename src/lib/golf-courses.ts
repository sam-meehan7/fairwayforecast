import type { GolfCourseResult } from "./types";

const API_BASE = "https://api.golfcourseapi.com/v1";

export async function searchGolfCourse(
  clubName: string
): Promise<GolfCourseResult | null> {
  const results = await searchGolfCourses(clubName, 1);
  return results[0] ?? null;
}

export async function searchGolfCourses(
  query: string,
  limit: number = 8
): Promise<GolfCourseResult[]> {
  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("search_query", query);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Key ${process.env.GOLF_COURSE_API_KEY}`,
    },
  });

  if (!response.ok) {
    console.warn(
      `Golf course API returned ${response.status} for '${query}'`
    );
    return [];
  }

  const data = await response.json();
  const courses = data.courses;

  if (!courses?.length) {
    return [];
  }

  return courses.slice(0, limit).map((course: Record<string, unknown>) => {
    const location = (course.location as Record<string, unknown>) || {};
    return {
      id: course.id,
      club_name: course.club_name,
      course_name: course.course_name,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      address: location.address ?? "",
      city: location.city ?? "",
      state: location.state ?? "",
      country: location.country ?? "",
    };
  });
}
