"use client";

import { Calendar, Clock } from "lucide-react";

interface DateTimePickerProps {
  date: string;
  teeTime: number;
  onDateChange: (date: string) => void;
  onTeeTimeChange: (hour: number) => void;
}

function getTeeTimeOptions() {
  const options: { value: number; label: string }[] = [];
  for (let hour = 5; hour <= 18; hour++) {
    for (const min of [0, 30]) {
      if (hour === 18 && min === 30) break;
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

function getDateRange() {
  const today = new Date();
  const max = new Date();
  max.setDate(max.getDate() + 14);

  const format = (d: Date) => d.toISOString().split("T")[0];
  return { min: format(today), max: format(max) };
}

const teeTimeOptions = getTeeTimeOptions();

export function DateTimePicker({
  date,
  teeTime,
  onDateChange,
  onTeeTimeChange,
}: DateTimePickerProps) {
  const { min, max } = getDateRange();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/60 pointer-events-none" />
        <input
          type="date"
          value={date}
          min={min}
          max={max}
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
