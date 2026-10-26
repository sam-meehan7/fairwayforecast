import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toLocationSeries,
  selectRoundWindow,
  type OpenMeteoSeriesResponse,
} from "./weather.ts";
import { calculatePlayabilityScore } from "./scoring.ts";
import { FORECAST_HORIZON_DAYS } from "./weather-utils.ts";
import type { HourlyWeather } from "./types.ts";

const HOUR = 3600;
const DAY = 24 * HOUR;

const utc = (iso: string) => Date.parse(iso) / 1000;

// Shapes a response the way Open-Meteo builds one with `timezone=auto` and
// `timeformat=unixtime`: hourly instants from local midnight at request time,
// daily rows stepped every 24h from there, whatever the clocks do afterwards.
function fakeResponse(opts: {
  timezone: string;
  firstHour: string;
  days: number;
  sunriseUtc?: number;
  sunsetUtc?: number;
  isDay?: (unixSeconds: number) => boolean;
}): OpenMeteoSeriesResponse {
  const start = utc(opts.firstHour);
  const time = Array.from({ length: opts.days * 24 }, (_, i) => start + i * HOUR);
  const series = (fn: (t: number, i: number) => number) => time.map(fn);
  const dayStarts = Array.from({ length: opts.days }, (_, i) => start + i * DAY);

  return {
    timezone: opts.timezone,
    hourly: {
      time,
      temperature_2m: series((_, i) => 10 + (i % 10)),
      apparent_temperature: series(() => 9),
      precipitation_probability: series(() => 20),
      precipitation: series(() => 0.2),
      wind_speed_10m: series(() => 12),
      wind_direction_10m: series(() => 270),
      wind_gusts_10m: series(() => 25),
      relative_humidity_2m: series(() => 80),
      dew_point_2m: series(() => 7),
      visibility: series(() => 24000),
      uv_index: series(() => 2),
      weather_code: series(() => 3),
      is_day: series((t) => (opts.isDay?.(t) ? 1 : 0)),
    },
    daily: {
      time: dayStarts,
      sunrise: dayStarts.map((d) => d + (opts.sunriseUtc ?? 7 * HOUR)),
      sunset: dayStarts.map((d) => d + (opts.sunsetUtc ?? 19 * HOUR)),
    },
  };
}

function roundTimes(
  response: OpenMeteoSeriesResponse,
  date: string,
  teeTime: number
): string[] {
  const series = toLocationSeries(response);
  return selectRoundWindow(series, date, teeTime).hourly.map((h) => h.time);
}

test("Irish summer-time date reads on Irish Summer Time", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-06-29T23:00Z",
    days: 7,
  });
  assert.deepEqual(roundTimes(response, "2026-07-01", 8), [
    "2026-07-01T08:00+01:00",
    "2026-07-01T09:00+01:00",
    "2026-07-01T10:00+01:00",
    "2026-07-01T11:00+01:00",
    "2026-07-01T12:00+01:00",
  ]);
});

test("Irish winter date reads on GMT", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-01-13T00:00Z",
    days: 7,
  });
  assert.deepEqual(roundTimes(response, "2026-01-15", 8), [
    "2026-01-15T08:00+00:00",
    "2026-01-15T09:00+00:00",
    "2026-01-15T10:00+00:00",
    "2026-01-15T11:00+00:00",
    "2026-01-15T12:00+00:00",
  ]);
});

test("Irish spring-forward day, requested while still on GMT", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-03-27T00:00Z",
    days: 7,
  });
  assert.deepEqual(roundTimes(response, "2026-03-29", 8), [
    "2026-03-29T08:00+01:00",
    "2026-03-29T09:00+01:00",
    "2026-03-29T10:00+01:00",
    "2026-03-29T11:00+01:00",
    "2026-03-29T12:00+01:00",
  ]);
  // 01:00 doesn't exist that night; the round starts at the next real hour
  assert.equal(roundTimes(response, "2026-03-29", 1)[0], "2026-03-29T02:00+01:00");
});

