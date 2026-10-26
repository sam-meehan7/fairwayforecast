import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { OG_IMAGE, TWITTER_IMAGE } from "@/app/_og-image";
import {
  coursePath,
  getCourseDirectory,
  type CourseListing,
} from "@/lib/courses";

export const revalidate = 86400;

const title = "Golf Weather Forecasts for Every Course in Ireland";
const description =
  "Golf weather for every course in Ireland: 7-day forecasts with wind, rain, temperature and a playability score for morning and afternoon rounds.";

export const metadata: Metadata = {
  title: `${title} | FairwayForecast`,
  description,
  alternates: { canonical: "/golf-weather" },
  openGraph: {
    title,
    description,
    url: "/golf-weather",
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

function groupByLetter(courses: CourseListing[]) {
  const groups = new Map<string, CourseListing[]>();
  for (const course of courses) {
    const first = course.slug.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), course]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default async function GolfWeatherDirectory() {
  const groups = groupByLetter(await getCourseDirectory());
  const count = groups.reduce((n, [, courses]) => n + courses.length, 0);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl font-heading">{title}</h1>
          <p className="text-foreground/70">
            Pick a course for its 7-day golf forecast: wind, rain and
            temperature through the day, plus a playability score for a
            morning and an afternoon round. {count} courses across Ireland,
            updated every few hours.
          </p>
          <nav aria-label="Jump to letter" className="flex flex-wrap gap-2">
            {groups.map(([letter]) => (
              <a
                key={letter}
                href={`#${letter}`}
                className="font-heading underline hover:text-main"
              >
                {letter}
              </a>
            ))}
          </nav>
        </div>

        {groups.map(([letter, courses]) => (
          <section key={letter} id={letter} className="space-y-3">
            <h2 className="text-2xl font-heading">{letter}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={coursePath(course)}
                    className="underline hover:text-main"
                  >
                    {course.club_name}
                  </Link>
                  {course.city && (
                    <span className="text-sm text-foreground/60">
                      {" "}
                      · {course.city}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Footer />
    </main>
  );
}
