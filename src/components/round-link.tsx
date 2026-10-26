"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

interface RoundLinkProps {
  href: string;
  label: string;
  teeLabel: string;
  startsAt: string;
  score: { overall: number; label: string; color: string };
}

function subscribe() {
  return () => {};
}

// Course pages are cached for hours, so whether a round has already teed off
// is only known in the viewer's browser. The server render assumes it hasn't.
export function useTeedOff(startsAt: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Date.parse(startsAt) < Date.now(),
    () => false
  );
}

export function RoundLink({
  href,
  label,
  teeLabel,
  startsAt,
  score,
}: RoundLinkProps) {
  const past = useTeedOff(startsAt);

  const body = (
    <>
      <div className="text-xs text-foreground/60">
        {label} · {teeLabel}
      </div>
      <div className="flex items-baseline justify-center gap-1.5">
        <span className={cn("text-xl font-heading", !past && score.color)}>
          {score.overall}
        </span>
        <span className={cn("text-xs font-heading", !past && score.color)}>
          {score.label}
        </span>
      </div>
    </>
  );

  const base =
    "flex-1 sm:flex-none sm:w-32 rounded-base border-2 px-3 py-1.5 text-center";

  if (past) {
    return (
      <div
        className={cn(base, "border-border/30 text-foreground/40")}
        title="This tee time has passed"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      rel="nofollow"
      className={cn(
        base,
        "border-border bg-secondary-background shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
      )}
    >
      {body}
    </Link>
  );
}
