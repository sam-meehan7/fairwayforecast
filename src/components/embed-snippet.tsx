"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmbedSnippetProps {
  courseName: string;
  embedUrl: string;
  courseUrl: string;
}

// Sized for the widget's seven rows; it scrolls inside if a club squeezes it.
const WIDGET_HEIGHT = 480;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The credit line sits outside the iframe on purpose: a link inside an iframe
// belongs to our page, while this one is a link from the club's site to ours.
function embedCode({ courseName, embedUrl, courseUrl }: EmbedSnippetProps) {
  courseName = escapeHtml(courseName);
  return [
    `<iframe src="${embedUrl}" title="${courseName} golf weather forecast" width="100%" height="${WIDGET_HEIGHT}" style="border:0;max-width:480px" loading="lazy"></iframe>`,
    `<p style="font-size:12px;margin:4px 0 0">Golf weather for ${courseName} by <a href="${courseUrl}">FairwayForecast</a></p>`,
  ].join("\n");
}

export function EmbedSnippet(props: EmbedSnippetProps) {
  const [copied, setCopied] = useState(false);
  const code = embedCode(props);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-base border-2 border-border bg-secondary-background p-4 text-xs">
        <code>{code}</code>
      </pre>
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCopy}>
          {copied ? (
            <>
              <Check /> Copied
            </>
          ) : (
            <>
              <Copy /> Copy code
            </>
          )}
        </Button>
        <Button asChild variant="neutral">
          <a href={props.embedUrl} target="_blank" rel="noopener nofollow">
            <ExternalLink /> Preview widget
          </a>
        </Button>
      </div>
    </div>
  );
}
