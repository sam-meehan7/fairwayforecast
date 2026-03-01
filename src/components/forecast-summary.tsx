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
      <CardContent className="flex gap-3 items-start py-5">
        <Sparkles className="size-5 shrink-0 text-main mt-0.5" />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <Loader2 className="size-4 animate-spin" />
            <span>Writing your forecast...</span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
