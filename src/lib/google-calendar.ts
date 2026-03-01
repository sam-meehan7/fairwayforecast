import { OAuth2Client } from "google-auth-library";
import { supabaseAdmin } from "./supabase";
import type { CalendarEvent } from "./types";

export async function getUpcomingEvents(
  accessToken: string,
  refreshToken: string | null,
  userEmail: string,
  daysAhead: number = 7
): Promise<CalendarEvent[]> {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Force a token refresh to get a fresh access token
  let token = accessToken;
  if (refreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      token = credentials.access_token || accessToken;

      // Update the stored access token
      if (token !== accessToken) {
        await supabaseAdmin
          .from("profiles")
          .update({ google_access_token: token })
          .eq("email", userEmail);
      }
    } catch (error) {
      console.warn("Token refresh failed, trying with existing token:", error);
    }
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(
    now.getTime() + daysAhead * 24 * 60 * 60 * 1000
  ).toISOString();

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(
      `Calendar API returned ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();
  return data.items || [];
}
