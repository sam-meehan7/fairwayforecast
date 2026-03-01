import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GolfTipsProps {
  tips: string[];
}

export function GolfTips({ tips }: GolfTipsProps) {
  if (tips.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tips for Your Round</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Lightbulb className="size-4 mt-0.5 shrink-0 text-yellow-500" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
