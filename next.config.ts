import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment only when requested
  // This allows 'next start' to work locally while still supporting optimized Docker images
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  
  // Ensure Next.js uses the correct root for tracing dependencies
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
