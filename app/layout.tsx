import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

/**
 * Instrument Sans is self-hosted rather than pulled from Google Fonts: it is
 * the one typeface in the design system, the build shouldn't depend on a third
 * party being reachable, and no visitor request leaves for fonts.gstatic.com.
 * Variable weight axis 400–600 — see app/fonts/OFL.txt.
 */
const instrumentSans = localFont({
  src: './fonts/InstrumentSans-Variable.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-instrument-sans',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const SITE = 'https://oriastudio.ai'
const TITLE = 'Oria'
const TAGLINE = 'Become better with people.'
const DESCRIPTION =
  'Work through difficult situations and build practical people skills. iOS, in closed beta.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: `${TITLE} — ${TAGLINE}`, template: `%s — ${TITLE}` },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: ['Oria', 'people skills', 'relationships', 'private', 'iOS'],
  authors: [{ name: 'Oria Studio LLC' }],
  creator: 'Oria Studio LLC',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: TITLE,
    title: `${TITLE} — ${TAGLINE}`,
    description: DESCRIPTION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: `${TITLE} — ${TAGLINE}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} — ${TAGLINE}`,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#1B1713',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body>{children}</body>
    </html>
  )
}
