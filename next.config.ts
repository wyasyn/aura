import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  turbopack: {
    // Pinned to this directory. Next infers the workspace root by walking up
    // for lockfiles, and a stray package-lock.json in a parent directory makes
    // it pick that parent instead — which changes what standalone output
    // traces. The offending file is outside the repository, so a clone never
    // sees it and CI is unaffected, but "correct only because of what is
    // absent" is not a property worth relying on.
    root: path.resolve(__dirname),
  },
  outputFileTracingIncludes: {
    // lib/pdf/brand-logo.ts reads the letterhead mark from disk at runtime.
    // Standalone output does not copy `public/`, and file tracing cannot always
    // follow a path built with path.join, so it is named here rather than left
    // to be discovered — a missed trace shows up as PDF generation throwing in
    // production while every local check passes.
    "/*": ["./generated/prisma/**/*", "./public/icons/logo-print.png"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.auroraorganics.co",
      },
    ],
  },
  async headers() {
    return [
      {
        // The worker must never be served from cache, or a stale one keeps
        // controlling the page after a deploy.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ]
  },
}

export default nextConfig
