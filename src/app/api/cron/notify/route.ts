import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getWeatherForecast } from "@/lib/weather";
import { sendWeatherEmail } from "@/lib/email";
import type { GolfEventWithRelations } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine morning vs evening based on current UTC hour
  const currentHour = new Date().getUTCHours();
  const notificationType = currentHour < 12 ? "morning" : "evening";

  // Morning: today's events. Evening: tomorrow's events.
  const targetDate =
    notificationType === "evening" ? getTomorrow() : getToday();

  console.log(
    `Sending ${notificationType} notifications for ${targetDate}`
  );

  const notifiedField = `${notificationType}_notified`;

  const { data: events } = await supabaseAdmin
    .from("golf_events")
    .select("*, profiles(*), clubs(*)")
    .eq("event_date", targetDate)
    .eq(notifiedField, false);

  if (!events?.length) {
    return NextResponse.json({
      date: targetDate,
      type: notificationType,
      notifications: [],
    });
  }

  const results = [];

  for (const event of events as GolfEventWithRelations[]) {
    const user = event.profiles;
    const club = event.clubs;

    if (!user || !user.notifications_enabled) {
      continue;
    }

    let clubName: string;
    let weather = null;

    if (!club?.latitude || !club?.longitude) {
      clubName = event.club_name_raw || "your golf club";
    } else {
      clubName = club.name;
      weather = await getWeatherForecast(
        club.latitude,
        club.longitude,
        targetDate
      );
    }

    try {
      await sendWeatherEmail({
        toEmail: user.email,
        userName: user.name || "Golfer",
        clubName,
        eventDate: targetDate,
        eventTime: event.event_time,
        weather,
        notificationType,
        unsubscribeToken: user.id,
      });

      // Mark as notified
      await supabaseAdmin
        .from("golf_events")
        .update({ [notifiedField]: true })
        .eq("id", event.id);

      console.log(`Notification sent to ${user.email} for ${clubName}`);
      results.push({
        email: user.email,
        club: clubName,
        status: "sent",
      });
    } catch (error) {
      console.error(
        `Failed to send notification to ${user.email}:`,
        error
      );
      results.push({
        email: user.email,
        club: clubName,
        error: String(error),
      });
    }
  }

  return NextResponse.json({
    date: targetDate,
    type: notificationType,
    notifications: results,
  });
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}
