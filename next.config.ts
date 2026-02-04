import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment only when requested
  // This allows 'next start' to work locally while still supporting optimized Docker images
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Ensure Next.js uses the correct root for tracing dependencies
  outputFileTracingRoot: path.join(process.cwd()),

  // Enable Turbopack (Next.js 16 default)
  turbopack: {},

  // Cache-Control headers for static assets in public/
  async headers() {
    return [
      {
        // Images, fonts, and icons - immutable long-term caching
        source: "/:path*.(svg|ico|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // OpenAPI spec - shorter cache with stale-while-revalidate
        source: "/openapi.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;


