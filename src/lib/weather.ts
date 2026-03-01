import type { WeatherForecast, RoundForecast, HourlyWeather } from "./types";

const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY;
const BASE_URL = "https://api.tomorrow.io/v4/weather/forecast";

export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  date: string
): Promise<WeatherForecast | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("location", `${latitude},${longitude}`);
  url.searchParams.set("timesteps", "1d");
  url.searchParams.set("units", "metric");
  url.searchParams.set("apikey", TOMORROW_API_KEY || "");

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.warn(
      `Weather API returned ${response.status} for (${latitude}, ${longitude})`
    );
    return null;
  }

  const data = await response.json();
  const daily = data.timelines?.daily;

  if (!daily?.length) {
    return null;
  }

  // Find the matching date, or fall back to first entry
  const targetDay =
    daily.find((d: { time: string }) => d.time.startsWith(date)) ?? daily[0];
  const v = targetDay.values;

  return {
    temp_max: v.temperatureMax ?? null,
    temp_min: v.temperatureMin ?? null,
    feels_like_max: v.temperatureApparentMax ?? null,
    feels_like_min: v.temperatureApparentMin ?? null,
    rain_chance: v.precipitationProbabilityMax ?? null,
    wind_speed: v.windSpeedMax != null ? v.windSpeedMax * 3.6 : null, // m/s → km/h
    wind_direction: v.windDirectionAvg ?? null,
    units: {
      temperature: "°C",
      wind_speed: "km/h",
    },
  };
}

export function degreesToDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

export async function getHourlyForecast(
  latitude: number,
  longitude: number,
  date: string,
  teeTimeHour: number,
  roundDurationHours: number = 5,
  temperatureUnit: "celsius" | "fahrenheit" = "celsius"
): Promise<RoundForecast | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("location", `${latitude},${longitude}`);
  url.searchParams.set("timesteps", "1h,1d");
  url.searchParams.set("units", "metric");
  url.searchParams.set("apikey", TOMORROW_API_KEY || "");

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.warn(
      `Weather API returned ${response.status} for (${latitude}, ${longitude})`
    );
    return null;
  }

  const data = await response.json();
  const hourly = data.timelines?.hourly;
  const daily = data.timelines?.daily;

  if (!hourly?.length || !daily?.length) {
    return null;
  }

  // Find the matching daily entry for sunrise/sunset
  const targetDay =
    daily.find((d: { time: string }) => d.time.startsWith(date)) ?? daily[0];
  const sunrise = targetDay.values.sunriseTime;
  const sunset = targetDay.values.sunsetTime;
  const sunriseTime = sunrise ? new Date(sunrise).getTime() : null;
  const sunsetTime = sunset ? new Date(sunset).getTime() : null;

  const endHour = teeTimeHour + roundDurationHours;

  const hourlyData: HourlyWeather[] = [];
  for (const entry of hourly) {
    const entryDate = new Date(entry.time);
    const entryDateStr = entryDate.toISOString().split("T")[0];
    const hour = entryDate.getUTCHours();

    // Only include hours for the target date within the tee time window
    if (entryDateStr !== date || hour < teeTimeHour || hour >= endHour) {
      continue;
    }

    const v = entry.values;
    const entryMs = entryDate.getTime();
    const isDay =
      sunriseTime && sunsetTime
        ? entryMs >= sunriseTime && entryMs <= sunsetTime
        : true;

    let temperature = v.temperature;
    let apparentTemp = v.temperatureApparent;
    let dewPoint = v.dewPoint;

    if (temperatureUnit === "fahrenheit") {
      temperature = temperature * 9 / 5 + 32;
      apparentTemp = apparentTemp * 9 / 5 + 32;
      dewPoint = dewPoint * 9 / 5 + 32;
    }

    hourlyData.push({
      time: entry.time,
      temperature,
      apparent_temperature: apparentTemp,
      precipitation_probability: v.precipitationProbability ?? 0,
      wind_speed: (v.windSpeed ?? 0) * 3.6, // m/s → km/h
      wind_direction: v.windDirection ?? 0,
      wind_gusts: (v.windGust ?? 0) * 3.6, // m/s → km/h
      relative_humidity: v.humidity ?? 0,
      dew_point: dewPoint,
      visibility: (v.visibility ?? 0) * 1000, // km → m
      uv_index: v.uvIndex ?? 0,
      weather_code: v.weatherCode ?? 0,
      is_day: isDay,
    });
  }

  return {
    hourly: hourlyData,
    daily: {
      sunrise: sunrise ?? "",
      sunset: sunset ?? "",
    },
    units: {
      temperature: temperatureUnit === "fahrenheit" ? "°F" : "°C",
      wind_speed: "km/h",
      visibility: "m",
    },
  };
}
