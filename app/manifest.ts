import type { MetadataRoute } from "next"

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_TAGLINE,
  THEME_COLOR_LIGHT,
} from "@/lib/site"

/**
 * Web app manifest. Together with the service worker registered in
 * components/pwa/service-worker-registrar.tsx this satisfies the browser's
 * installability criteria, so Chrome and Edge surface their own install
 * affordance. The app deliberately ships no install button of its own.
 *
 * Reads no request-time API, so it stays statically cached under
 * `cacheComponents`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} | ${SITE_TAGLINE}`,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    lang: "en",
    dir: "ltr",
    // proxy.ts sends signed-in visitors from "/" to /dashboard and everyone
    // else to the landing page, so "/" is the only start_url that works for
    // both. Pointing it at /dashboard would bounce signed-out launches to
    // /login.
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    // Matches --background (light) from app/globals.css, so the splash screen
    // and titlebar read as the app rather than as a brand banner. The dark
    // case is handled by the `viewport` export in app/layout.tsx, which the
    // installed shell picks up at runtime.
    background_color: THEME_COLOR_LIGHT,
    theme_color: THEME_COLOR_LIGHT,
    categories: ["health", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "New scan",
        short_name: "Scan",
        description: "Start a new skin scan",
        url: "/scan",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Your scans and routine",
        url: "/dashboard",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
    ],
  }
}
