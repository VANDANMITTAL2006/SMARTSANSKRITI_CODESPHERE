import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { UserProvider } from '@/lib/userContext'
import { AppWrapper } from '@/components/app-wrapper'
import { AuthProvider } from '@/lib/authContext'
import { AuthGuard } from '@/components/auth-guard'
import { LanguageProvider } from '@/lib/languageContext'
import { ClientLangWrapper } from '@/components/client-lang-wrapper'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair'
})

export const metadata: Metadata = {
  title: 'Sanskriti AI | Discover India\'s Living Heritage',
  description: 'AI-powered monument guide for students and tourists. Explore India\'s rich cultural heritage with smart recognition, heritage chatbot, and interactive learning.',
  keywords: 'Indian heritage, monuments, AI guide, Taj Mahal, cultural tourism, UNESCO sites',
}

export const viewport: Viewport = {
  themeColor: '#0F0B1E',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-[#0F0B1E] text-[#F5E6D3]`}>
        <AuthProvider>
          <AuthGuard>
            <LanguageProvider>
              <ClientLangWrapper />
              <UserProvider>
                <AppWrapper>
                  {children}
                </AppWrapper>
              </UserProvider>
            </LanguageProvider>
          </AuthGuard>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
