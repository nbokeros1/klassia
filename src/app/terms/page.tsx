import type { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { termsSections, termsMeta } from '@/content/legal/terms-fr'

export const metadata: Metadata = {
  title: "Conditions d'utilisation — ScorgIA",
  description: "Conditions régissant l'utilisation de la plateforme ScorgIA (Bodingo AI Tech Inc.).",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Conditions d'utilisation"
      subtitle="Les conditions régissant votre accès et votre utilisation de la plateforme ScorgIA."
      version={termsMeta.version}
      date={termsMeta.date}
      sections={termsSections}
    />
  )
}
