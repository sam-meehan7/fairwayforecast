"use client";

import { useState } from "react";
import { Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GolfCourseResult } from "@/lib/types";

interface ShareButtonProps {
  course: GolfCourseResult;
  date: string;
  teeTime: number;
}

export function ShareButton({ course, date, teeTime }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    const params = new URLSearchParams({
      name: course.club_name,
      lat: String(course.latitude),
      lng: String(course.longitude),
      date,
      t: String(Math.floor(teeTime)),
    });

    const shareUrl = `${window.location.origin}/?${params.toString()}`;

    setSharing(true);
    try {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (navigator.share && isMobile) {
        await navigator.share({
          title: `Golf Weather - ${course.club_name}`,
          text: `Check out the forecast for ${course.club_name}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <Button
      variant="neutral"
      size="sm"
      onClick={handleShare}
      disabled={sharing}
    >
      {sharing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : copied ? (
        <>
          <Check className="size-4" />
          Link Copied
        </>
      ) : (
        <>
          <Share2 className="size-4" />
          Share
        </>
      )}
    </Button>
  );
}
