import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Cloud, Mail } from "lucide-react";
import Link from "next/link";

export default function AuthSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            You&apos;re all set!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center">
            We&apos;ll send you weather updates before your golf rounds.
          </p>

          <div className="space-y-4">
            <h3 className="font-heading text-sm uppercase tracking-wide">
              What happens next:
            </h3>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-base border-2 border-border bg-main p-2 text-main-foreground">
                <Calendar className="size-4" />
              </div>
              <div>
                <p className="font-heading">Add golf events to your calendar</p>
                <p className="text-sm">
                  Include the club name in the event title or description.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-base border-2 border-border bg-main p-2 text-main-foreground">
                <Cloud className="size-4" />
              </div>
              <div>
                <p className="font-heading">We fetch the weather</p>
                <p className="text-sm">
                  We detect your golf rounds and look up the forecast.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-base border-2 border-border bg-main p-2 text-main-foreground">
                <Mail className="size-4" />
              </div>
              <div>
                <p className="font-heading">Get notified</p>
                <p className="text-sm">
                  Weather email the evening before and morning of your round.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link href="/" className="text-sm underline">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
