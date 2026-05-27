import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KlassIA — Quartier général pédagogique',
  description: 'Organise ton année scolaire et génère tes leçons avec l\'IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}