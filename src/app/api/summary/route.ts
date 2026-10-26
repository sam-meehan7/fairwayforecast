import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCourseDirectory } from "@/lib/courses";
import { calculatePlayabilityScore } from "@/lib/scoring";
import type {
  RoundForecast,
  PlayabilityScore,
  HourlyWeather,
} from "@/lib/types";
import {
  getWeatherDescription,
  isRequestableForecastDate,
} from "@/lib/weather-utils";
import {
  degreesToDirection,
  formatLocalHour,
  formatLocalTime,
  getHourlyForecast,
} from "@/lib/weather";

// Hard ceiling on Haiku calls per UTC day, across all visitors. Cache hits
// don't count. At ~$0.001 a call the default caps spend at about $1/day.
const DAILY_LIMIT = Number(process.env.SUMMARY_DAILY_LIMIT) || 1000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildWeatherContext(
  forecast: RoundForecast,
  score: PlayabilityScore,
  teeTime: number
): string {
  const { hourly, daily, units } = forecast;

  const hourLines = hourly.map((h: HourlyWeather) => {
    const weather = getWeatherDescription(h.weather_code);
    const dir = degreesToDirection(h.wind_direction);
    return `${formatLocalHour(h.time)}: ${Math.round(h.temperature)}${units.temperature} (feels ${Math.round(h.apparent_temperature)}${units.temperature}), ${weather.text}, wind ${Math.round(h.wind_speed)} ${units.wind_speed} ${dir} gusting ${Math.round(h.wind_gusts)}, ${
      h.precipitation_probability != null
        ? `rain ${h.precipitation_probability}%`
        : h.precipitation != null
        ? `rain chance not available, ${h.precipitation} mm expected`
        : "rain not available"
    }, UV ${h.uv_index}`;
  });

  return `Playability: ${score.overall}/100 (${score.label})
Sunrise: ${formatLocalTime(daily.sunrise)} / Sunset: ${formatLocalTime(daily.sunset)}

Hourly during round:
${hourLines.join("\n")}

Conditions: Temp ${score.temperatureDesc}, Wind ${score.windDesc}, Rain ${score.rainDesc}, Visibility ${score.visibilityDesc}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, date, teeTime } = body as {
      latitude?: number;
      longitude?: number;
      date?: string;
      teeTime?: number;
    };

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof date !== "string" ||
      !isRequestableForecastDate(date) ||
      typeof teeTime !== "number" ||
      !Number.isInteger(teeTime) ||
      teeTime < 0 ||
      teeTime > 23
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Everything that reaches the prompt or the cache key comes from our own
    // catalogue and our own forecast fetch, never the request body. That keeps
    // the cache keyspace bounded (a varied course name can't force a miss) and
    // stops anyone writing a summary that other visitors are then served.
    const course = (await getCourseDirectory()).find(
      (c) => c.latitude === latitude && c.longitude === longitude
    );
    if (!course) {
      return NextResponse.json({ error: "Unknown course" }, { status: 404 });
    }

    const cacheKey = `${course.id}|${date}|${teeTime}`;
    const supabase = getSupabaseAdmin();

    // Check cache (1 hour TTL)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("summary_cache")
      .select("summary")
      .eq("cache_key", cacheKey)
      .gte("created_at", oneHourAgo)
      .single();

    if (cached) {
      return NextResponse.json({ summary: cached.summary });
    }

    const forecast = await getHourlyForecast(
      course.latitude,
      course.longitude,
      date,
      teeTime
    );
    if (!forecast || forecast.hourly.length === 0) {
      return NextResponse.json(
        { error: "No forecast available" },
        { status: 502 }
      );
    }
    const score = calculatePlayabilityScore(forecast.hourly);
    const courseName = course.club_name;

    // Fails closed: if the budget can't be checked, no model call is made.
    const { data: granted, error: budgetError } = await supabase.rpc(
      "claim_summary_slot",
      { daily_limit: DAILY_LIMIT }
    );
    if (budgetError) {
      console.error("Summary budget check failed:", budgetError.message);
      return NextResponse.json(
        { error: "Summary unavailable" },
        { status: 503 }
      );
    }
    if (!granted) {
      console.warn(`Summary daily limit (${DAILY_LIMIT}) reached`);
      return NextResponse.json(
        { error: "Summary unavailable" },
        { status: 429 }
      );
    }

    const weatherContext = buildWeatherContext(forecast, score, teeTime);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Write a two-sentence summary of the conditions for this round of golf: first what to expect, then one practical tip. Write like an experienced local caddie: plain, specific and friendly, with no hype and no exclamation marks. Use the numbers given; don't invent details about the course.

Course: ${courseName}
Date: ${date}
Tee time: ${teeTime}:00

${weatherContext}

Write the summary now. No greeting, no heading, just the summary sentences.`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Cache the result (upsert to handle expired entries)
    await supabase
      .from("summary_cache")
      .upsert(
        { cache_key: cacheKey, summary, created_at: new Date().toISOString() },
        { onConflict: "cache_key" }
      );

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Failed to generate forecast summary:", err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
