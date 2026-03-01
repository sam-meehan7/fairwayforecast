import type { WeatherForecast, RoundForecast, HourlyWeather } from "./types";

export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  date: string
): Promise<WeatherForecast | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
    ].join(",")
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.warn(
      `Weather API returned ${response.status} for (${latitude}, ${longitude})`
    );
    return null;
  }

  const data = await response.json();
  const daily = data.daily;

  if (!daily?.time?.length) {
    return null;
  }

  return {
    temp_max: daily.temperature_2m_max?.[0] ?? null,
    temp_min: daily.temperature_2m_min?.[0] ?? null,
    feels_like_max: daily.apparent_temperature_max?.[0] ?? null,
    feels_like_min: daily.apparent_temperature_min?.[0] ?? null,
    rain_chance: daily.precipitation_probability_max?.[0] ?? null,
    wind_speed: daily.wind_speed_10m_max?.[0] ?? null,
    wind_direction: daily.wind_direction_10m_dominant?.[0] ?? null,
    units: {
      temperature: data.daily_units?.temperature_2m_max ?? "°C",
      wind_speed: data.daily_units?.wind_speed_10m_max ?? "km/h",
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
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "relative_humidity_2m",
      "dew_point_2m",
      "visibility",
      "uv_index",
      "weather_code",
      "is_day",
    ].join(",")
  );
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  if (temperatureUnit === "fahrenheit") {
    url.searchParams.set("temperature_unit", "fahrenheit");
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.warn(
      `Weather API returned ${response.status} for (${latitude}, ${longitude})`
    );
    return null;
  }

  const data = await response.json();
  const hourly = data.hourly;
  const daily = data.daily;

  if (!hourly?.time?.length || !daily?.time?.length) {
    return null;
  }

  const endHour = teeTimeHour + roundDurationHours;

  const hourlyData: HourlyWeather[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const hour = new Date(hourly.time[i]).getHours();
    if (hour >= teeTimeHour && hour < endHour) {
      hourlyData.push({
        time: hourly.time[i],
        temperature: hourly.temperature_2m[i],
        apparent_temperature: hourly.apparent_temperature[i],
        precipitation_probability: hourly.precipitation_probability[i],
        wind_speed: hourly.wind_speed_10m[i],
        wind_direction: hourly.wind_direction_10m[i],
        wind_gusts: hourly.wind_gusts_10m[i],
        relative_humidity: hourly.relative_humidity_2m[i],
        dew_point: hourly.dew_point_2m[i],
        visibility: hourly.visibility[i],
        uv_index: hourly.uv_index[i],
        weather_code: hourly.weather_code[i],
        is_day: !!hourly.is_day[i],
      });
    }
  }

  return {
    hourly: hourlyData,
    daily: {
      sunrise: daily.sunrise[0],
      sunset: daily.sunset[0],
    },
    units: {
      temperature: temperatureUnit === "fahrenheit" ? "°F" : "°C",
      wind_speed: "km/h",
      visibility: "m",
    },
  };
}
