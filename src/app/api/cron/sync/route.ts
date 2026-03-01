import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUpcomingEvents } from "@/lib/google-calendar";
import { detectGolfEvent } from "@/lib/anthropic";
import { getOrCreateClub } from "@/lib/clubs";
import type { Profile } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Starting calendar sync for all users");

  const { data: users } = await supabaseAdmin
    .from("profiles")
    .select("*");

  if (!users) {
    return NextResponse.json({ synced_users: 0, results: [] });
  }

  const results = [];

  for (const user of users as Profile[]) {
    if (!user.google_access_token) {
      continue;
    }

    try {
      const events = await getUpcomingEvents(
        user.google_access_token,
        user.google_refresh_token,
        user.email
      );

      let golfEventsFound = 0;

      for (const event of events) {
        const detection = await detectGolfEvent(
          event.summary || "",
          event.description || ""
        );

        if (detection.is_golf) {
          // Parse event date/time
          const start = event.start || {};
          const eventDate =
            start.date || (start.dateTime ? start.dateTime.slice(0, 10) : "");
          const eventTime = start.dateTime
            ? start.dateTime.slice(11, 16)
            : null;

          // Check if we already have this event
          const { data: existing } = await supabaseAdmin
            .from("golf_events")
            .select("id")
            .eq("user_id", user.id)
            .eq("calendar_event_id", event.id);

          if (!existing?.length) {
            // Look up or create club
            let clubId: string | null = null;
            if (detection.club_name) {
              clubId = await getOrCreateClub(detection.club_name);
            }

            // Store the golf event
            await supabaseAdmin.from("golf_events").insert({
              user_id: user.id,
              club_id: clubId,
              event_date: eventDate,
              event_time: eventTime,
              calendar_event_id: event.id,
              club_name_raw: detection.club_name,
            });

            golfEventsFound++;
          }
        }
      }

      results.push({
        user_email: user.email,
        events_checked: events.length,
        golf_events_found: golfEventsFound,
      });
    } catch (error) {
      console.error(`Calendar sync failed for ${user.email}:`, error);
      results.push({
        user_email: user.email,
        error: String(error),
      });
    }
  }

  console.log(`Calendar sync completed: ${results.length} users processed`);
  return NextResponse.json({ synced_users: results.length, results });
}
