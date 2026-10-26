import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wind, Droplets, Thermometer, Trophy, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CourseMap } from "@/components/course-map-lazy";
import { WeatherIcon } from "@/components/weather-icon";
import { RoundLink } from "@/components/round-link";
import { EmbedSnippet } from "@/components/embed-snippet";
import {
  SITE_URL,
  coursePath,
  embedPath,
  getCourseBySlug,
  getCourseDirectory,
  nearestCourses,
  toolHref,
  type CourseListing,
} from "@/lib/courses";
import {
  bestRound,
  buildOutlook,
  formatOutlookDate,
  formatTeeHour,
  type OutlookDay,
  type OutlookRound,
} from "@/lib/course-outlook";
import { fetchLocationSeries } from "@/lib/weather";
import { getWeatherDescription } from "@/lib/weather-utils";
import { OG_IMAGE, TWITTER_IMAGE } from "@/app/_og-image";

// Pages render on first request and refresh at most every three hours. That
// caps upstream use at ~8 Open-Meteo calls per course per day however often
// the page is viewed or crawled.
export const revalidate = 10800;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

// "Lahinch Golf Club Weather Forecast", not "... Golf Club Golf Weather".
function courseTitle(course: CourseListing): string {
  return /golf/i.test(course.club_name)
    ? `${course.club_name} Weather Forecast`
    : `${course.club_name} Golf Weather Forecast`;
}

function placeName(course: CourseListing): string {
  return course.city ? `${course.city}, Ireland` : "Ireland";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};

  const title = `${courseTitle(course)} | FairwayForecast`;
  const description = `7-day golf weather for ${course.club_name}, ${placeName(course)}: wind, rain, temperature and a playability score for morning and afternoon rounds. Updated every few hours.`;

  return {
    title,
    description,
    alternates: { canonical: coursePath(course) },
    openGraph: {
      title,
      description,
      url: coursePath(course),
      type: "website",
      siteName: "FairwayForecast",
      locale: "en_IE",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [TWITTER_IMAGE],
    },
  };
}

function outlookSummary(
  course: CourseListing,
  days: OutlookDay[],
  best: { day: OutlookDay; round: OutlookRound } | null
): string {
  const sentences: string[] = [];

  if (best) {
    sentences.push(
      `The best round at ${course.club_name} over the next ${days.length} days looks like ${formatOutlookDate(best.day.date)} (${best.round.label.toLowerCase()}), with a playability score of ${best.round.score.overall}/100 — ${best.round.score.label.toLowerCase()}.`
    );
  }

  const windiest = days.reduce((a, b) => (b.maxGust > a.maxGust ? b : a));
  sentences.push(
    `The windiest day is ${formatOutlookDate(windiest.date)}, with gusts up to ${Math.round(windiest.maxGust)} km/h.`
  );

  const withRain = days.filter((d) => d.rainChance != null);
  if (withRain.length > 0) {
    const wettest = withRain.reduce((a, b) =>
      b.rainChance! > a.rainChance! ? b : a
    );
    sentences.push(
      wettest.rainChance! >= 30
        ? `${formatOutlookDate(wettest.date)} is the wettest, with a ${wettest.rainChance}% chance of rain during the day.`
        : `Rain chances stay below 30% all week.`
    );
  }

  return sentences.join(" ");
}

