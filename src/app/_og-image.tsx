import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogAlt =
  "FairwayForecast — Golf weather forecasts for courses across Ireland";
export const ogContentType = "image/png";

const BRAND_GREEN = "#2d9049";
const BG = "#ecf4e6";
const INK = "#0a0a0a";

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <svg
            width="160"
            height="160"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M34 14 Q42 15 34 18"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M36 20 Q44 21 36 24"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <line
              x1="12"
              y1="6"
              x2="12"
              y2="42"
              stroke={INK}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M12 8 L32 14 L12 20 Z"
              fill={BRAND_GREEN}
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <line
              x1="4"
              y1="42"
              x2="44"
              y2="42"
              stroke={INK}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="30"
              cy="38"
              r="3"
              fill="white"
              stroke={INK}
              strokeWidth="2.5"
            />
          </svg>

          <div
            style={{
              display: "flex",
              fontSize: 128,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            <span style={{ color: INK }}>Fairway</span>
            <span style={{ color: BRAND_GREEN }}>FORE</span>
            <span style={{ color: INK }}>cast</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 40,
            color: "#333",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Golf weather forecasts for courses across Ireland
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