test("Irish fall-back day, requested while still on summer time", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-10-22T23:00Z",
    days: 7,
    sunriseUtc: 8 * HOUR + 10 * 60, // 08:10 after the 23:00Z day start
  });
  assert.deepEqual(roundTimes(response, "2026-10-25", 8), [
    "2026-10-25T08:00+00:00",
    "2026-10-25T09:00+00:00",
    "2026-10-25T10:00+00:00",
    "2026-10-25T11:00+00:00",
    "2026-10-25T12:00+00:00",
  ]);
  // 01:00 happens twice; the round is still five real hours
  assert.deepEqual(roundTimes(response, "2026-10-25", 1), [
    "2026-10-25T01:00+01:00",
    "2026-10-25T01:00+00:00",
    "2026-10-25T02:00+00:00",
    "2026-10-25T03:00+00:00",
    "2026-10-25T04:00+00:00",
  ]);
  // Open-Meteo would label this sunrise 08:10 on the stale +01:00 offset
  const round = selectRoundWindow(toLocationSeries(response), "2026-10-25", 8);
  assert.equal(round.daily.sunrise, "2026-10-25T07:10+00:00");
});

test("Southern-hemisphere course reads on its own clock", () => {
  const response = fakeResponse({
    timezone: "Australia/Sydney",
    firstHour: "2026-01-13T13:00Z",
    days: 7,
  });
  assert.deepEqual(roundTimes(response, "2026-01-15", 9), [
    "2026-01-15T09:00+11:00",
    "2026-01-15T10:00+11:00",
    "2026-01-15T11:00+11:00",
    "2026-01-15T12:00+11:00",
    "2026-01-15T13:00+11:00",
  ]);
});

test("Course west of UTC reads on its own clock and in daylight", () => {
  // Pebble Beach in July: up at ~13:00Z, down at ~03:30Z
  const response = fakeResponse({
    timezone: "America/Los_Angeles",
    firstHour: "2026-06-29T07:00Z",
    days: 7,
    isDay: (t) => {
      const h = new Date(t * 1000).getUTCHours();
      return h >= 13 || h < 3;
    },
  });
  const round = selectRoundWindow(toLocationSeries(response), "2026-07-01", 9);
  assert.deepEqual(
    round.hourly.map((h) => h.time),
    [
      "2026-07-01T09:00-07:00",
      "2026-07-01T10:00-07:00",
      "2026-07-01T11:00-07:00",
      "2026-07-01T12:00-07:00",
      "2026-07-01T13:00-07:00",
    ]
  );
  assert.equal(new Date(round.hourly[0].time).toISOString(), "2026-07-01T16:00:00.000Z");
  assert.ok(round.hourly.every((h) => h.is_day));
});

test("Half-hour tee maps to the hour containing it", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-06-29T23:00Z",
    days: 7,
  });
  assert.deepEqual(
    roundTimes(response, "2026-07-01", 9.5),
    roundTimes(response, "2026-07-01", 9)
  );
});

test("Date outside the series gives an empty round", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-06-29T23:00Z",
    days: 7,
  });
  assert.deepEqual(roundTimes(response, "2026-08-01", 9), []);
});

test("Fahrenheit converts temperatures only", () => {
  const series = toLocationSeries(
    fakeResponse({ timezone: "Europe/Dublin", firstHour: "2026-01-13T00:00Z", days: 7 })
  );
  const c = selectRoundWindow(series, "2026-01-15", 8);
  const f = selectRoundWindow(series, "2026-01-15", 8, 5, "fahrenheit");
  assert.equal(f.units.temperature, "°F");
  assert.equal(f.hourly[0].temperature, (c.hourly[0].temperature * 9) / 5 + 32);
  assert.equal(f.hourly[0].wind_speed, c.hourly[0].wind_speed);
  assert.equal(f.hourly[0].visibility, c.hourly[0].visibility);
});

// --- far end of the 16-day range ---

