import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wind, Droplets, Thermometer } from "lucide-react";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseMap } from "@/components/course-map-lazy";
import { WeatherIcon } from "@/components/weather-icon";
import {
  SITE_URL,
  coursePath,
  getCourseBySlug,
  getCourseDirectory,
  nearestCourses,
  type CourseListing,
} from "@/lib/courses";
import {
  bestRound,
  buildOutlook,
  formatOutlookDate,
  type OutlookDay,
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

// The homepage tool picks up these params as a shared link and fetches the
// forecast for that exact tee time.
function toolHref(course: CourseListing, date?: string, teeHour?: number) {
  const params = new URLSearchParams({
    name: course.club_name,
    lat: String(course.latitude),
    lng: String(course.longitude),
  });
  if (date) params.set("date", date);
  if (teeHour !== undefined) params.set("t", String(teeHour));
  return `/?${params.toString()}`;
}

function outlookSummary(course: CourseListing, days: OutlookDay[]): string {
  const sentences: string[] = [];

  const best = bestRound(days);
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
    <li className="rounded-base border-2 border-border bg-secondary-background shadow-shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 sm:w-56 shrink-0">
        <WeatherIcon code={day.weatherCode} className="size-8 shrink-0" />
        <div>
          <h3 className="font-heading">{formatOutlookDate(day.date)}</h3>
          <p className="text-sm text-foreground/60">
            {getWeatherDescription(day.weatherCode).text}
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm flex-1">
        <div className="flex items-center gap-1.5">
          <Thermometer className="size-4" />
          <dt className="sr-only">Temperature</dt>
          <dd>
            {Math.round(day.tempMin)}–{Math.round(day.tempMax)}°C
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="size-4" />
          <dt className="sr-only">Wind</dt>
          <dd>
            {Math.round(day.maxWind)} km/h, gusts {Math.round(day.maxGust)}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="size-4" />
          <dt className="sr-only">Chance of rain</dt>
          <dd>{day.rainChance == null ? "—" : `${day.rainChance}%`}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        {day.rounds.map((round) => (
          <Link
            key={round.label}
            href={toolHref(course, day.date, round.teeHour)}
            rel="nofollow"
            className="rounded-base border-2 border-border bg-background px-3 py-1.5 text-center min-w-24 hover:bg-main/20"
          >
            <div className="text-xs text-foreground/60">{round.label}</div>
            <div className={`font-heading ${round.score.color}`}>
              {round.score.overall}{" "}
              <span className="text-xs">{round.score.label}</span>
            </div>
          </Link>
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
      <header className="flex justify-center py-6 px-6">
        <Link href="/" aria-label="FairwayForecast home">
          <Logo />
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="space-y-3">
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
          <h1 className="text-3xl font-heading">{courseTitle(course)}</h1>
          <p className="text-foreground/70">
            Golf weather for {course.club_name}, {placeName(course)}. Wind,
            rain and temperature for the next {days.length} days, with a
            playability score for a 9 AM and a 1 PM round.
          </p>
          <p className="text-foreground/70">{outlookSummary(course, days)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <section className="space-y-3">
            <h2 className="text-2xl font-heading">
              {days.length}-day golf forecast
            </h2>
            <ul className="space-y-3">
              {days.map((day) => (
                <DayRow key={day.date} course={course} day={day} />
              ))}
            </ul>
          </section>
          <div className="order-first lg:order-last space-y-4">
            <CourseMap
              latitude={course.latitude}
              longitude={course.longitude}
              courseName={course.club_name}
              windDirection={firstRound?.wind_direction}
              windSpeed={firstRound?.wind_speed}
            />
            <Button asChild size="lg" className="w-full h-12 text-base">
              <Link href={toolHref(course)} rel="nofollow">
                Check your exact tee time
              </Link>
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl font-heading">
            Golf courses near {course.club_name}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {nearby.map((c) => (
              <li key={c.id}>
                <Card className="py-4 h-full">
                  <CardContent className="px-4">
                    <Link
                      href={coursePath(c)}
                      className="font-heading underline hover:text-main"
                    >
                      {c.club_name}
                    </Link>
                    <p className="text-sm text-foreground/60">
                      {Math.round(c.distanceKm)} km away
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 text-foreground/70 max-w-3xl">
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
      </div>

      <Footer />
    </main>
  );
}
