"use client";

import { cn } from "@/lib/utils";
import { useTeedOff } from "@/components/round-link";

interface EmbedRoundChipProps {
  href: string;
  title: string;
  startsAt: string;
  score: { overall: number; label: string; color: string };
}

// The widget's compact take on RoundLink: just the score, with the round and
// label in the tooltip, since the column header already names the tee time.
export function EmbedRoundChip({
  href,
  title,
  startsAt,
  score,
}: EmbedRoundChipProps) {
  const past = useTeedOff(startsAt);
  const base =
    "w-12 rounded-base border-2 py-0.5 text-center font-heading text-base";

  if (past) {
    return (
      <div
        className={cn(base, "border-border/20 text-foreground/30")}
        title="This tee time has passed"
      >
        {score.overall}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener nofollow"
      title={`${title}: playability ${score.overall}/100, ${score.label}`}
      className={cn(
        base,
        "border-border bg-secondary-background hover:bg-main/10",
        score.color
      )}
    >
      {score.overall}
    </a>
  );
}
