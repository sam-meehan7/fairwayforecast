import { Sunrise, Sunset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SunInfoProps {
  sunrise: string;
  sunset: string;
  teeTimeHour: number;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDaylightHours(sunrise: string, sunset: string): string {
  const rise = new Date(sunrise).getTime();
  const set = new Date(sunset).getTime();
  const hours = (set - rise) / (1000 * 60 * 60);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function SunInfo({ sunrise, sunset, teeTimeHour }: SunInfoProps) {
  const sunriseHour = new Date(sunrise).getHours();
  const sunsetHour = new Date(sunset).getHours();
  const roundEndHour = teeTimeHour + 5;

  const beforeSunrise = teeTimeHour < sunriseHour;
  const afterSunset = roundEndHour > sunsetHour;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daylight</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sunrise className="size-5 text-yellow-500" />
            <div>
              <div className="text-sm font-heading">{formatTime(sunrise)}</div>
              <div className="text-xs text-foreground/60">Sunrise</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-heading">
              {getDaylightHours(sunrise, sunset)}
            </div>
            <div className="text-xs text-foreground/60">of daylight</div>
          </div>

          <div className="flex items-center gap-2">
            <Sunset className="size-5 text-orange-500" />
            <div>
              <div className="text-sm font-heading">{formatTime(sunset)}</div>
              <div className="text-xs text-foreground/60">Sunset</div>
            </div>
          </div>
        </div>

        {(beforeSunrise || afterSunset) && (
          <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-base px-3 py-2">
            {beforeSunrise && "Your tee time is before sunrise. "}
            {afterSunset && "Your round may extend past sunset. "}
            Consider adjusting your tee time.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