function DayRow({ course, day }: { course: CourseListing; day: OutlookDay }) {
  return (
    <li className="px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:w-44 shrink-0">
        <WeatherIcon code={day.weatherCode} className="size-8 shrink-0" />
        <div>
          <h3 className="font-heading whitespace-nowrap">
            {formatOutlookDate(day.date, "short")}
          </h3>
          <p className="text-sm text-foreground/60">
            {getWeatherDescription(day.weatherCode).text}
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm flex-1">
        <div className="flex items-center gap-1.5">
          <Thermometer className="size-4 text-foreground/60" />
          <dt className="sr-only">Temperature</dt>
          <dd>
            {Math.round(day.tempMin)}–{Math.round(day.tempMax)}°C
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="size-4 text-foreground/60" />
          <dt className="sr-only">Wind</dt>
          <dd>
            {Math.round(day.maxWind)} km/h · gusts {Math.round(day.maxGust)}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="size-4 text-foreground/60" />
          <dt className="sr-only">Chance of rain</dt>
          <dd>
            {day.rainChance == null ? "—" : `${day.rainChance}% rain`}
          </dd>
        </div>
      </dl>
      <div className="flex gap-2">
        {day.rounds.map((round) => (
          <RoundLink
            key={round.label}
            href={toolHref(course, day.date, round.teeHour)}
            label={round.label}
            teeLabel={formatTeeHour(round.teeHour)}
            startsAt={round.startsAt}
            score={round.score}
          />
        ))}
      </div>
    </li>
  );
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const series = await fetchLocationSeries(course.latitude, course.longitude);
  // Throwing (rather than rendering an empty forecast) means a failed refresh
  // keeps serving the last good page instead of caching the failure.
  const days = series ? buildOutlook(series) : [];
  if (!series || days.length === 0) {
    throw new Error(`No forecast for ${course.id}`);
  }

  const nearby = nearestCourses(course, await getCourseDirectory(), 8);
  // The page is re-rendered at most every few hours, so this can still pick a
  // round that has since teed off; the round links grey those out client-side.
  const best = bestRound(days);
  const firstRound = series.hourly.find((h) => h.is_day) ?? series.hourly[0];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "GolfCourse",
      name: course.club_name,
      url: `${SITE_URL}${coursePath(course)}`,
      geo: {
        "@type": "GeoCoordinates",
        latitude: course.latitude,
        longitude: course.longitude,
      },
      address: {
        "@type": "PostalAddress",
        ...(course.city && { addressLocality: course.city }),
        addressCountry: "IE",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Golf weather",
          item: `${SITE_URL}/golf-weather`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: course.club_name,
          item: `${SITE_URL}${coursePath(course)}`,
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-10">
        <div className="space-y-4 max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-foreground/60">
            <Link href="/" className="underline hover:text-foreground">
              Home
            </Link>
            {" › "}
            <Link
              href="/golf-weather"
              className="underline hover:text-foreground"
            >
              Golf weather
            </Link>
            {" › "}
            <span>{course.club_name}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-heading tracking-tight text-balance">
            {courseTitle(course)}
          </h1>
          <p className="text-foreground/70">
            Golf weather for {course.club_name}, {placeName(course)}. Wind,
            rain and temperature for the next {days.length} days, with a
            playability score for a 9 AM and a 1 PM round.
          </p>
          <p className="text-sm text-foreground/60">
            {outlookSummary(course, days, best)}
          </p>
        </div>

        {best && (
          <Link
            href={toolHref(course, best.day.date, best.round.teeHour)}
            rel="nofollow"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow px-5 py-4 transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
          >
            <Trophy className="size-6 shrink-0" />
            <div className="flex-1 basis-56">
              <div className="text-sm opacity-80">Best round this week</div>
              <div className="font-heading text-lg">
                {formatOutlookDate(best.day.date)},{" "}
                {best.round.label.toLowerCase()} ·{" "}
                {best.round.score.overall}/100 {best.round.score.label}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-heading ml-10 sm:ml-0">
              See hour by hour <ArrowRight className="size-4" />
            </span>
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <section className="space-y-3">
            <div>
              <h2 className="text-2xl font-heading">
                {days.length}-day golf forecast
              </h2>
              <p className="text-sm text-foreground/60">
                Scores for a 9 AM and a 1 PM tee time. Pick a round for the
                hour-by-hour detail.
              </p>
            </div>
            <ul className="rounded-base border-2 border-border bg-secondary-background shadow-shadow divide-y-2 divide-border/10">
              {days.map((day) => (
                <DayRow key={day.date} course={course} day={day} />
              ))}
            </ul>
          </section>
          <div className="space-y-4">
            <Button asChild size="lg" className="w-full h-12 text-base">
              <Link href={toolHref(course)} rel="nofollow">
                Check your exact tee time
              </Link>
            </Button>
            <CourseMap
              latitude={course.latitude}
              longitude={course.longitude}
              courseName={course.club_name}
              windDirection={firstRound?.wind_direction}
              windSpeed={firstRound?.wind_speed}
            />
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl font-heading">
            Golf courses near {course.club_name}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {nearby.map((c) => (
              <li key={c.id}>
                <Link
                  href={coursePath(c)}
                  className="block h-full rounded-base border-2 border-border bg-secondary-background px-4 py-3 transition-colors hover:bg-main/10"
                >
                  <div className="font-heading">{c.club_name}</div>
                  <p className="text-sm text-foreground/60">
                    {Math.round(c.distanceKm)} km away
                    {c.city && ` · ${c.city}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="playability-score"
          className="space-y-2 text-foreground/70 max-w-3xl scroll-mt-6"
        >
          <h2 className="text-2xl font-heading text-foreground">
            How the playability score works
          </h2>
          <p>
            Each round covers five hours from the tee time on the course&apos;s
            local clock. The score out of 100 weighs wind (30%), rain (30%),
            temperature (25%) and visibility (15%): calm, dry rounds between
            18 and 25°C score highest. Pick any date and tee time in the next
            two weeks for an hour-by-hour breakdown.
          </p>
        </section>

        <section className="space-y-3 max-w-3xl">
          <h2 className="text-2xl font-heading">
            Add this forecast to your club&apos;s website
          </h2>
          <p className="text-foreground/70">
            Run {course.club_name}? Show members this 7-day golf forecast on
            your own site, free. Paste the code below into any page; it
            updates itself every few hours.
          </p>
          <EmbedSnippet
            courseName={course.club_name}
            embedUrl={`${SITE_URL}${embedPath(course)}`}
            courseUrl={`${SITE_URL}${coursePath(course)}`}
          />
        </section>
      </div>

      <Footer />
    </main>
  );
}
