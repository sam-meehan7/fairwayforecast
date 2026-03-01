import { NextRequest, NextResponse } from "next/server";
import { searchGolfCourses } from "@/lib/golf-courses";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ courses: [] });
  }

  const courses = await searchGolfCourses(query);
  return NextResponse.json({ courses });
}
