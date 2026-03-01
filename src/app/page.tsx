"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { CourseSearch } from "@/components/course-search";
import { DateTimePicker } from "@/components/date-time-picker";
import { WeatherDashboard } from "@/components/weather-dashboard";
import { ForecastSummary } from "@/components/forecast-summary";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import type {
  GolfCourseResult,
  RoundForecast,
  PlayabilityScore,
} from "@/lib/types";

const CourseMap = dynamic(() => import("@/components/course-map"), {
  ssr: false,
  loading: () => (
    <div className="rounded-base border-2 border-border shadow-shadow h-[350px] lg:h-full lg:min-h-[400px] flex items-center justify-center bg-secondary-background">
      <Loader2 className="size-6 animate-spin text-foreground/40" />
    </div>
  ),
});

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function Home() {
  const [selectedCourse, setSelectedCourse] =
    useState<GolfCourseResult | null>(null);
  const [date, setDate] = useState(getTomorrow);
  const [teeTime, setTeeTime] = useState(8);
  const [forecast, setForecast] = useState<RoundForecast | null>(null);
  const [score, setScore] = useState<PlayabilityScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);

  async function fetchSummary(
    courseName: string,
    forecastData: RoundForecast,
    scoreData: PlayabilityScore
  ) {
    setSummaryLoading(true);
    setSummaryError(false);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName,
          date,
          teeTime: Math.floor(teeTime),
          forecast: forecastData,
          score: scoreData,
        }),
      });

      if (!res.ok) {
        setSummaryError(true);
        return;
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function fetchWeather() {
    if (!selectedCourse?.latitude || !selectedCourse?.longitude) {
      setError(
        "This course doesn't have location data. Try a different course."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: String(selectedCourse.latitude),
        lng: String(selectedCourse.longitude),
        date,
        teeTime: String(Math.floor(teeTime)),
      });

      const res = await fetch(`/api/weather?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to fetch weather data.");
        return;
      }

      setForecast(data.forecast);
      setScore(data.score);

      // Fetch AI summary in parallel (fire-and-forget)
      fetchSummary(selectedCourse.club_name, data.forecast, data.score);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCourseSelect(course: GolfCourseResult) {
    setSelectedCourse(course);
    setForecast(null);
    setScore(null);
    setSummary(null);
    setSummaryError(false);
    setError(null);
  }

  const canFetch = selectedCourse && date && !loading;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="text-center py-8 px-6">
        <h1 className="text-4xl font-heading">Golf Weather</h1>
        <p className="mt-2 text-lg text-foreground/70">
          Search your course. Pick your tee time. Know what to expect.
        </p>
      </header>

      {/* Search Controls */}
      <section className="max-w-xl mx-auto px-6 space-y-3">
        <CourseSearch onSelect={handleCourseSelect} />
        <DateTimePicker
          date={date}
          teeTime={teeTime}
          onDateChange={setDate}
          onTeeTimeChange={setTeeTime}
        />
        <Button
          onClick={fetchWeather}
          disabled={!canFetch}
          className="w-full h-12 text-base"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Loading Forecast...
            </>
          ) : (
            "Get Forecast"
          )}
        </Button>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-base px-4 py-3">
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      {forecast && score && selectedCourse && (
        <section className="max-w-6xl mx-auto px-6 mt-8">
          <h2 className="text-2xl font-heading mb-4">
            {selectedCourse.club_name}
          </h2>
          <div className="mb-4">
            <ForecastSummary
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <WeatherDashboard
              forecast={forecast}
              score={score}
              teeTimeHour={Math.floor(teeTime)}
            />
            {selectedCourse.latitude && selectedCourse.longitude && (
              <div className="order-first lg:order-last">
                <CourseMap
                  latitude={selectedCourse.latitude}
                  longitude={selectedCourse.longitude}
                  courseName={selectedCourse.club_name}
                  windDirection={forecast.hourly[0]?.wind_direction}
                  windSpeed={forecast.hourly[0]?.wind_speed}
                />
              </div>
            )}
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
