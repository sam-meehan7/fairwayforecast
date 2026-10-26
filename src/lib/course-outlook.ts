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
  // Course-local ISO time of the first hour, e.g. "2026-10-27T09:00+00:00".
  startsAt: string;
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
        : [
            {
              label,
              teeHour,
              startsAt: hourly[0].time,
              score: calculatePlayabilityScore(hourly),
            },
          ];
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

// Rounds that teed off before `now` (ms since epoch) can't be booked, so
// they're never the best one.
export function bestRound(
  days: OutlookDay[],
  now: number = Date.now()
): { day: OutlookDay; round: OutlookRound } | null {
  let best: { day: OutlookDay; round: OutlookRound } | null = null;
  for (const day of days) {
    for (const round of day.rounds) {
      if (Date.parse(round.startsAt) < now) continue;
      if (!best || round.score.overall > best.round.score.overall) {
        best = { day, round };
      }
    }
  }
  return best;
}

// 9 → "9 AM", 13 → "1 PM"
export function formatTeeHour(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
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
