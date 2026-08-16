import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./generated/prisma/**/*"],
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
