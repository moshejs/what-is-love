import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  display: 'block', // the 1.2s opening dark beat hides the swap
  variable: '--font-serif',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
  display: 'block',
  variable: '--font-sans',
})

// Share tags need absolute URLs on the live address; icons use the build's
// base path (set by CI to /<repo>) so they also resolve when served locally.
const SITE_URL = 'https://moshejs.github.io/what-is-love/'
const BASE = process.env.PAGES_BASE_PATH || ''
const TITLE = 'only love.'
const DESCRIPTION =
  'There are only four questions of value in life. What is sacred? Of what is the spirit made? What is worth living for? What is worth dying for? The answer to each is the same.'
const SHARE_IMAGE = {
  url: `${SITE_URL}og.jpg`,
  width: 1200,
  height: 630,
  type: 'image/jpeg',
  alt: 'The words “only love.” in pale serif on near-black, a single flame resting where the period falls.',
}

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: SHARE_IMAGE.url, alt: SHARE_IMAGE.alt }],
  },
  icons: {
    icon: [
      { url: `${BASE}/favicon.ico`, sizes: '16x16 32x32 48x48' },
      { url: `${BASE}/icon.svg`, type: 'image/svg+xml' },
    ],
    apple: [{ url: `${BASE}/apple-touch-icon.png`, sizes: '180x180' }],
  },
}

export const viewport = {
  themeColor: '#050507',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${inter.variable}`}>{children}</body>
    </html>
  )
}
