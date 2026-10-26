import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Droplets, Wind } from "lucide-react";
import { Logo } from "@/components/logo";
import { WeatherIcon } from "@/components/weather-icon";
import { EmbedRoundChip } from "@/components/embed-round-chip";
import { coursePath, getCourseBySlug, toolHref } from "@/lib/courses";
import {
  OUTLOOK_ROUNDS,
  buildOutlook,
  formatOutlookDate,
  formatTeeHour,
} from "@/lib/course-outlook";
import { fetchLocationSeries } from "@/lib/weather";

// The widget clubs put on their own sites in an iframe. It shares the course
// page's cadence so a club's traffic can't drive up Open-Meteo use, and it
// reads no search params, which would make every view a fresh render.
export const revalidate = 10800;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};

  // The course page is the one that should rank; this is a copy of it.
  return {
    title: `${course.club_name} golf weather widget | FairwayForecast`,
    robots: { index: false, follow: true },
    alternates: { canonical: coursePath(course) },
  };
}

export default async function EmbedPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const series = await fetchLocationSeries(course.latitude, course.longitude);
  // Same as the course page: throwing keeps the last good widget serving.
  const days = series ? buildOutlook(series) : [];
  if (!series || days.length === 0) {
    throw new Error(`No forecast for ${course.id}`);
  }

  // Relative links resolve against the iframe's own URL, so they open
  // FairwayForecast rather than the club's site.
  const courseUrl = coursePath(course);

  return (
    <main className="h-dvh flex flex-col overflow-hidden rounded-base border-2 border-border bg-secondary-background">
      <header className="flex items-end gap-3 border-b-2 border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading leading-tight">
            {course.club_name}
          </h1>
          <p className="text-xs text-foreground/60">
            {days.length}-day golf forecast
          </p>
        </div>
        {/* Visitors to a club's site have never seen the score, so the
            column header names it and links to how it works. */}
        <div className="shrink-0 text-center text-xs">
          <a
            href={`${courseUrl}#playability-score`}
            target="_blank"
            rel="noopener"
            className="font-heading leading-tight underline decoration-dotted underline-offset-2 hover:text-main"
          >
            Playability score
          </a>
          <div className="flex gap-3 text-foreground/60">
            {OUTLOOK_ROUNDS.map((round) => (
              <div key={round.teeHour} className="w-12">
                {formatTeeHour(round.teeHour)}
              </div>
            ))}
          </div>
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto divide-y-2 divide-border/10">
        {days.map((day) => (
          <li key={day.date} className="flex items-center gap-3 px-3 py-2">
            <WeatherIcon code={day.weatherCode} className="size-6 shrink-0" />
            {/* Fixed-height lines that wrap into hidden overflow: on a narrow
                widget the stats that don't fit drop out whole, not half-cut. */}
            <div className="min-w-0 flex-1 text-xs text-foreground/60">
              <div className="flex h-5 flex-wrap items-baseline gap-x-2 overflow-hidden">
                <span className="font-heading text-sm text-foreground">
                  {formatOutlookDate(day.date, "short")}
                </span>
                <span>
                  {Math.round(day.tempMin)}–{Math.round(day.tempMax)}°C
                </span>
              </div>
              <div className="flex h-4 flex-wrap gap-x-2.5 overflow-hidden">
                <span className="flex items-center gap-1" title="Wind">
                  <Wind className="size-3.5" />
                  {Math.round(day.maxWind)} km/h
                </span>
                {day.rainChance != null && (
                  <span
                    className="flex items-center gap-1"
                    title="Chance of rain"
                  >
                    <Droplets className="size-3.5" />
                    {day.rainChance}%
                  </span>
                )}
              </div>
            </div>
            {OUTLOOK_ROUNDS.map(({ teeHour }) => {
              const round = day.rounds.find((r) => r.teeHour === teeHour);
              return round ? (
                <EmbedRoundChip
                  key={teeHour}
                  href={toolHref(course, day.date, teeHour)}
                  title={`${formatOutlookDate(day.date, "short")}, ${formatTeeHour(teeHour)}`}
                  startsAt={round.startsAt}
                  score={round.score}
                />
              ) : (
                <div key={teeHour} className="w-12" />
              );
            })}
          </li>
        ))}
      </ul>

      <footer className="flex items-center justify-between gap-3 border-t-2 border-border px-3 py-1.5 text-xs">
        <a
          href={courseUrl}
          target="_blank"
          rel="noopener"
          aria-label="Full forecast on FairwayForecast"
          className="text-foreground/70 hover:text-foreground"
        >
          <Logo markClassName="size-5" textClassName="text-sm" />
        </a>
        <a
          href={courseUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 font-heading hover:text-main"
        >
          Hour by hour <ArrowUpRight className="size-3.5" />
        </a>
      </footer>
    </main>
  );
}
