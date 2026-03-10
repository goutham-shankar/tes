import { ImageResponse } from "next/og";

export const runtime = "edge";

export const revalidate = 31536000;

export function GET() {
  const response = new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e2a8a 0%, #0d1117 100%)",
          borderRadius: 112,
        }}
      >
        <svg width="320" height="270" viewBox="0 0 120 100">
          <polygon
            points="60,34 60,78 14,68 14,24"
            fill="none"
            stroke="#6082fb"
            stroke-width="7"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <polygon
            points="60,34 60,78 106,68 106,24"
            fill="none"
            stroke="#6082fb"
            stroke-width="7"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <circle cx="95" cy="16" r="6" fill="#6082fb" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );

  response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return response;
}
