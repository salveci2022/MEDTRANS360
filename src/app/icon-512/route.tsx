import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#0f172a",
          borderRadius: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <svg width="280" height="280" viewBox="0 0 24 24" fill="none">
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
            fontSize: 60,
            fontWeight: 700,
            fontFamily: "sans-serif",
            letterSpacing: -1,
          }}
        >
          TransportSaaS
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
