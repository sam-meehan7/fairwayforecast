import { formatLocalDate } from "./weather-utils";

// Tee times run 05:00–18:00 on the half hour. Values are fractional hours
// (11.5 === 11:30) because that is the shape the weather lookup takes.
const FIRST_TEE_HOUR = 5;
const LAST_TEE_HOUR = 18;

// Defaulting to the very next slot can land a tee time two minutes from now,
// so the default skips to the first slot far enough out to actually make.
const LEAD_MINUTES = 15;

// Used when the day's tee times are already done and we roll to tomorrow —
// a plain morning slot beats defaulting to first light.
const TOMORROW_TEE_HOUR = 8;

export interface TeeTimeOption {
  value: number;
  label: string;
}

export function getTeeTimeOptions(): TeeTimeOption[] {
  const options: TeeTimeOption[] = [];
  for (let hour = FIRST_TEE_HOUR; hour <= LAST_TEE_HOUR; hour++) {
    for (const min of [0, 30]) {
      if (hour === LAST_TEE_HOUR && min === 30) break;
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMin = min === 0 ? "00" : "30";
      options.push({
        value: hour + min / 60,
        label: `${displayHour}:${displayMin} ${period}`,
      });
    }
  }
  return options;
}

// The round to preselect: today at the next reachable slot. Read from the
// viewer's clock, so it must be called on the client.
export function getDefaultRound(): { date: string; teeTime: number } {
  const now = new Date();
  const earliestMinutes =
    now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES;

  const nextSlot = getTeeTimeOptions().find(
    (option) => option.value * 60 >= earliestMinutes
  );

  if (nextSlot) {
    return { date: formatLocalDate(now), teeTime: nextSlot.value };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { date: formatLocalDate(tomorrow), teeTime: TOMORROW_TEE_HOUR };
}
