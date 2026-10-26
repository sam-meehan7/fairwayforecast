import type { RoundForecast, PlayabilityScore } from "@/lib/types";
import {
  getGolfTips,
  maxRainChance,
  totalPrecipitation,
} from "@/lib/weather-utils";
import { PlayabilityScoreCard } from "@/components/playability-score";
import { HourlyForecast } from "@/components/hourly-forecast";
import { WindDisplay } from "@/components/wind-display";
import { SunInfo } from "@/components/sun-info";
import { GolfTips } from "@/components/golf-tips";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, CloudRain, Sun, Droplet } from "lucide-react";

interface WeatherDashboardProps {
  forecast: RoundForecast;
  score: PlayabilityScore;
  teeTimeHour: number;
}

export function WeatherDashboard({
  forecast,
  score,
  teeTimeHour,
}: WeatherDashboardProps) {
  const { hourly, daily, units } = forecast;
  const tips = getGolfTips(hourly);

  if (hourly.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-foreground/60">
            No hourly data available for this time. Try a different tee time.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Summary stats across the round
  const avgTemp =
    hourly.reduce((sum, h) => sum + h.temperature, 0) / hourly.length;
  const avgFeels =
    hourly.reduce((sum, h) => sum + h.apparent_temperature, 0) /
    hourly.length;
  const avgWind =
    hourly.reduce((sum, h) => sum + h.wind_speed, 0) / hourly.length;
  const maxGust = Math.max(...hourly.map((h) => h.wind_gusts));
  const maxRain = maxRainChance(hourly);
  const totalRain = totalPrecipitation(hourly);
  const maxUV = Math.max(...hourly.map((h) => h.uv_index));
  const avgHumidity =
    hourly.reduce((sum, h) => sum + h.relative_humidity, 0) / hourly.length;
  const avgDirection =
    hourly.reduce((sum, h) => sum + h.wind_direction, 0) / hourly.length;

  return (
    <div className="space-y-4">
      {/* Playability + Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlayabilityScoreCard score={score} />

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <Thermometer className="size-5 text-red-500 mb-1" />
              <div className="text-2xl font-heading">
                {Math.round(avgTemp)}{units.temperature}
              </div>
              <div className="text-xs text-foreground/60">Avg temp</div>
              <div className="text-xs text-foreground/60">
                Feels like {Math.round(avgFeels)}{units.temperature}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <CloudRain className="size-5 text-blue-500 mb-1" />
              <div className="text-2xl font-heading">
                {maxRain != null
                  ? `${maxRain}%`
                  : totalRain != null
                  ? `${Math.round(totalRain * 10) / 10} mm`
                  : "—"}
              </div>
              <div className="text-xs text-foreground/60">
                {maxRain != null ? "Peak rain chance" : "Expected rainfall"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <Sun className="size-5 text-yellow-500 mb-1" />
              <div className="text-2xl font-heading">{Math.round(maxUV)}</div>
              <div className="text-xs text-foreground/60">Peak UV index</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <Droplet className="size-5 text-sky-500 mb-1" />
              <div className="text-2xl font-heading">{Math.round(avgHumidity)}%</div>
              <div className="text-xs text-foreground/60">Avg humidity</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hourly Breakdown */}
      <HourlyForecast hourly={hourly} units={units} />

      {/* Wind + Sun + Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WindDisplay
          direction={Math.round(avgDirection)}
          speed={avgWind}
          gusts={maxGust}
          unit={units.wind_speed}
        />
        <SunInfo
          sunrise={daily.sunrise}
          sunset={daily.sunset}
          teeTimeHour={teeTimeHour}
        />
      </div>

      {tips.length > 0 && <GolfTips tips={tips} />}
    </div>
  );
}
