import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KlassIA+ — Plateforme pédagogique IA',
  description: 'KlassIA+ aide les enseignants canadiens à préparer leurs leçons avec l\'IA',
  icons: {
    icon:     [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple:    '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('klassia-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();`
        }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
