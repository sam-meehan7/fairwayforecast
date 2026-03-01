import type { HourlyWeather, PlayabilityScore } from "./types";

export function calculatePlayabilityScore(
  hourly: HourlyWeather[]
): PlayabilityScore {
  if (hourly.length === 0) {
    return {
      overall: 0,
      temperature: 0,
      temperatureDesc: "",
      wind: 0,
      windDesc: "",
      rain: 0,
      rainDesc: "",
      visibility: 0,
      visibilityDesc: "",
      label: "No Data",
      color: "text-foreground",
    };
  }

  const avgTemp =
    hourly.reduce((sum, h) => sum + h.temperature, 0) / hourly.length;
  const avgWind =
    hourly.reduce((sum, h) => sum + h.wind_speed, 0) / hourly.length;
  const maxRain = Math.max(...hourly.map((h) => h.precipitation_probability));
  const avgVisibility =
    hourly.reduce((sum, h) => sum + h.visibility, 0) / hourly.length;

  // Temperature score: peaks at 18-25°C, drops at extremes
  let tempScore: number;
  if (avgTemp >= 18 && avgTemp <= 25) {
    tempScore = 100;
  } else if (avgTemp < 18) {
    tempScore = Math.max(0, 100 - (18 - avgTemp) * 5);
  } else {
    tempScore = Math.max(0, 100 - (avgTemp - 25) * 5);
  }

  // Wind score: 0-13 km/h ideal, drops linearly
  let windScore: number;
  if (avgWind <= 13) {
    windScore = 100;
  } else if (avgWind <= 24) {
    windScore = 100 - ((avgWind - 13) / 11) * 30;
  } else if (avgWind <= 40) {
    windScore = 70 - ((avgWind - 24) / 16) * 40;
  } else {
    windScore = Math.max(0, 30 - ((avgWind - 40) / 16) * 30);
  }

  // Rain score: based on max probability during round
  const rainScore = Math.max(0, 100 - maxRain);

  // Visibility score: >10000m (10km) = 100, <1000m (1km) = 0
  let visScore: number;
  if (avgVisibility >= 10000) {
    visScore = 100;
  } else if (avgVisibility >= 1000) {
    visScore = ((avgVisibility - 1000) / (10000 - 1000)) * 100;
  } else {
    visScore = 0;
  }

  // Weighted overall: wind and rain matter most for golf
  const overall = Math.round(
    tempScore * 0.25 + windScore * 0.3 + rainScore * 0.3 + visScore * 0.15
  );

  let label: string;
  let color: string;
  if (overall >= 80) {
    label = "Excellent";
    color = "text-green-700";
  } else if (overall >= 60) {
    label = "Good";
    color = "text-green-600";
  } else if (overall >= 40) {
    label = "Fair";
    color = "text-yellow-600";
  } else if (overall >= 20) {
    label = "Poor";
    color = "text-orange-600";
  } else {
    label = "Unplayable";
    color = "text-red-600";
  }

  return {
    overall,
    temperature: Math.round(tempScore),
    temperatureDesc: getTemperatureDesc(Math.round(tempScore), avgTemp),
    wind: Math.round(windScore),
    windDesc: getWindDesc(Math.round(windScore)),
    rain: Math.round(rainScore),
    rainDesc: getRainDesc(Math.round(rainScore)),
    visibility: Math.round(visScore),
    visibilityDesc: getVisibilityDesc(Math.round(visScore)),
    label,
    color,
  };
}

function getTemperatureDesc(score: number, avgTemp: number): string {
  if (score >= 80) return "Perfect golf weather";
  if (score >= 60) return "Comfortable out there";
  if (score >= 40) return avgTemp < 18 ? "A bit chilly, layer up" : "Getting warm";
  if (score >= 20) return "Cold — dress warmly";
  return "Extreme temps, be careful";
}

function getWindDesc(score: number): string {
  if (score >= 80) return "Calm conditions";
  if (score >= 60) return "Light breeze, minor impact";
  if (score >= 40) return "Will be windy out there!";
  if (score >= 20) return "Strong winds, expect challenges";
  return "Brutal wind, good luck!";
}

function getRainDesc(score: number): string {
  if (score >= 80) return "Dry skies ahead";
  if (score >= 60) return "Slight chance of rain";
  if (score >= 40) return "Pack a rain jacket";
  if (score >= 20) return "Rain is looking likely";
  return "Rain is a certainty";
}

function getVisibilityDesc(score: number): string {
  if (score >= 80) return "Crystal clear";
  if (score >= 60) return "Good visibility";
  if (score >= 40) return "Slightly hazy";
  if (score >= 20) return "Limited visibility";
  return "Very poor visibility";
}
