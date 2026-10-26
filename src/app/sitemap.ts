import type { MetadataRoute } from "next";
import { SITE_URL, coursePath, getCourseDirectory } from "@/lib/courses";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getCourseDirectory();
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/golf-weather`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...courses.map((course) => ({
      url: `${SITE_URL}${coursePath(course)}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
