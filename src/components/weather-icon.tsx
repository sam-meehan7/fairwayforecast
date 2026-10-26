import { getWeatherDescription } from "@/lib/weather-utils";
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

export function WeatherIcon({
  code,
  className,
}: {
  code: number;
  className?: string;
}) {
  const Icon = ICON_MAP[getWeatherDescription(code).icon] || Cloud;
  return <Icon className={className} />;
}
