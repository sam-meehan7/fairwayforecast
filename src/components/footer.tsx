import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-border bg-secondary-background text-sm">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div className="space-y-2 max-w-sm">
          <Logo markClassName="size-6" textClassName="text-lg" />
          <p className="text-foreground/60">
            Hour-by-hour golf weather for every course in Ireland.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1.5">
          <Link href="/" className="hover:text-main">
            Forecast a round
          </Link>
          <Link href="/golf-weather" className="hover:text-main">
            All Irish courses
          </Link>
        </nav>
        <div className="space-y-1.5 text-foreground/60">
          <p>
            Weather data by{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Open-Meteo.com
            </a>
          </p>
          <p>
            Map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              OpenStreetMap
            </a>{" "}
            contributors
          </p>
          <p>
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/sam-meehan/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Sam Meehan
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
