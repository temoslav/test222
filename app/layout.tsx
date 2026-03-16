import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Swipely — Открывай новое',
  description: 'Персональная лента открытий: свайпайте товары, события и места. Каждый свайп обучает алгоритм.',
  keywords: ['свайп', 'открытия', 'товары', 'события', 'места', 'персонализация'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFFFFF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body suppressHydrationWarning className="min-h-screen antialiased bg-[#F7F7F5] text-[#0F0F0F] font-sans">
        <div className="mx-auto w-full max-w-[430px]">
          <Suspense
            fallback={
              <div className="px-4 py-6 space-y-3 animate-pulse">
                <div className="h-6 w-36 rounded bg-[#E9E9E9]" />
                <div className="h-24 rounded-2xl bg-[#EEEEEE]" />
                <div className="h-24 rounded-2xl bg-[#EEEEEE]" />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </body>
    </html>
  )
}
