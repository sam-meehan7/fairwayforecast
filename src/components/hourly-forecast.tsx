import type { HourlyWeather } from "@/lib/types";
import { getWeatherDescription } from "@/lib/weather-utils";
import { degreesToDirection } from "@/lib/weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
  Droplets,
  Wind,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
};

interface HourlyForecastProps {
  hourly: HourlyWeather[];
  units: { temperature: string; wind_speed: string };
}

function formatHour(iso: string): string {
  const date = new Date(iso);
  const hour = date.getHours();
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}${period}`;
}

export function HourlyForecast({ hourly, units }: HourlyForecastProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {hourly.map((h) => {
            const weather = getWeatherDescription(h.weather_code);
            const Icon = ICON_MAP[weather.icon] || Cloud;

            return (
              <div
                key={h.time}
                className="flex flex-col items-center gap-1.5 min-w-[80px] p-3 rounded-base border-2 border-border bg-background"
              >
                <span className="text-xs font-heading">
                  {formatHour(h.time)}
                </span>
                <Icon className="size-6" />
                <span className="text-sm font-heading">
                  {Math.round(h.temperature)}{units.temperature}
                </span>
                <span className="text-xs text-foreground/60">
                  Feels {Math.round(h.apparent_temperature)}{units.temperature}
                </span>

                <div className="flex items-center gap-1 text-xs">
                  <Wind className="size-3" />
                  <span>
                    {Math.round(h.wind_speed)} {units.wind_speed}
                  </span>
                </div>
                <div className="text-xs text-foreground/60">
                  {degreesToDirection(h.wind_direction)}
                  {h.wind_gusts > h.wind_speed && (
                    <span> G{Math.round(h.wind_gusts)}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <Droplets className="size-3" />
                  <span
                    className={
                      h.precipitation_probability > 50
                        ? "text-red-600 font-heading"
                        : h.precipitation_probability > 20
                        ? "text-yellow-600"
                        : ""
                    }
                  >
                    {h.precipitation_probability}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
