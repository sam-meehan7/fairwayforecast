import { NextRequest, NextResponse } from "next/server";
import { getHourlyForecast } from "@/lib/weather";
import { calculatePlayabilityScore } from "@/lib/scoring";

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

  const forecast = await getHourlyForecast(lat, lng, date, teeTime);

  if (!forecast) {
    return NextResponse.json(
      { error: "Unable to fetch weather data" },
      { status: 502 }
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
