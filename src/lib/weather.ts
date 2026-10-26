import type {
  WeatherForecast,
  RoundForecast,
  HourlyWeather,
  DailyWeather,
} from "./types";

// Runtime imports carry the `.ts` extension so `node --test` can load this
// module directly.
import { FORECAST_HORIZON_DAYS } from "./weather-utils.ts";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// The picker reaches FORECAST_HORIZON_DAYS past the viewer's date; the two
// extra days cover a course whose clock is ahead of the viewer's. That is
// Open-Meteo's 16-day maximum.
const SERIES_DAYS = FORECAST_HORIZON_DAYS + 2;

const HOURLY_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "relative_humidity_2m",
  "dew_point_2m",
  "visibility",
  "uv_index",
  "weather_code",
  "is_day",
] as const;

type HourlyVariable = (typeof HOURLY_VARIABLES)[number];

export interface OpenMeteoSeriesResponse {
  timezone: string;
  hourly: { time: number[] } & Record<HourlyVariable, (number | null)[]>;
  daily: {
    time: number[];
    sunrise: (number | null)[];
    sunset: (number | null)[];
  };
}

// The full multi-day hourly series for one location, in °C, km/h and metres.
// Every timestamp is course-local ISO 8601 with its UTC offset (e.g.
// "2026-07-01T09:00-07:00"): the date and hour read straight off the string
// are the course's wall clock, and `new Date()` still parses the instant.
export interface LocationSeries {
  timezone: string;
  hourly: HourlyWeather[];
  daily: ({ date: string } & DailyWeather)[];
}

const formatters = new Map<string, Intl.DateTimeFormat>();

// Open-Meteo's `timezone=auto` labels every hour with the offset in force at
// request time, so its local strings are an hour out once a clock change falls
// inside the series. Instants plus the IANA zone are right in every season.
export function toCourseLocalIso(unixSeconds: number, timeZone: string): string {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, fmt);
  }

  const ms = Math.floor(unixSeconds / 60) * 60_000;
  const p = Object.fromEntries(
    fmt.formatToParts(new Date(ms)).map((part) => [part.type, part.value])
  );
  const wallMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const offset = Math.round((wallMs - ms) / 60_000);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");

  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}${sign}${oh}:${om}`;
}

// Course-local wall-clock readers for timestamps from this module. They read
// the string rather than going through Date, which would apply the viewer's
// timezone.
export function localDate(iso: string): string {
  return iso.slice(0, 10);
}

export function localHour(iso: string): number {
  return Number(iso.slice(11, 13));
}

export function formatLocalHour(iso: string): string {
  const hour = localHour(iso);
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}${period}`;
}

