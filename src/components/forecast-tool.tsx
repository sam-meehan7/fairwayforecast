"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { CourseSearch } from "@/components/course-search";
import { DateTimePicker } from "@/components/date-time-picker";
import { WeatherDashboard } from "@/components/weather-dashboard";
import { ForecastSummary } from "@/components/forecast-summary";
import { ShareButton } from "@/components/share-button";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ComingSoonModal } from "@/components/coming-soon-modal";
import { CourseMap } from "@/components/course-map-lazy";
import type {
  GolfCourseResult,
  RoundForecast,
  PlayabilityScore,
} from "@/lib/types";
import {
  FORECAST_HORIZON_DAYS,
  isWithinForecastWindow,
} from "@/lib/weather-utils";
import { getDefaultRound, getTeeTimeOptions } from "@/lib/tee-times";
import { formatOutlookDate } from "@/lib/course-outlook";

const FF_INTEREST_DISMISSED = "ff_interest_dismissed_v1";

// The "coming soon" prompt waits until a visitor has run this many forecasts,
// so it never interrupts someone reading their first result.
const INTEREST_PROMPT_AFTER = 2;

function teeTimeLabel(teeTime: number): string {
  return (
    getTeeTimeOptions().find((opt) => opt.value === teeTime)?.label ??
    `${Math.floor(teeTime)}:00`
  );
}

interface ForecastToolProps {
  // Static, crawlable content from the server page goes in `children`,
  // between the results and the footer.
  children?: React.ReactNode;
  courseCount?: number;
  popularCourses?: { name: string; href: string }[];
}

