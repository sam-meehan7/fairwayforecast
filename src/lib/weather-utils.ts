import type { HourlyWeather } from "./types";

const WMO_CODES: Record<number, { text: string; icon: string }> = {
  0: { text: "Clear sky", icon: "Sun" },
  1: { text: "Mainly clear", icon: "Sun" },
  2: { text: "Partly cloudy", icon: "CloudSun" },
  3: { text: "Overcast", icon: "Cloud" },
  45: { text: "Fog", icon: "CloudFog" },
  48: { text: "Depositing rime fog", icon: "CloudFog" },
  51: { text: "Light drizzle", icon: "CloudDrizzle" },
  53: { text: "Moderate drizzle", icon: "CloudDrizzle" },
  55: { text: "Dense drizzle", icon: "CloudDrizzle" },
  56: { text: "Light freezing drizzle", icon: "CloudDrizzle" },
  57: { text: "Dense freezing drizzle", icon: "CloudDrizzle" },
  61: { text: "Slight rain", icon: "CloudRain" },
  63: { text: "Moderate rain", icon: "CloudRain" },
  65: { text: "Heavy rain", icon: "CloudRainWind" },
  66: { text: "Light freezing rain", icon: "CloudRain" },
  67: { text: "Heavy freezing rain", icon: "CloudRainWind" },
  71: { text: "Slight snow", icon: "CloudSnow" },
  73: { text: "Moderate snow", icon: "CloudSnow" },
  75: { text: "Heavy snow", icon: "CloudSnow" },
  77: { text: "Snow grains", icon: "CloudSnow" },
  80: { text: "Slight rain showers", icon: "CloudRain" },
  81: { text: "Moderate rain showers", icon: "CloudRain" },
  82: { text: "Violent rain showers", icon: "CloudRainWind" },
  85: { text: "Slight snow showers", icon: "CloudSnow" },
  86: { text: "Heavy snow showers", icon: "CloudSnow" },
  95: { text: "Thunderstorm", icon: "CloudLightning" },
  96: { text: "Thunderstorm with slight hail", icon: "CloudLightning" },
  99: { text: "Thunderstorm with heavy hail", icon: "CloudLightning" },
};

export function getWeatherDescription(code: number): {
  text: string;
  icon: string;
} {
  return WMO_CODES[code] ?? { text: "Unknown", icon: "Cloud" };
}

export function getLightningRisk(
  weatherCodes: number[]
): { level: string; warning: string } | null {
  const hasThunderstorm = weatherCodes.some((c) => c >= 95);
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
