"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ForecastSummaryProps {
  summary: string | null;
  loading: boolean;
  error: boolean;
}

export function ForecastSummary({
  summary,
  loading,
  error,
}: ForecastSummaryProps) {
  if (error) return null;

  return (
    <Card>
      <CardContent className="flex gap-3 items-start">
        <Sparkles className="size-5 shrink-0 text-main mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <h3 className="font-heading">Round summary</h3>
            <span className="text-xs text-foreground/50">AI-generated</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <Loader2 className="size-4 animate-spin" />
              <span>Summarising the conditions…</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{summary}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
