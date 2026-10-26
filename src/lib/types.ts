export interface Profile {
  id: string;
  email: string;
  name: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  default_club_id: string | null;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface GolfEvent {
  id: string;
  user_id: string;
  club_id: string | null;
  club_name_raw: string | null;
  event_date: string;
  event_time: string | null;
  calendar_event_id: string | null;
  evening_notified: boolean;
  morning_notified: boolean;
  created_at: string;
}

export interface GolfEventWithRelations extends GolfEvent {
  profiles: Profile;
  clubs: Club | null;
}

export interface WeatherForecast {
  temp_max: number | null;
  temp_min: number | null;
  feels_like_max: number | null;
  feels_like_min: number | null;
  rain_chance: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  units: {
    temperature: string;
    wind_speed: string;
  };
}

export interface GolfDetectionResult {
  is_golf: boolean;
  club_name: string | null;
}

export interface GolfCourseResult {
  id: string;
  club_name: string;
  course_name: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
}

// --- Lookup tool types ---

export interface HourlyWeather {
  time: string;
  temperature: number;
  apparent_temperature: number;
  // null where the model publishes no chance this far out (Open-Meteo drops it
  // around day 10 for some regions). Never treat it as 0%.
  precipitation_probability: number | null;
  // Expected rainfall in mm for the hour; null only at the very end of range.
  precipitation: number | null;
  wind_speed: number;
  wind_direction: number;
  wind_gusts: number;
  relative_humidity: number;
  dew_point: number;
  visibility: number;
  uv_index: number;
  weather_code: number;
  is_day: boolean;
}

export interface DailyWeather {
  sunrise: string;
  sunset: string;
}

export interface RoundForecast {
  hourly: HourlyWeather[];
  daily: DailyWeather;
  units: WeatherUnits;
}

export interface WeatherUnits {
  temperature: string;
  wind_speed: string;
  visibility: string;
}

export interface PlayabilityScore {
  overall: number;
  temperature: number;
  temperatureDesc: string;
  wind: number;
  windDesc: string;
  rain: number;
  rainDesc: string;
  // Where the rain score came from: the chance of rain, the expected amount
  // when no chance is published, or nothing (then rain is left out of overall).
  rainBasis: "probability" | "amount" | "unavailable";
  visibility: number;
  visibilityDesc: string;
  label: string;
  color: string;
}
