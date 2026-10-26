import Link from "next/link";
import { ForecastTool } from "@/components/forecast-tool";
import { coursePath, getCourseDirectory } from "@/lib/courses";
import { FORECAST_HORIZON_DAYS } from "@/lib/weather-utils";

export const revalidate = 86400;

// Well-known links shown as quick starts under the search box. Looked up in
// the directory so a renamed course drops out instead of linking to a 404.
const POPULAR_SLUGS = [
  "lahinch-golf-club",
  "ballybunion-golf-club",
  "portmarnock-golf-club",
  "royal-dublin-golf-club",
  "old-head-golf-links",
];

export default async function Home() {
  const courses = await getCourseDirectory();
  const popularCourses = POPULAR_SLUGS.flatMap((slug) => {
    const course = courses.find((c) => c.slug === slug);
    if (!course) return [];
    // "Lahinch Golf Club" → "Lahinch": the row is short on space.
    const name = course.club_name.replace(/ golf (club|links|course)$/i, "");
    return [{ name, href: coursePath(course) }];
  });

  return (
    <ForecastTool courseCount={courses.length} popularCourses={popularCourses}>
      <section className="max-w-3xl mx-auto px-6 mt-16 space-y-3 text-foreground/70">
        <h2 className="text-2xl font-heading text-foreground">
          Golf weather for your tee time, not just your town
        </h2>
        <p>
          A regular weather forecast tells you about the day. FairwayForecast
          tells you about your round: the five hours from your tee time, hour
          by hour, at the course itself. Wind speed and gusts, chance of rain,
          temperature and visibility are combined into a playability score out
          of 100, weighted towards what matters most on the course — wind
          (30%) and rain (30%), then temperature (25%) and visibility (15%).
        </p>
        <p>
          Forecasts run {FORECAST_HORIZON_DAYS} days ahead for{" "}
          {courses.length} golf courses across Ireland.{" "}
          <Link
            href="/golf-weather"
            className="underline text-foreground hover:text-main"
          >
            Browse golf weather for every Irish course
          </Link>
          .
        </p>
      </section>
    </ForecastTool>
  );
}
