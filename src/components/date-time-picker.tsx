"use client";

import { useSyncExternalStore } from "react";
import { Calendar, Clock } from "lucide-react";
import { getForecastDateRange } from "@/lib/weather-utils";
import { getTeeTimeOptions } from "@/lib/tee-times";

interface DateTimePickerProps {
  date: string;
  teeTime: number;
  onDateChange: (date: string) => void;
  onTeeTimeChange: (hour: number) => void;
}

// The selectable window depends on the *viewer's* current date, which the
// prerendered markup can't know: the page is built once and React does not
// patch attribute mismatches during hydration, so a build-time min/max would
// stay frozen at the deploy date. Rendering it as an external store leaves the
// server markup unconstrained and lets the client fill the range in after
// hydration, re-reading it whenever the tab is focused so a long-open tab
// survives midnight. The snapshot is a cached string so it stays referentially
// stable across renders.
const SERVER_RANGE = "|";
let cachedRange = SERVER_RANGE;

function getRangeSnapshot() {
  const { min, max } = getForecastDateRange();
  const next = `${min}|${max}`;
  if (next !== cachedRange) cachedRange = next;
  return cachedRange;
}

function getServerRangeSnapshot() {
  return SERVER_RANGE;
}

function subscribeToRange(onStoreChange: () => void) {
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);
  return () => {
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

const teeTimeOptions = getTeeTimeOptions();

export function DateTimePicker({
  date,
  teeTime,
  onDateChange,
  onTeeTimeChange,
}: DateTimePickerProps) {
  const [min, max] = useSyncExternalStore(
    subscribeToRange,
    getRangeSnapshot,
    getServerRangeSnapshot,
  ).split("|");

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/60 pointer-events-none" />
        <input
          type="date"
          value={date}
          min={min || undefined}
          max={max || undefined}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-base border-2 border-border bg-secondary-background text-foreground font-base focus:outline-none focus:ring-2 focus:ring-main"
        />
      </div>

      <div className="relative flex-1">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/60 pointer-events-none" />
        <select
          value={teeTime}
          onChange={(e) => onTeeTimeChange(Number(e.target.value))}
          className="w-full h-12 pl-11 pr-4 rounded-base border-2 border-border bg-secondary-background text-foreground font-base focus:outline-none focus:ring-2 focus:ring-main appearance-none"
        >
          {teeTimeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
