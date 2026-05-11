import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#0f172a",
          borderRadius: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2"
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="17" r="1.5" fill="#60a5fa" />
          <circle cx="16.5" cy="17" r="1.5" fill="#60a5fa" />
          <path d="M5 12h14" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div
          style={{
            color: "#f1f5f9",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "sans-serif",
            letterSpacing: -0.5,
          }}
        >
          Transport
        </div>
      </div>
    ),
    { ...size }
  );
}