export function ForecastTool({
  children,
  courseCount,
  popularCourses = [],
}: ForecastToolProps) {
  const [selectedCourse, setSelectedCourse] =
    useState<GolfCourseResult | null>(null);
  // Both set on mount, not here: this page is prerendered, so a default fixed
  // at build time would be as stale as the deploy is old.
  const [date, setDate] = useState("");
  const [teeTime, setTeeTime] = useState(8);
  const [forecast, setForecast] = useState<RoundForecast | null>(null);
  const [score, setScore] = useState<PlayabilityScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  // The round the results on screen are for. The pickers can move on before
  // the next fetch, so the header and share link read this instead.
  const [round, setRound] = useState<{ date: string; teeTime: number } | null>(
    null
  );
  const forecastCount = useRef(0);
  const resultsRef = useRef<HTMLElement>(null);
  const initialised = useRef(false);
  // Bumped to remount the course search, which keeps its own query text.
  const [resetCount, setResetCount] = useState(0);

  async function fetchSummary(
    course: GolfCourseResult,
    summaryDate: string,
    summaryTeeTime: number
  ) {
    setSummaryLoading(true);
    setSummaryError(false);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: course.latitude,
          longitude: course.longitude,
          date: summaryDate,
          teeTime: summaryTeeTime,
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

  async function fetchWeatherFor(
    course: GolfCourseResult,
    weatherDate: string,
    weatherTeeTime: number
  ) {
    if (!course.latitude || !course.longitude) {
      setError(
        "This course doesn't have location data. Try a different course."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: String(course.latitude),
        lng: String(course.longitude),
        date: weatherDate,
        teeTime: String(Math.floor(weatherTeeTime)),
      });

      const res = await fetch(`/api/weather?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to fetch weather data.");
        return;
      }

      setForecast(data.forecast);
      setScore(data.score);
      setRound({ date: weatherDate, teeTime: weatherTeeTime });
      forecastCount.current += 1;

      fetch("/api/track-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: course.club_name,
          latitude: course.latitude,
          longitude: course.longitude,
          date: weatherDate,
          teeTime: Math.floor(weatherTeeTime),
        }),
      }).catch(() => {});

      if (
        forecastCount.current === INTEREST_PROMPT_AFTER &&
        typeof window !== "undefined" &&
        !localStorage.getItem(FF_INTEREST_DISMISSED)
      ) {
        setTimeout(() => setShowComingSoon(true), 1500);
      }

      // Fetch AI summary in parallel (fire-and-forget)
      fetchSummary(course, weatherDate, Math.floor(weatherTeeTime));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fetchWeather() {
    if (selectedCourse) {
      fetchWeatherFor(selectedCourse, date, teeTime);
    }
  }

  // Auto-fetch from shared link params. Runs once: the link is cleared from
  // the URL below, so a second run (React dev mode re-runs mount effects)
  // would find no params and reset the pickers to the defaults.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const defaultRound = getDefaultRound();
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const lat = params.get("lat");
    const lng = params.get("lng");
    const dateParam = params.get("date");
    const t = params.get("t");

    if (name && lat && lng) {
      const course: GolfCourseResult = {
        id: `${lat},${lng}`,
        club_name: name,
        course_name: name,
        latitude: Number(lat),
        longitude: Number(lng),
        address: "",
        city: "",
        state: "",
        country: "",
      };

      const sharedDate = dateParam || defaultRound.date;
      const sharedTeeTime = t ? Number(t) : defaultRound.teeTime;

      setSelectedCourse(course);
      setTeeTime(sharedTeeTime);

      window.history.replaceState({}, "", "/");

      // A shared link carries an absolute date, so by the time it is opened it
      // can sit outside the forecast window. Fetching anyway returns an empty
      // forecast rather than an error, so ask for a new date instead.
      if (isWithinForecastWindow(sharedDate)) {
        setDate(sharedDate);
        fetchWeatherFor(course, sharedDate, sharedTeeTime);
      } else {
        setDate(defaultRound.date);
        setTeeTime(defaultRound.teeTime);
        setError(
          `This link is for ${sharedDate}, which is outside the ${FORECAST_HORIZON_DAYS}-day forecast window. Pick a new date below.`
        );
      }
    } else {
      setDate(defaultRound.date);
      setTeeTime(defaultRound.teeTime);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Below the lg breakpoint the results land under the fold (and the map
  // stacks on top of them), so bring them up. Desktop shows them in place.
  useEffect(() => {
    const el = resultsRef.current;
    if (!forecast || !el) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [forecast]);

  function resetTool() {
    const defaultRound = getDefaultRound();
    setSelectedCourse(null);
    setDate(defaultRound.date);
    setTeeTime(defaultRound.teeTime);
    setForecast(null);
    setScore(null);
    setSummary(null);
    setSummaryError(false);
    setError(null);
    setRound(null);
    setResetCount((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCourseSelect(course: GolfCourseResult) {
    setSelectedCourse(course);
    setForecast(null);
    setScore(null);
    setSummary(null);
    setSummaryError(false);
    setError(null);
    setRound(null);
  }

  const canFetch = selectedCourse && date && !loading;

  return (
    <main className="min-h-screen bg-background">
      <ComingSoonModal
        open={showComingSoon}
        onClose={() => {
          if (typeof window !== "undefined") {
            localStorage.setItem(FF_INTEREST_DISMISSED, "1");
          }
          setShowComingSoon(false);
        }}
      />
      <SiteHeader onHomeClick={resetTool} />

      {/* Hero + search */}
      <section className="max-w-xl mx-auto px-6 pt-10 sm:pt-14">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-heading tracking-tight text-balance sm:-mx-12">
            Golf weather forecasts for Irish courses
          </h1>
          <p className="mt-3 text-foreground/70 text-balance">
            Pick your course and tee time to see wind, rain and temperature
            for the five hours you&apos;re actually out there.
          </p>
        </div>

        <Card className="p-4 sm:p-5 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="course-search" className="text-sm font-heading">
              Course
            </label>
            <CourseSearch
              key={resetCount}
              onSelect={handleCourseSelect}
              initialValue={selectedCourse?.club_name}
            />
          </div>
          <DateTimePicker
            date={date}
            teeTime={teeTime}
            onDateChange={setDate}
            onTeeTimeChange={setTeeTime}
          />
          <Button
            onClick={fetchWeather}
            disabled={!canFetch}
            className="w-full h-12 text-base mt-1"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Loading forecast…
              </>
            ) : (
              "Get forecast"
            )}
          </Button>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border-2 border-red-300 rounded-base px-4 py-3"
            >
              {error}
            </div>
          )}
        </Card>

        <p className="mt-4 text-center text-sm text-foreground/60 text-balance">
          {courseCount ? `${courseCount} Irish courses · ` : ""}
          {FORECAST_HORIZON_DAYS}-day forecasts · Free, no sign-up
        </p>
        {popularCourses.length > 0 && !forecast && (
          <p className="mt-2 text-center text-sm text-foreground/60 text-balance">
            Popular:{" "}
            {popularCourses.map((course, i) => (
              <span key={course.href}>
                {i > 0 && " · "}
                <Link
                  href={course.href}
                  className="underline text-foreground hover:text-main"
                >
                  {course.name}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

      {/* Results */}
      {forecast && score && selectedCourse && round && (
        <section
          ref={resultsRef}
          className="max-w-6xl mx-auto px-6 mt-10 scroll-mt-4"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-heading">
                {selectedCourse.club_name}
              </h2>
              <p className="text-sm text-foreground/60">
                {formatOutlookDate(round.date)} ·{" "}
                {teeTimeLabel(round.teeTime)} tee time · 5-hour round
              </p>
            </div>
            <ShareButton
              course={selectedCourse}
              date={round.date}
              teeTime={round.teeTime}
            />
          </div>
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
              teeTimeHour={Math.floor(round.teeTime)}
            />
            {selectedCourse.latitude && selectedCourse.longitude && (
              <div>
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

      {children}

      <Footer />
    </main>
  );
}
