import { ImageResponse } from "next/og"

export const runtime = "edge"

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A5C38",
          borderRadius: 80,
        }}
      >
        <svg width="300" height="300" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 5V11C4 16.5 7.4 21.3 12 22C16.6 21.3 20 16.5 20 11V5L12 2Z"
            fill="#ffffff"
          />
          <path
            d="M9.5 12L11 13.5L14.5 10"
            stroke="#1A5C38"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
