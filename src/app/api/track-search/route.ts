import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseName, latitude, longitude, date, teeTime } = body as {
      courseName?: string;
      latitude?: number;
      longitude?: number;
      date?: string;
      teeTime?: number;
    };

    if (
      !courseName ||
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !date ||
      typeof teeTime !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("forecast_searches").insert({
      course_name: courseName,
      latitude,
      longitude,
      forecast_date: date,
      tee_time: teeTime,
    });

    if (error) {
      console.error("Failed to record forecast search:", error);
      return NextResponse.json(
        { error: "Failed to save" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to record forecast search:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
