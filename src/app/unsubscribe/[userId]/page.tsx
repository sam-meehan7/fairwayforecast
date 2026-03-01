import { supabaseAdmin } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const { data } = await supabaseAdmin
    .from("profiles")
    .update({ notifications_enabled: false })
    .eq("id", userId)
    .select("id");

  if (!data?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              User not found
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            You&apos;ve been unsubscribed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>You won&apos;t receive any more golf weather notifications.</p>
          <p className="text-sm">
            Changed your mind?{" "}
            <Link
              href={`/unsubscribe/${userId}/resubscribe`}
              className="underline font-heading"
            >
              Resubscribe
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
