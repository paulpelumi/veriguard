import { ImageResponse } from "next/og"

export const runtime = "edge"

// PWA manifest icons, generated on the fly rather than shipped as static
// PNG assets - there's no existing logo image file in this project (the
// header Logo component is just an inline lucide icon + text), and this
// avoids needing a design tool to produce one. Matches the brand green
// used everywhere else (--primary: #1A5C38).
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
          borderRadius: 32,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 5V11C4 16.5 7.4 21.3 12 22C16.6 21.3 20 16.5 20 11V5L12 2Z"
            fill="#ffffff"
          />
          <path
            d="M9.5 12L11 13.5L14.5 10"
            stroke="#1A5C38"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
