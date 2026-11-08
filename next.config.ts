import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded at runtime from their own folders, so they stay out of the bundle.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Spawned or read by path, so the bundler can't see them.
  outputFileTracingIncludes: {
    "/**": ["./career-ops/**/*", "./node_modules/@sparticuz/chromium/bin/**"],
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
