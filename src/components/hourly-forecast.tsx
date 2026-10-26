import type { HourlyWeather } from "@/lib/types";
import { degreesToDirection, formatLocalHour } from "@/lib/weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherIcon } from "@/components/weather-icon";
import { Droplets, Wind } from "lucide-react";

interface HourlyForecastProps {
  hourly: HourlyWeather[];
  units: { temperature: string; wind_speed: string };
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
            return (
              <div
                key={h.time}
                className="flex flex-col items-center gap-1.5 min-w-[80px] p-3 rounded-base border-2 border-border bg-background"
              >
                <span className="text-xs font-heading">
                  {formatLocalHour(h.time)}
                </span>
                <WeatherIcon code={h.weather_code} className="size-6" />
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
                  {h.precipitation_probability == null ? (
                    <span
                      title="Rain chance isn't published this far out"
                      className={
                        (h.precipitation ?? 0) >= 1 ? "text-yellow-600" : ""
                      }
                    >
                      {h.precipitation == null
                        ? "—"
                        : `${Math.round(h.precipitation * 10) / 10} mm`}
                    </span>
                  ) : (
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
