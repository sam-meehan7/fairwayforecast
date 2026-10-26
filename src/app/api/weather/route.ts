import { NextRequest, NextResponse } from "next/server";
import { getHourlyForecast } from "@/lib/weather";
import { calculatePlayabilityScore } from "@/lib/scoring";
import {
  FORECAST_HORIZON_DAYS,
  isRequestableForecastDate,
} from "@/lib/weather-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const date = searchParams.get("date") || "";
  const teeTime = parseInt(searchParams.get("teeTime") || "8", 10);

  if (isNaN(lat) || isNaN(lng) || !date) {
    return NextResponse.json(
      { error: "Missing required parameters: lat, lng, date" },
      { status: 400 }
    );
  }

  // A date past the fetched series is caught below.
  if (!isRequestableForecastDate(date)) {
    return NextResponse.json(
      {
        error: `Date must be within the next ${FORECAST_HORIZON_DAYS} days (YYYY-MM-DD)`,
      },
      { status: 400 }
    );
  }

  const forecast = await getHourlyForecast(lat, lng, date, teeTime);

  if (!forecast) {
    return NextResponse.json(
      { error: "Unable to fetch weather data" },
      { status: 502 }
    );
  }

  // In-range by the check above but beyond what the provider has for this
  // course (or a tee hour past the end of the data): say so, don't return an
  // empty forecast with a score of 0.
  if (forecast.hourly.length === 0) {
    return NextResponse.json(
      { error: "No forecast available for that date and tee time" },
      { status: 404 }
    );
  }

  const score = calculatePlayabilityScore(forecast.hourly);

  return NextResponse.json(
    { forecast, score },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    }
  );
}
