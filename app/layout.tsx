import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ServiceWorkerRegister } from '@/components/sw-register'
import './globals.css'

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'FuelMap Armenia',
  description: 'Карта АЗС Армении с актуальными ценами на топливо',
  applicationName: 'FuelMap Armenia',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FuelMap',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#059669',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="bg-slate-100">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="w-full max-w-[420px] min-h-screen bg-background shadow-xl">
            {children}
          </div>
        </div>
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
