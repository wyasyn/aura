import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Geist_Mono, Inter } from "next/font/google"

import { Suspense } from "react"

import "./globals.css"
import { AnalyticsConsentLoader } from "@/components/privacy/analytics-consent-loader"
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_TAGLINE,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  siteUrl,
} from "@/lib/site"
import { getSiteUrl } from "@/lib/site-url"
import { cn } from "@/lib/utils"

// Inter carries both body and headings. Cormorant stays reserved for display
// type on marketing surfaces, where it has the size to read as editorial.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" })

const cormorantDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const SITE_TITLE = `${SITE_NAME} | ${SITE_TAGLINE}`

// VERCEL_ENV is "production", "preview", or "development" on Vercel, and
// unset locally — every case other than "production" must stay out of
// search results, or a preview alias ends up indexed under its own URL.
const isProductionDeployment = process.env.VERCEL_ENV === "production"

// Painted by the browser outside the document (mobile status bar, installed
// titlebar), so it has to follow the theme by media query rather than by the
// `.dark` class next-themes toggles.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
}

export const metadata: Metadata = {
  // Called directly (not via the siteUrl re-export) so canonical, og:url and
  // og:image resolve against the origin actually serving this deployment.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // iOS has no install prompt of its own: Safari's Share sheet is the only
  // path, and these are what make the result launch as a standalone app.
  appleWebApp: {
    capable: true,
    title: SITE_SHORT_NAME,
    statusBarStyle: "default",
  },
  keywords: [
    "skin scan",
    "skincare analysis",
    "personalized skincare",
    "cosmetic skin assessment",
    "Aurora Organics",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: isProductionDeployment,
    follow: isProductionDeployment,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        inter.variable,
        interHeading.variable,
        cormorantDisplay.variable,
        fontMono.variable
      )}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        {/* Behind Suspense: reading the consent cookie must not make every
            route dynamic. */}
        <Suspense fallback={null}>
          <AnalyticsConsentLoader />
        </Suspense>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
