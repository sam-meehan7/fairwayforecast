import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  textClassName?: string;
  showTagline?: boolean;
};

export function Logo({ className, textClassName, showTagline }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className="size-12 shrink-0" />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading tracking-tight text-4xl",
            textClassName,
          )}
        >
          <span>Fairway</span>
          <span className="relative mx-[0.05em] text-main">
            FORE
            <span
              aria-hidden
              className="absolute -top-[0.55em] right-[-0.12em] text-[0.5em] font-heading text-foreground"
            >
              !
            </span>
          </span>
          <span>cast</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-sm font-base text-foreground/70">
            Search your course. Pick your tee time. Know what to expect.
          </span>
        )}
      </div>
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Wind lines streaming from flag */}
      <path
        d="M34 14 Q42 15 34 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 20 Q44 21 36 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Flag pole */}
      <line
        x1="12"
        y1="6"
        x2="12"
        y2="42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Pennant flag — brand green */}
      <path
        d="M12 8 L32 14 L12 20 Z"
        className="fill-main"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Ground line / horizon */}
      <line
        x1="4"
        y1="42"
        x2="44"
        y2="42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Golf ball on the green */}
      <circle
        cx="30"
        cy="38"
        r="3"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
