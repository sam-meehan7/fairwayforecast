import type { PlayabilityScore } from "./types";
import { calculatePlayabilityScore } from "./scoring";
import { localDate, localHour, selectRoundWindow } from "./weather";
import type { LocationSeries } from "./weather";
import { maxRainChance } from "./weather-utils";

// The course pages are cached and shared by every visitor, so instead of one
// viewer's tee time they show fixed representative rounds for each day.
export const OUTLOOK_DAYS = 7;

export const OUTLOOK_ROUNDS = [
  { label: "Morning", teeHour: 9 },
  { label: "Afternoon", teeHour: 13 },
] as const;

// Daylight golfing hours used for the day's headline numbers.
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 18;
const HEADLINE_HOUR = 12;

export interface OutlookRound {
  label: string;
  teeHour: number;
  score: PlayabilityScore;
}

export interface OutlookDay {
  date: string;
  weatherCode: number;
  tempMin: number;
  tempMax: number;
  maxWind: number;
  maxGust: number;
  rainChance: number | null;
  rounds: OutlookRound[];
}

export function buildOutlook(series: LocationSeries): OutlookDay[] {
  const days: OutlookDay[] = [];

  for (const { date } of series.daily.slice(0, OUTLOOK_DAYS)) {
    const hours = series.hourly.filter((h) => {
      const hour = localHour(h.time);
      return (
        localDate(h.time) === date &&
        hour >= DAY_START_HOUR &&
        hour < DAY_END_HOUR
      );
    });
    if (hours.length === 0) continue;

    const headline =
      hours.find((h) => localHour(h.time) === HEADLINE_HOUR) ?? hours[0];

    const rounds = OUTLOOK_ROUNDS.flatMap(({ label, teeHour }) => {
      const { hourly } = selectRoundWindow(series, date, teeHour);
      return hourly.length === 0
        ? []
        : [{ label, teeHour, score: calculatePlayabilityScore(hourly) }];
    });

    days.push({
      date,
      weatherCode: headline.weather_code,
      tempMin: Math.min(...hours.map((h) => h.temperature)),
      tempMax: Math.max(...hours.map((h) => h.temperature)),
      maxWind: Math.max(...hours.map((h) => h.wind_speed)),
      maxGust: Math.max(...hours.map((h) => h.wind_gusts)),
      rainChance: maxRainChance(hours),
      rounds,
    });
  }

  return days;
}

export function bestRound(
  days: OutlookDay[]
): { day: OutlookDay; round: OutlookRound } | null {
  let best: { day: OutlookDay; round: OutlookRound } | null = null;
  for (const day of days) {
    for (const round of day.rounds) {
      if (!best || round.score.overall > best.round.score.overall) {
        best = { day, round };
      }
    }
  }
  return best;
}

// "2026-10-27" → "Tuesday 27 October". The date is already the course's own,
// so it is formatted as a bare calendar date in UTC.
export function formatOutlookDate(
  date: string,
  style: "long" | "short" = "long"
): string {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: style,
    day: "numeric",
    month: style,
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
