import type { HourlyWeather } from "./types";

// WMO weather interpretation codes, as returned by Open-Meteo.
const WMO_CODES: Record<number, { text: string; icon: string }> = {
  0: { text: "Clear sky", icon: "Sun" },
  1: { text: "Mostly clear", icon: "Sun" },
  2: { text: "Partly cloudy", icon: "CloudSun" },
  3: { text: "Cloudy", icon: "Cloud" },
  45: { text: "Fog", icon: "CloudFog" },
  48: { text: "Freezing fog", icon: "CloudFog" },
  51: { text: "Light drizzle", icon: "CloudDrizzle" },
  53: { text: "Drizzle", icon: "CloudDrizzle" },
  55: { text: "Heavy drizzle", icon: "CloudDrizzle" },
  56: { text: "Freezing drizzle", icon: "CloudDrizzle" },
  57: { text: "Heavy freezing drizzle", icon: "CloudDrizzle" },
  61: { text: "Light rain", icon: "CloudRain" },
  63: { text: "Rain", icon: "CloudRain" },
  65: { text: "Heavy rain", icon: "CloudRainWind" },
  66: { text: "Light freezing rain", icon: "CloudRain" },
  67: { text: "Heavy freezing rain", icon: "CloudRainWind" },
  71: { text: "Light snow", icon: "CloudSnow" },
  73: { text: "Snow", icon: "CloudSnow" },
  75: { text: "Heavy snow", icon: "CloudSnow" },
  77: { text: "Snow grains", icon: "CloudSnow" },
  80: { text: "Light showers", icon: "CloudRain" },
  81: { text: "Showers", icon: "CloudRain" },
  82: { text: "Heavy showers", icon: "CloudRainWind" },
  85: { text: "Light snow showers", icon: "CloudSnow" },
  86: { text: "Heavy snow showers", icon: "CloudSnow" },
  95: { text: "Thunderstorm", icon: "CloudLightning" },
  96: { text: "Thunderstorm with hail", icon: "CloudLightning" },
  99: { text: "Thunderstorm with heavy hail", icon: "CloudLightning" },
};

const THUNDERSTORM_CODES = new Set([95, 96, 99]);

export function getWeatherDescription(code: number): {
  text: string;
  icon: string;
} {
  return WMO_CODES[code] ?? { text: "Unknown", icon: "Cloud" };
}

export function getLightningRisk(
  weatherCodes: number[]
): { level: string; warning: string } | null {
  const hasThunderstorm = weatherCodes.some((c) => THUNDERSTORM_CODES.has(c));
  if (hasThunderstorm) {
    return {
      level: "High",
      warning:
        "Thunderstorms expected. Seek shelter immediately if you hear thunder or see lightning.",
    };
  }
  return null;
}

// Highest hourly rain chance in the round, or null when no hour has one.
export function maxRainChance(hourly: HourlyWeather[]): number | null {
  const known = hourly
    .map((h) => h.precipitation_probability)
    .filter((p): p is number => p != null);
  return known.length ? Math.max(...known) : null;
}

// Expected rainfall in mm across the round, or null when no hour has an amount.
export function totalPrecipitation(hourly: HourlyWeather[]): number | null {
  const known = hourly
    .map((h) => h.precipitation)
    .filter((p): p is number => p != null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

export function getGolfTips(hourly: HourlyWeather[]): string[] {
  const tips: string[] = [];
  if (hourly.length === 0) return tips;

  const avgWind =
    hourly.reduce((sum, h) => sum + h.wind_speed, 0) / hourly.length;
  const maxGust = Math.max(...hourly.map((h) => h.wind_gusts));
  const maxRain = maxRainChance(hourly);
  const totalRain = totalPrecipitation(hourly);
  const maxUV = Math.max(...hourly.map((h) => h.uv_index));
  const avgTemp =
    hourly.reduce((sum, h) => sum + h.temperature, 0) / hourly.length;
  const avgHumidity =
    hourly.reduce((sum, h) => sum + h.relative_humidity, 0) / hourly.length;
  const weatherCodes = hourly.map((h) => h.weather_code);

  const lightning = getLightningRisk(weatherCodes);
  if (lightning) {
    tips.push(lightning.warning);
  }

  if (avgWind > 24 || maxGust > 40) {
    tips.push(
      "Strong winds expected. Consider lower-trajectory clubs and keep the ball below the wind."
    );
  }

  if (maxRain != null) {
    if (maxRain > 50) {
      tips.push("Rain is likely. Bring rain gear, an umbrella, and extra gloves.");
    } else if (maxRain > 20) {
      tips.push(
        "Some chance of rain. Pack a rain jacket just in case."
      );
    }
  } else if (totalRain != null && totalRain >= 1) {
    // No chance published this far out; the expected amount is all we have.
    tips.push("Some rain is forecast. Pack a rain jacket just in case.");
  }

  if (maxUV >= 6) {
    tips.push(
      "High UV index. Apply SPF 30+ sunscreen and wear a hat."
    );
  }

  if (avgTemp > 30 && avgHumidity > 60) {
    tips.push(
      "Hot and humid conditions. Stay hydrated and bring extra water."
    );
  } else if (avgTemp < 10) {
    tips.push("Cold conditions. Layer up and consider hand warmers.");
  }

  if (hourly.some((h) => h.visibility < 1000)) {
    tips.push(
      "Low visibility expected. Consider delaying your tee time if fog is present."
    );
  }

  return tips;
}

// Open-Meteo serves 16 days of hourly data, but the last day or so thins out
// (some variables go null) and past ~day 10 the rain chance can be missing, so
// we offer 14 and keep two days of headroom. A date beyond the series comes
// back with no hours rather than an error, so the picker, the stale-link
// message and the /api/weather validation all read this one constant.
export const FORECAST_HORIZON_DAYS = 14;

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Computed from the caller's clock, so this must only be used where the
// viewer's local date is the right frame of reference.
export function getForecastDateRange(): { min: string; max: string } {
  const max = new Date();
  max.setDate(max.getDate() + FORECAST_HORIZON_DAYS);
  return { min: formatLocalDate(new Date()), max: formatLocalDate(max) };
}

export function isWithinForecastWindow(date: string): boolean {
  const { min, max } = getForecastDateRange();
  return date >= min && date <= max;
}

// Server-side check for a requested round date. The picker's window is the
// viewer's date through +FORECAST_HORIZON_DAYS. The viewer's and the course's
// clocks can each sit a day off UTC, so allow a day either side here; a date
// past the fetched series comes back with no hours.
export function isRequestableForecastDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const utcToday = Date.parse(new Date().toISOString().slice(0, 10));
  const dayOffset = Math.round((Date.parse(date) - utcToday) / 86_400_000);
  return (
    !isNaN(dayOffset) &&
    dayOffset >= -1 &&
    dayOffset <= FORECAST_HORIZON_DAYS + 1
  );
}
