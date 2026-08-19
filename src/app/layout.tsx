import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default:  'ScorgIA — L\'assistant intelligent des enseignants',
    template: '%s | ScorgIA',
  },
  description: 'ScorgIA aide les enseignants francophones à préparer et animer leurs leçons avec l\'IA',
  applicationName: 'ScorgIA',
  icons: {
    icon:     [
      { url: '/branding/scorgia-icon.png',   type: 'image/png'      },
      { url: '/favicon.png',                 type: 'image/png'      },
    ],
    shortcut: '/branding/scorgia-icon.png',
    apple:    '/branding/scorgia-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
