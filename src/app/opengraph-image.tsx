import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Golf Weather — Course Forecast Lookup";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1a6b35 0%, #2d8a4e 50%, #1a6b35 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Golf flag icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{ marginBottom: 24 }}
        >
          <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,0.15)" />
          <line
            x1="58"
            y1="25"
            x2="58"
            y2="95"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <polygon points="61,25 92,38 61,51" fill="white" />
          <ellipse cx="58" cy="95" rx="14" ry="4" fill="rgba(255,255,255,0.4)" />
        </svg>

        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          Golf Weather
        </div>

        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.85)",
            marginTop: 12,
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Search any golf course, pick your tee time, and see the full weather
          forecast for your round.
        </div>

        {/* Subtle bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "1px",
          }}
        >
          fairwayforecast.app
        </div>
      </div>
    ),
    { ...size }
  );
}
