import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VeriGuard - Verify. Monitor. Protect.",
    short_name: "VeriGuard",
    description:
      "Nigerian food safety, inventory management, and NAFDAC regulatory compliance platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9FA",
    theme_color: "#1A5C38",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
