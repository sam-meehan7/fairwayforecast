"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Leaflet touches `window` at import time, so the map is client-only. The
// `ssr: false` import has to live in a client component, which is why this
// wrapper exists for server-rendered pages.
export const CourseMap = dynamic(() => import("@/components/course-map"), {
  ssr: false,
  loading: () => (
    <div className="rounded-base border-2 border-border shadow-shadow h-[350px] lg:h-full lg:min-h-[400px] flex items-center justify-center bg-secondary-background">
      <Loader2 className="size-6 animate-spin text-foreground/40" />
    </div>
  ),
});
