import { degreesToDirection } from "@/lib/weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WindDisplayProps {
  direction: number;
  speed: number;
  gusts: number;
  unit: string;
}

export function WindDisplay({ direction, speed, gusts, unit }: WindDisplayProps) {
  const cardinal = degreesToDirection(direction);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wind</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Compass */}
          <div className="relative size-28 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full">
              {/* Outer circle */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              {/* Cardinal labels */}
              <text x="50" y="14" textAnchor="middle" className="text-[10px] font-bold fill-current">N</text>
              <text x="90" y="54" textAnchor="middle" className="text-[10px] font-bold fill-current">E</text>
              <text x="50" y="96" textAnchor="middle" className="text-[10px] font-bold fill-current">S</text>
              <text x="10" y="54" textAnchor="middle" className="text-[10px] font-bold fill-current">W</text>
              {/* Arrow */}
              <g transform={`rotate(${direction} 50 50)`}>
                <polygon points="50,18 44,42 50,38 56,42" fill="currentColor" className="text-main" />
                <line x1="50" y1="38" x2="50" y2="72" stroke="currentColor" strokeWidth="2" className="text-main" />
              </g>
            </svg>
          </div>

          {/* Details */}
          <div className="space-y-1">
            <div className="text-3xl font-heading">
              {Math.round(speed)} <span className="text-base font-base">{unit}</span>
            </div>
            <div className="text-sm text-foreground/60">
              from the {cardinal}
            </div>
            {gusts > speed && (
              <div className="text-sm">
                Gusts up to{" "}
                <span className="font-heading">{Math.round(gusts)} {unit}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
