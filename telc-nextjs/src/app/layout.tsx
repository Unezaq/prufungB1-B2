import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TELC B1/B2 Prep',
  description: 'Préparez votre examen TELC B1/B2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased bg-slate-50 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
