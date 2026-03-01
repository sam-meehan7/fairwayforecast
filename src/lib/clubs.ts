import { supabaseAdmin } from "./supabase";
import { searchGolfCourse } from "./golf-courses";

export async function getOrCreateClub(
  clubName: string
): Promise<string | null> {
  // Check if club exists (case-insensitive partial match)
  const { data: existing } = await supabaseAdmin
    .from("clubs")
    .select("id, latitude, longitude")
    .ilike("name", `%${clubName}%`);

  if (existing?.length) {
    const club = existing[0];

    // If we have the club but no coordinates, try to fetch them
    if (!club.latitude || !club.longitude) {
      await updateClubCoordinates(club.id, clubName);
    }

    return club.id;
  }

  // Search Golf Course API for club details
  const courseData = await searchGolfCourse(clubName);

  if (courseData?.latitude) {
    // Create club with coordinates from API
    const { data: result } = await supabaseAdmin
      .from("clubs")
      .insert({
        name: courseData.club_name || clubName,
        latitude: courseData.latitude,
        longitude: courseData.longitude,
      })
      .select("id")
      .single();

    return result?.id ?? null;
  }

  // Create club without coordinates (fallback)
  const { data: result } = await supabaseAdmin
    .from("clubs")
    .insert({ name: clubName })
    .select("id")
    .single();

  return result?.id ?? null;
}

async function updateClubCoordinates(
  clubId: string,
  clubName: string
): Promise<void> {
  const courseData = await searchGolfCourse(clubName);

  if (courseData?.latitude) {
    await supabaseAdmin
      .from("clubs")
      .update({
        latitude: courseData.latitude,
        longitude: courseData.longitude,
      })
      .eq("id", clubId);
  }
}
