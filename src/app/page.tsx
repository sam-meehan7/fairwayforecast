import Link from "next/link";
import { ForecastTool } from "@/components/forecast-tool";
import { getCourseDirectory } from "@/lib/courses";
import { FORECAST_HORIZON_DAYS } from "@/lib/weather-utils";

export const revalidate = 86400;

export default async function Home() {
  const courses = await getCourseDirectory();

  return (
    <ForecastTool>
      <section className="max-w-3xl mx-auto px-6 mt-12 space-y-3 text-foreground/70">
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