export function formatLocalTime(iso: string): string {
  if (!iso) return "";
  const hour = localHour(iso);
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${iso.slice(14, 16)} ${period}`;
}

export function toLocationSeries(data: OpenMeteoSeriesResponse): LocationSeries {
  const { timezone, hourly: h, daily: d } = data;
  const toIso = (t: number | null) => (t == null ? "" : toCourseLocalIso(t, timezone));

  // The tail of the 16-day range thins out: the last few hours come back null
  // for most variables. Coercing those to 0 would invent a 0 °C, calm, clear
  // hour, so an hour without its core readings is dropped and the round simply
  // ends early. The rain chance goes missing much sooner (~day 10 in Ireland)
  // and stays null; the scorer falls back to `precipitation` for that.
  const hourly: HourlyWeather[] = h.time.flatMap((t, i) => {
    if (
      h.temperature_2m[i] == null ||
      h.wind_speed_10m[i] == null ||
      h.weather_code[i] == null ||
      h.visibility[i] == null
    ) {
      return [];
    }
    return [
      {
        time: toIso(t),
        temperature: h.temperature_2m[i]!,
        apparent_temperature: h.apparent_temperature[i] ?? h.temperature_2m[i]!,
        precipitation_probability: h.precipitation_probability[i] ?? null,
        precipitation: h.precipitation[i] ?? null,
        wind_speed: h.wind_speed_10m[i]!,
        wind_direction: h.wind_direction_10m[i] ?? 0,
        wind_gusts: h.wind_gusts_10m[i] ?? h.wind_speed_10m[i]!,
        relative_humidity: h.relative_humidity_2m[i] ?? 0,
        dew_point: h.dew_point_2m[i] ?? 0,
        visibility: h.visibility[i]!,
        uv_index: h.uv_index[i] ?? 0,
        weather_code: h.weather_code[i]!,
        is_day: h.is_day[i] === 1,
      },
    ];
  });

  // Keyed by the course-local date at the day's midday: after a clock change,
  // Open-Meteo's fixed-offset midnight falls on the previous local date.
  const daily = d.time.map((t, i) => ({
    date: localDate(toIso(t + 12 * 3600)),
    sunrise: toIso(d.sunrise[i]),
    sunset: toIso(d.sunset[i]),
  }));

  return { timezone, hourly, daily };
}

export async function fetchLocationSeries(
  latitude: number,
  longitude: number
): Promise<LocationSeries | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
  url.searchParams.set("daily", "sunrise,sunset");
  // `auto` resolves the course's IANA timezone and starts the series at local
  // midnight; `best_match` picks the best regional model for the location.
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("models", "best_match");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("forecast_days", String(SERIES_DAYS));

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.warn(
      `Weather API returned ${response.status} for (${latitude}, ${longitude})`
    );
    return null;
  }

  const data = (await response.json()) as OpenMeteoSeriesResponse;

  if (!data.hourly?.time?.length || !data.daily?.time?.length) {
    return null;
  }

  return toLocationSeries(data);
}

// The round is the `roundDurationHours` consecutive hours starting at the tee
// hour on the course's own clock. A half-hour tee maps to the hour containing
// it; on a spring-forward day a tee in the skipped hour starts at the next one.
export function selectRoundWindow(
  series: LocationSeries,
  date: string,
  teeTimeHour: number,
  roundDurationHours: number = 5,
  temperatureUnit: "celsius" | "fahrenheit" = "celsius"
): RoundForecast {
  const teeHour = Math.floor(teeTimeHour);
  const start = series.hourly.findIndex(
    (h) => localDate(h.time) === date && localHour(h.time) >= teeHour
  );
  const round =
    start === -1 ? [] : series.hourly.slice(start, start + roundDurationHours);

  const toUnit = (c: number) =>
    temperatureUnit === "fahrenheit" ? (c * 9) / 5 + 32 : c;

  const day = series.daily.find((d) => d.date === date) ?? series.daily[0];

  return {
    hourly: round.map((h) => ({
      ...h,
      temperature: toUnit(h.temperature),
      apparent_temperature: toUnit(h.apparent_temperature),
      dew_point: toUnit(h.dew_point),
    })),
    daily: {
      sunrise: day?.sunrise ?? "",
      sunset: day?.sunset ?? "",
    },
    units: {
      temperature: temperatureUnit === "fahrenheit" ? "°F" : "°C",
      wind_speed: "km/h",
      visibility: "m",
    },
  };
}

export async function getHourlyForecast(
  latitude: number,
  longitude: number,
  date: string,
  teeTimeHour: number,
  roundDurationHours: number = 5,
  temperatureUnit: "celsius" | "fahrenheit" = "celsius"
): Promise<RoundForecast | null> {
  const series = await fetchLocationSeries(latitude, longitude);
  if (!series) return null;
  return selectRoundWindow(
    series,
    date,
    teeTimeHour,
    roundDurationHours,
    temperatureUnit
  );
}

export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  date: string
): Promise<WeatherForecast | null> {
  const url = new URL(BASE_URL);
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
  url.searchParams.set("models", "best_match");
  url.searchParams.set("wind_speed_unit", "kmh");
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
  const d = data.daily;

  if (!d?.time?.length) {
    return null;
  }

  return {
    temp_max: d.temperature_2m_max[0] ?? null,
    temp_min: d.temperature_2m_min[0] ?? null,
    feels_like_max: d.apparent_temperature_max[0] ?? null,
    feels_like_min: d.apparent_temperature_min[0] ?? null,
    rain_chance: d.precipitation_probability_max[0] ?? null,
    wind_speed: d.wind_speed_10m_max[0] ?? null,
    wind_direction: d.wind_direction_10m_dominant[0] ?? null,
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
