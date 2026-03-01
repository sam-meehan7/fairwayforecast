import type { PlayabilityScore as PlayabilityScoreType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface PlayabilityScoreProps {
  score: PlayabilityScoreType;
}

function ScoreBar({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-base w-16 shrink-0">{label}</span>
        <div className="flex-1 h-2 bg-background rounded-full border border-border">
          <div
            className="h-full bg-main rounded-full transition-all"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-xs font-heading w-8 text-right">{value}</span>
      </div>
      {description && (
        <p className="text-[11px] text-foreground/50 ml-[72px]">{description}</p>
      )}
    </div>
  );
}

export function PlayabilityScoreCard({ score }: PlayabilityScoreProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="text-center">
          <div className="text-sm font-base uppercase tracking-wide text-foreground/60">
            Playability
          </div>
          <div className={`text-5xl font-heading ${score.color}`}>
            {score.overall}
          </div>
          <div className={`text-lg font-heading ${score.color}`}>
            {score.label}
          </div>
        </div>
        <div className="w-full space-y-2">
          <ScoreBar label="Temp" value={score.temperature} description={score.temperatureDesc} />
          <ScoreBar label="Wind" value={score.wind} description={score.windDesc} />
          <ScoreBar label="Rain" value={score.rain} description={score.rainDesc} />
          <ScoreBar label="Visibility" value={score.visibility} description={score.visibilityDesc} />
        </div>
      </CardContent>
    </Card>
  );
}
