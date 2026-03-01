import { supabaseAdmin } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function ResubscribePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  await supabaseAdmin
    .from("profiles")
    .update({ notifications_enabled: true })
    .eq("id", userId);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-xl text-center">Welcome back!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            You&apos;ll receive weather notifications before your golf rounds
            again.
          </p>
          <p className="text-sm">
            <Link href="/" className="underline font-heading">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
