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

export const metadata = {
  title: 'only love.',
  description:
    'There are only four questions of value in life. What is sacred? Of what is the spirit made? What is worth living for? What is worth dying for? The answer to each is the same.',
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
