import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spawned by path, so the bundler can't see it.
  outputFileTracingIncludes: {
    "/**": ["./career-ops/**/*"],
  },
  experimental: {
    serverActions: {
      // Spreadsheet import base64-encodes the file; Vercel's own ~4.5MB request
      // cap still applies on top of this limit.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
