import Link from "next/link";
import { Logo } from "@/components/logo";

// `onHomeClick` lets the homepage reset itself: a link to "/" from "/" is a
// no-op navigation, so without it the logo looks dead there.
export function SiteHeader({ onHomeClick }: { onHomeClick?: () => void }) {
  return (
    <header className="border-b-2 border-border bg-secondary-background">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" aria-label="FairwayForecast home" onClick={onHomeClick}>
          <Logo markClassName="size-8" textClassName="text-2xl" />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-heading">
          <Link href="/golf-weather" className="hover:text-main">
            All courses
          </Link>
        </nav>
      </div>
    </header>
  );
}