test("horizon constant is 14", () => {
  assert.equal(FORECAST_HORIZON_DAYS, 14);
});

test("missing rain chance stays null instead of becoming 0%", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-06-29T23:00Z",
    days: 7,
  });
  response.hourly.precipitation_probability = response.hourly.time.map(() => null);
  const series = toLocationSeries(response);
  const round = selectRoundWindow(series, "2026-07-01", 8).hourly;
  assert.equal(round.length, 5);
  assert.ok(round.every((h) => h.precipitation_probability === null));
  assert.ok(round.every((h) => h.precipitation === 0.2));
});

test("hours whose core readings are null are dropped, not zeroed", () => {
  const response = fakeResponse({
    timezone: "Europe/Dublin",
    firstHour: "2026-06-29T23:00Z",
    days: 7,
  });
  // Blank every core variable from 11:00 local (10:00Z) on 2026-07-01 onwards.
  const cut = response.hourly.time.findIndex(
    (t) => t === utc("2026-07-01T10:00Z")
  );
  for (const key of [
    "temperature_2m",
    "wind_speed_10m",
    "weather_code",
    "visibility",
  ] as const) {
    for (let i = cut; i < response.hourly.time.length; i++) {
      response.hourly[key][i] = null;
    }
  }
  const series = toLocationSeries(response);
  const round = selectRoundWindow(series, "2026-07-01", 8).hourly;
  assert.equal(round.length, 3);
  assert.equal(round.at(-1)!.time, "2026-07-01T10:00+01:00");
  assert.deepEqual(selectRoundWindow(series, "2026-07-02", 8).hourly, []);
});

// --- scoring with missing rain data ---

function hours(over: Partial<HourlyWeather>): HourlyWeather[] {
  return Array.from({ length: 5 }, (_, i) => ({
    time: `2026-07-01T${String(8 + i).padStart(2, "0")}:00+01:00`,
    temperature: 20,
    apparent_temperature: 20,
    precipitation_probability: 0,
    precipitation: 0,
    wind_speed: 5,
    wind_direction: 270,
    wind_gusts: 10,
    relative_humidity: 60,
    dew_point: 10,
    visibility: 24000,
    uv_index: 3,
    weather_code: 0,
    is_day: true,
    ...over,
  }));
}

test("known 0% rain chance still scores rain as perfect", () => {
  const s = calculatePlayabilityScore(hours({}));
  assert.equal(s.rainBasis, "probability");
  assert.equal(s.rain, 100);
  assert.equal(s.overall, 100);
});

test("missing rain chance falls back to expected rainfall", () => {
  const dry = calculatePlayabilityScore(
    hours({ precipitation_probability: null, precipitation: 0 })
  );
  assert.equal(dry.rainBasis, "amount");
  assert.equal(dry.rain, 100);

  // 5 x 1 mm = 5 mm over the round
  const wet = calculatePlayabilityScore(
    hours({ precipitation_probability: null, precipitation: 1 })
  );
  assert.equal(wet.rainBasis, "amount");
  assert.equal(wet.rain, 50);
  assert.ok(wet.overall < dry.overall);
  assert.match(wet.rainDesc, /expected rainfall/);
});

test("no rain data at all leaves rain out of the overall", () => {
  const s = calculatePlayabilityScore(
    hours({ precipitation_probability: null, precipitation: null })
  );
  assert.equal(s.rainBasis, "unavailable");
  assert.equal(s.overall, 100);
  assert.match(s.rainDesc, /not available/);

  const windy = calculatePlayabilityScore(
    hours({ precipitation_probability: null, precipitation: null, wind_speed: 40 })
  );
  assert.ok(windy.overall < 100);
});

test("rain chance on only some hours uses the known ones", () => {
  const h = hours({});
  h[0].precipitation_probability = 60;
  h[3].precipitation_probability = null;
  const s = calculatePlayabilityScore(h);
  assert.equal(s.rainBasis, "probability");
  assert.equal(s.rain, 40);
});
