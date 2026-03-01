import type { HourlyWeather } from "./types";

const TOMORROW_CODES: Record<number, { text: string; icon: string }> = {
  1000: { text: "Clear sky", icon: "Sun" },
  1100: { text: "Mostly clear", icon: "Sun" },
  1101: { text: "Partly cloudy", icon: "CloudSun" },
  1102: { text: "Mostly cloudy", icon: "Cloud" },
  1001: { text: "Cloudy", icon: "Cloud" },
  2100: { text: "Light fog", icon: "CloudFog" },
  2000: { text: "Fog", icon: "CloudFog" },
  4000: { text: "Drizzle", icon: "CloudDrizzle" },
  4200: { text: "Light rain", icon: "CloudRain" },
  4001: { text: "Rain", icon: "CloudRain" },
  4201: { text: "Heavy rain", icon: "CloudRainWind" },
  5001: { text: "Flurries", icon: "CloudSnow" },
  5100: { text: "Light snow", icon: "CloudSnow" },
  5000: { text: "Snow", icon: "CloudSnow" },
  5101: { text: "Heavy snow", icon: "CloudSnow" },
  6000: { text: "Freezing drizzle", icon: "CloudDrizzle" },
  6200: { text: "Light freezing rain", icon: "CloudRain" },
  6001: { text: "Freezing rain", icon: "CloudRain" },
  6201: { text: "Heavy freezing rain", icon: "CloudRainWind" },
  8000: { text: "Thunderstorm", icon: "CloudLightning" },
};

export function getWeatherDescription(code: number): {
  text: string;
  icon: string;
} {
  return TOMORROW_CODES[code] ?? { text: "Unknown", icon: "Cloud" };
}

export function getLightningRisk(
  weatherCodes: number[]
): { level: string; warning: string } | null {
  const hasThunderstorm = weatherCodes.some((c) => c === 8000);
  if (hasThunderstorm) {
    return {
      level: "High",
      warning:
        "Thunderstorms expected. Seek shelter immediately if you hear thunder or see lightning.",
    };
  }
  return null;
}

export function getGolfTips(hourly: HourlyWeather[]): string[] {
  const tips: string[] = [];
  if (hourly.length === 0) return tips;

  const avgWind =
    hourly.reduce((sum, h) => sum + h.wind_speed, 0) / hourly.length;
  const maxGust = Math.max(...hourly.map((h) => h.wind_gusts));
  const maxRain = Math.max(...hourly.map((h) => h.precipitation_probability));
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

  if (maxRain > 50) {
    tips.push("Rain is likely. Bring rain gear, an umbrella, and extra gloves.");
  } else if (maxRain > 20) {
    tips.push(
      "Some chance of rain. Pack a rain jacket just in case."
    );
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
