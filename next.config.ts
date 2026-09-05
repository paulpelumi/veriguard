import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled: the dev machine's disk is very tight on space, and
  // Turbopack's on-disk filesystem cache has repeatedly failed mid-write
  // with ENOSPC, crashing the dev server. Cold starts are a bit slower
  // without it, but the server stays up reliably.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
